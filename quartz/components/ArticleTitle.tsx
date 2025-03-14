import React from "react"

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

import { classNames } from "../util/lang"
import { formatTitle } from "./component_utils"
import { formatTag } from "./TagList"

const ArticleTitle: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  if (fileData.frontmatter?.hide_title) {
    return null
  }
  if (fileData.frontmatter?.title) {
    fileData.frontmatter.title = formatTitle(fileData.frontmatter.title)
  }
  const title = fileData.frontmatter?.title
  let titleContent = null

  if (title) {
    titleContent = (
      <h1 id="article-title" className={classNames(displayClass)}>
        {title}
      </h1>
    )
    if (title.match("Tag: ")) {
      const tagText = formatTag(title.split("Tag: ")[1])
      titleContent = (
        <h1 className={classNames(displayClass, "article-title")}>
          Tag: <span className="tag-text">{tagText}</span>
        </h1>
      )
    }
  }

  return titleContent
}

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
