import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"

export const ornamentNode = {
  type: "element",
  tagName: "div",
  properties: {
    style: "align-items:center;display:flex;justify-content:center;",
  },
  children: [
    {
      type: "element",
      tagName: "span",
      properties: {
        class: "text-ornament no-select",
        style: "vertical-align:2.6rem;margin-right:0.3rem;",
      },
      children: [{ type: "text", value: "☙" }],
    },
    {
      type: "element",
      tagName: "img",
      children: [],
      properties: {
        src: "https://assets.turntrout.com/static/trout-bw.svg",
        style: "height:var(--ornament-size);",
        alt: "Black and white trout",
        class: "no-select trout-ornament",
      },
    },
    {
      type: "element",
      tagName: "span",
      properties: {
        class: "text-ornament no-select",
        style: "vertical-align:2.6rem;margin-left:0.5rem;",
      },
      children: [{ type: "text", value: "❧" }],
    },
  ],
}

export const TroutOrnamentHr: QuartzTransformerPlugin = () => {
  return {
    name: "TroutOrnamentHr",
    htmlPlugins() {
      return [
        () => {
          return (tree) => {
            let footnotesFound = false

            // Find the section containing the footnotes
            visit(tree, "element", (node, index, parent) => {
              if (
                !footnotesFound &&
                node.tagName === "section" &&
                node?.properties["dataFootnotes"] !== undefined &&
                node?.properties?.className.includes("footnotes")
                )
               {
                footnotesFound = true
                parent.children.splice(index, 0, ornamentNode)
              }
            })
            

            if (!footnotesFound) {
              tree.children.push(ornamentNode)
            }
          }
        },
      ]
    },
  }
}
