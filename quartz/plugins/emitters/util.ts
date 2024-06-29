import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { glob } from "../../util/glob"
import dotenv from "dotenv"
import { FilePath, joinSegments, QUARTZ } from "../../util/path"
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

export async function uploadPathToR2(client, dir: string, fp: string) {
  const src = joinSegments(QUARTZ, dir, fp) as FilePath
  const key = path.join(dir, fp)
  const fileContent = await fs.promises.readFile(src)
  const ext = path.extname(src).toLowerCase()

  await client.send(
    new PutObjectCommand({
      Bucket: r2BucketName,
      Key: key,
      Body: fileContent,
      ContentType: `image/${ext.slice(1)}`,
    }),
  )
  console.log(`Uploaded ${key} to R2`)

  // Update references in Markdown/HTML files
  /* dir: quartz/static/images
   * fp: images/kofi-cover.avif
   * r2Url: https://assets.turntrout.com/images/kofi-cover.avif
   */
  console.log(`key: ${key}`)
  const r2Url = `${r2BaseUrl}/${key}`
  await updateReferences(dir, key, r2Url)
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
  console.log(`Updating references from ${localPath} to ${r2Url}`)

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
