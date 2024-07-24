import { visit } from "unist-util-visit"
import { createLogger } from "./logger_utils"
import { Readable } from "stream"
import { pipeline } from "stream/promises"
import fs from "fs"
import path from "path"

const logger = createLogger("linkfavicons")

export const MAIL_PATH = "https://assets.turntrout.com/static/images/mail.svg"
export const TURNTROUT_FAVICON_PATH =
  "https://assets.turntrout.com/static/images/turntrout-favicons/favicon.ico"
const QUARTZ_FOLDER = "quartz"
const FAVICON_FOLDER = "static/images/external-favicons"
export const DEFAULT_PATH = ""

/**
 * Downloads an image from a given URL and saves it to the specified local path.
 *
 * @param url - The URL of the image to download.
 * @param imagePath - The local file path where the image should be saved.
 * @returns A Promise that resolves to true if the download was successful, false otherwise.
 */
export async function downloadImage(url: string, imagePath: string): Promise<boolean> {
  logger.info(`Attempting to download image from ${url} to ${imagePath}`)
  try {
    const response = await fetch(url)
    if (!response.ok || !response.body) {
      logger.warn(`Failed to fetch image: ${url}. Status: ${response.status}`)
      return false
    }
    const fileStream = fs.createWriteStream(imagePath)
    const bodyStream = Readable.from(response.body as unknown as AsyncIterable<Uint8Array>)

    await pipeline(bodyStream, fileStream)
    logger.info(`Successfully downloaded image to ${imagePath}`)
    return true
  } catch (err) {
    logger.error(`Failed to download: ${url}\nEncountered ${err}`)
    fs.promises.unlink(imagePath).catch((unlinkErr) => {
      logger.error(`Failed to delete incomplete download: ${unlinkErr}`)
    })
    return false
  }
}

/**
 * Generates a Quartz-compatible path for a given hostname.
 *
 * @param hostname - The hostname to generate the path for.
 * @returns A string representing the Quartz path for the favicon.
 */
export function GetQuartzPath(hostname: string): string {
  logger.debug(`Generating Quartz path for hostname: ${hostname}`)
  hostname = hostname === "localhost" ? "turntrout.com" : hostname.replace(/^www\./, "")
  const sanitizedHostname = hostname.replace(/\./g, "_")
  const path = sanitizedHostname.includes("turntrout_com")
    ? TURNTROUT_FAVICON_PATH
    : `/${FAVICON_FOLDER}/${sanitizedHostname}.png`
  logger.debug(`Generated Quartz path: ${path}`)
  return path
}

const defaultCache = new Map<string, string>([[TURNTROUT_FAVICON_PATH, TURNTROUT_FAVICON_PATH]])
export function createUrlCache(): Map<string, string> {
  return new Map(defaultCache)
}
export let urlCache = createUrlCache()

/**
 * Attempts to find or save a favicon for a given hostname.
 *
 * @param hostname - The hostname to find or save the favicon for.
 * @returns A Promise that resolves to the path of the favicon (local or remote).
 */
