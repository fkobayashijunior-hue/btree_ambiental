/**
 * Upload helper — usa o S3 do Manus (storagePut) para armazenar imagens.
 * Mantém a mesma interface do cloudinaryUpload para compatibilidade.
 * 
 * Migrado do Cloudinary para S3 do Manus pois o Cloudinary requer
 * configuração de preset no painel externo.
 */

import { storagePut } from "./storage";

/**
 * Faz upload de uma imagem (Buffer ou base64 string) para o S3 do Manus.
 * Retorna a URL pública da imagem.
 */
export async function cloudinaryUpload(
  data: Buffer | string,
  folder = "btree"
): Promise<{ url: string; publicId: string }> {
  // Converter base64 para Buffer se necessário
  let buffer: Buffer;
  let contentType = "image/jpeg";

  if (Buffer.isBuffer(data)) {
    buffer = data;
  } else {
    // Extrair content type do prefixo data: se presente
    if (data.startsWith("data:")) {
      const match = data.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        buffer = Buffer.from(match[2], "base64");
      } else {
        buffer = Buffer.from(data.replace(/^data:[^;]+;base64,/, ""), "base64");
      }
    } else {
      // Já é base64 puro
      buffer = Buffer.from(data, "base64");
    }
  }

  // Gerar chave única para o arquivo
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = contentType.includes("pdf") ? "pdf" : contentType.includes("png") ? "png" : "jpg";
  const key = `${folder}/${timestamp}-${random}.${ext}`;

  const { url } = await storagePut(key, buffer, contentType);

  return {
    url,
    publicId: key,
  };
}
