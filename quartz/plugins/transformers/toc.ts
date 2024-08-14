import { QuartzTransformerPlugin } from "../types"
import { createLogger } from "./logger_utils"
import { Root } from "mdast"
import { visit } from "unist-util-visit"
import Slugger from "github-slugger"
import { applyTextTransforms } from "./formatting_improvement_html"
import { Node } from "hast"

export interface Options {
  maxDepth: 1 | 2 | 3 | 4 | 5 | 6
  minEntries: number
  showByDefault: boolean
  collapseByDefault: boolean
}

const defaultOptions: Options = {
  maxDepth: 3,
  minEntries: 1,
  showByDefault: true,
  collapseByDefault: false,
}

export interface TocEntry {
  depth: number
  text: string
  slug: string // this is just the anchor (#some-slug), not the canonical slug
}

const logger = createLogger("TableOfContents")

const slugAnchor = new Slugger()

function customToString(node: Node): string {
  if ((node.type === "inlineMath" || node.type === "math") && "value" in node) {
    return node.type === "inlineMath" ? `$${node.value}$` : `$$${node.value}$$`
  }
  if ("children" in node) {
    return (node.children as Node[]).map(customToString).join("")
  }
  return "value" in node ? String(node.value) : ""
}

export const TableOfContents: QuartzTransformerPlugin<Partial<Options> | undefined> = (
  userOpts,
) => {
  const opts = { ...defaultOptions, ...userOpts }
  logger.info(`TableOfContents plugin initialized with options: ${JSON.stringify(opts)}`)

  return {
    name: "TableOfContents",
    markdownPlugins() {
      return [
        () => {
          return async (tree: Root, file) => {
            const display = file.data.frontmatter?.enableToc ?? opts.showByDefault
            logger.debug(`Processing file: ${file.path}, TOC display: ${display}`)

            if (display) {
              slugAnchor.reset()
              const toc: TocEntry[] = []
              let highestDepth: number = opts.maxDepth

              visit(tree, "heading", (node) => {
                if (node.depth <= opts.maxDepth) {
                  let text = applyTextTransforms(customToString(node))
                  highestDepth = Math.min(highestDepth, node.depth)
                  toc.push({
                    depth: node.depth,
                    text,
                    slug: slugAnchor.slug(text),
                  })
                  logger.debug(`Added TOC entry: depth=${node.depth}, text="${text}"`)
                }
              })

              if (toc.length > 0 && toc.length > opts.minEntries) {
                file.data.toc = toc.map((entry) => ({
                  ...entry,
                  depth: entry.depth - highestDepth,
                }))
                file.data.collapseToc = opts.collapseByDefault
                logger.info(`Generated TOC for ${file.path} with ${toc.length} entries`)
              } else {
                logger.info(`Skipped TOC generation for ${file.path}: not enough entries`)
              }
            } else {
              logger.info(`TOC generation skipped for ${file.path}: display is false`)
            }
          }
        },
      ]
    },
  }
}

declare module "vfile" {
  interface DataMap {
    toc: TocEntry[]
    collapseToc: boolean
  }
}
