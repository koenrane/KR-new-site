import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import fs from "fs"
import https from "https"

const MAIL_PATH = "/static/images/mail.svg"

const MaybeSaveFavicon = (node: any, hostname: string) => {
  // Save the favicon to the local storage and return path
  const sanitizedHostname = hostname.replace(/\./g, "_")
  const localPath = `/static/images/external-favicons/${sanitizedHostname}.png`

  if (!fs.existsSync(localPath)) {
    const googleFaviconURL = `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`
    const file = fs.createWriteStream(localPath)

    https
      .get(googleFaviconURL, (res) => {
        res.pipe(file)

        file.on("finish", () => {
          file.close()
          console.log("Image downloaded successfully!")
        })
      })
      .on("error", (err) => {
        fs.unlink(localPath, () => {}) // Delete the file if it was partially downloaded
        console.error("Error downloading image:", err)
        return ""
      })
  }

  return localPath
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
                if (linkNode?.children) {
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
                    const imgPath = MaybeSaveFavicon(linkNode, url.hostname)
                    if (!imgPath) return // Couldn't load/save favicon
                    img = CreateFaviconElement(imgPath, url.hostname)
                  }
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
                }
              }
            })
          }
        },
      ]
    },
  }
}
