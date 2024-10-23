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
  const originalIndex: number = node.children.length - 2
  const lastParagraph = node.children[originalIndex]
  console.log("lastParagraph", lastParagraph)

  if (lastParagraph && "tagName" in lastParagraph && lastParagraph.tagName === "p") {
    removeBackArrow(lastParagraph)

    // Last child is the back arrow, second to last is the text
    const lastParagraphChildIndex = lastParagraph.children.length - 1
    const lastChildText = lastParagraph.children[lastParagraphChildIndex] as Text
    console.log("lastChildText", lastChildText)

    const textContent = lastChildText.value
    const charsToRead = Math.min(4, textContent.length)
    const lastFourChars = textContent.slice(-charsToRead)

    // Update the original text node with truncated content
    if (charsToRead < textContent.length) {
      lastChildText.value = textContent.slice(0, -charsToRead)
    } else {
      // Remove the original text node if we're using all of its content
      node.children.pop()
    }

    const span: Element = {
      type: "element",
      tagName: "span",
      properties: {
        style: "white-space: nowrap;",
      },
      children: [{ type: "text", value: lastFourChars } as Text, backArrow],
    }

    // Insert the new span
    lastParagraph.children.push(span)
  }
}
