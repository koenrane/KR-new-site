import { QuartzComponent, QuartzComponentProps } from "../types"
import style from "../styles/listPage.scss"
import { PageList } from "../PageList"
import React from "react"

export const RecentPosts: QuartzComponent = (props: QuartzComponentProps) => {
  const { fileData } = props
  const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
  const classes = ["popover-hint", ...cssClasses].join(" ")

  return (
    <div className={classes}>
      <article>
        <div
          className="page-listing"
          id="recent-posts-listing"
          data-url="recent-posts-listing"
          data-block="recent-posts-listing"
        >
          <PageList {...props} />
        </div>
      </article>
    </div>
  )
}

RecentPosts.css = style
export default RecentPosts
