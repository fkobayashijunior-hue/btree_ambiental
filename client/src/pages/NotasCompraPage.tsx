// Notas de Compra: NF-e emitidas contra o CNPJ da empresa, buscadas automaticamente na SEFAZ.
// Tela inspirada em "Notas de compras" do Conta Azul: período por mês, lista, XML e PDF (DANFE) de cada nota.
import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, RefreshCw, Search, FileCode2, FileText, Info, KeyRound, Upload, FileArchive, AlertTriangle, Loader2, ListTree } from "lucide-react";
import { gerarDanfe } from "@/lib/danfe";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const moeda = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dataBR = (s?: string | null) => (s ? s.slice(0, 10).split("-").reverse().join("/") : "-");
const dataHoraBR = (s?: string | null) => (s ? `${dataBR(s)} às ${s.slice(11, 16)}` : "-");
const cnpjFmt = (s?: string | null) => (s && s.length === 14 ? s.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : s ?? "");

function baixarArquivo(nome: string, conteudo: Blob) {
  const url = URL.createObjectURL(conteudo);
  const a = document.createElement("a");
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const SITUACAO: Record<string, { l: string; cls: string }> = {
  completa: { l: "XML completo", cls: "bg-emerald-100 text-emerald-800" },
  resumo: { l: "Aguardando XML", cls: "bg-amber-100 text-amber-800" },
  cancelada: { l: "Cancelada", cls: "bg-red-100 text-red-700" },
  denegada: { l: "Denegada", cls: "bg-red-100 text-red-700" },
};
const situacaoDe = (n: { situacao: string; tipo: string }) => SITUACAO[n.situacao !== "autorizada" ? n.situacao : n.tipo];

export default function NotasCompraPage() {
  const hoje = new Date();
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth() + 1);
  const [busca, setBusca] = useState("");
  const [buscaAplicada, setBuscaAplicada] = useState("");
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(10);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [chaveAberta, setChaveAberta] = useState(false);
  const [chave, setChave] = useState("");
  const [logAberto, setLogAberto] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState<number | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  useEffect(() => { const t = setTimeout(() => { setBuscaAplicada(busca.trim()); setPagina(1); }, 400); return () => clearTimeout(t); }, [busca]);

  const status = trpc.nfeCompras.status.useQuery(undefined, { refetchInterval: 60_000 });
  const lista = trpc.nfeCompras.listar.useQuery({ ano, mes, busca: buscaAplicada || undefined, pagina, porPagina });
  const detalhe = trpc.nfeCompras.detalhe.useQuery({ id: detalheId ?? 0 }, { enabled: !!detalheId });
  const log = trpc.nfeCompras.log.useQuery(undefined, { enabled: logAberto });

  const recarregar = () => { utils.nfeCompras.listar.invalidate(); utils.nfeCompras.status.invalidate(); utils.nfeCompras.log.invalidate(); };
  const atualizar = trpc.nfeCompras.atualizarAgora.useMutation({
    onSuccess: (r) => { (r.ok ? toast.success : toast.error)(r.mensagem); recarregar(); },
    onError: (e) => toast.error(e.message),
  });
  const porChave = trpc.nfeCompras.buscarPorChave.useMutation({
    onSuccess: (r) => { (r.ok ? toast.success : toast.error)(r.mensagem); if (r.ok) { setChaveAberta(false); setChave(""); } recarregar(); },
    onError: (e) => toast.error(e.message),
  });
  const importar = trpc.nfeCompras.importarArquivo.useMutation();
  const [importando, setImportando] = useState<string | null>(null);
  const [resultadoImport, setResultadoImport] = useState<{ novas: number; atualizadas: number; canceladas: number; emitidas: number; ignoradas: { arquivo: string; motivo: string }[] } | null>(null);
  const zip = trpc.nfeCompras.zipMes.useMutation({
    onSuccess: (r) => {
      const bin = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      baixarArquivo(r.nome, new Blob([bin], { type: "application/zip" }));
      toast.success(`${r.quantidade} XML(s) no arquivo`);
    },
    onError: (e) => toast.error(e.message),
  });

  const navMes = (d: number) => {
    let m = mes + d, a = ano;
    if (m < 1) { m = 12; a--; } if (m > 12) { m = 1; a++; }
    setMes(m); setAno(a); setPagina(1);
  };

  const baixarXml = async (id: number) => {
    try {
      const r = await utils.nfeCompras.xml.fetch({ id });
      baixarArquivo(r.nome, new Blob([r.conteudo], { type: "application/xml" }));
      if (!r.completo) toast.info("Ainda é só o resumo da nota, não o XML completo.");
    } catch (e: any) { toast.error(e.message); }
  };
  const baixarPdf = async (id: number) => {
    setGerandoPdf(id);
    try {
      const r = await utils.nfeCompras.xml.fetch({ id });
      if (!r.completo) { toast.error("O PDF só pode ser gerado com o XML completo da nota."); return; }
      gerarDanfe(r.conteudo).save(r.nome.replace(/\.xml$/, ".pdf"));
    } catch (e: any) { toast.error(`Não foi possível gerar o PDF: ${e.message}`); }
    finally { setGerandoPdf(null); }
  };
  // Cada arquivo (XML ou ZIP) vai num envio separado; no fim mostra o resumo do que entrou e do que foi ignorado.
  const lerArquivos = async (files: FileList | File[] | null) => {
    const lista = Array.from(files ?? []);
    if (!lista.length) return;
    const tot = { novas: 0, atualizadas: 0, canceladas: 0, emitidas: 0, ignoradas: [] as { arquivo: string; motivo: string }[] };
    for (let i = 0; i < lista.length; i++) {
      const f = lista[i];
      setImportando(`Importando ${i + 1} de ${lista.length}: ${f.name}`);
      if (f.size > 28_000_000) { tot.ignoradas.push({ arquivo: f.name, motivo: "arquivo maior que 28 MB (divida o ZIP)" }); continue; }
      try {
        const b64 = await new Promise<string>((ok, erro) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1] ?? ""); r.onerror = () => erro(r.error); r.readAsDataURL(f); });
        const r = await importar.mutateAsync({ nome: f.name, base64: b64 });
        tot.novas += r.novas; tot.atualizadas += r.atualizadas; tot.canceladas += r.canceladas; tot.emitidas += r.emitidas; tot.ignoradas.push(...r.ignoradas);
      } catch (e: any) { tot.ignoradas.push({ arquivo: f.name, motivo: e?.message ?? "erro" }); }
    }
    setImportando(null);
    if (arquivoRef.current) arquivoRef.current.value = "";
    setResultadoImport(tot);
    recarregar();
  };

  const s = status.data;
  const itens = lista.data?.itens ?? [];
  const total = lista.data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / porPagina));
  const aguardando = !!s?.aguardando;

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Notas de compra</h1>
        <div className="flex flex-wrap gap-2">
          {s?.modo === "sefaz" && <Button variant="outline" size="sm" className="gap-1" onClick={() => setChaveAberta(true)}><KeyRound className="h-4 w-4" /> Buscar pela chave</Button>}
          <Button size="sm" className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700" disabled={!!importando} onClick={() => arquivoRef.current?.click()}>
            {importando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Importar XML / ZIP
          </Button>
          <input ref={arquivoRef} type="file" accept=".xml,.zip,text/xml,application/xml,application/zip" multiple className="hidden" onChange={(e) => lerArquivos(e.target.files)} />
          <Button variant="outline" size="sm" className="gap-1" disabled={zip.isPending} onClick={() => zip.mutate({ ano, mes })}>
            {zip.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileArchive className="h-4 w-4" />} XMLs do mês (ZIP)
          </Button>
        </div>
      </div>

      {/* Modo importação: as notas vêm do Conta Azul */}
      {s?.modo === "importacao" && (
        <div
          className="flex gap-3 rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/60 p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); lerArquivos(e.dataTransfer.files); }}
        >
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
          <div className="min-w-0 flex-1 space-y-1 text-sm">
            <p className="font-semibold">As notas de compra vêm do Conta Azul</p>
            <p className="text-gray-700">
              O Conta Azul busca as NF-e de compra na Receita Federal. Baixe lá os XMLs (um a um ou em ZIP) e importe aqui com
              “Importar XML / ZIP”, ou arraste os arquivos para este quadro. Notas repetidas não são duplicadas.
            </p>
            {importando && <p className="flex items-center gap-1 text-xs text-blue-800"><Loader2 className="h-3.5 w-3.5 animate-spin" /> {importando}</p>}
          </div>
        </div>
      )}

      {/* Situação da busca automática (só no modo SEFAZ) */}
      {s?.modo === "sefaz" && (
      <div className="flex gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-semibold">Busca automática de NF-e{s && s.ambiente === "homologacao" ? " (AMBIENTE DE TESTE DA SEFAZ)" : ""}</p>
          <p className="text-gray-700">
            {s?.ultimaConsulta ? <>A última atualização com a Receita Federal ocorreu no dia {dataHoraBR(s.ultimaConsulta)}.</> : "Nenhuma consulta feita ainda."}
            {s && !s.automatico && <span className="text-gray-500"> A busca automática está desligada; use “Atualizar lista de notas”.</span>}
          </p>
          {s?.certificado.ok && (
            <p className={`text-xs ${s.certificado.diasRestantes <= 30 ? "font-medium text-red-700" : "text-gray-500"}`}>
              Certificado {s.certificado.nome} ({cnpjFmt(s.certificado.cnpj)}) válido até {new Date(s.certificado.validoAte).toLocaleDateString("pt-BR")}
              {s.certificado.diasRestantes <= 30 ? ` — vence em ${s.certificado.diasRestantes} dia(s), renove!` : ""}
            </p>
          )}
          {s && !s.certificado.ok && <p className="flex items-center gap-1 text-xs font-medium text-red-700"><AlertTriangle className="h-3.5 w-3.5" /> {s.certificado.erro}</p>}
          {s?.ultimoErro && <p className="flex items-center gap-1 text-xs font-medium text-red-700"><AlertTriangle className="h-3.5 w-3.5" /> Última consulta: {s.ultimoErro}</p>}
          {!!s?.aguardandoXml && <p className="text-xs text-amber-800">{s.aguardandoXml} nota(s) aguardando o XML completo (chega na próxima busca, após a Ciência da Operação).</p>}
          <button type="button" onClick={() => setLogAberto(true)} className="flex items-center gap-1 text-xs text-blue-700 hover:underline"><ListTree className="h-3.5 w-3.5" /> Ver últimas consultas</button>
        </div>
      </div>
      )}

      <div className="space-y-3 rounded-xl border bg-white p-3 md:p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <p className="mb-1 text-xs text-gray-500">Período</p>
            <div className="flex items-center rounded-md border">
              <Button variant="ghost" size="icon" onClick={() => navMes(-1)} aria-label="Mês anterior"><ChevronLeft className="h-4 w-4" /></Button>
              <span className="min-w-40 text-center text-sm font-semibold text-blue-800">{MESES[mes - 1]} de {ano}</span>
              <Button variant="ghost" size="icon" onClick={() => navMes(1)} aria-label="Próximo mês"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          {s?.modo === "sefaz" && <Button variant="ghost" className="gap-1 text-blue-700" disabled={atualizar.isPending || aguardando} onClick={() => atualizar.mutate()}
            title={aguardando ? "A SEFAZ exige 1 hora entre consultas quando não há nota nova" : ""}>
            <RefreshCw className={`h-4 w-4 ${atualizar.isPending ? "animate-spin" : ""}`} />
            {atualizar.isPending ? "Buscando na SEFAZ..." : aguardando ? `Próxima busca às ${s?.proximaHora ?? ""}` : "Atualizar lista de notas"}
          </Button>}
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar fornecedor, CNPJ, nº ou chave" className="h-10 pl-8" />
          </div>
        </div>

        {/* Tabela (computador) */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
                <th className="px-3 py-2.5">Emissão</th><th className="px-3 py-2.5">Fornecedor</th><th className="px-3 py-2.5">Série - NF</th>
                <th className="px-3 py-2.5 text-right">Valor (R$)</th><th className="px-3 py-2.5">Situação</th><th className="px-3 py-2.5 text-center">Arquivos</th>
              </tr>
            </thead>
            <tbody>
              {lista.isLoading && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Carregando...</td></tr>}
              {!lista.isLoading && itens.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-gray-500">Nenhuma nota neste período.</td></tr>}
              {itens.map((n) => {
                const sit = situacaoDe(n);
                return (
                  <tr key={n.id} className="cursor-pointer border-b hover:bg-gray-50" onClick={() => setDetalheId(n.id)}>
                    <td className="whitespace-nowrap px-3 py-3">{dataBR(n.dataEmissao)}</td>
                    <td className="px-3 py-3"><span className="block">{n.emitenteNome ?? "-"}</span><span className="text-xs text-gray-400">{cnpjFmt(n.emitenteCnpj)}</span></td>
                    <td className="whitespace-nowrap px-3 py-3">{n.serie ?? "-"} - {n.numero ?? "-"}</td>
                    <td className={`whitespace-nowrap px-3 py-3 text-right ${n.situacao !== "autorizada" ? "text-gray-400 line-through" : ""}`}>{moeda(n.valorTotal)}</td>
                    <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sit?.cls}`}>{sit?.l}</span></td>
                    <td className="whitespace-nowrap px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="gap-1" onClick={() => baixarXml(n.id)}><FileCode2 className="h-4 w-4" /> XML</Button>
                      <Button variant="ghost" size="sm" className="gap-1" disabled={n.tipo !== "completa" || gerandoPdf === n.id} onClick={() => baixarPdf(n.id)}>
                        {gerandoPdf === n.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} PDF
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Cartões (celular) */}
        <ul className="space-y-2 md:hidden">
          {lista.isLoading && <li className="py-6 text-center text-sm text-gray-500">Carregando...</li>}
          {!lista.isLoading && itens.length === 0 && <li className="py-6 text-center text-sm text-gray-500">Nenhuma nota neste período.</li>}
          {itens.map((n) => {
            const sit = situacaoDe(n);
            return (
              <li key={n.id} className="rounded-xl border p-3" onClick={() => setDetalheId(n.id)}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{n.emitenteNome ?? "-"}</p>
                  <p className={`whitespace-nowrap text-sm font-semibold ${n.situacao !== "autorizada" ? "text-gray-400 line-through" : ""}`}>R$ {moeda(n.valorTotal)}</p>
                </div>
                <p className="text-xs text-gray-500">{dataBR(n.dataEmissao)} · Série {n.serie} - NF {n.numero}</p>
                <div className="mt-2 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sit?.cls}`}>{sit?.l}</span>
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={() => baixarXml(n.id)}>XML</Button>
                    <Button variant="outline" size="sm" disabled={n.tipo !== "completa" || gerandoPdf === n.id} onClick={() => baixarPdf(n.id)}>PDF</Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Paginação */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-sm">
          <div className="flex items-center gap-2">
            <select className="h-9 rounded-md border px-2" value={porPagina} onChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(1); }}>
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs text-gray-500">Registros por página</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
              <span className="px-2 text-xs text-gray-600">{pagina} / {paginas}</span>
              <Button variant="outline" size="sm" disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Próximo <ChevronRight className="h-4 w-4" /></Button>
            </div>
            <span className="text-xs text-gray-500">
              Mostrando {total ? (pagina - 1) * porPagina + 1 : 0} - {Math.min(pagina * porPagina, total)} de {total} registros · Total R$ {moeda(lista.data?.valorTotal ?? 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Detalhe da nota */}
      <Dialog open={!!detalheId} onOpenChange={(v) => !v && setDetalheId(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader><DialogTitle>NF-e {detalhe.data?.nota.numero ?? ""} · {detalhe.data?.nota.emitenteNome ?? ""}</DialogTitle></DialogHeader>
          {detalhe.isLoading && <p className="text-sm text-gray-500">Carregando...</p>}
          {detalhe.data && (() => {
            const n = detalhe.data.nota, d = detalhe.data.detalhe;
            const sit = situacaoDe(n);
            return (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  <div><p className="text-xs text-gray-500">Emissão</p><p>{dataHoraBR(n.dataEmissao)}</p></div>
                  <div><p className="text-xs text-gray-500">Série / número</p><p>{n.serie} / {n.numero}</p></div>
                  <div><p className="text-xs text-gray-500">Valor</p><p className="font-semibold">R$ {moeda(n.valorTotal)}</p></div>
                  <div><p className="text-xs text-gray-500">Fornecedor</p><p>{n.emitenteNome}</p><p className="text-xs text-gray-500">{cnpjFmt(n.emitenteCnpj)} · IE {n.emitenteIe ?? "-"}</p></div>
                  <div><p className="text-xs text-gray-500">Natureza da operação</p><p>{n.natureza ?? "-"}</p></div>
                  <div><p className="text-xs text-gray-500">Situação</p><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sit?.cls}`}>{sit?.l}</span></div>
                </div>
                <div><p className="text-xs text-gray-500">Chave de acesso</p><p className="break-all font-mono text-xs">{n.chave.replace(/(\d{4})(?=\d)/g, "$1 ")}</p></div>
                <p className="text-xs text-gray-500">
                  Recebida em {dataHoraBR(n.recebidaEm)} ({n.origem === "sefaz" ? "SEFAZ" : n.origem === "chave" ? "busca pela chave" : "XML importado"})
                  {n.manifestacao === "ciencia" && <> · Ciência da Operação enviada em {dataHoraBR(n.manifestacaoEm)}</>}
                  {n.manifestacao === "erro" && <span className="text-red-700"> · Erro na Ciência da Operação: {n.manifestacaoMsg}</span>}
                </p>
                {!d && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Só o resumo da nota chegou até agora. Os itens, o XML completo e o PDF ficam disponíveis depois da Ciência da Operação, na próxima busca.</p>}
                {d && (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead><tr className="bg-gray-50 text-left text-gray-600"><th className="px-2 py-1.5">Produto</th><th className="px-2 py-1.5">NCM</th><th className="px-2 py-1.5 text-right">Qtd</th><th className="px-2 py-1.5">Un</th><th className="px-2 py-1.5 text-right">V. unit.</th><th className="px-2 py-1.5 text-right">Total</th></tr></thead>
                        <tbody>
                          {d.itens.map((i) => (
                            <tr key={i.item} className="border-b">
                              <td className="px-2 py-1.5">{i.descricao}<span className="block text-gray-400">{i.codigo} · CFOP {i.cfop}</span></td>
                              <td className="px-2 py-1.5">{i.ncm}</td>
                              <td className="px-2 py-1.5 text-right">{i.quantidade.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}</td>
                              <td className="px-2 py-1.5">{i.unidade}</td>
                              <td className="px-2 py-1.5 text-right">{i.valorUnitario.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</td>
                              <td className="px-2 py-1.5 text-right">{moeda(i.valorTotal)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs md:grid-cols-4">
                      <span>Produtos: <b>{moeda(d.totais.produtos)}</b></span><span>Frete: {moeda(d.totais.frete)}</span>
                      <span>Desconto: {moeda(d.totais.desconto)}</span><span>Outros: {moeda(d.totais.outros)}</span>
                      <span>ICMS: {moeda(d.totais.icms)}</span><span>ICMS ST: {moeda(d.totais.icmsSt)}</span>
                      <span>IPI: {moeda(d.totais.ipi)}</span><span>Total da nota: <b>{moeda(d.totais.nota)}</b></span>
                    </div>
                    {d.duplicatas.length > 0 && (
                      <div><p className="text-xs text-gray-500">Duplicatas</p>
                        <p className="text-xs">{d.duplicatas.map((x) => `${x.numero ?? ""} venc. ${dataBR(x.vencimento)} R$ ${moeda(x.valor)}`).join(" · ")}</p></div>
                    )}
                    {d.informacoes && <div><p className="text-xs text-gray-500">Informações complementares</p><p className="whitespace-pre-wrap text-xs">{d.informacoes}</p></div>}
                  </>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="gap-1" onClick={() => baixarXml(n.id)}><FileCode2 className="h-4 w-4" /> Baixar XML</Button>
                  <Button variant="outline" className="gap-1" disabled={n.tipo !== "completa" || gerandoPdf === n.id} onClick={() => baixarPdf(n.id)}><FileText className="h-4 w-4" /> Baixar PDF (DANFE)</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Resultado da importação */}
      <Dialog open={!!resultadoImport} onOpenChange={(v) => !v && setResultadoImport(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>Importação concluída</DialogTitle></DialogHeader>
          {resultadoImport && (
            <div className="space-y-3 text-sm">
              <ul className="space-y-1">
                <li><b>{resultadoImport.novas}</b> nota(s) nova(s)</li>
                <li><b>{resultadoImport.atualizadas}</b> já estavam no sistema (atualizadas)</li>
                {resultadoImport.canceladas > 0 && <li><b>{resultadoImport.canceladas}</b> marcada(s) como cancelada(s)</li>}
                {resultadoImport.emitidas > 0 && <li className="text-gray-500"><b>{resultadoImport.emitidas}</b> nota(s) emitida(s) pela empresa (vendas) puladas: este módulo é só de compras</li>}
                <li><b>{resultadoImport.ignoradas.length}</b> arquivo(s) ignorado(s)</li>
              </ul>
              {resultadoImport.ignoradas.length > 0 && (
                <ul className="max-h-60 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-2 text-xs">
                  {resultadoImport.ignoradas.map((x, i) => <li key={i}><span className="font-medium">{x.arquivo}</span>: {x.motivo}</li>)}
                </ul>
              )}
              <Button className="w-full" onClick={() => setResultadoImport(null)}>OK</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Buscar pela chave */}
      <Dialog open={chaveAberta} onOpenChange={setChaveAberta}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Buscar nota pela chave de acesso</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600">Digite os 44 números da chave (estão no DANFE, abaixo do código de barras). Serve para notas que não vieram na busca automática.</p>
          <Input value={chave} onChange={(e) => setChave(e.target.value.replace(/[^\d ]/g, ""))} placeholder="0000 0000 0000 ..." inputMode="numeric" className="font-mono" />
          <p className="text-xs text-gray-500">{chave.replace(/\D/g, "").length}/44 dígitos</p>
          <Button disabled={chave.replace(/\D/g, "").length !== 44 || porChave.isPending} onClick={() => porChave.mutate({ chave })}>
            {porChave.isPending ? "Consultando a SEFAZ..." : "Buscar"}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Últimas consultas */}
      <Dialog open={logAberto} onOpenChange={setLogAberto}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader><DialogTitle>Últimas consultas à SEFAZ</DialogTitle></DialogHeader>
          <ul className="space-y-1 text-xs">
            {(log.data ?? []).map((l, i) => (
              <li key={i} className="rounded border p-2">
                <span className="font-medium">{dataHoraBR(l.em)}</span> · {l.tipo} · {l.cstat ? `${l.cstat} - ` : ""}{l.motivo}
                {l.documentos ? ` · ${l.documentos} doc(s)` : ""}{l.detalhe ? <span className="block text-gray-500">{l.detalhe}</span> : null}
              </li>
            ))}
            {log.data && log.data.length === 0 && <li className="text-gray-500">Nenhuma consulta registrada.</li>}
          </ul>
        </DialogContent>
      </Dialog>
    </div>
  );
}
