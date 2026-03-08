/**
 * Cloudinary upload helper — usa a API de upload sem assinatura (unsigned)
 * Cloud name: djob7pxme
 * Upload preset: btree_ambiental (unsigned)
 */

const CLOUD_NAME = "djob7pxme";
const UPLOAD_PRESET = "btree_ambiental";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Faz upload de uma imagem (Buffer ou base64 string) para o Cloudinary.
 * Retorna a URL segura (https) da imagem.
 */
export async function cloudinaryUpload(
  data: Buffer | string,
  folder = "btree"
): Promise<{ url: string; publicId: string }> {
  // Converter Buffer para base64 se necessário
  let base64Data: string;
  if (Buffer.isBuffer(data)) {
    base64Data = `data:image/jpeg;base64,${data.toString("base64")}`;
  } else {
    // Já é base64 string (pode ter ou não o prefixo data:...)
    base64Data = data.startsWith("data:") ? data : `data:image/jpeg;base64,${data}`;
  }

  const formData = new FormData();
  formData.append("file", base64Data);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  return {
    url: result.secure_url as string,
    publicId: result.public_id as string,
  };
}
