import GithubSlugger from "github-slugger"
import { headingRank } from "hast-util-heading-rank"
import { toString } from "hast-util-to-string"
import { visit } from "unist-util-visit"

import remarkGfm from "remark-gfm"
import smartypants from "remark-smartypants"
import { QuartzTransformerPlugin } from "../types"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import { Root, Element } from "hast"
import rehypeSlug from "rehype-slug"
import { Text } from "hast"
import type { Plugin as UnifiedPlugin, PluggableList } from "unified"

export interface Options {
  enableSmartyPants: boolean
  linkHeadings: boolean
}

const defaultOptions: Options = {
  enableSmartyPants: true,
  linkHeadings: true,
}

export const GitHubFlavoredMarkdown: QuartzTransformerPlugin<Partial<Options> | undefined> = (
  userOpts,
) => {
  const opts = { ...defaultOptions, ...userOpts }
  return {
    name: "GitHubFlavoredMarkdown",
    markdownPlugins() {
      return opts.enableSmartyPants ? [remarkGfm, smartypants] : [remarkGfm]
    },
    htmlPlugins() {
      const plugins: PluggableList = [] // explicitly type the plugins array

      /* The existing footnote back arrows will by default wrap onto the next line all alone. That looks weird.
      We fix this by adding a span that contains the last four characters of preceding footnote text.
      */
      plugins.push(() => {
        return (tree: Root) => {
          visit(tree, "element", (node) => {
            if (
              node.tagName === "li" &&
              node.properties?.id?.toString().startsWith("user-content-fn")
            ) {
              // Find the existing back arrow - it's a child of the last paragraph element
              const lastParagraph = node.children.find(
                (child) => child.type === "element" && child.tagName === "p",
              )
              if (lastParagraph && "children" in lastParagraph) {
                const lastChild = lastParagraph.children.at(-1)
                if (
                  lastChild?.type === "element" &&
                  lastChild.tagName === "a" &&
                  lastChild.properties?.className?.toString().includes("data-footnote-backref")
                ) {
                  maybeSpliceAndAppendBackArrow(node, lastChild)
                }
              }
            }
          })
        }
      })

      if (opts.linkHeadings) {
        plugins.push(slugFunction, [
          rehypeAutolinkHeadings,
          {
            behavior: "wrap",
            properties: {
              "data-no-popover": "true",
              ariaHidden: true,
              tabIndex: -1,
            },
          },
        ] as unknown as [UnifiedPlugin, Options])
      }

      return plugins
    },
  }
}

const slugger = new GithubSlugger()

export function preprocessSlug(headerText: string): string {
  const charsToConvert = ["'", "’", "/", "&", "—", "‘"]

  let protoSlug = headerText
  for (const char of charsToConvert) {
    protoSlug = protoSlug.replaceAll(new RegExp(char, "g"), "-")
  }

  // Remove consecutive hyphens
  protoSlug = protoSlug.replaceAll(/-+/g, "-")

  return protoSlug
}

export function slugify(headerText: string): string {
  const protoSlug = preprocessSlug(headerText)
  const slug = slugger.slug(protoSlug)
  return slug.replaceAll(/-+/g, "-")
}

export function resetSlugger() {
  slugger.reset()
}

/**
 * Add `id`s to headings.
 *
 * @returns
 *   Transform.
 */
export function slugFunction() {
  return function (tree: Root) {
    slugger.reset()

    visit(tree, "element", function (node: Element) {
      if (headingRank(node) && !node.properties.id) {
        node.properties.id = slugify(toString(node))
      }
    })

    rehypeSlug()(tree)
  }
}

export function removeBackArrow(node: Element): void {
  node.children = node.children.filter((child) => {
    if (
      child.type === "element" &&
      child.tagName === "a" &&
      child.properties?.className?.toString().includes("data-footnote-backref")
    ) {
      return false
    }
    return true
  })
}

/**
 * Add a back arrow to the footnote. Modifies the footnote node in place, appending the back arrow to the footnote.
 *
 * @returns
 *   The back arrow element.
 */
export function maybeSpliceAndAppendBackArrow(node: Element, backArrow: Element): void {
  // Find the last non-whitespace element
  const lastElement = node.children
    .slice()
    .reverse()
    .find((child) => {
      if (child.type === "text") {
        return child.value.trim() !== ""
      }
      return child.type === "element"
    })

  // Only process if it's a paragraph
  if (!(lastElement?.type === "element" && lastElement.tagName === "p")) {
    return
  }

  removeBackArrow(lastElement)
  // Handle empty paragraph case
  if (lastElement.children.length === 0) {
    lastElement.children = [backArrow]
    return
  }

  // Get the last text node
  const lastTextNode = lastElement.children
    .slice()
    .reverse()
    .find((child) => child.type === "text") as Text

  // Handle whitespace-only case
  if (!lastTextNode || lastTextNode.value.trim() === "") {
    lastElement.children = [lastTextNode, backArrow].filter(Boolean)
    return
  }

  const textContent = lastTextNode.value
  const charsToRead = Math.min(4, textContent.length)
  const lastFourChars = textContent.slice(-charsToRead)

  // Update the original text node with truncated content
  if (charsToRead < textContent.length) {
    lastTextNode.value = textContent.slice(0, -charsToRead)

    const span: Element = {
      type: "element",
      tagName: "span",
      properties: {
        style: "white-space: nowrap;",
      },
      children: [{ type: "text", value: lastFourChars }, backArrow],
    }

    lastElement.children.push(span)
  } else {
    // For short text, wrap everything in the span
    lastElement.children = [
      {
        type: "element",
        tagName: "span",
        properties: {
          style: "white-space: nowrap;",
        },
        children: [{ type: "text", value: textContent }, backArrow],
      },
    ]
  }
}
