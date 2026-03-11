/**
 * Upload de arquivos para o Cloudinary usando upload preset unsigned.
 * Cloud Name: djob7pxme
 * Upload Preset: btree_ambiental (unsigned, public, auto resource type)
 *
 * NOTA: O parâmetro `folder` foi removido pois o Cloudinary rejeita
 * nomes de pasta com barras ("Display name cannot contain slashes").
 */

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "djob7pxme";
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "btree_ambiental";

/**
 * Faz upload de uma imagem (Buffer ou base64 string) para o Cloudinary.
 * Retorna URL pública e publicId.
 */
export async function cloudinaryUpload(
  data: Buffer | string,
  _folder = "btree" // aceito por compatibilidade, mas não enviado ao Cloudinary
): Promise<{ url: string; publicId: string }> {
  let base64: string;
  let contentType = "image/jpeg";

  if (Buffer.isBuffer(data)) {
    base64 = data.toString("base64");
    contentType = "image/jpeg";
  } else if (data.startsWith("data:")) {
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      contentType = match[1];
      base64 = match[2];
    } else {
      base64 = data.replace(/^data:[^;]+;base64,/, "");
    }
  } else {
    base64 = data;
  }

  const dataUri = `data:${contentType};base64,${base64}`;

  const params = new URLSearchParams();
  params.append("file", dataUri);
  params.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  // NÃO enviar o parâmetro "folder" — causa erro "Display name cannot contain slashes"

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudinary upload failed: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as { secure_url: string; public_id: string };
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}
