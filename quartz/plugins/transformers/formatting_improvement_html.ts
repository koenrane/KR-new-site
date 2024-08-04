import { QuartzTransformerPlugin } from "../types"
import { replaceRegex, numberRegex } from "./utils"
import assert from "assert"
import { Plugin } from "unified"
import { Element, Text } from "hast"
import { visit } from "unist-util-visit"

export function flattenTextNodes(node: any, ignoreNode: (n: Element) => boolean): Text[] {
  if (ignoreNode(node)) {
    return []
  }
  if (node.type === "text") {
    return [node]
  }
  if (node.type === "element" && "children" in node) {
    // EG <code> would be an "element"
    return node.children.flatMap((child: Node) => flattenTextNodes(child, ignoreNode))
  }
  // Handle other node types (like comments) by returning an empty array
  return []
}

export function getTextContent(
  node: Element,
  ignoreNodeFn: (n: Element) => boolean = () => false,
): string {
  return flattenTextNodes(node, ignoreNodeFn)
    .map((n) => n.value)
    .join("")
}

export function assertSmartQuotesMatch(input: string): void {
  if (!input) return

  const quoteMap: Record<string, string> = { "”": "“", "“": "”" }
  const stack: string[] = []

  for (const char of input) {
    if (char in quoteMap) {
      if (stack.length > 0 && quoteMap[stack[stack.length - 1]] === char) {
        stack.pop()
      } else {
        stack.push(char)
      }
    }
  }

  assert.strictEqual(stack.length, 0, `Mismatched quotes in ${input}`)
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
  
  NOTE/TODO this function is, in practice, called multiple times on the same
  node via its parent paragraphs. Beware non-idempotent transforms.
  */
export function transformElement(
  node: Element,
  transform: (input: string) => string,
  ignoreNodeFn: (input: Element) => boolean = () => false,
  checkTransformInvariance: any = true,
): void {
  if (!node.children) {
    throw new Error("Node has no children")
  }
  // Append markerChar and concatenate all text nodes
  const textNodes = flattenTextNodes(node, ignoreNodeFn)
  const markedContent = textNodes.map((n) => n.value + markerChar).join("")

  const transformedContent = transform(markedContent)

  // Split and overwrite. Last fragment is always empty because strings end with markerChar
  const transformedFragments = transformedContent.split(markerChar).slice(0, -1)

  if (transformedFragments.length !== textNodes.length) {
    throw new Error("Transformation altered the number of text nodes")
  }

  textNodes.forEach((n, index) => {
    n.value = transformedFragments[index]
  })

  if (checkTransformInvariance) {
    const strippedContent = markedContent.replaceAll(markerChar, "")
    const strippedTransformed = transformedContent.replaceAll(markerChar, "")
    assert.strictEqual(transform(strippedContent), strippedTransformed)
  }
}

export function niceQuotes(text: string) {
  // Single quotes //
  // Ending comes first so as to not mess with the open quote (which
  // happens in a broader range of situations, including e.g. 'sup)
  const endingSingle = `(?<=[^\\s“'])['](?!=')(?=${chr}?(?:s${chr}?)?(?:[\\s.!?;,]|$))`
  text = text.replace(new RegExp(endingSingle, "gm"), "’")
  // Contractions are sandwiched between two letters
  const contraction = `(?<=[A-Za-z]${chr}?)['](?=${chr}?[a-z])`
  text = text.replace(new RegExp(contraction, "gm"), "’")

  // Beginning single quotes
  const beginningSingle = `((?:^|[\\s“"])${chr}?)['](?=${chr}?\\S)`
  text = text.replace(new RegExp(beginningSingle, "gm"), "$1‘")

  const beginningDouble = new RegExp(
    `(?<=^|\\b|\\s|[\\(\\/\\[\\{\\\-\—])(${chr}?)["](${chr}?)(?=[^\\s\\)\\—\\-,!?${chr};:\/.\\}])`,
    "gm",
  )
  text = text.replace(beginningDouble, "$1“$2")
  // Open quote after brace (generally in math mode)
  text = text.replace(new RegExp(`(?<=\\{)(${chr}? )?["]`, "g"), "$1“")

  const endingDouble = `([^\\s\\(])["](${chr}?)(?=[\\s/\\).,;—:\\-\\}!?]|$)`
  text = text.replace(new RegExp(endingDouble, "g"), "$1”$2")

  // If end of line, replace with right double quote
  text = text.replace(new RegExp(`["](${chr}?)$`, "g"), "”$1")
  // // If closing quote followed by brace, generally in math mode
  // text = text.replace(new RegExp(`["](${chr}?\s*${chr}?\\})`, "g"), "”$1")

  // Periods inside quotes
  text = text.replace(new RegExp(`(?<![!?])(${chr}?[’”])\\.`, "g"), ".$1")
  // Commas outside of quotes
  text = text.replace(new RegExp(`,(${chr}?[”’])`, "g"), "$1,")

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
  //  Being right after chr is a sufficient condition for being an em
  //  dash, as it indicates the start of a new line
  const preDash = new RegExp(
    `([ ]+(?<markerBeforeOne>${chr}?)[ ]*|[ ]*(?<markerBeforeTwo>${chr}?)[ ]+|(?<markerBeforeThree>${chr}))`,
  )
  // Want eg " - " to be replaced with "—"
  const surroundedDash = new RegExp(
    `(?<before>[^\\s>]|^)${preDash.source}[~–—\-]+[ ]*(?<markerAfter>${chr}?)[ ]+`,
    "g",
  )

  // Replace surrounded dashes with em dash
  text = text.replace(
    surroundedDash,
    `$<before>$<markerBeforeOne>$<markerBeforeTwo>$<markerBeforeThree>—$<markerAfter>`,
  )
  // Handle dashes at the start of a line
  text = text.replace(new RegExp(`^(${chr})?[-]+ `, "gm"), "$1— ")
  // Handle lines joined by chr
  // text = text.replace(new RegExp(`(?<=${chr})[-]+ `, "g"), "—")

  // Create a regex for spaces around em dashes, allowing for optional spaces around the em dash
  const spacesAroundEM = new RegExp(
    `(?<markerBefore>${chr}?)[ ]*—[ ]*(?<markerAfter>${chr}?)[ ]*`,
    "g",
  )
  // Remove spaces around em dashes
  text = text.replace(spacesAroundEM, "$<markerBefore>—$<markerAfter>")

  // Handle special case after quotation marks
  const postQuote = new RegExp(`(?<quote>[.!?]${chr}?['"’”]${chr}?|…)${spacesAroundEM.source}`, "g")
  text = text.replace(postQuote, "$<quote> $<markerBefore>—$<markerAfter> ")

  // Handle em dashes at the start of a line
  const startOfLine = new RegExp(`^${spacesAroundEM.source}(?<after>[A-Z0-9])`, "gm")
  text = text.replace(startOfLine, "$<markerBefore>—$<markerAfter> $<after>")

  return text
}

// A fraction is a number followed by a slash and another number. There
// are a few checks to avoid false positives like dates (1/1/2001).
const fractionRegex = new RegExp(
  `(?<![\w\/]|${numberRegex.source})(${numberRegex.source})\/(${numberRegex.source})(?!${numberRegex.source})(?=[^\w\/]|$)`,
  "g",
)

// Node-skipping predicates //
/**
 *  Check for ancestors satisfying certain criteria
 */
function hasAncestor(node: any, ancestorPredicate: (anc: Element) => boolean): boolean {
  let ancestor = node
  while (ancestor) {
    if (ancestorPredicate(ancestor)) {
      return true
    }
    ancestor = ancestor.parent
  }
  return false
}

function isCode(node: Element): boolean {
  return node.tagName === "code"
}

function isMath(node: Element): boolean {
  return (node?.properties?.className as String)?.includes("katex")
}

function isTextClass(node: Element): boolean {
  return (node?.properties?.className as String)?.includes("text")
}

function isFootnote(node: Element) {
  return (node?.properties?.href as String)?.includes("user-content-fn-")
}

// Main function //
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

      // A direct transform, instead of on the children of a <p> element
      if (node.type === "text" && node.value && !hasAncestor(parent, isCode)) {
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
            const className = prnt?.properties?.className
            return className?.includes("fraction") || className?.includes("no-fraction")
          },
          "span.fraction",
        )
      }

      // Parent-less nodes are the root of the article
      if (!parent?.tagName && node.type === "element") {
        function toSkip(n: Element): boolean {
          return (
            hasAncestor(n, isCode) || isFootnote(n) || (hasAncestor(n, isMath) && !isTextClass(n))
          )
        }
        transformElement(node, hyphenReplace, toSkip, false)
        transformElement(node, niceQuotes, toSkip, false)

        let notMatching = false
        try {
          assertSmartQuotesMatch(getTextContent(node))
        } catch (e: any) {
          notMatching = true
          console.error(e.message)
        }
        if (notMatching) {
          console.error("Some double quotes are not matched.")
        }

        // Don't replace slashes in fractions, but give breathing room
        // to others
        const slashPredicate = (n: any) => {
          return !n.properties?.className?.includes("fraction") && n?.tagName !== "a"
        }
        if (slashPredicate(node)) {
          transformElement(node, fullWidthSlashes, toSkip)
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
