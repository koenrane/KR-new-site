import { htmlToJsx } from "../../util/jsx"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import { addListItem } from "../TableOfContents"

const Content: QuartzComponent = ({ fileData, tree }: QuartzComponentProps) => {
  const useDropcap = !fileData?.frontmatter?.no_dropcap

  const content = htmlToJsx(fileData.filePath!, tree)
  const classes: string[] = fileData.frontmatter?.cssclasses ?? []
  const classString = ["popover-hint", ...classes].join(" ")
  const toc = renderTableOfContents(fileData)
  return (
    <article class={classString} data-use-dropcap={useDropcap}>
      <span class="mobile-only">{toc}</span>
      {content}
    </article>
  )
}

function renderTableOfContents(fileData: QuartzComponentProps["fileData"]): JSX.Element | null {
  if (!fileData.toc || fileData.frontmatter?.toc === "false") {
    return null
  }

  const toc = addListItem(fileData.toc, 0)
  return (
    <blockquote
      class="callout example is-collapsible is-collapsed"
      data-callout="example"
      data-callout-fold=""
      style="max-height: 75px;" // prevent flashes of unstyled content
    >
      <div class="callout-title">
        <div class="callout-icon"></div>
        <div class="callout-title-inner">
          <p>Table of contents</p>
        </div>
        <div class="fold-callout-icon"></div>
      </div>
      <div id="toc-content-mobile" class="callout-content">
        <ul style="padding-left: 1rem !important;">{toc}</ul>
      </div>
    </blockquote>
  )
}

export default (() => Content) satisfies QuartzComponentConstructor
