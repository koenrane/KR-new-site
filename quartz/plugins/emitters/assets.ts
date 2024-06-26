import { FilePath, joinSegments, slugifyFilePath } from "../../util/path"
import dotenv from "dotenv"

import { QuartzEmitterPlugin } from "../types"
import { QuartzConfig } from "../../cfg"
import path from "path"
import fs from "fs"
import { glob } from "../../util/glob"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { Argv } from "../../util/ctx"
import { exec } from "child_process"
import util from "util"

// Promisify exec for easier async/await usage
const execAsync = util.promisify(exec)

const filesToCopy = async (argv: Argv, cfg: QuartzConfig) => {
  // glob all non MD files in content folder and copy it over
  return await glob("**", argv.directory, ["**/*.md", ...cfg.configuration.ignorePatterns])
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
const r2BaseUrl = "https://turntrout.com"

export const Assets: QuartzEmitterPlugin = () => {
  return {
    name: "Assets",
    getQuartzComponents() {
      return []
    },
    async getDependencyGraph(ctx, _content, _resources) {
      // ... (existing code)
    },
    async emit({ argv, cfg }, _content, _resources): Promise<FilePath[]> {
      const assetsPath = argv.output
      const fps = await filesToCopy(argv, cfg)
      const res: FilePath[] = []
      for (const fp of fps) {
        const ext = path.extname(fp).toLowerCase()
        const src = joinSegments(argv.directory, fp) as FilePath

        if ([".png", ".jpg", ".avif", ".jpeg", ".gif", ".svg", ".webp"].includes(ext)) {
          // Upload image to R2
          const fileContent = await fs.promises.readFile(src)
          const r2Key = `assets/${fp}`
          const newCommand = new PutObjectCommand({
            Bucket: r2BucketName,
            Key: r2Key,
            Body: fileContent,
            ContentType: `image/${ext.slice(1)}`,
          })

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

async function updateReferences(directory: string, localPath: string, r2Url: string) {
  const files = await glob("**/*.md", directory)
  const relativePath = path.relative(path.dirname(directory), localPath).replace(/\\/g, "/")
  // Escape the filenames and prepare them for the shell command
  const escapedFiles = files.map((file) => `'${directory}/${file.replace(/'/g, "'\\''")}'`)
  const base = path.basename(localPath)
  for (const file of escapedFiles) {
    const sedCommand = `sed -i '' -E 's|([\"\(]).*${base}([\"\\)])|\\1${r2Url}\\2|g' ${file}`
    console.log(`Executing: ${sedCommand}`)

    try {
      await execAsync(sedCommand)
    } catch (error) {
      console.error("Error updating references with sed:", error)
    }
  }
}
