import { formatDate, getDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps, QuartzComponent } from "./types"
import { classNames } from "../util/lang"
import { TagList } from "./TagList"
import { GetQuartzPath } from "../plugins/transformers/linkfavicons"
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

// Generate favicon paths for both PNG and AVIF formats
export const getFaviconPaths = (originalURL: URL): { quartzPath: string; avifPath: string } => {
  const quartzPath = `https://assets.turntrout.com${GetQuartzPath(originalURL.hostname)}`
  return {
    quartzPath,
    avifPath: quartzPath.replace(".png", ".avif"),
  }
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
  const { avifPath } = getFaviconPaths(originalURL)

  return (
    <span className="publication-str">
      <a href={frontmatter.original_url} class="external" target="_blank">
        {publicationStr}
      </a>
      <img src={avifPath} class="favicon" alt="" />
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

export const renderLinkpostInfo = (fileData: QuartzPluginData): JSX.Element | null => {
  const linkpostUrl = fileData.frontmatter?.["lw-linkpost-url"]
  if (typeof linkpostUrl !== "string") return null

  let displayText = linkpostUrl

  const url = new URL(linkpostUrl)
  displayText = url.hostname.replace(/^(https?:\/\/)?(www\.)?/, "")

  return (
    <span className="linkpost-info">
      Originally linked to{" "}
      <a href={linkpostUrl} className="external" target="_blank">
        {displayText}
      </a>
      {/* {faviconPath && <img src={faviconPath} className="favicon" alt="" />} */}
    </span>
  )
}

// a callout that displays the tags for the post
export const renderTags = (props: QuartzComponentProps): JSX.Element => {
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

export const ContentMetadata = (props: QuartzComponentProps) => {
  const { cfg, fileData, displayClass } = props
  if (fileData.frontmatter?.hide_metadata || !fileData.text) {
    return null
  }

  // Collect all metadata elements
  const metadataElements = [
    renderReadingTime(fileData),
    renderTags(props),
    renderPublicationInfo(cfg, fileData),
    renderLinkpostInfo(fileData),
  ]

  const filteredElements = metadataElements.filter(Boolean) // Remove any null or undefined elements
  console.log(filteredElements)

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
