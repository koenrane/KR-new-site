import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { glob } from "../../util/glob"
import dotenv from "dotenv"
import { FilePath, joinSegments } from "../../util/path"
import path from "path"
import fs from "fs"
import { replaceInFile } from "replace-in-file"

export const uploadFileTypes = [".png", ".jpg", ".avif", ".jpeg", ".gif", ".svg", ".webp"]

const r2BaseUrl = "https://assets.turntrout.com"
const r2BucketName = "turntrout"

export function getR2Client() {
  dotenv.config()
  const endpoint = `https://${process.env.S3_ENDPOINT_ID_TURNTROUT_MEDIA}.r2.cloudflarestorage.com`
  return new S3Client({
    region: "auto",
    endpoint: endpoint,
    credentials: {
      accessKeyId: process.env.ACCESS_KEY_ID_TURNTROUT_MEDIA!,
      secretAccessKey: process.env.SECRET_ACCESS_TURNTROUT_MEDIA!,
    },
  })
}

export async function uploadPathToR2(client, dir: string, r2Key: string) {
  const src = joinSegments(dir, r2Key) as FilePath
  const fileContent = await fs.promises.readFile(src)
  const ext = path.extname(src).toLowerCase()

  await client.send(
    new PutObjectCommand({
      Bucket: r2BucketName,
      Key: r2Key,
      Body: fileContent,
      ContentType: `image/${ext.slice(1)}`,
    }),
  )
  console.log(`Uploaded ${r2Key} to R2`)

  // Update references in Markdown/HTML files
  const r2Url = `${r2BaseUrl}/${r2Key}`
  await updateReferences(dir, r2Key, r2Url)
  await fs.promises.rm(src)

  return r2Url
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&")
}

export function getReferenceRegex(base: string): string {
  return `(["\(]).*?${escapeRegExp(base)}(["\)])`
}
export function getTargetRegex(r2Url: string): string {
  return `$1${r2Url}$2`
}

async function updateReferences(directory: string, localPath: string, r2Url: string) {
  const files = await glob("**/*.md", directory, [])
  const base = path.basename(localPath)

  const options = {
    files: files.map((file) => path.join(directory, file)),
    from: getReferenceRegex(base),
    to: getTargetRegex(r2Url),
  }

  try {
    await replaceInFile(options)
  } catch (error) {
    console.error("Error occurred:", error)
  }
}
