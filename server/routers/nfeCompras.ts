// Módulo "Notas de Compra": NF-e emitidas contra o CNPJ da empresa, buscadas na SEFAZ (Distribuição DF-e) e guardadas
// no banco (XML). Independente dos demais módulos: só busca, guarda, lista e permite baixar XML/PDF.
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router } from "../_core/trpc";
import { moduleProcedure } from "./permissions";
import { ambienteAtual, carregarCertificado, infoCertificado, modoSefaz } from "../utils/nfeCompras/sefaz";
import { buscarPorChave, ensureNfeTables, getDbNfe, gravarNota, sincronizarNfeCompras } from "../utils/nfeCompras/sincronizar";
import { detalharCompleta, lerDocumento } from "../utils/nfeCompras/xml";
import { criarZip, lerZip } from "../utils/nfeCompras/zip";

const MOD = "notas-compra" as const;

async function db0() {
  const db = await getDbNfe().catch((e) => { throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: String(e?.message ?? e) }); });
  await ensureNfeTables(db);
  return db;
}

const COLS = `id, chave, emitente_cnpj, emitente_nome, emitente_ie, numero, serie, DATE_FORMAT(data_emissao, '%Y-%m-%d %H:%i:%s') AS data_emissao,
  valor_total, natureza, protocolo, situacao, tipo, propria, manifestacao, DATE_FORMAT(manifestacao_em, '%Y-%m-%d %H:%i:%s') AS manifestacao_em,
  manifestacao_msg, origem, DATE_FORMAT(recebida_em, '%Y-%m-%d %H:%i:%s') AS recebida_em`;

const mapNota = (r: any) => ({
  id: Number(r.id), chave: String(r.chave), emitenteCnpj: r.emitente_cnpj ?? null, emitenteNome: r.emitente_nome ?? null,
  emitenteIe: r.emitente_ie ?? null, numero: r.numero ?? null, serie: r.serie ?? null, dataEmissao: r.data_emissao ?? null,
  valorTotal: Number(r.valor_total ?? 0), natureza: r.natureza ?? null, protocolo: r.protocolo ?? null,
  situacao: String(r.situacao) as "autorizada" | "cancelada" | "denegada", tipo: String(r.tipo) as "resumo" | "completa",
  propria: Number(r.propria) === 1, manifestacao: String(r.manifestacao), manifestacaoEm: r.manifestacao_em ?? null,
  manifestacaoMsg: r.manifestacao_msg ?? null, origem: String(r.origem), recebidaEm: r.recebida_em ?? null,
});

const nomeArquivo = (n: { chave: string; numero: string | null; emitenteNome: string | null }) =>
  `NFe_${n.numero ?? ""}_${(n.emitenteNome ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w]+/g, "_").slice(0, 40)}_${n.chave}`.replace(/_+/g, "_");

