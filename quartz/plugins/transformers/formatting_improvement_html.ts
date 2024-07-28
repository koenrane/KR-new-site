import { QuartzTransformerPlugin } from "../types"
import { toHtml } from "hast-util-to-html"
import smartquotes from "smartquotes"
import { replaceRegex, numberRegex } from "./utils"
import { Plugin } from "unified"
import { Element, Text } from "hast"
import { visit } from "unist-util-visit"

// TODO test
export function flattenTextNodes(node: any, ignoreNode: (n: Node) => boolean): Text[] {
  if (ignoreNode(node)) {
    return []
  }
  if (node.type === "text") {
    return [node]
  }
  if (node.type === "element" && "children" in node) {
    return node.children.flatMap((child: any) => flattenTextNodes(child as Node, ignoreNode))
  }
  // Handle other node types (like comments) by returning an empty array
  return []
}

export const markerChar: string = "\uE000"
const chr = markerChar
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
export function transformParagraph(
  node: Element,
  transform: (input: string) => string,
  ignoreNodeFn: (input: Node) => boolean = () => false,
): void {
  if (node.tagName !== "p") {
    throw new Error("Node must be a paragraph element; got " + node.tagName)
  }

  const textNodes = flattenTextNodes(node, ignoreNodeFn)
  const originalContent = textNodes.map((n) => n.value).join("")

  // Append markerChar and concatenate
  // TODO is first node not getting a marker?
  const markedContent = textNodes.map((n) => n.value + markerChar).join("")

  const transformedContent = transform(markedContent)

  // Split and overwrite. Last fragment is always empty because strings end with markerChar
  const transformedFragments = transformedContent.split(markerChar).slice(0, -1)

  if (transformedFragments.length !== textNodes.length) {
    throw new Error("Transformation altered the number of text nodes")
  }

  textNodes.forEach((node, index) => {
    node.value = transformedFragments[index]
  })

  // Check that the transformation is invariant to our choice of character
  const newContent = flattenTextNodes(node, ignoreNodeFn)
    .map((n) => n.value)
    .join("")
  if (newContent !== transform(originalContent)) {
    console.log("Original content:", originalContent)
    console.log("Transformed content:", newContent)
    console.log("Transformed original content:", transform(originalContent))

    throw new Error(
      `Transformed original content (${transform(originalContent)}) is not invariant to private character (newContent=${newContent})`,
    )
  }
}

export function niceQuotes(text: string) {
  text = smartquotes(text)

  // In some situations, smartquotes adds ″ instead of “
  text = text.replace(/″/g, "“")

  // at the beginning of a word
  const quoteRegex = new RegExp(`(?<before>[^\\w\\d${chr}])['’](?!s\\s)(?=\\S)`, "g")
  text = text.replace(quoteRegex, "$<before>‘")
  text = text.replace(/(?<![\!\?])([’”])\./g, ".$1") // Periods inside quotes
  text = text.replace(/,([”’])/g, "$1,") // Commas outside of quotes

  return text
}

// Give extra breathing room to slashes with full-width slashes
export function fullWidthSlashes(text: string): string {
  const slashRegex = new RegExp(
    `(?<![\\d\/])(${chr}?)[ ]?(${chr}?)\/(${chr}?)[ ]?(${chr}?)(?=[^\\d\/])`,
    "g",
  )
  return text.replace(slashRegex, "$1$2／$3$4")
}

export function hyphenReplace(text: string) {
  // Handle dashes with potential spaces and optional marker character
  const surroundedDash = new RegExp(
    `(?<before>[^\\s>]|^)[ ]*(?<markerBefore>${chr}?)[ ]*[~–—-]+[ ]*(?<markerAfter>${chr}?)[ ]+`,
    "g",
  )

  // Replace surrounded dashes with em dash
  text = text.replace(surroundedDash, `$<before>$<markerBefore>—$<markerAfter>`)

  // Create a regex for spaces around em dashes, allowing for optional spaces around the em dash
  const spacesAroundEM = new RegExp(
    `[ ]*(?<markerBefore>${chr}?)[ ]*—[ ]*(?<markerAfter>${chr}?)[ ]*`,
    "g",
  )

  // Remove spaces around em dashes
  text = text.replace(spacesAroundEM, "$<markerBefore>—$<markerAfter>")

  // Handle special case after quotation marks
  const postQuote = new RegExp(`(?<quote>[.!?]${chr}?['"’”]${chr}?|…)${spacesAroundEM.source}`, "g")
  text = text.replace(postQuote, "$<quote> $<markerBefore>—$<markerAfter> ")

  // Handle em dashes at the start of a line
  const startOfLine = new RegExp(`^${spacesAroundEM.source}(?<after>[A-Z0-9])`, "g")
  text = text.replace(startOfLine, "$<markerBefore>—$<markerAfter> $<after>")

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

function isCode(node: any): boolean {
  return node.tagName === "code"
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

      if (node.tagName === "p") {
        transformParagraph(node, hyphenReplace, isCode)
      }

      // A direct transform, instead of on the children of a <p> element
      if (node.type === "text" && node.value && !isInsideCode(parent)) {
        node.value = node.value.replaceAll(/\u00A0/g, " ") // Replace non-breaking spaces with regular spaces

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
      }
      if (node.tagName === "p") {
        transformParagraph(node, niceQuotes, isCode)
        // TODO check Dyck-1 compliant

        // Don't replace slashes in fractions, but give breathing room
        // to others
        const slashPredicate = (n: any) => {
          return !n.properties?.className?.includes("fraction") && n?.tagName !== "a"
        }
        if (slashPredicate(node)) {
          transformParagraph(node, fullWidthSlashes, isCode)
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
