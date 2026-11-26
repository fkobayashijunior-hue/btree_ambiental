// Busca as NF-e de compra na SEFAZ e grava no banco. Usado pela rotina automática (de hora em hora) e pelo botão
// "Atualizar lista de notas". Respeita a regra da SEFAZ: sem documento novo, só pode consultar de novo depois de 1 hora.
import { ambienteAtual, carregarCertificado, consultarDistribuicao, enviarCiencia, modoSefaz, type Ambiente } from "./sefaz";
import { lerDocumento, type NotaExtraida } from "./xml";

export async function getDbNfe() {
  const { getDb } = await import("../../db");
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  return db as any;
}

let ensurePromise: Promise<void> | null = null;
export function ensureNfeTables(db: any): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS nfe_compras (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ambiente VARCHAR(12) NOT NULL DEFAULT 'producao',
          chave CHAR(44) NOT NULL,
          nsu BIGINT NULL,
          emitente_cnpj VARCHAR(14) NULL,
          emitente_nome VARCHAR(200) NULL,
          emitente_ie VARCHAR(20) NULL,
          numero VARCHAR(12) NULL,
          serie VARCHAR(5) NULL,
          data_emissao DATETIME NULL,
          valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
          natureza VARCHAR(120) NULL,
          protocolo VARCHAR(20) NULL,
          situacao VARCHAR(12) NOT NULL DEFAULT 'autorizada',
          tipo VARCHAR(10) NOT NULL DEFAULT 'resumo',
          propria TINYINT NOT NULL DEFAULT 0,
          manifestacao VARCHAR(16) NOT NULL DEFAULT 'nenhuma',
          manifestacao_em DATETIME NULL,
          manifestacao_msg VARCHAR(255) NULL,
          ciencia_tentativas INT NOT NULL DEFAULT 0,
          ultima_busca_chave DATETIME NULL,
          xml MEDIUMTEXT NULL,
          xml_resumo TEXT NULL,
          origem VARCHAR(10) NOT NULL DEFAULT 'sefaz',
          recebida_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          atualizada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY nfe_compras_chave (ambiente, chave),
          KEY nfe_compras_emissao (data_emissao),
          KEY nfe_compras_emitente (emitente_cnpj)
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS nfe_compras_controle (
          id VARCHAR(40) PRIMARY KEY,
          ult_nsu BIGINT NOT NULL DEFAULT 0,
          max_nsu BIGINT NOT NULL DEFAULT 0,
          ultima_consulta DATETIME NULL,
          proxima_permitida DATETIME NULL,
          ultimo_cstat VARCHAR(5) NULL,
          ultimo_motivo VARCHAR(255) NULL,
          ultimo_erro VARCHAR(500) NULL
        )
      `);
      await db.$client.execute(`
        CREATE TABLE IF NOT EXISTS nfe_compras_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          ambiente VARCHAR(12) NOT NULL,
          tipo VARCHAR(20) NOT NULL,
          cstat VARCHAR(5) NULL,
          motivo VARCHAR(255) NULL,
          documentos INT NOT NULL DEFAULT 0,
          detalhe VARCHAR(500) NULL,
          KEY nfe_compras_log_em (em)
        )
      `);
    })().catch((e) => { ensurePromise = null; throw e; });
  }
  return ensurePromise;
}

async function log(db: any, amb: Ambiente, tipo: string, cstat: string | null, motivo: string | null, documentos = 0, detalhe: string | null = null) {
  try {
    await db.$client.execute(`INSERT INTO nfe_compras_log (ambiente, tipo, cstat, motivo, documentos, detalhe) VALUES (?, ?, ?, ?, ?, ?)`,
      [amb, tipo, cstat, (motivo ?? "").slice(0, 255) || null, documentos, detalhe ? detalhe.slice(0, 500) : null]);
  } catch { /* log não pode derrubar a busca */ }
}

/** Grava (ou completa) uma nota. Um resumo nunca sobrescreve uma nota que já tem o XML completo. */
export async function gravarNota(db: any, amb: Ambiente, n: NotaExtraida, tipo: "resumo" | "completa", xml: string, nsu: string | null, origem: string, cnpjEmpresa: string) {
  const propria = n.emitenteCnpj && n.emitenteCnpj === cnpjEmpresa ? 1 : 0;
  const base = [amb, n.chave, nsu ? Number(nsu) : null, n.emitenteCnpj, n.emitenteNome?.slice(0, 200) ?? null, n.emitenteIe, n.numero, n.serie,
    n.dataEmissao, n.valorTotal, n.natureza?.slice(0, 120) ?? null, n.protocolo, n.situacao, propria, origem];
  if (tipo === "completa") {
    await db.$client.execute(
      `INSERT INTO nfe_compras (ambiente, chave, nsu, emitente_cnpj, emitente_nome, emitente_ie, numero, serie, data_emissao, valor_total, natureza, protocolo, situacao, propria, origem, tipo, xml)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completa', ?)
       ON DUPLICATE KEY UPDATE tipo = 'completa', xml = VALUES(xml), nsu = COALESCE(VALUES(nsu), nsu), emitente_cnpj = VALUES(emitente_cnpj),
         emitente_nome = VALUES(emitente_nome), emitente_ie = VALUES(emitente_ie), numero = VALUES(numero), serie = VALUES(serie),
         data_emissao = VALUES(data_emissao), valor_total = VALUES(valor_total), natureza = VALUES(natureza),
         protocolo = COALESCE(VALUES(protocolo), protocolo), situacao = IF(situacao = 'cancelada', situacao, VALUES(situacao))`,
      [...base, xml]);
  } else {
    await db.$client.execute(
      `INSERT INTO nfe_compras (ambiente, chave, nsu, emitente_cnpj, emitente_nome, emitente_ie, numero, serie, data_emissao, valor_total, natureza, protocolo, situacao, propria, origem, tipo, xml_resumo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'resumo', ?)
       ON DUPLICATE KEY UPDATE xml_resumo = VALUES(xml_resumo), situacao = IF(VALUES(situacao) = 'autorizada', situacao, VALUES(situacao))`,
      [...base, xml]);
  }
}

let rodando = false;

export type ResultadoSync = {
  ok: boolean; mensagem: string; novas: number; completas: number; cienciasEnviadas: number;
};

/** Executa uma rodada de busca. `forcarChaves` = quantas notas antigas (com ciência já enviada) buscar pela chave. */
export async function sincronizarNfeCompras(opts: { origem: "automatica" | "manual" } = { origem: "manual" }): Promise<ResultadoSync> {
  if (!modoSefaz()) return { ok: false, mensagem: "A busca na SEFAZ está desligada: as notas vêm do Conta Azul (importe os XMLs).", novas: 0, completas: 0, cienciasEnviadas: 0 };
  if (rodando) return { ok: false, mensagem: "Uma busca já está em andamento. Aguarde alguns instantes.", novas: 0, completas: 0, cienciasEnviadas: 0 };
  rodando = true;
  const amb = ambienteAtual();
  let db: any = null;
  try {
    db = await getDbNfe();
    await ensureNfeTables(db);
    const cert = carregarCertificado();
    const ctrlId = `${amb}:${cert.cnpj}`;
    await db.$client.execute(`INSERT IGNORE INTO nfe_compras_controle (id) VALUES (?)`, [ctrlId]);
    // horários comparados pelo relógio do banco (evita diferença de fuso entre servidor e banco)
    const [cr] = await db.$client.execute(`SELECT *, (proxima_permitida > NOW()) AS aguardando, DATE_FORMAT(proxima_permitida, '%H:%i') AS prox_hora FROM nfe_compras_controle WHERE id = ?`, [ctrlId]);
    const ctrl = (cr as any[])[0];
    let novas = 0, completas = 0, ciencias = 0;
    let mensagem = "";
    let esperarUmaHora = false;

    if (Number(ctrl.aguardando) === 1) {
      mensagem = `A SEFAZ só permite nova consulta a partir de ${ctrl.prox_hora}.`;
    } else {
      let ult = String(ctrl.ult_nsu ?? 0);
      for (let rodada = 0; rodada < 30; rodada++) {
        const r = await consultarDistribuicao({ ultNSU: ult, ambiente: amb });
        await log(db, amb, "distribuicao", r.cStat, r.xMotivo, r.docs.length, `ultNSU ${ult} → ${r.ultNSU} (max ${r.maxNSU}) · ${opts.origem}`);
        if (r.cStat === "138") {
          for (const d of r.docs) {
            const lido = lerDocumento(d.xml);
            if (lido.tipo === "resumo" || lido.tipo === "completa") {
              const [ex] = await db.$client.execute(`SELECT id FROM nfe_compras WHERE ambiente = ? AND chave = ?`, [amb, lido.nota.chave]);
              if (!(ex as any[]).length) novas++;
              if (lido.tipo === "completa") completas++;
              await gravarNota(db, amb, lido.nota, lido.tipo, d.xml, d.nsu, "sefaz", cert.cnpj);
            } else if (lido.tipo === "evento" && /^\d{44}$/.test(lido.chave)) {
              if (lido.tpEvento === "110111") {
                await db.$client.execute(`UPDATE nfe_compras SET situacao = 'cancelada' WHERE ambiente = ? AND chave = ?`, [amb, lido.chave]);
              }
              await log(db, amb, "evento", lido.tpEvento, lido.descricao, 0, lido.chave);
            }
          }
          ult = r.ultNSU;
          await db.$client.execute(`UPDATE nfe_compras_controle SET ult_nsu = ?, max_nsu = ?, ultima_consulta = NOW(), ultimo_cstat = ?, ultimo_motivo = ?, ultimo_erro = NULL WHERE id = ?`,
            [Number(r.ultNSU), Number(r.maxNSU), r.cStat, r.xMotivo.slice(0, 255), ctrlId]);
          if (Number(r.ultNSU) >= Number(r.maxNSU)) { esperarUmaHora = true; break; }
          continue;
        }
        // 137 = nada novo; 656 = consumo indevido; outros = erro. Em todos, a próxima consulta só depois de 1 hora.
        // 656 "Deve ser utilizado o ultNSU": outro sistema (ex.: Conta Azul) já recebeu os documentos até o ultNSU
        // devolvido; a SEFAZ exige continuar dali. Adota o maior ultNSU informado.
        esperarUmaHora = true;
        const ultNovo = Math.max(Number(r.ultNSU) || 0, Number(ult) || 0);
        await db.$client.execute(`UPDATE nfe_compras_controle SET ult_nsu = ?, max_nsu = GREATEST(max_nsu, ?), ultima_consulta = NOW(), ultimo_cstat = ?, ultimo_motivo = ?, ultimo_erro = ? WHERE id = ?`,
          [ultNovo, Number(r.maxNSU) || 0, r.cStat, r.xMotivo.slice(0, 255), r.cStat === "137" ? null : `${r.cStat} - ${r.xMotivo}`.slice(0, 500), ctrlId]);
        if (r.cStat !== "137") mensagem = `SEFAZ: ${r.cStat} - ${r.xMotivo}`;
        break;
      }
      if (esperarUmaHora) await db.$client.execute(`UPDATE nfe_compras_controle SET proxima_permitida = NOW() + INTERVAL 61 MINUTE WHERE id = ?`, [ctrlId]);
    }

    // Ciência da Operação para os resumos (libera o XML completo na próxima consulta)
    const [pend] = await db.$client.execute(
      `SELECT chave FROM nfe_compras WHERE ambiente = ? AND tipo = 'resumo' AND situacao = 'autorizada' AND propria = 0
         AND manifestacao IN ('nenhuma', 'erro') AND ciencia_tentativas < 3 ORDER BY data_emissao DESC LIMIT 300`, [amb]);
    const chaves = (pend as any[]).map((x) => String(x.chave));
    for (let i = 0; i < chaves.length; i += 20) {
      const lote = chaves.slice(i, i + 20);
      try {
        const r = await enviarCiencia(lote, amb);
        await log(db, amb, "ciencia", r.cStatLote, r.xMotivoLote, lote.length);
        const porChave = new Map(r.retornos.map((x) => [x.chave, x]));
        for (const c of lote) {
          const x = porChave.get(c);
          const ok = !!x?.ok;
          if (ok) ciencias++;
          await db.$client.execute(
            `UPDATE nfe_compras SET manifestacao = ?, manifestacao_em = NOW(), manifestacao_msg = ?, ciencia_tentativas = ciencia_tentativas + 1 WHERE ambiente = ? AND chave = ?`,
            [ok ? "ciencia" : "erro", x ? `${x.cStat} - ${x.xMotivo}`.slice(0, 255) : `${r.cStatLote} - ${r.xMotivoLote}`.slice(0, 255), amb, c]);
        }
      } catch (e: any) {
        await log(db, amb, "ciencia_erro", null, String(e?.message ?? e), lote.length);
        await db.$client.execute(
          `UPDATE nfe_compras SET manifestacao = 'erro', manifestacao_msg = ?, ciencia_tentativas = ciencia_tentativas + 1 WHERE ambiente = ? AND chave IN (${lote.map(() => "?").join(",")})`,
          [String(e?.message ?? e).slice(0, 255), amb, ...lote]);
        break;
      }
    }

    // Notas com ciência há mais de 2 horas e ainda sem XML completo: busca pela chave (no máximo 5 por rodada, cada uma a cada 6 horas)
    if (opts.origem === "automatica") {
      const [atras] = await db.$client.execute(
        `SELECT chave FROM nfe_compras WHERE ambiente = ? AND tipo = 'resumo' AND manifestacao = 'ciencia' AND manifestacao_em < NOW() - INTERVAL 2 HOUR
           AND (ultima_busca_chave IS NULL OR ultima_busca_chave < NOW() - INTERVAL 6 HOUR) ORDER BY manifestacao_em LIMIT 5`, [amb]);
      for (const a of atras as any[]) {
        const r = await buscarPorChave(db, amb, String(a.chave), cert.cnpj).catch(() => null);
        if (r?.completa) completas++;
      }
    }

    if (!mensagem) {
      mensagem = novas || completas || ciencias
        ? `${novas} nota(s) nova(s), ${completas} com XML completo${ciencias ? `, ciência enviada para ${ciencias}` : ""}.`
        : "Nenhuma nota nova na SEFAZ.";
    }
    return { ok: true, mensagem, novas, completas, cienciasEnviadas: ciencias };
  } catch (e: any) {
    const msg = String(e?.message ?? e);
    if (db) {
      await log(db, amb, "erro", null, msg);
      try {
        const cert = carregarCertificado();
        await db.$client.execute(`UPDATE nfe_compras_controle SET ultimo_erro = ?, ultima_consulta = NOW() WHERE id = ?`, [msg.slice(0, 500), `${amb}:${cert.cnpj}`]);
      } catch { /* sem certificado: nada a gravar */ }
    }
    return { ok: false, mensagem: msg, novas: 0, completas: 0, cienciasEnviadas: 0 };
  } finally {
    rodando = false;
  }
}

/** Consulta uma nota específica pela chave de acesso (44 dígitos). */
export async function buscarPorChave(db: any, amb: Ambiente, chave: string, cnpjEmpresa: string) {
  await db.$client.execute(`UPDATE nfe_compras SET ultima_busca_chave = NOW() WHERE ambiente = ? AND chave = ?`, [amb, chave]);
  const r = await consultarDistribuicao({ chave, ambiente: amb });
  await log(db, amb, "chave", r.cStat, r.xMotivo, r.docs.length, chave);
  let achou = false, completa = false;
  for (const d of r.docs) {
    const lido = lerDocumento(d.xml);
    if ((lido.tipo === "resumo" || lido.tipo === "completa") && lido.nota.chave === chave) {
      await gravarNota(db, amb, lido.nota, lido.tipo, d.xml, null, "chave", cnpjEmpresa);
      achou = true;
      if (lido.tipo === "completa") completa = true;
    } else if (lido.tipo === "evento" && lido.chave === chave && lido.tpEvento === "110111") {
      await db.$client.execute(`UPDATE nfe_compras SET situacao = 'cancelada' WHERE ambiente = ? AND chave = ?`, [amb, chave]);
    }
  }
  return { cStat: r.cStat, xMotivo: r.xMotivo, achou, completa };
}

// ── Rotina automática: de hora em hora (minuto 7), das 6h às 22h, só com NFE_COMPRAS_ATIVO=1 ──
export function agendarNfeCompras() {
  if (!modoSefaz() || process.env.NFE_COMPRAS_ATIVO !== "1") {
    console.log("[NFeCompras] Busca automática na SEFAZ desligada (as notas vêm por importação dos XMLs)");
    return;
  }
  const proxima = () => {
    const agora = new Date();
    const alvo = new Date(agora);
    alvo.setMinutes(7, 0, 0);
    if (alvo.getTime() <= agora.getTime()) alvo.setHours(alvo.getHours() + 1);
    setTimeout(async () => {
      const h = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Sao_Paulo" }));
      if (h >= 6 && h <= 22) {
        const r = await sincronizarNfeCompras({ origem: "automatica" });
        console.log(`[NFeCompras] ${r.ok ? "OK" : "ERRO"}: ${r.mensagem}`);
      }
      proxima();
    }, Math.max(alvo.getTime() - agora.getTime(), 60_000));
  };
  proxima();
  console.log(`[NFeCompras] Busca automática ligada (${ambienteAtual()})`);
}
