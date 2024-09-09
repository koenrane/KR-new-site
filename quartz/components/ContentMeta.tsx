import { formatDate, getDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { TagList } from "./TagList"
import { GetQuartzPath } from "../plugins/transformers/linkfavicons"
import style from "./styles/contentMeta.scss"
import { ValidLocale } from "../i18n"
import { GlobalConfiguration } from "../cfg"
import { QuartzPluginData } from "../plugins/vfile"

const formatDateStr = (date: Date, locale: ValidLocale) => ` on ${formatDate(date, locale)}`

// Determine which date to use for formatting
const getDateToFormat = (fileData: QuartzPluginData, cfg: GlobalConfiguration) =>
  fileData.frontmatter?.date_published
    ? new Date(fileData.frontmatter.date_published as string)
    : fileData.dates
      ? getDate(cfg, fileData)
      : null

// Render date element with proper datetime attribute
const renderDateElement = (fileData: QuartzPluginData, dateStr: string) => (
  <time datetime={fileData.frontmatter?.date_published as string}>{dateStr}</time>
)

// Generate favicon paths for both PNG and AVIF formats
const getFaviconPaths = (originalURL: URL) => {
  const quartzPath = `https://assets.turntrout.com${GetQuartzPath(originalURL.hostname)}`
  return {
    quartzPath,
    avifPath: quartzPath.replace(".png", ".avif"),
  }
}

// Render publication information including original URL and date
const renderPublicationInfo = (cfg: GlobalConfiguration, fileData: QuartzPluginData) => {
  const frontmatter = fileData.frontmatter
  if (typeof frontmatter?.original_url !== "string") return null

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

const ContentMetadata = (props: QuartzComponentProps) => {
  const { cfg, fileData, displayClass } = props
  if (fileData.frontmatter?.hide_metadata || !fileData.text) {
    return null
  }

  // Collect all metadata elements
  const metadataElements = [
    <TagList {...props} />,
    renderPublicationInfo(cfg, fileData),
    // Add more metadata elements here
  ].filter(Boolean) // Remove any null or undefined elements

  return (
    <div id="content-meta" class={classNames(displayClass)}>
      {metadataElements.map((element) => (
        <p>{element}</p>
      ))}
    </div>
  )
}

ContentMetadata.css = style

export default (() => ContentMetadata) satisfies QuartzComponentConstructor
