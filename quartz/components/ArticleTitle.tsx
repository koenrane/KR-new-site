import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { formatTag } from "./TagList"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  if (fileData.frontmatter?.hide_title) {
    return null
  }

  const title = fileData.frontmatter?.title
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
