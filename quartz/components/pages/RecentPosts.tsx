import { QuartzComponent, QuartzComponentProps } from "../types"
import style from "../styles/listPage.scss"
import { PageList } from "../PageList"
import React from "react"
import { FullSlug } from "../../util/path"

export const recentSlug = "recent" as FullSlug
export const recentTitle = "Recent Posts"
export const recentDescription = "Recent posts"
export const recentPostsListing: string = "recent-posts-listing"

export function generateRecentPostsBlock(props: QuartzComponentProps): JSX.Element {
  const pageListing = (
    <div
      className="page-listing"
      id={recentPostsListing}
      data-url={recentPostsListing}
      data-block={recentPostsListing}
    >
      <PageList {...props} />
    </div>
  )
  return pageListing
}

export const RecentPosts: QuartzComponent = (props: QuartzComponentProps) => {
  const { fileData } = props
  const cssClasses: string[] = fileData.frontmatter?.cssclasses ?? []
  const classes = ["popover-hint", ...cssClasses].join(" ")

  const pageListing = generateRecentPostsBlock(props)

  return (
    <div className={classes}>
      <article>{pageListing}</article>
    </div>
  )
}

RecentPosts.css = style
export default RecentPosts
