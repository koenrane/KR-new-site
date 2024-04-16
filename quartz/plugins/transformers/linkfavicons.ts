import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import axios from "axios"
import fs from "fs"
import https from "https"
import path from "path"

const MAIL_PATH = "/Users/turntrout/Documents/quartz/quartz/static/images/mail.svg"
const QUARTZ_FOLDER = "/Users/turntrout/Documents/quartz/quartz"
const FAVICON_FOLDER = "static/images/external-favicons"

function downloadImage(url, image_path) {
  axios({
    url,
    responseType: "stream",
  })
    .then(
      (response) =>
        new Promise((resolve, reject) => {
          response.data
            .pipe(fs.createWriteStream(image_path))
            .on("finish", () => resolve())
            .on("error", (e) => reject(e))
        }),
    )
    .catch((error) => {})
}

async function MaybeSaveFavicon(hostname: string) {
  return new Promise((resolve, reject) => {
    // Save the favicon to the local storage and return path
    const sanitizedHostname = hostname.replace(/\./g, "_")
    const localPath = `${QUARTZ_FOLDER}/${FAVICON_FOLDER}/${sanitizedHostname}.png`

    const quartzPath = `/${FAVICON_FOLDER}/${sanitizedHostname}.png`
    fs.stat(localPath, function (err, stat) {
      if (err === null) {
        resolve(quartzPath)
      } else if (err.code === "ENOENT") {
        // File doesn't exist
        const googleFaviconURL = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`
        try {
          downloadImage(googleFaviconURL, localPath)
          console.log("Resolved ", hostname)
          resolve(quartzPath)
        } catch (error) {
          console.log(error)
          console.error(`Failed to download favicon for ${hostname}`)
          reject(null)
        }
      } else {
        console.log(err)
      }
    })
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
                  var imgElement = { children: [] }
                  if (isMailTo) {
                    imgElement = CreateFaviconElement(MAIL_PATH, "email address")
                  } else {
                    const url = new URL(linkNode.properties.href)
                    MaybeSaveFavicon(url.hostname)
                      .then(function (imgPath) {
                        imgElement = CreateFaviconElement(imgPath, url.hostname)

                        var toPush = imgElement

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
