import { Root, Element, Parent } from "hast"
import { visit } from "unist-util-visit"

import { QuartzTransformerPlugin } from "../types"

export const SUBTITLE_REGEX = /^Subtitle:\s*(.*)/

export function createSubtitleNode(children: Element["children"]): Element {
  return {
    type: "element",
    tagName: "p",
    properties: { className: ["subtitle"] },
    children,
  }
}

export function modifyNode(
  node: Element,
  index: number | undefined,
  parent: Parent | null | undefined,
): void {
  if (node.tagName === "p" && processParagraph(node)) {
    const newNode = createSubtitleNode(node.children)
    if (parent && index !== undefined) {
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
        firstChild.value = match[1].trimStart()
        return true
      }
    }
  }
  return false
}

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
