import { v2 as cloudinary } from "cloudinary"

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadBuffer(
  buffer: Buffer,
  options: { folder?: string; public_id?: string } = {}
): Promise<string> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: options.folder ?? "prova-app/questoes",
          public_id: options.public_id,
          resource_type: "image",
        },
        (error, result) => {
          if (error || !result) return reject(error ?? new Error("Upload falhou"))
          resolve(result.secure_url)
        }
      )
      .end(buffer)
  })
}

export async function uploadFromUrl(url: string, folder?: string): Promise<string> {
  const result = await cloudinary.uploader.upload(url, {
    folder: folder ?? "prova-app/questoes",
    resource_type: "image",
  })
  return result.secure_url
}

export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}
