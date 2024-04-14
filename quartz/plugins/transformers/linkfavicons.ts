import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"

const CreateFavicon = (urlString: string, description: string = "") => {
  return {
    type: "element",
    tagName: "img",
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

                const isMailTo = linkNode?.properties?.href?.startsWith("mailto:")
                const isExternal = linkNode?.properties?.className?.includes("external")
                if (isMailTo || isExternal) {
                  var img = ""
                  if (isMailTo) {
                    const mailUrl = "/static/mail.svg"
                    img = CreateFavicon(mailUrl, "email address")
                  } else {
                    const url = new URL(linkNode.properties.href)
                    const faviconUrl = `https://www.google.com/s2/favicons?sz=64&domain=${url.hostname}`
                    img = CreateFavicon(faviconUrl, url.hostname)
                  }
                  var toPush = img

                  // Remove the "external-icon" elements, hidden anyways
                  const length = linkNode.children.length
                  if (linkNode?.children[length - 1]?.properties?.class === "external-icon") {
                    linkNode.children.pop()
                  }

                  const lastChild = linkNode.children[linkNode.children.length - 1]
                  if (lastChild && lastChild.type === "text") {
                    const textContent = lastChild.value
                    const lastFourChars = textContent.slice(-4)
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
                        // Add properties here
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
