import { JSX } from "preact"
import * as React from "react"

import type { QuartzComponent, QuartzComponentProps } from "../types"

import { type FullSlug } from "../../util/path"
import { PageList } from "../PageList"
import style from "../styles/listPage.scss"

export const recentSlug = "recent" as FullSlug
export const recentTitle = "Recent Posts"
export const recentDescription = "Recent posts"
export const recentPostsListing = "recent-posts-listing"

export function generateRecentPostsBlock(props: QuartzComponentProps): JSX.Element {
  const pageListing = (
    <span id={recentPostsListing} data-url={recentPostsListing} data-block={recentPostsListing}>
      <PageList {...props} />
    </span>
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
