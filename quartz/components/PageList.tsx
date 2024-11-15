import { Element } from "hast"
import { toJsxRuntime, Options } from "hast-util-to-jsx-runtime"
import { h } from "hastscript"
import { Fragment, jsx, jsxs } from "preact/jsx-runtime"

import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import { FullSlug, resolveRelative } from "../util/path"
import { getDate } from "./Date"
import { formatTag } from "./TagList"
import { QuartzComponent, QuartzComponentProps } from "./types"

export function byDateAndAlphabetical(
  cfg: GlobalConfiguration,
): (f1: QuartzPluginData, f2: QuartzPluginData) => number {
  return (f1, f2) => {
    if (f1.dates && f2.dates) {
      // sort descending
      const date1 = getDate(cfg, f1)
      const date2 = getDate(cfg, f2)
      if (!date1 || !date2) {
        return 0
      }
      return date2.getTime() - date1.getTime()
    } else if (f1.dates && !f2.dates) {
      // prioritize files with dates
      return -1
    } else if (!f1.dates && f2.dates) {
      return 1
    }

    // otherwise, sort lexographically by title
    const f1Title = f1.frontmatter?.title.toLowerCase() ?? ""
    const f2Title = f2.frontmatter?.title.toLowerCase() ?? ""
    return f1Title.localeCompare(f2Title)
  }
}

type Props = {
  limit?: number
} & QuartzComponentProps

/**
 * Creates a HAST (Hypertext Abstract Syntax Tree) representation of a page list
 *
 * @param cfg - Global configuration object containing site-wide settings
 * @param fileData - Data for the current file being processed
 * @param allFiles - Array of all files/pages in the site
 * @param limit - Optional maximum number of pages to include in the list
 * @returns Element - A HAST Element representing the page list as a ul element with nested structure
 *
 * The function:
 * 1. Sorts pages by date (newest first) and alphabetically
 * 2. Applies optional limit to number of pages shown
 * 3. Creates a hierarchical HTML structure for each page including:
 *    - Date (if available)
 *    - Page title with link
 *    - Tags with links
 *    - Dividers between pages
 */
export function createPageListHast(
  cfg: GlobalConfiguration,
  fileData: QuartzPluginData,
  allFiles: QuartzPluginData[],
  limit?: number,
): Element {
  let list = allFiles.sort(byDateAndAlphabetical(cfg))
  if (limit) {
    list = list.slice(0, limit)
  }

  return h("div.page-listing", [
    h(
      "ul.section-ul",
      list
        .map((page, index) => {
          const title = page.frontmatter?.title
          let tags = page.frontmatter?.tags ?? []
          tags = tags.sort((a, b) => b.length - a.length)

          const date = getDate(cfg, page)?.toLocaleDateString() || ""
          const fileDataSlug = fileData.slug || ("" as FullSlug)
          const pageSlug = page.slug || ("" as FullSlug)

          return [
            h("li.section-li", [
              h("div.section", [
                page.dates && h("time.meta", [date]),
                h("div.desc", [
                  h("p", { class: "page-listing-title" }, [
                    h("a.internal", { href: resolveRelative(fileDataSlug, pageSlug) }, title),
                  ]),
                  h(
                    "ul.tags",
                    tags.map((tag) =>
                      h(
                        "a.internal.tag-link",
                        { href: resolveRelative(fileDataSlug, `tags/${tag}` as FullSlug) },
                        formatTag(tag),
                      ),
                    ),
                  ),
                ]),
              ]),
            ]),
            index < list.length - 1 ? h("hr.page-divider") : null,
          ]
        })
        .flat()
        .filter(Boolean),
    ),
  ])
}

export const PageList: QuartzComponent = ({ cfg, fileData, allFiles, limit }: Props) => {
  const pageListHast = createPageListHast(cfg, fileData, allFiles, limit)
  return toJsxRuntime(pageListHast, { Fragment, jsx, jsxs } as Options)
}
