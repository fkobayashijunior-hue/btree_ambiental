// "Memória" de favorecidos do extrato: uma vez identificado (CNPJ, nome, ou fragmento de CPF
// mascarado pelo banco), o sistema guarda razão social/CNAE (via BrasilAPI) e a classificação
// contábil/gerencial (Grupo, Centro de Custo, etc, editada na tela) — reaplicada automaticamente
// em lançamentos futuros do mesmo favorecido, sem precisar reconsultar a API.
import { consultarCnpjBrasilApi } from "./brasilApiCnpj";

export type TipoChaveFavorecido = "cnpj" | "nome" | "cpf_fragmento";

export type IdentificadorFavorecido = {
  tipo: TipoChaveFavorecido;
  chave: string;
};

const CNPJ_REGEX = /(\d{2}\.\d{3}\.\d{3})[\/\s](\d{4}-\d{2})/;
const CPF_MASCARADO_REGEX = /(\d{3}\.\d{3})-\*{2}/;
const FAV_NOME_REGEX = /FAV\.:\s*(.+?)\s+Transferência Pix/i;

// Em "TRANSF.REALIZADA PIX SICOOB" / "DÉB.TRANSF.CONTAS DIF.TIT." o CNPJ que aparece no texto
// (depois de "Transferência Pix") é sempre o da PRÓPRIA conta pagadora (Btree), não o do
// favorecido — o favorecido real só aparece pelo nome, em "FAV.: <nome>". Por isso o padrão
// "FAV.:" precisa ser checado ANTES do CNPJ genérico, senão todo mundo cairia sob a mesma chave.
export function extrairIdentificadorFavorecido(
  descricao: string | null | undefined,
  complemento: string | null | undefined,
  numeroDocumento?: string | null
): IdentificadorFavorecido | null {
  const texto = `${descricao ?? ""} ${complemento ?? ""}`;

  const favMatch = (complemento ?? "").match(FAV_NOME_REGEX);
  if (favMatch) {
    const nome = favMatch[1].trim().toUpperCase();
    if (nome) return { tipo: "nome", chave: `nome:${nome}` };
  }

  const cnpjMatch = texto.match(CNPJ_REGEX);
  if (cnpjMatch) {
    const digitos = (cnpjMatch[1] + cnpjMatch[2]).replace(/\D/g, "");
    if (digitos.length === 14) return { tipo: "cnpj", chave: `cnpj:${digitos}` };
  }

  // Compra no cartão: complemento traz "ESTABELECIMENTO   CIDADE   BR"
  if (/COMPRA/i.test(descricao ?? "") && complemento) {
    const nome = complemento.replace(/\s+BR$/i, "").replace(/\s+/g, " ").trim().toUpperCase();
    if (nome) return { tipo: "nome", chave: `nome:${nome}` };
  }

  const cpfMatch = (complemento ?? "").match(CPF_MASCARADO_REGEX);
  if (cpfMatch) {
    const fragmento = cpfMatch[1].replace(/\D/g, "");
    return { tipo: "cpf_fragmento", chave: `cpf:${fragmento}` };
  }

  // Sem CNPJ, nome nem CPF em lugar nenhum do texto (ex: "DÉBITO PEDÁGIO SICOOB TAG", "TARIFA
  // COBRANÇA" — sem complemento nenhum): usa a própria descrição do lançamento como identidade.
  // Isso agrupa certo pra rótulos verdadeiramente fixos (Pedágio, Diária/Estacionamento/
  // Mensalidade SICOOB TAG — o Nº Documento também é sempre o mesmo código ali). Mas alguns
  // rótulos são usados pra pagamentos/recebimentos de fornecedores/clientes bem diferentes que só
  // coincidem no texto (ex: "DÉB.TIT.COMPE EFETIVADO", cada um com um Nº Documento próprio) — pra
  // esses, listados aqui, o Nº Documento entra na chave também, tratando cada um como favorecido
  // distinto em vez de generalizar errado.
  const DESCRICOES_COM_DOCUMENTO_NA_CHAVE = new Set([
    "DÉB.TIT.COMPE EFETIVADO",
    "DÉB. PAGAMENTO DE BOLETO INTERCREDIS",
  ]);
  const descricaoLimpa = (descricao ?? "").trim().toUpperCase();
  const documentoLimpo = (numeroDocumento ?? "").trim().toUpperCase();
  if (descricaoLimpa) {
    const usaDocumento = documentoLimpo && DESCRICOES_COM_DOCUMENTO_NA_CHAVE.has(descricaoLimpa);
    const chave = usaDocumento ? `nome:${descricaoLimpa}#${documentoLimpo}` : `nome:${descricaoLimpa}`;
    return { tipo: "nome", chave };
  }

  return null;
}

