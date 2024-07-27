import { QuartzTransformerPlugin } from "../types"
import smartquotes from "smartquotes"
import { replaceRegex, numberRegex } from "./utils"
import { Plugin } from "unified"
import { Element, Text } from "hast"
import { visit } from "unist-util-visit"

// TODO test
export function flattenTextNodes(node: any): Text[] {
  if (node.type === "text") {
    return [node]
  }
  if (node.type === "element" && "children" in node) {
    return node.children.flatMap((child: any) => flattenTextNodes(child as Node))
  }
  // Handle other node types (like comments) by returning an empty array
  return []
}

export const markerChar: string = "\uE000"
/* Sometimes I want to transform the text content of a paragraph (e.g.
by adding smart quotes). But that paragraph might contain multiple child
elements. If I transform each of the child elements individually, the
transformation might fail or be mangled. For example, consider the
literal string "<em>foo</em>" The transformers will see '"', 'foo', and
'"'. It's then impossible to know how to transform the quotes.

This function allows applying transformations to the text content of a
paragraph, while preserving the structure of the paragraph. 
  1. Append a private-use unicode char to end of each child's text content.  
  2. Take text content of the whole paragraph and apply
     transform to it
  3. Split the transformed text content by the unicode char, putting
     each fragment back into the corresponding child node. 
  4. Assert that stripChar(transform(textContentWithChar)) =
     transform(stripChar(textContent)) as a sanity check, ensuring
     transform is invariant to our choice of character.
  */
export function transformParagraph(node: Element, transform: (input: string) => string): void {
  if (node.tagName !== "p") {
    throw new Error("Node must be a paragraph element; got " + node.tagName)
  }

  const textNodes = flattenTextNodes(node)

  // Append markerChar and concatenate
  const originalContent = textNodes.map((n) => n.value + markerChar).join("")

  // Apply transformation
  const transformedContent = transform(originalContent)

  // Split and overwrite. Last fragment is always empty because strings end with markerChar
  const transformedFragments = transformedContent.split(markerChar).slice(0, -1)

  if (transformedFragments.length !== textNodes.length) {
    throw new Error("Transformation altered the number of text nodes")
  }

  textNodes.forEach((node, index) => {
    node.value = transformedFragments[index]
  })

  // Sanity check
  const newContent = flattenTextNodes(node)
    .map((n) => n.value)
    .join("")
  if (newContent !== transform(originalContent.replace(new RegExp(markerChar, "g"), ""))) {
    // console.log("Transformed fragments:", transformedFragments)
    // console.log("Text nodes:", textNodes)
    // console.log("New content:", newContent)
    // console.log("Target content:", transform(originalContent.replace(markerChar, "")))
    throw new Error("Transform is not invariant to private character")
  }
}

function quotesInSmallString(text: string) {
  const numDoubleQuotes = text.match(/["]/g)
  // If two, replace with nice quotes
  if (numDoubleQuotes) {
    if (numDoubleQuotes.length === 2) {
      let newText = text.replace(/"/, "“")
      newText = newText.replace(/"/, "”")
      return newText
    } else {
      // This gambles that we're inside a closing slice, not an opening one
      return text.replace(/"/g, "”")
    }
  }
  const numSingleQuotes = text.match(/[']/g)
  if (numSingleQuotes) {
    if (numSingleQuotes.length === 2) {
      let newText = text.replace(/'/, "‘")
      newText = newText.replace(/'/, "’")
      return newText
    } else {
      return text.replace(/'/g, "’")
    }
  }
  return text
}

export function niceQuotes(text: string) {
  // Generally these are short strings, so we can just do a simple replace
  if (text.length < 5) {
    return quotesInSmallString(text)
  }

  text = smartquotes(text)
  text = text.replace(/([\s“])[\'’](?=\S)/gm, "$1‘") // Quotes at the beginning of a word
  text = text.replace(/(?<![\!\?])([’”])\./g, ".$1") // Periods inside quotes
  text = text.replace(/,([”’])/g, "$1,") // Commas outside of quotes

  return text
}

// Give extra breathing room to slashes
export function fullWidthSlashes(text: string): string {
  return text.replace(/(?<=[^\d\/]) ?\/(?!=\/) ?(?=[^\d])(?!\/)/g, "／")
}

export function hyphenReplace(text: string) {
  // Create a regex for dashes surrounded by spaces
  const surroundedDash = new RegExp("([^\\s>]|^) *[~–—-]+ +", "g")

  // Replace surrounded dashes with em dash
  text = text.replace(surroundedDash, "$1—")

  // Create a regex for spaces around em dashes, allowing for optional spaces around the em dash
  const spacesAroundEM = new RegExp(" *— *", "g")

  // Remove spaces around em dashes
  text = text.replace(spacesAroundEM, "—")

  const postQuote = /([.!?]["”])\s*—\s*/g
  text = text.replace(postQuote, "$1 — ")

  const startOfLine = /^\s*—\s*([A-Z0-9])/g
  text = text.replace(startOfLine, "— $1")

  return text
}

const fractionRegex = new RegExp(
  `(?<![\w\/]|${numberRegex.source})(${numberRegex.source})\/(${numberRegex.source})(?!${numberRegex.source})(?=[^\w\/]|$)`,
  "g",
)

function isInsideCode(node: any) {
  let ancestor = node
  while (ancestor) {
    if (ancestor.tagName === "code") {
      return true
    }
    ancestor = ancestor.parent
  }
  return false
}

export const improveFormatting: Plugin = () => {
  return (tree: any) => {
    visit(tree, (node, index, parent) => {
      // Wrap fn in span so that multiple <p> elements can be used
      if (node?.properties?.id?.includes("user-content-fn-")) {
        const newSpan = {
          type: "element",
          tagName: "span",
          properties: {
            className: ["footnote"],
          },
          children: node.children,
        }
        node.children = [newSpan]
      }

      if (node.type === "text" && node.value && !isInsideCode(parent)) {
        node.value = node.value.replaceAll(/\u00A0/g, " ") // Replace non-breaking spaces with regular spaces
        node.value = hyphenReplace(node.value)

        replaceRegex(
          node,
          index,
          parent,
          fractionRegex,
          (match: any) => {
            return {
              before: "",
              replacedMatch: match[0],
              after: "",
            }
          },
          (_nd: any, _idx: any, prnt: any) => {
            return prnt?.properties?.className?.includes("fraction")
          },
          "span.fraction",
        )

        node.value = niceQuotes(node.value)

        // Don't replace slashes in fractions, but give breathing room to others
        if (!parent.properties?.className?.includes("fraction") && parent?.tagName !== "a") {
          node.value = fullWidthSlashes(node.value)
        }
      }
    })
  }
}

export const HTMLFormattingImprovement: QuartzTransformerPlugin = () => {
  return {
    name: "htmlFormattingImprovement",
    htmlPlugins() {
      return [improveFormatting]
    },
  }
}
