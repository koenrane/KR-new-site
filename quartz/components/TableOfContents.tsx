import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { createLogger } from "../plugins/transformers/logger_utils"
import modernStyle from "./styles/toc.scss"
import { classNames } from "../util/lang"
import { Parent, Text, Element } from "hast"
import { replaceSCInNode } from "../plugins/transformers/tagacronyms"
import { TocEntry } from "../plugins/transformers/toc"
// @ts-expect-error
import script from "./scripts/toc.inline"
import katex from "katex"

const logger = createLogger("TableOfContents")
const TableOfContents: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  logger.info(`Rendering TableOfContents for file: ${fileData.filePath}`)

  if (!fileData.toc || fileData.frontmatter?.toc === "false") {
    logger.info(
      `TableOfContents skipped for ${fileData.filePath}: no TOC data or disabled in frontmatter`,
    )
    return null
  }

  const title = fileData.frontmatter?.title
  logger.debug(`Title for TOC: ${title}`)

  const toc = addListItem(fileData.toc, 0)
  logger.debug(`Generated TOC items: ${toc.length}`)

  return (
    <div id="table-of-contents" className={classNames(displayClass)}>
      <h6 className="toc-title">
        <a href="#">{title}</a>
      </h6>
      <div id="toc-content">
        <ul className="overflow">{toc}</ul>
      </div>
    </div>
  )
}

function addListItem(remainingEntries: TocEntry[], currentDepth: number) {
  logger.debug(
    `addListItem called with ${remainingEntries.length} entries at depth ${currentDepth}`,
  )

  if (remainingEntries.length === 0) {
    logger.debug("No remaining entries, returning empty string")
    return ""
  }

  let result = []
  while (remainingEntries.length > 0) {
    const tocEntry = remainingEntries[0]
    logger.debug(`Processing TOC entry: ${JSON.stringify(tocEntry)}`)

    if (tocEntry.depth > currentDepth) {
      logger.debug(`Starting new sublist at depth ${tocEntry.depth}`)
      result.push(<ul key={`sublist-${tocEntry.slug}`}>{addListItem(remainingEntries, tocEntry.depth)}</ul>)
    } else if (tocEntry.depth < currentDepth) {
      logger.debug(`Ending sublist, returning to depth ${tocEntry.depth}`)
      break
    } else {
      remainingEntries.shift()
      const entryParent: Parent = processSCInTocEntry(tocEntry)
      const children = entryParent.children.map((child, index) => elementToJsx(child, index))
      const li = (
        <li key={tocEntry.slug} className={`depth-${tocEntry.depth}`}>
          <a href={`#${tocEntry.slug}`} data-for={tocEntry.slug}>
            {children}
          </a>
        </li>
      )
      logger.debug(`Added list item for "${tocEntry.text}" at depth ${tocEntry.depth}`)
      result.push(li)
    }
  }

  logger.debug(`Returning ${result.length} list items`)
  return result
}

function processSCInTocEntry(entry: TocEntry): Parent {
  logger.debug(`Processing SC in TOC entry: ${entry.text}`)
  const parent = { type: "element", tagName: "span", properties: {}, children: [] } as Parent
  
  // Split the text by LaTeX delimiters
  const parts = entry.text.split(/(\$[^$]+\$)/g)
  
  parts.forEach(part => {
    if (part.startsWith('$') && part.endsWith('$')) {
      // LaTeX expression
      const latex = part.slice(1, -1)
      const html = katex.renderToString(latex, { throwOnError: false })
      const katexNode = {
        type: "element",
        tagName: "span",
        properties: { className: ["katex-toc"] },
        children: [{ type: "raw", value: html }]
      } as Element
      parent.children.push(katexNode)
    } else {
      // Regular text
      const textNode = { type: "text", value: part } as Text
      replaceSCInNode(textNode, 0, parent)
    }
  })

  return parent
}

function elementToJsx(elt: any, index: number): JSX.Element {
  logger.debug(`Converting element to JSX: ${JSON.stringify(elt)}`)
  if (elt.type === "text") {
    return <React.Fragment key={index}>{elt.value}</React.Fragment>
  } else if (elt.tagName === "abbr") {
    const abbrText = elt.children[0].value
    const className = Array.isArray(elt.properties.className) ? elt.properties.className.join(" ") : elt.properties.className
    return <abbr key={index} className={className}>{abbrText}</abbr>
  } else if (elt.tagName === "span" && elt.properties.className?.includes("katex-toc")) {
    return <span key={index} className="katex-toc" dangerouslySetInnerHTML={{ __html: elt.children[0].value }} />
  } else {
    logger.error(`Unknown element type: ${elt.type}`)
    throw Error("Unknown element type")
  }
}

TableOfContents.css = modernStyle
TableOfContents.afterDOMLoaded = script

export default ((_opts?) => {
  logger.info("TableOfContents component initialized")
  return TableOfContents
}) satisfies QuartzComponentConstructor
