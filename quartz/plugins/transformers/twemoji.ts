import { visit } from "unist-util-visit"
import { twemoji } from "./modules/twemoji.min"
import { h } from "hastscript"

const placeholder = "__EMOJI_PLACEHOLDER__"

export const Twemoji = () => {
  return {
    name: "Twemoji",
    htmlPlugins() {
      return [
        () => (tree: any) => {
          visit(tree, "text", (node, index, parent) => {
            // Replace ↩ with placeholder
            let content = node.value.replace(/↩/g, placeholder)

            // Parse emojis
            const parsed = twemoji.parse(content, {
              folder: "svg",
              ext: ".svg",
              callback: (icon, options) => {
                return `https://assets.turntrout.com/twemoji/${icon}${options.ext}`
              },
            })

            if (parsed !== content) {
              // Create an array to hold the new nodes
              const newNodes = []

              // Split the parsed content by the img tags
              const parts = parsed.split(/<img.*?>/g)
              const matches = parsed.match(/<img.*?>/g) || []

              parts.forEach((part, i) => {
                if (part) {
                  newNodes.push({ type: "text", value: part })
                }
                if (matches[i]) {
                  const attrs = matches[i].match(/(\w+)="([^"]*)"?/g)
                  const properties = {}
                  attrs?.forEach((attr) => {
                    const [key, value] = attr.split("=")
                    properties[key] = value.replace(/"/g, "")
                  })
                  newNodes.push(h("img", properties))
                }
              })

              // Replace placeholder back with ⤴
              newNodes.forEach((node) => {
                if (node.type === "text") {
                  node.value = node.value.replace(/__EMOJI_PLACEHOLDER__/g, "⤴")
                }
              })

              // Replace the original node with the new nodes
              parent.children.splice(index, 1, ...newNodes)
            }
          })
        },
      ]
    },
  }
}