export const nfeComprasRouter = router({
  status: moduleProcedure(MOD).query(async () => {
    const db = await db0();
    const amb = ambienteAtual();
    const cert = infoCertificado();
    let ctrl: any = null;
    if (cert.ok) {
      const [r] = await db.$client.execute(`SELECT ult_nsu, max_nsu, DATE_FORMAT(ultima_consulta, '%Y-%m-%d %H:%i:%s') AS ultima_consulta, (proxima_permitida > NOW()) AS aguardando, DATE_FORMAT(proxima_permitida, '%H:%i') AS prox_hora, ultimo_cstat, ultimo_motivo, ultimo_erro FROM nfe_compras_controle WHERE id = ?`, [`${amb}:${cert.cnpj}`]);
      ctrl = (r as any[])[0] ?? null;
    }
    const [c] = await db.$client.execute(
      `SELECT SUM(tipo = 'resumo' AND situacao = 'autorizada' AND propria = 0) AS resumos, SUM(manifestacao = 'erro') AS erros_ciencia FROM nfe_compras WHERE ambiente = ?`, [amb]);
    const cont = (c as any[])[0] ?? {};
    return {
      ambiente: amb,
      modo: modoSefaz() ? ("sefaz" as const) : ("importacao" as const),
      automatico: modoSefaz() && process.env.NFE_COMPRAS_ATIVO === "1",
      certificado: cert,
      ultimaConsulta: ctrl?.ultima_consulta ?? null,
      aguardando: Number(ctrl?.aguardando ?? 0) === 1,
      proximaHora: (ctrl?.prox_hora as string | null) ?? null,
      ultNsu: ctrl ? String(ctrl.ult_nsu) : null,
      maxNsu: ctrl ? String(ctrl.max_nsu) : null,
      ultimoCstat: ctrl?.ultimo_cstat ?? null,
      ultimoMotivo: ctrl?.ultimo_motivo ?? null,
      ultimoErro: ctrl?.ultimo_erro ?? null,
      aguardandoXml: Number(cont.resumos ?? 0),
      errosCiencia: Number(cont.erros_ciencia ?? 0),
    };
  }),

  listar: moduleProcedure(MOD)
    .input(z.object({
      ano: z.number().int().min(2000).max(2100), mes: z.number().int().min(1).max(12),
      busca: z.string().trim().max(100).optional(), pagina: z.number().int().min(1).default(1),
      porPagina: z.number().int().min(5).max(200).default(10), incluirProprias: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await db0();
      const ini = `${input.ano}-${String(input.mes).padStart(2, "0")}-01`;
      const where: string[] = ["ambiente = ?", "data_emissao >= ?", "data_emissao < DATE_ADD(?, INTERVAL 1 MONTH)"];
      const params: any[] = [ambienteAtual(), ini, ini];
      if (!input.incluirProprias) where.push("propria = 0");
      if (input.busca) {
        const b = input.busca;
        const dig = b.replace(/\D/g, "");
        where.push(`(emitente_nome LIKE ? OR numero = ? ${dig ? "OR chave LIKE ? OR emitente_cnpj LIKE ?" : ""})`);
        params.push(`%${b}%`, b.replace(/^0+/, ""));
        if (dig) params.push(`%${dig}%`, `%${dig}%`);
      }
      const w = where.join(" AND ");
      const [tot] = await db.$client.execute(`SELECT COUNT(*) AS n, COALESCE(SUM(IF(situacao = 'autorizada', valor_total, 0)), 0) AS v FROM nfe_compras WHERE ${w}`, params);
      const off = (input.pagina - 1) * input.porPagina;
      const [rows] = await db.$client.execute(`SELECT ${COLS} FROM nfe_compras WHERE ${w} ORDER BY data_emissao DESC, id DESC LIMIT ${Number(input.porPagina)} OFFSET ${Number(off)}`, params);
      const t = (tot as any[])[0] ?? {};
      return { itens: (rows as any[]).map(mapNota), total: Number(t.n ?? 0), valorTotal: Number(t.v ?? 0) };
    }),

  detalhe: moduleProcedure(MOD).input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await db0();
    const [rows] = await db.$client.execute(`SELECT ${COLS}, xml FROM nfe_compras WHERE id = ?`, [input.id]);
    const r = (rows as any[])[0];
    if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "Nota não encontrada" });
    let det: ReturnType<typeof detalharCompleta> | null = null;
    if (r.xml) { try { det = detalharCompleta(r.xml); } catch { det = null; } }
    return { nota: mapNota(r), detalhe: det };
  }),

  /** XML para baixar (completo; se ainda não chegou, o resumo). */
  xml: moduleProcedure(MOD).input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await db0();
    const [rows] = await db.$client.execute(`SELECT ${COLS}, xml, xml_resumo FROM nfe_compras WHERE id = ?`, [input.id]);
    const r = (rows as any[])[0];
    if (!r) throw new TRPCError({ code: "NOT_FOUND", message: "Nota não encontrada" });
    const n = mapNota(r);
    const conteudo = r.xml ?? r.xml_resumo;
    if (!conteudo) throw new TRPCError({ code: "NOT_FOUND", message: "XML ainda não disponível" });
    return { nome: `${nomeArquivo(n)}${r.xml ? "" : "_resumo"}.xml`, conteudo: String(conteudo), completo: !!r.xml };
  }),

  /** Todos os XMLs completos do mês num ZIP (base64), para o contador. */
  zipMes: moduleProcedure(MOD).input(z.object({ ano: z.number().int(), mes: z.number().int().min(1).max(12) })).mutation(async ({ input }) => {
    const db = await db0();
    const ini = `${input.ano}-${String(input.mes).padStart(2, "0")}-01`;
    const [rows] = await db.$client.execute(
      `SELECT ${COLS}, xml FROM nfe_compras WHERE ambiente = ? AND propria = 0 AND xml IS NOT NULL AND data_emissao >= ? AND data_emissao < DATE_ADD(?, INTERVAL 1 MONTH) ORDER BY data_emissao`,
      [ambienteAtual(), ini, ini]);
    const lista = rows as any[];
    if (!lista.length) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhuma nota com XML completo neste mês" });
    const zip = criarZip(lista.map((r) => ({ nome: `${nomeArquivo(mapNota(r))}.xml`, conteudo: String(r.xml) })));
    return { nome: `NFe_compras_${input.ano}-${String(input.mes).padStart(2, "0")}.zip`, base64: zip.toString("base64"), quantidade: lista.length };
  }),

  atualizarAgora: moduleProcedure(MOD).mutation(async () => sincronizarNfeCompras({ origem: "manual" })),

  buscarPorChave: moduleProcedure(MOD).input(z.object({ chave: z.string().transform((s) => s.replace(/\D/g, "")).pipe(z.string().length(44, "A chave tem 44 dígitos")) }))
    .mutation(async ({ input }) => {
      if (!modoSefaz()) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "A busca na SEFAZ está desligada: as notas vêm do Conta Azul." });
      const db = await db0();
      let cnpj: string;
      try { cnpj = carregarCertificado().cnpj; } catch (e: any) { throw new TRPCError({ code: "PRECONDITION_FAILED", message: String(e?.message ?? e) }); }
      try {
        const r = await buscarPorChave(db, ambienteAtual(), input.chave, cnpj);
        if (!r.achou) return { ok: false, mensagem: `SEFAZ: ${r.cStat} - ${r.xMotivo}` };
        return { ok: true, mensagem: r.completa ? "Nota encontrada com XML completo." : "Nota encontrada (resumo). O XML completo chega depois da Ciência da Operação." };
      } catch (e: any) {
        throw new TRPCError({ code: "BAD_GATEWAY", message: String(e?.message ?? e) });
      }
    }),

  /** Importa um arquivo baixado do Conta Azul (ou de outro lugar): um XML de NF-e, ou um ZIP com vários XMLs. */
  importarArquivo: moduleProcedure(MOD)
    .input(z.object({ nome: z.string().max(255), base64: z.string().min(10).max(40_000_000) }))
    .mutation(async ({ input }) => {
      const db = await db0();
      const amb = ambienteAtual();
      let cnpj = "";
      try { cnpj = carregarCertificado().cnpj; } catch { cnpj = (process.env.NFE_COMPRAS_CNPJ ?? "").replace(/\D/g, ""); }
      const buf = Buffer.from(input.base64, "base64");
      let arquivos: { nome: string; dados: Buffer }[];
      if (buf.length >= 4 && buf.readUInt32LE(0) === 0x04034b50) {
        try { arquivos = lerZip(buf).filter((a) => /\.xml$/i.test(a.nome)); }
        catch (e: any) { throw new TRPCError({ code: "BAD_REQUEST", message: `${input.nome}: ${e?.message ?? "ZIP inválido"}` }); }
      } else arquivos = [{ nome: input.nome, dados: buf }];
      // O ZIP do Conta Azul traz as pastas "Emitidas" (vendas da própria empresa) e "Recebidas" (compras).
      // Este módulo é só de compras: o que a empresa emitiu é pulado e só contado.
      let novas = 0, atualizadas = 0, canceladas = 0, emitidas = 0;
      const ignoradas: { arquivo: string; motivo: string }[] = [];
      const pastaEmitidas = (nome: string) => /(^|\/)emitidas?\//i.test(nome);
      for (const a of arquivos) {
        const xml = a.dados.toString("utf8").replace(/^﻿/, "");
        const doc = lerDocumento(xml);
        if (doc.tipo === "completa") {
          const n = doc.nota;
          if (cnpj ? n.emitenteCnpj === cnpj : pastaEmitidas(a.nome)) { emitidas++; continue; }
          if (cnpj && n.destCnpj && n.destCnpj !== cnpj) { ignoradas.push({ arquivo: a.nome, motivo: `não é destinada à empresa (destinatário ${n.destCnpj})` }); continue; }
          const [ex] = await db.$client.execute(`SELECT id FROM nfe_compras WHERE ambiente = ? AND chave = ?`, [amb, n.chave]);
          await gravarNota(db, amb, n, "completa", xml, null, "upload", cnpj);
          if ((ex as any[]).length) atualizadas++; else novas++;
        } else if (doc.tipo === "evento") {
          // o CNPJ do emitente está dentro da chave (posições 7 a 20)
          if ((cnpj && doc.chave.slice(6, 20) === cnpj) || pastaEmitidas(a.nome)) { emitidas++; continue; }
          if (doc.tpEvento === "110111" && /^\d{44}$/.test(doc.chave)) {
            const [r] = await db.$client.execute(`UPDATE nfe_compras SET situacao = 'cancelada' WHERE ambiente = ? AND chave = ?`, [amb, doc.chave]);
            if ((r as any).affectedRows) canceladas++; else ignoradas.push({ arquivo: a.nome, motivo: "cancelamento de nota que não está no sistema" });
          }
          // outros eventos (carta de correção, manifestação) não mudam nada aqui: pulados sem aviso
        } else if (pastaEmitidas(a.nome)) {
          emitidas++;
        } else {
          ignoradas.push({ arquivo: a.nome, motivo: doc.tipo === "resumo" ? "é só o resumo da nota, não o XML completo" : doc.motivo });
        }
      }
      if (!arquivos.length) ignoradas.push({ arquivo: input.nome, motivo: "nenhum XML dentro do ZIP" });
      return { novas, atualizadas, canceladas, emitidas, ignoradas };
    }),

  /** Últimas consultas à SEFAZ (para diagnóstico). */
  log: moduleProcedure(MOD).query(async () => {
    const db = await db0();
    const [rows] = await db.$client.execute(
      `SELECT DATE_FORMAT(em, '%Y-%m-%d %H:%i:%s') AS em, tipo, cstat, motivo, documentos, detalhe FROM nfe_compras_log WHERE ambiente = ? ORDER BY id DESC LIMIT 50`, [ambienteAtual()]);
    return (rows as any[]).map((r) => ({ em: r.em, tipo: r.tipo, cstat: r.cstat, motivo: r.motivo, documentos: Number(r.documentos), detalhe: r.detalhe }));
  }),
});
