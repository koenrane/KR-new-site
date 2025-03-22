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
  let tagContent = <>{title}</>

  // Tags are styled like inline code
  if (title?.match("Tag: ")) {
    const tagText = title.split("Tag: ")[1]
    tagContent = (
      <>
        Tag: <span className="tag-text">{formatTag(tagText)}</span>
      </>
    )
  }

  return (
    <h1 id="article-title" className={classNames(displayClass)}>
      {tagContent}
    </h1>
  )
}

export default (() => ArticleTitle) satisfies QuartzComponentConstructor
