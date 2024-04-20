import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const Authors: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  if (fileData.frontmatter?.hide_metadata) {
    return null
  }
  let authors = "Alex Turner"
  if (fileData.frontmatter?.authors) {
    authors = fileData.frontmatter?.authors as string
  }
  authors = "By " + authors
  if (fileData.frontmatter?.hide_authors) {
    return ""
  }

  return <p class="authors content-meta">{authors}</p>
}

Authors.css = `
.article-title {
  margin: 2rem 0 0 0;
}
`

export default (() => Authors) satisfies QuartzComponentConstructor
