import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { toJsxRuntime } from "hast-util-to-jsx-runtime"
import modernStyle from "./styles/toc.scss"
import htmr from "htmr"
import { classNames } from "../util/lang"
import { Parent } from "unist"
import { Fragment, jsx, jsxs } from "react/jsx-runtime"

import { replaceSCInNode } from "../plugins/transformers/tagacronyms"
import { TocEntry } from "../plugins/transformers/toc"

// @ts-ignore
import script from "./scripts/toc.inline"

const TableOfContents: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  if (!fileData.toc || fileData.frontmatter?.toc === "false") {
    return null
  }

  const title = fileData.frontmatter?.title

  const toc = addListItem(fileData.toc, 0)
  return (
    <div id="table-of-contents" class={classNames(displayClass)}>
      <h6 class="toc-title">
        <a href="#">{title}</a>
      </h6>
      <div id="toc-content">
        <ul class="overflow">{toc}</ul>
      </div>
    </div>
  )
}

function addListItem(remainingEntries: TocEntry[], currentDepth: number) {
  if (remainingEntries.length === 0) {
    return ""
  }

  let result = []
  while (remainingEntries.length > 0) {
    const tocEntry = remainingEntries[0]

    if (tocEntry.depth > currentDepth) {
      // If the entry is deeper, start a new list
      result.push(<ul>{addListItem(remainingEntries, tocEntry.depth)}</ul>)
    } else if (tocEntry.depth < currentDepth) {
      // If the entry is shallower, stop the recursion
      break
    } else {
      // Process entries at the same depth
      remainingEntries.shift()
      const entryParent: Parent = processSCInTocEntry(tocEntry)
      const children = entryParent.children.map(elementToJsx)
      let li = (
        <li key={tocEntry.slug} className={`depth-${tocEntry.depth}`}>
          <a href={`#${tocEntry.slug}`} data-for={tocEntry.slug}>
            {children}
          </a>
        </li>
      )
      result.push(li)
    }
  }
  return result
}

function processSCInTocEntry(entry: TocEntry): Parent {
  const node = { type: "text", value: entry.text }
  const parent = { type: "element", tagName: "span", properties: {}, children: [node] }
  replaceSCInNode(node, 0, parent)

  return parent
}

function elementToJsx(elt: any): JSX.Element {
  if (elt.type === "text") {
    return <>{elt.value}</>
  } else if (elt.tagName === "abbr") {
    const abbrText = elt.children[0].value
    const className = elt.properties.className.join(" ")
    return <abbr class={className}>{abbrText}</abbr>
  } else {
    throw Error("Unknown element type")
  }
}

TableOfContents.css = modernStyle
TableOfContents.afterDOMLoaded = script

export default ((_opts?) => {
  return TableOfContents
}) satisfies QuartzComponentConstructor
