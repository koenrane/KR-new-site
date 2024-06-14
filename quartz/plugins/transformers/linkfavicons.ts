import { visit } from "unist-util-visit"
import axios from "axios"
import fs from "fs"

const STATIC_RELATIVE_PATH = "quartz/static"
const MAIL_PATH = `${STATIC_RELATIVE_PATH}/images/mail.svg`
const QUARTZ_FOLDER = "quartz"
const FAVICON_FOLDER = "static/images/external-favicons"

async function downloadImage(url: string, image_path: string): Promise<boolean> {
  let writeStream = fs.createWriteStream(image_path)

  try {
    const response = await axios({
      url,
      responseType: "stream",
      validateStatus: function (status) {
        return status < 500 // Resolve only if the status code is less than 500
      },
    })

    // Check if the response status is 404
    if (response.status === 404) {
      console.error(`Favicon not found at ${url}`)
      writeStream.close()
      return false
    }

    await new Promise((resolve, reject) => {
      response.data.pipe(writeStream).on("finish", resolve).on("error", reject)
    })
    return true
  } catch (error) {
    console.error(`Failed to download image from ${url}`, error)
    writeStream.close()
    return false
  }
}

async function MaybeSaveFavicon(hostname: string) {
  return new Promise((resolve, reject) => {
    // Save the favicon to the local storage and return path
    if (hostname === "localhost") {
      hostname = "www.turntrout.com"
    }
    const sanitizedHostname = hostname.replace(/\./g, "_")
    const localPath = `${QUARTZ_FOLDER}/${FAVICON_FOLDER}/${sanitizedHostname}.png`

    const quartzPath = `/${FAVICON_FOLDER}/${sanitizedHostname}.png`

    fs.stat(localPath, async function (err) {
      if (err === null) {
        // Already exists
        resolve(quartzPath)
      } else if (err.code === "ENOENT") {
        // File doesn't exist
        const googleFaviconURL = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`
        const downloaded = await downloadImage(googleFaviconURL, localPath)
        if (downloaded) {
          resolve(quartzPath)
        } else {
          reject(null)
        }
      } else {
        console.log(err)
        reject(null)
      }
    })
  })
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

                    console.log("href", href)
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
