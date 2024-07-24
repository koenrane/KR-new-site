import { visit } from "unist-util-visit"
import { followRedirects } from "./utils"
import { createLogger } from "./logger_utils"
import { Readable } from "stream"
import { pipeline } from "stream/promises"
import fs from "fs"
import path from "path"

const logger = createLogger("linkfavicons")

export const MAIL_PATH = "https://assets.turntrout.com/static/images/mail.svg"
export const TURNTROUT_FAVICON_PATH = "https://assets.turntrout.com/static/images/trout_favicon.png"
const QUARTZ_FOLDER = "quartz"
const FAVICON_FOLDER = "static/images/external-favicons"
export const DEFAULT_PATH = "https://assets.turntrout.com/static/images/default_favicon.png"

/**
 * Downloads an image from a specified URL and saves it to the given file path.
 * @param {string} url - The URL of the image to download.
 * @param {string} imagePath - The local file path where the image should be saved.
 * @returns {Promise<boolean>} A promise that resolves to true if the download is successful, false otherwise.
 */
export async function downloadImage(url: string, imagePath: string): Promise<boolean> {
  try {
    const response = await fetch(url)
    if (!response.ok || !response.body) return false
    const fileStream = fs.createWriteStream(imagePath)
    const bodyStream = Readable.from(response.body as unknown as AsyncIterable<Uint8Array>)

    await pipeline(bodyStream, fileStream)
    return true
  } catch (err) {
    logger.error(`Failed to download: ${url}\nEncountered ${err}`)
    // Not awaiting because we don't care about the result
    fs.promises.unlink(imagePath).catch(() => {})
    return false
  }
}

/**
 * Generates a standardized path for storing favicons based on the given hostname.
 * @param {string} hostname - The hostname for which to generate the favicon path.
 * @returns {string} The generated favicon path.
 */
export function GetQuartzPath(hostname: string): string {
  hostname = hostname === "localhost" ? "turntrout.com" : hostname.replace(/^www\./, "")
  const sanitizedHostname = hostname.replace(/\./g, "_")
  return sanitizedHostname.includes("turntrout_com")
    ? TURNTROUT_FAVICON_PATH
    : `/${FAVICON_FOLDER}/${sanitizedHostname}.png`
}

/**
 * Attempts to find or download a favicon for the given hostname.
 * @param {string} hostname - The hostname for which to find the favicon.
 * @returns {Promise<string>} A promise that resolves to the path of the favicon.
 */
export async function MaybeSaveFavicon(hostname: string): Promise<string> {
  const quartzPngPath = GetQuartzPath(hostname)
  if (quartzPngPath === TURNTROUT_FAVICON_PATH) return TURNTROUT_FAVICON_PATH

  const localPngPath = path.join(QUARTZ_FOLDER, quartzPngPath)
  const assetAvifURL = `https://assets.turntrout.com${quartzPngPath.replace(".png", ".avif")}`

  try {
    const avifResponse = await fetch(assetAvifURL, { method: "HEAD" })
    if (avifResponse.ok) return assetAvifURL
  } catch (err) {
    logger.info(`Error checking AVIF on assets.turntrout.com: ${err}`)
  }

  // Check if the PNG already exists locally (before upload to R2)
  try {
    await fs.promises.stat(localPngPath)
    return quartzPngPath
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const googleFaviconURL = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`
      if (await downloadImage(googleFaviconURL, localPngPath)) {
        return quartzPngPath
      }
    }
  }

  // If all else fails, return the default favicon TODO reconsider
  return DEFAULT_PATH
}

/**
 * Creates an image element (<img>) representing a favicon.
 * @param {string} urlString - The URL of the favicon image.
 * @param {string} [description='Favicon'] - An optional description for the favicon.
 * @returns {Object} An object representing the favicon image element.
 */
export function CreateFaviconElement(urlString: string, description = "Favicon"): FaviconNode {
  return {
    type: "element",
    tagName: "img",
    properties: {
      src: urlString,
      class: "favicon",
      alt: description,
    },
  }
}

/**
 * Inserts a favicon image element into a given HTML element node.
 * @param {string | null} imgPath - The path to the favicon image.
 * @param {Object} node - The HTML element node where the favicon should be inserted.
 */
export function insertFavicon(imgPath: string | null, node: any): void {
  if (imgPath === null) return

  const imgElement = CreateFaviconElement(imgPath)
  const lastChild = node.children[node.children.length - 1]

  if (lastChild && lastChild.type === "text" && lastChild.value) {
    const textContent = lastChild.value
    const charsToRead = Math.min(4, textContent.length)
    const lastFourChars = textContent.slice(-charsToRead)
    lastChild.value = textContent.slice(0, -charsToRead)

    const span = {
      type: "element",
      tagName: "span",
      children: [{ type: "text", value: lastFourChars }, imgElement],
      properties: {
        style: "white-space: nowrap;",
      },
    }
    node.children.push(span)
  } else {
    node.children.push(imgElement)
  }
}

/**
 * Modifies HTML link (<a>) elements, potentially adding favicons and performing additional cleanup and URL processing.
 * @param {Object} node - The HTML element node (expected to be an <a> tag) to modify.
 * @effects Modifies the node in place.
 */
export async function ModifyNode(node: any): Promise<void> {
  if (node.tagName !== "a" || !node.properties.href) return

  let href = node.properties.href

  if (href.startsWith("mailto:")) {
    insertFavicon(MAIL_PATH, node)
    return
  }

  const isInternalBody = href.startsWith("#")
  if (isInternalBody) {
    node.properties.className = [...(node.properties.className || []), "same-page-link"]
    return
  }

  const samePage = node.properties.className?.includes("same-page-link")
  const isAsset = /\.(png|jpg|jpeg)$/.test(href)

  if (!samePage && !isAsset) {
      if (href.startsWith("./")) {
          // Relative link
          href = href.slice(2)
          href = "https://www.turntrout.com/" + href
        } else if (href.startsWith("..")) {
          return
        }
    try {
      const finalURL = await followRedirects(new URL(href))
      const imgPath = await MaybeSaveFavicon(finalURL.hostname)
      insertFavicon(imgPath, node)
    } catch (error) {
      logger.error(`Error processing URL ${href}: ${error}`)
    }
    console.log(node.children)
  }
}

export interface FaviconNode {
  type: string
  tagName: string
  properties: {
    src: string
    class: string
    alt: string
  }
}

/**
 * Creates a Rehype plugin that adds favicons to anchor elements in HTML documents.
 * @returns {Object} A Rehype plugin object.
 */
export const AddFavicons = () => {

  return {
    name: "AddFavicons",
    htmlPlugins() {
      return [
        () => {
          return async (tree: any) => {
            logger.info("Processing favicons...")
            const nodesToProcess: any[] = []

            visit(tree, "element", (node: any) => {
              if (node.tagName === "a" && node.properties.href) {
                nodesToProcess.push(node)
              }
            })
        
            await Promise.all(nodesToProcess.map(ModifyNode)) // TODO will reject on any
            return tree
          }
        },
      ]
    },
  }
}
