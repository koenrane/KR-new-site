import { visit } from "unist-util-visit"
import axios from "axios"
import path from "path"
import fs from "fs"

const STATIC_RELATIVE_PATH = "quartz/static"
const MAIL_PATH = `${STATIC_RELATIVE_PATH}/images/mail.svg`
const QUARTZ_FOLDER = "quartz"
const FAVICON_FOLDER = "static/images/external-favicons"

async function downloadImage(url: string, image_path: string): Promise<boolean> {
  try {
    const response = await axios({
      url,
      method: "GET",
      responseType: "stream", // Stream the image data
    })

    // Check if the request was successful (status 200)
    if (response.status !== 200) {
      console.error(`Failed to download image from ${url}. Status: ${response.status}`)
      return false
    }

    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(image_path)

      response.data.pipe(writeStream)

      writeStream.on("finish", () => {
        writeStream.close()
        resolve(true) // Image download succeeded
      })

      writeStream.on("error", (error) => {
        writeStream.close()
        fs.unlink(image_path, () => {}) // Delete the partial file
        console.error(`Error downloading image from ${url}:`, error)
        reject(false) // Image download failed
      })
    })
  } catch (error) {
    console.error(`Error fetching image from ${url}:`, error)
    return false
  }
}

async function MaybeSaveFavicon(hostname: string): Promise<string | null> {
  if (hostname === "localhost") {
    hostname = "www.turntrout.com"
  }

  const sanitizedHostname = hostname.replace(/\./g, "_")
  const localPath = path.join(QUARTZ_FOLDER, FAVICON_FOLDER, `${sanitizedHostname}.png`)
  const quartzPath = `/${FAVICON_FOLDER}/${sanitizedHostname}.png`

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

    console.error(`Error handling favicon for ${hostname}:`, err)
    return null // Indicate failure
  }
}

const CreateFaviconElement = (urlString: string, description = "") => {
  return {
    type: "element",
    tagName: "img",
    children: [],
    properties: {
      src: urlString,
      class: "favicon",
    },
    alt: "Favicon for " + description,
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
                if (notSamePage && !isImage) {
                  let imgElement = { children: [] }
                  const isMailTo = href?.startsWith("mailto:")
                  if (isMailTo) {
                    imgElement = CreateFaviconElement(MAIL_PATH, "email address")
                  } else if (href) {
                    if (href.startsWith("./")) {
                      // Relative link
                      href = href.slice(2)
                      href = "https://www.turntrout.com/" + href
                    } else if (href.startsWith("..")) {
                      return
                    }

                    const url = new URL(href)
                    MaybeSaveFavicon(url.hostname).then(function (imgPath) {
                      if (imgPath !== null) {
                        imgElement = CreateFaviconElement(imgPath, url.hostname)

                        let toPush = imgElement

                        const lastChild = linkNode.children[linkNode.children.length - 1]
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
                        linkNode.children.push(toPush)
                      }
                    })
                  }
                }
              }
            })
          }
        },
      ]
    },
  }
}
