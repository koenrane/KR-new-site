import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"

const CreateFavicon = (urlString: string, description: string = "") => {
  return {
    type: "element",
    tagName: "img",
    properties: {
      src: urlString,
      // onerror: `console.error('Failed to load favicon for ${domain}');`,
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

                if (linkNode?.properties?.href?.startsWith("mailto:")) {
                  const mailUrl = "/static/mail.svg"
                  const mailImg = CreateFavicon(mailUrl, "email address")
                  linkNode.children.push(mailImg)
                  return
                } else if (linkNode?.properties?.className?.includes("external")) {
                  const url = new URL(linkNode.properties.href)
                  const domain = url.hostname
                  const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}`
                  const faviconImg = CreateFavicon(faviconUrl, domain)
                  linkNode.children.push(faviconImg)
                  return
                }
              }
            })
          }
        },
      ]
    },
  }
}
