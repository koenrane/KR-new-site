import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import modernStyle from "./styles/toc.scss"
import { classNames } from "../util/lang"

// @ts-ignore
import script from "./scripts/toc.inline"

const TableOfContents: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  if (!fileData.toc || fileData.frontmatter?.toc === "false") {
    return null
  }

  const title = fileData.frontmatter?.title

  return (
    <div id="table-of-contents" class={classNames(displayClass)}>
      <h6 class="toc-title">
        <a href="#">{title}</a>
      </h6>
      <div id="toc-content">
        <ul class="overflow">{addListItem(fileData.toc, 0)}</ul>
      </div>
    </div>
  )
}

function addListItem(remainingEntries, currentDepth: number) {
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
      let li = (
        <li key={tocEntry.slug} className={`depth-${tocEntry.depth}`}>
          <a href={`#${tocEntry.slug}`} data-for={tocEntry.slug}>
            {tocEntry.text}
          </a>
        </li>
      )
      result.push(li)
    }
  }
  return result
}

TableOfContents.css = modernStyle
TableOfContents.afterDOMLoaded = script

export default ((_opts?) => {
  return TableOfContents
}) satisfies QuartzComponentConstructor
