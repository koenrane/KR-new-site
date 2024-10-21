import { visit } from "unist-util-visit"
import { QuartzTransformerPlugin } from "../types"
import { Root, Element, Parent } from "hast"

// Regex to match subtitle syntax
export const SUBTITLE_REGEX = /^sub:\s*(.*)/

/**
 * Creates a subtitle node from the given children.
 * @param children Children of the subtitle node
 * @returns Subtitle node
 */
export function createSubtitleNode(children: Element["children"]): Element {
  return {
    type: "element",
    tagName: "p",
    properties: { className: ["subtitle"] },
    children: children,
  }
}

/**
 * Modifies a node to convert it to a subtitle if applicable.
 * @param node Element to modify
 * @param index Index of the node in its parent
 * @param parent Parent of the node
 */
export function modifyNode(
  node: Element,
  index: number | undefined,
  parent: Parent | null | undefined,
): void {
  if (node.tagName === "p" && processParagraph(node)) {
    const newNode = createSubtitleNode(node.children)
    if (parent && typeof index === "number") {
      parent.children[index] = newNode
    }
  }
}

/**
 * Processes a paragraph to convert it to a subtitle if applicable.
 * @param paragraph Paragraph element
 * @returns True if the paragraph is a subtitle, false otherwise
 */
export function processParagraph(paragraph: Element): boolean {
  if (paragraph.children.length > 0) {
    const firstChild = paragraph.children[0]
    if (firstChild.type === "text") {
      const match = firstChild.value.match(SUBTITLE_REGEX)
      if (match) {
        // If it's a subtitle, replace the first text node with the subtitle content
        firstChild.value = firstChild.value.replace(SUBTITLE_REGEX, "")
        return true // Indicate that this paragraph is a subtitle
      }
    }
  }
  return false // Not a subtitle
}

/**
 * Transforms the AST by converting subtitles.
 * @param tree AST to transform
 */
export function transformAST(tree: Root): void {
  visit(tree, "element", modifyNode)
}

/**
 * Quartz plugin for custom subtitle syntax.
 */
export const rehypeCustomSubtitle: QuartzTransformerPlugin = () => {
  return {
    name: "customSubtitle",
    htmlPlugins() {
      return [() => transformAST]
    },
  }
}