export async function MaybeSaveFavicon(hostname: string): Promise<string> {
  logger.info(`Attempting to find or save favicon for ${hostname}`)

  const quartzPngPath = GetQuartzPath(hostname)
  if (urlCache.has(quartzPngPath)) {
    logger.info(`Returning cached favicon for ${hostname}`)
    return urlCache.get(quartzPngPath) as string
  }

  const localPngPath = path.join(QUARTZ_FOLDER, quartzPngPath)
  const assetAvifURL = `https://assets.turntrout.com${quartzPngPath.replace(".png", ".avif")}`

  logger.debug(`Checking for AVIF at ${assetAvifURL}`)
  try {
    const avifResponse = await fetch(assetAvifURL, { method: "HEAD" })
    if (avifResponse.ok) {
      logger.info(`AVIF found for ${hostname}: ${assetAvifURL}`)
      urlCache.set(quartzPngPath, assetAvifURL)
      return assetAvifURL
    }
  } catch (err) {
    logger.info(`Error checking AVIF on assets.turntrout.com: ${err}`)
  }

  logger.debug(`Checking for local PNG at ${localPngPath}`)
  try {
    await fs.promises.stat(localPngPath)
    logger.info(`Local PNG found for ${hostname}: ${quartzPngPath}`)
    urlCache.set(quartzPngPath, quartzPngPath)
    return quartzPngPath
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const googleFaviconURL = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`
      logger.info(`Attempting to download favicon from Google: ${googleFaviconURL}`)
      if (await downloadImage(googleFaviconURL, localPngPath)) {
        logger.info(`Successfully downloaded favicon for ${hostname}`)
        urlCache.set(quartzPngPath, quartzPngPath)
        return quartzPngPath
      }
    }
  }

  logger.warn(`Failed to find or download favicon for ${hostname}, using default`)
  urlCache.set(quartzPngPath, DEFAULT_PATH)
  return DEFAULT_PATH
}

export interface FaviconNode {
  type: string
  tagName: string
  children: any[]
  properties: {
    src: string
    class: string
    alt: string
  }
}

/**
 * Creates a favicon element (img tag) with the given URL and description.
 *
 * @param urlString - The URL of the favicon image.
 * @param description - The alt text for the favicon (default: "", so
 * that favicons are treated as decoration by screen readers).
 * @returns An object representing the favicon element.
 */
export function CreateFaviconElement(urlString: string, description = ""): FaviconNode {
  logger.debug(`Creating favicon element with URL: ${urlString}`)
  return {
    type: "element",
    tagName: "img",
    children: [],
    properties: {
      src: urlString,
      class: "favicon",
      alt: description,
    },
  }
}

/**
 * Inserts a favicon image into a node's children.
 *
 * @param imgPath - The path to the favicon image.
 * @param node - The node to insert the favicon into.
 */
export function insertFavicon(imgPath: string | null, node: any): void {
  logger.debug(`Inserting favicon: ${imgPath}`)
  if (imgPath === null) {
    logger.debug("No favicon to insert")
    return
  }

  const imgElement = CreateFaviconElement(imgPath)
  const lastChild = node.children[node.children.length - 1]

  if (lastChild && lastChild.type === "text" && lastChild.value) {
    logger.debug(`Last child is text: "${lastChild.value}"`)
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
    // If the text content is the same as the last four characters,
    // replace the text with the span so we don't have an extra (empty) text node.
    if (lastFourChars === textContent && node.children.length === 1) {
      logger.debug("Replacing entire text with span")
      node.children = [span]
    } else {
      logger.debug("Appending span to existing text")
      node.children.push(span)
    }
  } else {
    logger.debug("Appending favicon directly to node")
    node.children.push(imgElement)
  }
}

/**
 * Modifies a node by processing its href and inserting a favicon if applicable.
 *
 * @param node - The node to modify.
 * @returns A Promise that resolves when the modification is complete.
 */
export async function ModifyNode(node: any): Promise<void> {
  logger.info(`Modifying node: ${node.tagName}`)
  if (node.tagName !== "a" || !node.properties.href) {
    logger.debug("Node is not an anchor or has no href, skipping")
    return
  }

  let href = node.properties.href
  logger.debug(`Processing href: ${href}`)

  if (href.startsWith("mailto:")) {
    logger.info("Inserting mail icon for mailto link")
    insertFavicon(MAIL_PATH, node)
    return
  }

  const isInternalBody = href.startsWith("#")
  if (isInternalBody) {
    logger.info("Adding same-page-link class to internal link")
    node.properties.className = [...(node.properties.className || []), "same-page-link"]
    return
  }

  const samePage = node.properties.className?.includes("same-page-link")
  const isAsset = /\.(png|jpg|jpeg)$/.test(href)

  if (!samePage && !isAsset) {
    if (href.startsWith("./")) {
      logger.debug("Converting relative link to absolute")
      href = href.slice(2)
      href = "https://www.turntrout.com/" + href
    } else if (href.startsWith("..")) {
      logger.debug("Skipping parent directory link")
      return
    }
    try {
      let finalURL = new URL(href)
      logger.info(`Final URL: ${finalURL.href}`)

      const imgPath = await MaybeSaveFavicon(finalURL.hostname)

      // TODO improve semantics on handling no-favicon case
      if (imgPath === DEFAULT_PATH) return // No favicon to insert

      logger.info(`Inserting favicon for ${finalURL.hostname}: ${imgPath}`)
      insertFavicon(imgPath, node)
    } catch (error) {
      logger.error(`Error processing URL ${href}: ${error}`)
    }
  } else {
    logger.debug(`Skipping favicon insertion for same-page link or asset: ${href}`)
  }
}

/**
 * Creates a plugin that adds favicons to anchor tags in the HTML tree.
 *
 * @returns An object representing the plugin configuration.
 */
export const AddFavicons = () => {
  return {
    name: "AddFavicons",
    htmlPlugins() {
      return [
        () => {
          return async (tree: any) => {
            logger.info("Starting favicon processing")
            const nodesToProcess: any[] = []

            visit(tree, "element", (node: any) => {
              if (node.tagName === "a" && node.properties.href) {
                logger.debug(`Found anchor node: ${node.properties.href}`)
                nodesToProcess.push(node)
              }
            })

            logger.info(`Processing ${nodesToProcess.length} nodes`)
            await Promise.all(nodesToProcess.map(ModifyNode))
            logger.info("Finished processing favicons")
          }
        },
      ]
    },
  }
}
