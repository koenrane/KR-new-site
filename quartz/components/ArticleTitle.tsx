import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { niceQuotes } from "../plugins/transformers/formatting_improvement_html"
import { formatTag } from "./TagList"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  if (fileData.frontmatter?.hide_title) {
    return null
  }

  let title = fileData.frontmatter?.title || ""
  // Replace single quotes with double quotes for consistency
  // NOTE this is a bit of a hack, but probably fine
  console.log(title)
  title = niceQuotes(title)
  if (title.includes("‘") && title.includes("’")) {
    title = title.replace(/(?<= |^)‘/g, "“").replace(/’(?<= |$)/g, "”")
  }
  if (title) {
    let htmlContent = <h1 class={classNames(displayClass, "article-title")}>{title}</h1>
    if (title.match("Tag: ")) {
      const tagText = formatTag(title.split("Tag: ")[1])
      htmlContent = (
        <h1 class={classNames(displayClass, "article-title")}>
          Tag: <span style="font-family:var(--font-monospace); font-size: smaller">{tagText}</span>
        </h1>
      )
    }
    return htmlContent
  } else {
    return null
  }
}

ArticleTitle.css = `
.article-title {
  margin: -2rem 0 0 0;
}
`

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
