import type { JSX } from "preact"

import React from "react"
import readingTime from "reading-time"

import { type GlobalConfiguration } from "../cfg"
import { getQuartzPath, urlCache } from "../plugins/transformers/linkfavicons"
import * as linkfavicons from "../plugins/transformers/linkfavicons"
import { type QuartzPluginData } from "../plugins/vfile"
import { Backlinks } from "./Backlinks"
import { formatTitle } from "./component_utils"
import { DateElement } from "./Date"
import style from "./styles/contentMeta.scss"
import { TagList } from "./TagList"
import { type QuartzComponentConstructor, type QuartzComponentProps } from "./types"

export const getFaviconPath = (originalURL: URL): string | null => {
  const quartzPath = getQuartzPath(originalURL.hostname)
  const cachedPath = urlCache.get(quartzPath) || null
  return cachedPath?.replace(".png", ".avif") || null
}

/**
 * Inserts a favicon image next to a given JSX element.
 *
 * @param imgPath - The path to the favicon image, or null if no favicon is available.
 * @param node - The JSX element to which the favicon should be added.
 * @returns A new JSX element with the favicon inserted.
 *
 * If the node contains a string, the favicon is inserted after the last 4 characters (or less).
 * If imgPath is null, the original node is returned unchanged.
 */
export const insertFavicon = (imgPath: string | null, node: JSX.Element): JSX.Element => {
  if (imgPath === null) {
    return node
  }

  const faviconElement: JSX.Element = (
    <img src={imgPath} className="favicon" alt="" key="favicon-img" />
  )

  const textContent = node.props.children
  if (typeof textContent !== "string" || textContent.length < 4) {
    return (
      <>
        {node}
        {faviconElement}
      </>
    )
  }

  const charsToRead = Math.min(linkfavicons.maxCharsToRead, textContent.length)
  const lastChars = textContent.slice(-charsToRead)
  const remainingText = textContent.slice(0, -charsToRead)

  node.props.children = [
    remainingText,
    <span key="favicon-span" className="favicon-span">
      {lastChars}
      {faviconElement}
    </span>,
  ]
  return node
}

// Render publication information including original URL and date
export function RenderPublicationInfo(
  cfg: GlobalConfiguration,
  fileData: QuartzPluginData,
): JSX.Element | null {
  const frontmatter = fileData.frontmatter
  const datePublished = frontmatter?.date_published as Date
  if (!datePublished || frontmatter?.hide_metadata) {
    return null
  }

  const dateElement = (
    <DateElement
      cfg={cfg}
      date={datePublished}
      monthFormat="long"
      includeOrdinalSuffix
      formatOrdinalSuffix
    />
  )

  // If there's an original URL, show "Originally published on" with favicon
  const originalUrl = frontmatter?.original_url
  if (typeof originalUrl === "string") {
    const url = new URL(originalUrl)
    const faviconPath = getFaviconPath(url)

    return (
      <span className="publication-str">
        {insertFavicon(
          faviconPath,
          <a href={url.toString()} className="external" target="_blank" rel="noopener noreferrer">
            Published
          </a>,
        )}
        {" on "}
        {dateElement}
      </span>
    )
  }

  return <span className="publication-str">Published on {dateElement}</span>
}

// Add new function to render last updated info
export function renderLastUpdated(
  cfg: GlobalConfiguration,
  fileData: QuartzPluginData,
): JSX.Element | null {
  const frontmatter = fileData.frontmatter
  if (!frontmatter?.date_updated || frontmatter?.hide_metadata) {
    return null
  }
  const dateUpdated = new Date(frontmatter.date_updated as string)

  const githubFaviconPath = getFaviconPath(new URL("https://github.com"))

  const githubStem = "https://github.com/alexander-turner/TurnTrout.com/blob/main/content/"
  const githubUrl = `${githubStem}${fileData.relativePath}`
  const githubLink = (
    <a href={githubUrl} className="external" target="_blank" rel="noopener noreferrer">
      Updated
    </a>
  )
  const linkWithFavicon = insertFavicon(githubFaviconPath, githubLink)

  const date = (
    <DateElement
      cfg={cfg}
      date={dateUpdated}
      monthFormat="long"
      includeOrdinalSuffix
      formatOrdinalSuffix
    />
  )
  return (
    <span className="last-updated-str">
      {linkWithFavicon} on {date}
    </span>
  )
}

/**
 * Formats reading time into a human-readable string.
 *
 * @param minutes - The total number of minutes to format.
 * @returns A formatted string representing hours and/or minutes.
 *
 * Examples:
 * - 30 minutes -> "30 minutes"
 * - 60 minutes -> "1 hour"
 * - 90 minutes -> "1 hour 30 minutes"
 * - 120 minutes -> "2 hours"
 * - 150 minutes -> "2 hours 30 minutes"
 */
export function processReadingTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = Math.ceil(minutes % 60)

  let timeString = ""

  if (hours > 0) {
    timeString += `${hours} hour${hours > 1 ? "s" : ""}` // Pluralize 'hour' if > 1
    if (remainingMinutes > 0) {
      timeString += " " // Add separator if we also have minutes
    }
  }

  if (remainingMinutes > 0) {
    timeString += `${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}` // Pluralize 'minute' if > 1
  }

  return timeString
}

export const renderReadingTime = (fileData: QuartzPluginData): JSX.Element => {
  if (fileData.frontmatter?.hide_reading_time) {
    return <></>
  }

  const text = fileData.text as string
  const { minutes } = readingTime(text)
  const displayedTime = processReadingTime(Math.ceil(minutes))

  return <span className="reading-time">Read time: {displayedTime}</span>
}

