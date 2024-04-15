import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import fs from "fs"
import https from "https"
import path from "path"

const MAIL_PATH = "~/Documents/quartz/quartz/static/images/mail.svg"

function downloadFileSync(url, destPath) {
  const file = fs.createWriteStream(destPath)
  const response = https.get(url)
  response.pipe(file)

  return new Promise((resolve, reject) => {
    file.on("finish", () => {
      file.close()
      resolve()
    })
    response.on("error", (err) => {
      fs.unlinkSync(destPath)
      reject(err)
    })
    file.on("error", (err) => {
      fs.unlinkSync(destPath)
      reject(err)
    })
  })
}

const QUARTZ_FOLDER = "~/Documents/quartz/quartz"
const FAVICON_FOLDER = "/static/images/external-favicons"

async function MaybeSaveFavicon(hostname: string) {
  return new Promise((resolve, reject) => {
    // Save the favicon to the local storage and return path
    const sanitizedHostname = hostname.replace(/\./g, "_")
    const localPath = `${QUARTZ_FOLDER}/${sanitizedHostname}.png`
    const quartzPath = `${FAVICON_FOLDER}/${sanitizedHostname}.png`

    if (!fs.existsSync(localPath)) {
      const googleFaviconURL = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`
      try {
        downloadFileSync(googleFaviconURL, localPath)
        resolve(quartzPath)
      } catch (error) {
        console.log(error)
        console.error(`Failed to download favicon for ${hostname}`)
        reject(null)
      }
    } else {
      resolve(quartzPath)
    }
  })
}

const CreateFaviconElement = (urlString: string, description: string = "") => {
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

const VERBOSE = false
const log = (message: string) => {
  if (VERBOSE) {
    console.log(message)
  }
}

export const AddFavicons: QuartzTransformerPlugin = () => {
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

                const isMailTo = linkNode?.properties?.href?.startsWith("mailto:")
                const isExternal = linkNode?.properties?.className?.includes("external")
                if (isMailTo || isExternal) {
                  var img = ""
                  if (isMailTo) {
                    img = CreateFaviconElement(MAIL_PATH, "email address")
                  } else {
                    const url = new URL(linkNode.properties.href)
                    MaybeSaveFavicon(url.hostname)
                      .then(function (imgPath) {
                        console.log(imgPath)
                        img = CreateFaviconElement(imgPath, url.hostname)
                        var toPush = img

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
                              img, // Append the previously created image
                            ],
                            properties: {
                              style: "white-space: nowrap;",
                            },
                          }
                        }
                        linkNode.children.push(toPush)
                        console.log(toPush)
                      })
                      .catch((error) => {
                        console.error("Error downloading favicon:", error)
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
