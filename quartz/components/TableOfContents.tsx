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

function processSmallCaps(text: string, parent: Parent): void {
  const textNode = { type: "text", value: text } as Text
  parent.children.push(textNode)
  replaceSCInNode(textNode, 0, parent)
}

function processKatex(latex: string, parent: Parent): void {
  const html = katex.renderToString(latex, { throwOnError: false })
  const katexNode = {
    type: "element",
    tagName: "span",
    properties: { className: ["katex-toc"] },
    children: [{ type: "raw", value: html }],
  } as Element
  parent.children.push(katexNode)
}

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
      result.push(<ul>{addListItem(remainingEntries, tocEntry.depth)}</ul>)
    } else if (tocEntry.depth < currentDepth) {
      logger.debug(`Ending sublist, returning to depth ${tocEntry.depth}`)
      break
    } else {
      remainingEntries.shift()
      const entryParent: Parent = processSCInTocEntry(tocEntry)
      const children = entryParent.children.map(elementToJsx)
      let childElts: JSX.Element[] = []
      for (let i = 0; i < children.length; i++) {
        childElts.push(children[i])
      }
      let li = (
        <li key={tocEntry.slug} className={`depth-${tocEntry.depth}`}>
          <a href={`#${tocEntry.slug}`} data-for={tocEntry.slug}>
            {childElts}
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

  parts.forEach((part) => {
    if (part.startsWith("$") && part.endsWith("$")) {
      // LaTeX expression
      const latex = part.slice(1, -1)
      processKatex(latex, parent)
    } else {
      // Regular text
      processSmallCaps(part, parent)
    }
  })

  return parent
}

function elementToJsx(elt: any): JSX.Element {
  logger.debug(`Converting element to JSX: ${JSON.stringify(elt)}`)
  if (elt.type === "text") {
    return <>{elt.value}</>
  } else if (elt.tagName === "abbr") {
    const abbrText = elt.children[0].value
    const className = elt.properties.className.join(" ")
    return <abbr class={className}>{abbrText}</abbr>
  } else if (elt.tagName === "span") {
    if (elt.properties.className?.includes("katex-toc")) {
      return (
        <span className="katex-toc" dangerouslySetInnerHTML={{ __html: elt.children[0].value }} />
      )
    } else {
      // Handle other span elements (e.g., those created by processSmallCaps)
      return <span>{elt.children.map((child: any) => elementToJsx(child))}</span>
    }
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
