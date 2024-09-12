import { formatDate, getDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { TURNTROUT_FAVICON_PATH } from "../plugins/transformers/linkfavicons"
import { classNames } from "../util/lang"
import { TagList } from "./TagList"
import { GetQuartzPath, urlCache } from "../plugins/transformers/linkfavicons"
import style from "./styles/contentMeta.scss"
import { ValidLocale } from "../i18n"
import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"
import readingTime from "reading-time"

export const formatDateStr = (date: Date, locale: ValidLocale): string =>
  ` on ${formatDate(date, locale)}`

// Determine which date to use for formatting
export const getDateToFormat = (
  fileData: QuartzPluginData,
  cfg: GlobalConfiguration,
): Date | undefined => {
  if (fileData.frontmatter?.date_published) {
    return new Date(fileData.frontmatter.date_published as string)
  }

  if (fileData.dates) {
    return getDate(cfg, fileData)
  }

  return undefined
}

// Render date element with proper datetime attribute
export const renderDateElement = (fileData: QuartzPluginData, dateStr: string): JSX.Element => (
  <time datetime={fileData.frontmatter?.date_published as string}>{dateStr}</time>
)

export const getFaviconPath = (originalURL: URL): string | null => {
  const quartzPath = GetQuartzPath(originalURL.hostname)
  const cachedPath = urlCache.get(quartzPath) || null
  return cachedPath?.replace(".png", ".avif") || null
}

// Render publication information including original URL and date
export const renderPublicationInfo = (
  cfg: GlobalConfiguration,
  fileData: QuartzPluginData,
): JSX.Element => {
  const frontmatter = fileData.frontmatter
  if (typeof frontmatter?.original_url !== "string") return <></>

  const publicationStr = frontmatter?.date_published ? "Originally published" : "Published"
  const dateToFormat = getDateToFormat(fileData, cfg)
  const dateStr = dateToFormat ? formatDateStr(dateToFormat, cfg.locale) : ""
  const dateElement = renderDateElement(fileData, dateStr)

  const originalURL = new URL(frontmatter.original_url)
  const faviconPath = getFaviconPath(originalURL)

  return (
    <span className="publication-str">
      <a href={frontmatter.original_url} class="external" target="_blank">
        {publicationStr}
      </a>
      {faviconPath && <img src={faviconPath} class="favicon" alt="" />}
      {dateElement}
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
  const remainingMinutes = minutes % 60

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

  const text = fileData.text
  const { minutes } = readingTime(text!)
  const displayedTime = processReadingTime(Math.ceil(minutes))

  return (
    <span className="reading-time">
      <b>Read time:</b> {displayedTime}
    </span>
  )
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
      <a href={linkpostUrl} className="external" target="_blank">
        {displayText}
      </a>
      {faviconPath && <img src={faviconPath} className="favicon" alt="" />}
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
    <blockquote class="callout callout-metadata" data-callout="tag">
      <div class="callout-title">
        <div class="callout-icon"></div>
        <div class="callout-title-inner">Tags</div>
      </div>
      <TagList {...props} />
    </blockquote>
  )
}

export const renderSequenceTitle = (fileData: QuartzPluginData): JSX.Element | null => {
  const sequence = fileData.frontmatter?.["lw-sequence-title"]
  if (typeof sequence !== "string") return null
  const sequenceLink: string = fileData.frontmatter?.["sequence-link"] as string
  const faviconPathSequence = null

  return (
    <div className="callout-title-inner">
      <b>Sequence:</b>{" "}
      <a href={sequenceLink} className="internal">
        {sequence}
      </a>
      {faviconPathSequence && <img src={faviconPathSequence} className="favicon" alt="" />}
    </div>
  )
}

export const renderPreviousPost = (fileData: QuartzPluginData): JSX.Element | null => {
  const prevPostSlug: string = (fileData.frontmatter?.["prev-post-slug"] as string) || ""
  const prevPostTitle: string = (fileData.frontmatter?.["prev-post-title"] as string) || ""
  if (!prevPostSlug) return null

  const faviconPathPrev = TURNTROUT_FAVICON_PATH

  return (
    <p>
      <b>Previous:</b>{" "}
      <a href={prevPostSlug} className="internal">
        {prevPostTitle}
      </a>
      {faviconPathPrev && <img src={faviconPathPrev} className="favicon" alt="" />}
    </p>
  )
}

export const renderNextPost = (fileData: QuartzPluginData): JSX.Element | null => {
  const nextPostSlug: string = (fileData.frontmatter?.["next-post-slug"] as string) || ""
  const nextPostTitle: string = (fileData.frontmatter?.["next-post-title"] as string) || ""
  if (!nextPostSlug) return null

  const faviconPathNext = TURNTROUT_FAVICON_PATH

  return (
    <p>
      <b>Next:</b>{" "}
      <a href={nextPostSlug} className="internal">
        {nextPostTitle}
      </a>
      {faviconPathNext && <img src={faviconPathNext} className="favicon" alt="" />}
    </p>
  )
}

const renderSequenceInfo = (fileData: QuartzPluginData): JSX.Element | null => {
  const sequenceTitle = renderSequenceTitle(fileData)
  if (!sequenceTitle) return null

  return (
    <blockquote class="callout callout-metadata" data-callout="example">
      <div class="callout-title">
        <div class="callout-icon"></div>
        {sequenceTitle}
      </div>
      <div class="callout-content">
        {renderPreviousPost(fileData)}
        {renderNextPost(fileData)}
      </div>
    </blockquote>
  )
}

export const ContentMetadata = (props: QuartzComponentProps) => {
  const { cfg, fileData, displayClass } = props
  if (fileData.frontmatter?.hide_metadata || !fileData.text) {
    return null
  }

  // Collect all metadata elements
  const metadataElements = [
    renderTags(props),
    renderPublicationInfo(cfg, fileData),
    renderLinkpostInfo(fileData),
    renderReadingTime(fileData),
    renderSequenceInfo(fileData),
  ]

  const filteredElements = metadataElements.filter(Boolean) // Remove any null or undefined elements

  return (
    <div id="content-meta" className={classNames(displayClass)}>
      {filteredElements.map((element, index) => (
        <p key={index}>{element}</p>
      ))}
    </div>
  )
}

ContentMetadata.css = style

export default (() => ContentMetadata) satisfies QuartzComponentConstructor
