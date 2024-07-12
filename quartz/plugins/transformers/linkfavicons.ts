import { visit } from "unist-util-visit"
import path from "path"
import { findGitRoot } from "./utils"
import fs from "fs"
import winston from "winston"
import DailyRotateFile from "winston-daily-rotate-file"

const gitRoot = findGitRoot()
const logDir = path.join(gitRoot, ".logs")
//
// Create the log directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true }) // 'recursive: true' creates parent folders if needed
}

winston.transports.DailyRotateFile = DailyRotateFile
const logger = winston.createLogger({
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
})

const MAIL_PATH = "https://assets.turntrout.com/static/images/mail.svg"
const QUARTZ_FOLDER = "quartz"
const FAVICON_FOLDER = "static/images/external-favicons"

async function downloadImage(url: string, image_path: string): Promise<boolean> {
  try {
    const file = await fs.open(image_path, "wx")

    return new Promise((resolve) => {
      get(url, (response) => {
        if (response.statusCode !== 200) {
          logger.info(`Failed to download: ${url} (Status ${response.statusCode})`)
          resolve(false)
          return
        }

        response.pipe(file)
        file.on("finish", () => {
          file.close()
          resolve(true)
        })
      }).on("error", (err) => {
        logger.info(`Failed to download ${url}`)
        fs.unlink(image_path) // Cleanup
        resolve(false)
      })
    })
  } catch (err) {
    return false
  }
}

export function GetQuartzPath(hostname: string): string {
  if (hostname === "localhost") {
    hostname = "www.turntrout.com"
  }

  const sanitizedHostname = hostname.replace(/\./g, "_")
  return `/${FAVICON_FOLDER}/${sanitizedHostname}.png`
}

async function MaybeSaveFavicon(hostname: string): Promise<string | null> {
  const quartzPath = GetQuartzPath(hostname)
  const localPath = path.join(QUARTZ_FOLDER, quartzPath)

  try {
    await fs.promises.stat(localPath) // Use fs.promises for Promise-based stat
    return quartzPath // Favicon already exists
  } catch (err) {
    if (err.code === "ENOENT") {
      // File doesn't exist
      const googleFaviconURL = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`
      if (await downloadImage(googleFaviconURL, localPath)) {
        return quartzPath
      }
    }

    logger.info(`No favicon found for ${hostname}`)
    return null // Indicate failure
  }
}

export const CreateFaviconElement = (urlString: string, description = "") => {
  return {
    type: "element",
    tagName: "img",
    children: [],
    properties: {
      src: urlString,
      class: "favicon",
    },
    alt: description,
  }
}

export const AddFavicons = () => {
  return {
    name: "AddFavicons",
    htmlPlugins() {
      return [
        () => {
          return (tree) => {
            visit(tree, "element", (node) => {
              if (node.tagName === "a") {
                const linkNode = node
                // Remove the "external-icon" elements, hidden anyways
                if (linkNode?.children && linkNode.children.length > 0) {
                  linkNode.children = linkNode.children.filter(
                    (child) => child.properties?.class !== "external-icon",
                  )
                }

                let href = linkNode?.properties?.href
                const isInternalBody = href?.startsWith("#")
                if (isInternalBody) {
                  linkNode.properties.className.push("same-page-link")
                }

                const notSamePage = !linkNode?.properties?.className?.includes("same-page-link")
                const isImage =
                  href?.endsWith(".png") || href?.endsWith(".jpg") || href?.endsWith(".jpeg")
                if (notSamePage && !isImage && href) {
                  // Handle before attempting to create URL
                  if (href.startsWith("./")) {
                    // Relative link
                    href = href.slice(2)
                    href = "https://www.turntrout.com/" + href
                  } else if (href.startsWith("..")) {
                    return
                  }

                  const url = new URL(href)
                  MaybeSaveFavicon(url.hostname).then((imgPath) => {
                    let path = imgPath
                    if (href.startsWith("mailto:")) {
                      path = MAIL_PATH
                    }
                    insertFavicon(path, linkNode, url)
                  })
                }
              }
            })
          }
        },
      ]
    },
  }
}

function insertFavicon(imgPath: any, node: any, _url: URL) {
  if (imgPath !== null) {
    const imgElement = CreateFaviconElement(imgPath)

    let toPush = imgElement

    const lastChild = node.children[node.children.length - 1]
    if (lastChild && lastChild.type === "text" && lastChild.value) {
      const textContent = lastChild.value
      const charsToRead = Math.min(4, textContent.length)
      const lastFourChars = textContent.slice(-1 * charsToRead)
      lastChild.value = textContent.slice(0, -4)

      // Create a new span
      toPush = {
        type: "element",
        tagName: "span",
        children: [
          { type: "text", value: lastFourChars },
          imgElement, // Append the previously created image
        ],
        properties: {
          style: "white-space: nowrap;",
        },
      }
    }
    node.children.push(toPush)
  }
}
