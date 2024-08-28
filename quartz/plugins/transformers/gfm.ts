import GithubSlugger from "github-slugger"
import { headingRank } from "hast-util-heading-rank"
import { toString } from "hast-util-to-string"
import { visit } from "unist-util-visit"

import remarkGfm from "remark-gfm"
import smartypants from "remark-smartypants"
import { QuartzTransformerPlugin } from "../types"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import { Root, Element } from "hast"
import { h } from "hastscript"

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
      if (opts.linkHeadings) {
        return [
          slugFunction,
          [
            rehypeAutolinkHeadings,
            {
              behavior: "append",
              properties: {
                ariaHidden: true,
                tabIndex: -1,
                "data-no-popover": true,
              },
              content: h("span", { class: "heading-anchor" }, [
                h("svg", {
                  width: 18,
                  height: 18,
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  "stroke-width": "2",
                  "stroke-linecap": "round",
                  "stroke-linejoin": "round",
                }, [
                  h("path", { d: "M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" }),
                  h("path", { d: "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" }),
                ]),
              ]),
            },
          ],
        ]
      } else {
        return []
      }
    },
  }
}

// Slight misalignment between this and LessWrong slugger behavior
//  For compatibility, preserve certain characters in the slug
const slugger = new GithubSlugger()

export function preprocessSlug(headerText: string): string {
  const charsToConvert = ["'", "’"]

  let protoSlug = headerText
  for (const char of charsToConvert) {
    protoSlug = protoSlug.replace(new RegExp(char, "g"), "_")
  }
  return protoSlug
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
        const protoSlug = preprocessSlug(toString(node))
        node.properties.id = slugger.slug(protoSlug)
      }
    })
  }
}
