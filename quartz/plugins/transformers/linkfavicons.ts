import { visit } from "unist-util-visit"
import path from "path"
import { findGitRoot } from "./utils"
import fs from "fs"
import winston from "winston"
import { format } from "winston"
import DailyRotateFile from "winston-daily-rotate-file"

const gitRoot = findGitRoot()

if (!gitRoot) {
  throw new Error("Git root not found.")
}
const logDir = path.join(gitRoot, ".logs")

// Create the log directory if it doesn't exist
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true }) // 'recursive: true' creates parent folders if needed
}

const timezoned = () => {
  return new Date().toLocaleString("en-US", {
    timeZone: "America/Los_Angeles", // Use the correct IANA time zone name
    timeZoneName: "short", // Include the time zone abbreviation
  })
}
winston.transports.DailyRotateFile = DailyRotateFile
const logger = winston.createLogger({
  format: format.combine(format.timestamp({ format: timezoned }), format.prettyPrint()),

  transports: [
    new winston.transports.DailyRotateFile({
      filename: path.join(logDir, "faviconErrors.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
})

export const MAIL_PATH = "https://assets.turntrout.com/static/images/mail.svg"
const QUARTZ_FOLDER = "quartz"
const FAVICON_FOLDER = "static/images/external-favicons"
import { pipeline } from "stream/promises" // For streamlined stream handling

export async function downloadImage(
  url: string,
  imagePath: string,
  maxRedirects = 5,
  currentRedirect = 0,
): Promise<boolean> {
  try {
    const response = await fetch(url)

    if (response.status >= 300 && response.status < 400 && currentRedirect < maxRedirects) {
      const newUrl = response.headers.get("location")
      if (newUrl) {
        return downloadImage(newUrl, imagePath, maxRedirects, currentRedirect + 1)
      } else {
        logger.info(`Redirect found but no location header for ${url}`)
        return false
      }
    }

    if (!response.ok) {
      logger.info(`Failed to download: ${url} (Status ${response.status})`)
      return false
    }

    const fileStream = fs.createWriteStream(imagePath)
    await pipeline(response.body as any, fileStream)

    return true
  } catch (err) {
    logger.info(`Failed to download: ${url}\nEncountered ${err}`)
    fs.unlink(imagePath, () => {}) // Attempt to clean up (ignore errors)
    return false
  }
}

export function GetQuartzPath(hostname: string): string {
  if (hostname === "localhost") {
    hostname = "turntrout.com"
  }

  if (hostname.startsWith("www.")) {
    hostname = hostname.slice(4)
  }
  const sanitizedHostname = hostname.replace(/\./g, "_")
  return `/${FAVICON_FOLDER}/${sanitizedHostname}.png`
}

export async function MaybeSaveFavicon(hostname: string): Promise<string | null> {
  const quartzPath = GetQuartzPath(hostname)
  const localPath = path.join(QUARTZ_FOLDER, quartzPath)

  try {
    await fs.promises.stat(localPath) // Use fs.promises for Promise-based stat
    return quartzPath // Favicon already exists
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
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

export const ModifyNode = (node: any) => {
  if (node.tagName === "a") {
    // Remove the "external-icon" elements, hidden anyways
    if (node?.children && node.children.length > 0) {
      node.children = node.children.filter(
        (child: any) => child.properties?.class !== "external-icon",
      )
    }

    let href = node?.properties?.href
    if (href?.startsWith("mailto:")) {
      insertFavicon(MAIL_PATH, node)
      return
    }

    const isInternalBody = href?.startsWith("#")
    if (isInternalBody) {
      node.properties.className.push("same-page-link")
    }

    const notSamePage = !node?.properties?.className?.includes("same-page-link")
    const isAsset = href?.endsWith(".png") || href?.endsWith(".jpg") || href?.endsWith(".jpeg")
    // href?.startsWith("assets.turntrout.com")
    if (notSamePage && !isAsset && href) {
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
        if (imgPath?.includes("mail")) {
        }
        insertFavicon(path, node) // node looks fine, so does path
      })
    }
  }
}

export function insertFavicon(imgPath: any, node: any) {
  if (imgPath !== null) {
    const imgElement = CreateFaviconElement(imgPath)

    const lastChild = node.children[node.children.length - 1]
    if (lastChild && lastChild.type === "text" && lastChild.value) {
      const textContent = lastChild.value
      const charsToRead = Math.min(4, textContent.length)
      const lastFourChars = textContent.slice(-1 * charsToRead)
      lastChild.value = textContent.slice(0, -4)

      // Create a new span
      const span = {
        type: "element",
        tagName: "span",
        children: [
          { type: "text", value: lastFourChars },
          imgElement, // Assuming imgElement is correctly typed
        ],
        properties: {
          style: "white-space: nowrap;",
        },
      }
      node.children.push(span)
    } else {
      node.children.push(imgElement)
    }
  }
}

export const AddFavicons = () => {
  return {
    name: "AddFavicons",
    htmlPlugins() {
      return [
        () => {
          return (tree: any) => {
            visit(tree, "element", (node) => {
              ModifyNode(node)
            })
          }
        },
      ]
    },
  }
}
