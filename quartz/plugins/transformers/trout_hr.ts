import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"

interface FootnotesLocation {
  footnotesSectionFound: boolean
  previousHr?: Node // Store the <hr> found before 'footnotes'
}

const children = [
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
      src: "/static/trout-bw.png",
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
]

export const TroutOrnamentHr: QuartzTransformerPlugin = () => {
  return {
    name: "TroutOrnamentHr",
    htmlPlugins() {
      return [
        () => {
          return (tree, file) => {
            const footnotesData: FootnotesLocation = {
              footnotesSectionFound: false,
            }
            const newNode = {
              type: "element",
              tagName: "div",
              properties: {
                style: "align-items:center;display:flex;justify-content:center;",
              },
              children: children,
            }

            // Find the HR before the footnotes section
            visit(tree, "element", (node, index, parent) => {
              if (
                !footnotesData.footnotesSectionFound &&
                node.tagName === "h2" &&
                node.children[0].type === "text" &&
                node.children[0]?.value?.toLowerCase() === "footnotes"
              ) {
                footnotesData.footnotesSectionFound = true
                parent.children.splice(index, 0, newNode)
              }
            })

            if (!footnotesData.footnotesSectionFound) {
              tree.children.push(newNode)
            }
          }
        },
      ]
    },
  }
}
