import { FilePath, joinSegments, slugifyFilePath } from "../../util/path"
import { replaceInFile } from "replace-in-file"
import dotenv from "dotenv"
import DepGraph from "../../depgraph"

import { QuartzEmitterPlugin } from "../types"
import { QuartzConfig } from "../../cfg"
import path from "path"
import fs from "fs"
import { glob } from "../../util/glob"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { Argv } from "../../util/ctx"

const filesToCopy = async (argv: Argv, cfg: QuartzConfig) => {
  // glob all non MD files in content folder and copy it over
  return await glob("**", argv.directory, [
    "**/*.md",
    "**/*.md~",
    ...cfg.configuration.ignorePatterns,
  ])
}
const endpoint = `https://${process.env.S3_ENDPOINT_ID_TURNTROUT_MEDIA}.r2.cloudflarestorage.com`

dotenv.config()
const r2Client = new S3Client({
  region: "auto",
  endpoint: endpoint,
  credentials: {
    accessKeyId: process.env.ACCESS_KEY_ID_TURNTROUT_MEDIA!,
    secretAccessKey: process.env.SECRET_ACCESS_TURNTROUT_MEDIA!,
  },
})

const r2BucketName = "turntrout"
const r2BaseUrl = "https://assets.turntrout.com"
const imageFileTypes = [".png", ".jpg", ".avif", ".jpeg", ".gif", ".svg", ".webp"]

// export function uploadPathToR2(src: string, fp: string) {
//           const fileContent = await fs.promises.readFile(src)
//           const r2Key = fp
//
//           await r2Client.send(
//             new PutObjectCommand({
//               Bucket: r2BucketName,
//               Key: r2Key,
//               Body: fileContent,
//               ContentType: `image/${ext.slice(1)}`,
//             }),
//           )
//           console.log(`Uploaded ${r2Key} to R2`)
//
//           // Update references in Markdown/HTML files
//           const r2Url = `${r2BaseUrl}/${r2Key}`
//           await updateReferences(argv.directory, fp, r2Url)
//           await fs.promises.rm(src)
// }
//

export const Assets: QuartzEmitterPlugin = () => {
  return {
    name: "Assets",
    getQuartzComponents() {
      return []
    },
    async getDependencyGraph(ctx, _content, _resources) {
      const { argv, cfg } = ctx
      const graph = new DepGraph<FilePath>()
      const fps = await filesToCopy(argv, cfg)
      for (const fp of fps) {
        const ext = path.extname(fp)
        const src = joinSegments(argv.directory, fp) as FilePath
        const name = (slugifyFilePath(fp as FilePath, true) + ext) as FilePath
        const dest = joinSegments(argv.output, name) as FilePath
        graph.addEdge(src, dest)
      }
      return graph
    },
    async emit({ argv, cfg }, _content, _resources): Promise<FilePath[]> {
      const assetsPath = argv.output
      const fps = await filesToCopy(argv, cfg)
      const res: FilePath[] = []
      console.log(fps)
      for (const fp of fps) {
        const ext = path.extname(fp).toLowerCase()
        const src = joinSegments(argv.directory, fp) as FilePath

        if (imageFileTypes.includes(ext)) {
          // Upload image to R2
          const fileContent = await fs.promises.readFile(src)
          const r2Key = fp

          await r2Client.send(
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
          await updateReferences(argv.directory, fp, r2Url)
          await fs.promises.rm(src)

          res.push(r2Url as FilePath)
        } else {
          // Handle non-image files as before
          const name = (slugifyFilePath(fp as FilePath, true) + ext) as FilePath
          const dest = joinSegments(assetsPath, name) as FilePath
          const dir = path.dirname(dest) as FilePath
          await fs.promises.mkdir(dir, { recursive: true })
          await fs.promises.copyFile(src, dest)
          res.push(dest)
        }
      }

      return res
    },
  }
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
