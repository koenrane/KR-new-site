import { QuartzComponent, QuartzComponentProps } from "./types"
import { resolveRelative, simplifySlug } from "../util/path"
import { FullSlug } from "../util/path"
import { replaceSCInNode } from "../plugins/transformers/tagacronyms"
import { fromHtml } from "hast-util-from-html"
import { RootContent, Parent, Text, Element } from "hast"

function processSmallCaps(text: string, parent: Parent): void {
  const textNode = { type: "text", value: text } as Text
  parent.children.push(textNode)
  replaceSCInNode(textNode, 0, parent)
}

function processBacklinkTitle(title: string): Parent {
  const parent = { type: "element", tagName: "span", properties: {}, children: [] } as Parent
  const htmlAst = fromHtml(title, { fragment: true })
  processHtmlAst(htmlAst, parent)
  return parent
}

function processHtmlAst(htmlAst: any, parent: Parent): void {
  htmlAst.children.forEach((node: any) => {
    if (node.type === "text") {
      processSmallCaps(node.value, parent)
    } else if (node.type === "element") {
      const newElement = {
        type: "element",
        tagName: node.tagName,
        properties: { ...node.properties },
        children: [],
      } as Element
      parent.children.push(newElement)
      processHtmlAst(node, newElement)
    }
  })
}

function elementToJsx(elt: RootContent): JSX.Element {
  switch (elt.type) {
    case "text":
      return <>{elt.value}</>
    case "element":
      if (elt.tagName === "abbr") {
        const abbrText = (elt.children[0] as Text).value
        const className = (elt.properties?.className as string[])?.join(" ") || ""
        return <abbr className={className}>{abbrText}</abbr>
      } else {
        return <span>{elt.children.map(elementToJsx)}</span>
      }
    default:
      return <></>
  }
}

const BacklinksList = ({
  backlinkFiles,
  currentSlug,
}: {
  backlinkFiles: any[]
  currentSlug: FullSlug
}) => (
  <ul class="backlinks-list" id="backlinks">
    {backlinkFiles.map((f) => {
      const processedTitle = processBacklinkTitle(f.frontmatter?.title || "")
      return (
        <li key={f.slug}>
          <a href={resolveRelative(currentSlug, f.slug!)} class="internal">
            {processedTitle.children.map(elementToJsx)}
          </a>
        </li>
      )
    })}
  </ul>
)

export const Backlinks: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const slug = simplifySlug(fileData.slug!)
  const backlinkFiles = allFiles.filter((file) => file.links?.includes(slug))

  if (backlinkFiles.length === 0) return <></>

  return (
    <blockquote
      class="callout callout-metadata is-collapsible is-collapsed"
      data-callout="link"
      data-callout-fold=""
    >
      <div class="callout-title" style="padding-bottom: 1rem;">
        <div class="callout-icon"></div>
        <div class="callout-title-inner">
          <p>Links to this page</p>
        </div>
        <div class="fold-callout-icon"></div>
      </div>
      <div class="callout-content" id="backlinks">
        <BacklinksList backlinkFiles={backlinkFiles} currentSlug={fileData.slug!} />
      </div>
    </blockquote>
  )
}

// TODO apply tag-acronyms