export async function buscarFavorecido(db: any, chave: string): Promise<any | null> {
  const [rows] = (await db.$client.execute(
    `SELECT id FROM favorecido_categoria WHERE chave = ? LIMIT 1`,
    [chave]
  )) as any;
  return (rows as any[])?.[0] ?? null;
}

// Busca a classificação (Grupo, Centro de Custo, etc) de outro favorecido já classificado com o
// MESMO CNAE — usada para um CNPJ novo herdar automaticamente a classificação de um "colega de
// ramo" já conhecido, em vez de começar sempre em branco.
async function herdarClassificacaoPorCnae(db: any, cnaeCodigo: string | null): Promise<Record<string, string | null> | null> {
  if (!cnaeCodigo) return null;
  const [rows] = (await db.$client.execute(
    `SELECT grupo, centro_custo, natureza, classificacao, fixo_variavel, direto_indireto
     FROM favorecido_categoria
     WHERE cnae_codigo = ?
       AND (grupo IS NOT NULL OR centro_custo IS NOT NULL OR natureza IS NOT NULL
            OR classificacao IS NOT NULL OR fixo_variavel IS NOT NULL OR direto_indireto IS NOT NULL)
     ORDER BY updated_at DESC LIMIT 1`,
    [cnaeCodigo]
  )) as any;
  return (rows as any[])?.[0] ?? null;
}

// Registra (ou enriquece, se já existir) um favorecido com razão social/CNAE. Nunca apaga um
// valor já preenchido — só completa o que estiver faltando. Quando é um favorecido NOVO com CNAE
// conhecido, tenta herdar a classificação de outro favorecido já classificado com o mesmo CNAE.
export async function registrarFavorecido(
  db: any,
  params: {
    chave: string;
    tipoChave: TipoChaveFavorecido;
    razaoSocial?: string | null;
    cnaeCodigo?: string | null;
    cnaeDescricao?: string | null;
  }
): Promise<void> {
  const { chave, tipoChave, razaoSocial = null, cnaeCodigo = null, cnaeDescricao = null } = params;

  const existente = await buscarFavorecido(db, chave);
  if (existente) {
    await db.$client.execute(
      `UPDATE favorecido_categoria SET
         razao_social = COALESCE(?, razao_social),
         cnae_codigo = COALESCE(?, cnae_codigo),
         cnae_descricao = COALESCE(?, cnae_descricao),
         updated_at = NOW()
       WHERE chave = ?`,
      [razaoSocial, cnaeCodigo, cnaeDescricao, chave]
    );
    return;
  }

  const herdado = await herdarClassificacaoPorCnae(db, cnaeCodigo);
  await db.$client.execute(
    `INSERT INTO favorecido_categoria
       (chave, tipo_chave, razao_social, cnae_codigo, cnae_descricao,
        grupo, centro_custo, natureza, classificacao, fixo_variavel, direto_indireto)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      chave, tipoChave, razaoSocial, cnaeCodigo, cnaeDescricao,
      herdado?.grupo ?? null, herdado?.centro_custo ?? null, herdado?.natureza ?? null,
      herdado?.classificacao ?? null, herdado?.fixo_variavel ?? null, herdado?.direto_indireto ?? null,
    ]
  );
}

// Ponto de entrada usado na sincronização/importação: se o favorecido do lançamento ainda não é
// conhecido e tem CNPJ completo, consulta a BrasilAPI para descobrir razão social/CNAE e já
// deixa registrado na memória — sem precisar reconsultar depois.
export async function descobrirFavorecido(
  db: any,
  descricao: string | null | undefined,
  complemento: string | null | undefined,
  numeroDocumento?: string | null
): Promise<void> {
  const identificador = extrairIdentificadorFavorecido(descricao, complemento, numeroDocumento);
  if (!identificador) return;

  const existente = await buscarFavorecido(db, identificador.chave);
  if (existente) return;

  if (identificador.tipo === "cnpj") {
    const cnpj = identificador.chave.replace("cnpj:", "");
    const info = await consultarCnpjBrasilApi(cnpj);
    if (info) {
      await registrarFavorecido(db, {
        chave: identificador.chave,
        tipoChave: "cnpj",
        razaoSocial: info.razaoSocial,
        cnaeCodigo: info.cnaeCodigo,
        cnaeDescricao: info.cnaeDescricao,
      });
    }
  }
}