// Modify renderLinkpostInfo function
export const renderLinkpostInfo = (fileData: QuartzPluginData): JSX.Element | null => {
  const linkpostUrl = fileData.frontmatter?.["lw-linkpost-url"]
  if (typeof linkpostUrl !== "string") return null

  let displayText = linkpostUrl

  const url = new URL(linkpostUrl)
  displayText = url.hostname.replace(/^(https?:\/\/)?(www\.)?/, "")

  const faviconPath = getFaviconPath(url)
  return (
    <span className="linkpost-info">
      Originally linked to{" "}
      {insertFavicon(
        faviconPath,
        <a href={linkpostUrl} className="external" target="_blank" rel="noopener noreferrer">
          <code>{displayText}</code>
        </a>,
      )}
    </span>
  )
}

// a callout that displays the tags for the post
export const renderTags = (props: QuartzComponentProps): JSX.Element => {
  // Check if there are any tags
  const tags = props.fileData.frontmatter?.tags
  if (!tags || tags.length === 0) {
    return <></>
  }

  return (
    <blockquote className="callout callout-metadata" data-callout="tag">
      <div className="callout-title">
        <div className="callout-icon"></div>
        <div className="callout-title-inner">Tags</div>
      </div>
      <div className="callout-content" id="tags">
        <TagList {...props} />
      </div>
    </blockquote>
  )
}

export const renderSequenceTitleJsx = (fileData: QuartzPluginData) => {
  const sequence = fileData.frontmatter?.["lw-sequence-title"]
  if (!sequence) return null
  const sequenceLink: string = fileData.frontmatter?.["sequence-link"] as string

  return (
    <div>
      <b>Sequence:</b>{" "}
      <a href={sequenceLink} className="internal" style={{ cursor: "pointer" }}>
        {sequence}
      </a>
    </div>
  )
}
export const renderPreviousPostJsx = (fileData: QuartzPluginData) => {
  const prevPostSlug: string = (fileData.frontmatter?.["prev-post-slug"] as string) || ""
  const prevPostTitle: string = (fileData.frontmatter?.["prev-post-title"] as string) || ""
  const prevPostTitleFormatted = formatTitle(prevPostTitle)
  if (!prevPostSlug) return null

  return (
    <p style={{ margin: 0 }}>
      <b>Previous:</b>{" "}
      <a href={prevPostSlug} className="internal">
        {prevPostTitleFormatted}
      </a>
    </p>
  )
}

export const renderNextPostJsx = (fileData: QuartzPluginData) => {
  const nextPostSlug: string = (fileData.frontmatter?.["next-post-slug"] as string) || ""
  const nextPostTitle: string = (fileData.frontmatter?.["next-post-title"] as string) || ""
  const nextPostTitleFormatted = formatTitle(nextPostTitle)
  if (!nextPostSlug) return null

  return (
    <p style={{ marginTop: ".5rem" }}>
      <b>Next:</b>{" "}
      <a href={nextPostSlug} className="internal">
        {nextPostTitleFormatted}
      </a>
    </p>
  )
}

const renderSequenceInfo = (fileData: QuartzPluginData): JSX.Element | null => {
  const sequenceTitle = renderSequenceTitleJsx(fileData)
  if (!sequenceTitle) return null

  const sequenceTitleJsx = renderSequenceTitleJsx(fileData)
  const previousPostJsx = renderPreviousPostJsx(fileData)
  const nextPostJsx = renderNextPostJsx(fileData)

  return (
    <blockquote className="callout callout-metadata" data-callout="example">
      <div className="callout-title">
        <div className="callout-icon"></div>
        {sequenceTitleJsx}
      </div>
      <div className="callout-content">
        {previousPostJsx}
        {nextPostJsx}
      </div>
    </blockquote>
  )
}

export function renderPostStatistics(props: QuartzComponentProps): JSX.Element | null {
  const readingTime = renderReadingTime(props.fileData)
  const linkpostInfo = renderLinkpostInfo(props.fileData)
  const publicationInfo = RenderPublicationInfo(props.cfg, props.fileData)
  const lastUpdated = renderLastUpdated(props.cfg, props.fileData)

  return (
    <blockquote id="post-statistics" className="callout callout-metadata" data-callout="info">
      <div className="callout-title">
        <div className="callout-icon"></div>
        <div className="callout-title-inner">About this post</div>
      </div>
      <div className="callout-content">
        <ul>
          {readingTime && <li>{readingTime}</li>}
          {linkpostInfo && <li>{linkpostInfo}</li>}
          {publicationInfo && <li>{publicationInfo}</li>}
          {lastUpdated && <li>{lastUpdated}</li>}
        </ul>
      </div>
    </blockquote>
  )
}

export const ContentMetadata = (props: QuartzComponentProps) => {
  if (props.fileData.frontmatter?.hide_metadata || !props.fileData.text) {
    return null
  }

  // Collect all metadata elements
  const metadataElements = [
    renderSequenceInfo(props.fileData),
    renderTags(props),
    renderPostStatistics(props),
  ]

  const filteredElements = metadataElements.filter(Boolean) // Remove any null or undefined elements

  return (
    <div id="content-meta">
      {filteredElements}
      <Backlinks {...props} />
    </div>
  )
}

ContentMetadata.css = style

export default (() => ContentMetadata) satisfies QuartzComponentConstructor
