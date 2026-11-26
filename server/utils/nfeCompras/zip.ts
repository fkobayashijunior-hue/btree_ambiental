// ZIP simples (sem dependência): cada arquivo compactado com deflate, no formato ZIP padrão.
import zlib from "zlib";

const TABELA = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
export function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABELA[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

export function criarZip(arquivos: { nome: string; conteudo: string | Buffer }[]): Buffer {
  const partes: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  const agora = new Date();
  const dosHora = ((agora.getHours() << 11) | (agora.getMinutes() << 5) | Math.floor(agora.getSeconds() / 2)) & 0xffff;
  const dosData = (((agora.getFullYear() - 1980) << 9) | ((agora.getMonth() + 1) << 5) | agora.getDate()) & 0xffff;
  for (const a of arquivos) {
    const dados = Buffer.isBuffer(a.conteudo) ? a.conteudo : Buffer.from(a.conteudo, "utf8");
    const comp = zlib.deflateRawSync(dados);
    const nome = Buffer.from(a.nome, "utf8");
    const crc = crc32(dados);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); local.writeUInt16LE(8, 8);
    local.writeUInt16LE(dosHora, 10); local.writeUInt16LE(dosData, 12); local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(dados.length, 22); local.writeUInt16LE(nome.length, 26); local.writeUInt16LE(0, 28);
    partes.push(local, nome, comp);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(8, 10);
    cd.writeUInt16LE(dosHora, 12); cd.writeUInt16LE(dosData, 14); cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(dados.length, 24); cd.writeUInt16LE(nome.length, 28); cd.writeUInt32LE(offset, 42);
    central.push(cd, nome);
    offset += local.length + nome.length + comp.length;
  }
  const tamCentral = central.reduce((s, b) => s + b.length, 0);
  const fim = Buffer.alloc(22);
  fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(arquivos.length, 8); fim.writeUInt16LE(arquivos.length, 10);
  fim.writeUInt32LE(tamCentral, 12); fim.writeUInt32LE(offset, 16);
  return Buffer.concat([...partes, ...central, fim]);
}

/** Lê um ZIP (sem dependência) e devolve os arquivos. Suporta arquivos guardados (0) e compactados com deflate (8). */
export function lerZip(buf: Buffer): { nome: string; dados: Buffer }[] {
  let fim = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { fim = i; break; }
  }
  if (fim < 0) throw new Error("Arquivo ZIP inválido");
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const saida: { nome: string; dados: Buffer }[] = [];
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("ZIP corrompido (diretório central)");
    const metodo = buf.readUInt16LE(p + 10);
    const tamComp = buf.readUInt32LE(p + 20);
    const lenNome = buf.readUInt16LE(p + 28), lenExtra = buf.readUInt16LE(p + 30), lenCom = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const nome = buf.subarray(p + 46, p + 46 + lenNome).toString("utf8");
    p += 46 + lenNome + lenExtra + lenCom;
    if (nome.endsWith("/")) continue; // pasta
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error("ZIP corrompido (cabeçalho local)");
    const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const comp = buf.subarray(ini, ini + tamComp);
    if (metodo === 0) saida.push({ nome, dados: Buffer.from(comp) });
    else if (metodo === 8) saida.push({ nome, dados: zlib.inflateRawSync(comp) });
    // outros métodos (raros) são ignorados
  }
  return saida;
}
