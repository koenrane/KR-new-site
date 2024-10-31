import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "../types"
import style from "../styles/listPage.scss"
import { formatTag } from "../TagList"
import { getAllSegmentPrefixes } from "../../util/path"
import React from "react"

const AllTagsContent: QuartzComponent = (props: QuartzComponentProps) => {
  const { fileData, allFiles, cfg } = props
  const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
  const classes = ["popover-hint", ...cssClasses].join(" ")

  // Get all unique tags and their counts
  const tagMap = new Map<string, number>()
  allFiles.forEach((file) => {
    const tags = (file.frontmatter?.tags ?? []).flatMap(getAllSegmentPrefixes)
    tags.forEach((tag) => {
      tagMap.set(tag, (tagMap.get(tag) ?? 0) + 1)
    })
  })

  // Convert to array and sort alphabetically
  const sortedTags = Array.from(tagMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], cfg.locale),
  )

  return (
    <div className={classes}>
      <article>
        <div className="all-tags">
          {sortedTags.map(([tag, count]) => (
            <div key={tag} className="tag-container">
              <a className="internal tag-link" href={`../tags/${tag}`}>
                {formatTag(tag)}
              </a>
              <span className="tag-count">({count})</span>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

AllTagsContent.css = style

export default (() => AllTagsContent) satisfies QuartzComponentConstructor
