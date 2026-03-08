/**
 * Upload de arquivos para o Cloudinary usando upload preset unsigned.
 * Cloud Name: djob7pxme
 * Upload Preset: azaconnect (unsigned, public, auto resource type)
 */

const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || "djob7pxme";
const CLOUDINARY_UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET || "azaconnect";

/**
 * Faz upload de uma imagem (Buffer ou base64 string) para o Cloudinary.
 * Retorna URL pública e publicId.
 */
export async function cloudinaryUpload(
  data: Buffer | string,
  folder = "btree"
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
  params.append("folder", folder);

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
