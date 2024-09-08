import { formatDate, getDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { TagList } from "./TagList"
import { GetQuartzPath } from "../plugins/transformers/linkfavicons"
import style from "./styles/contentMeta.scss"
import { ValidLocale } from "../i18n"

const renderTags = (props: QuartzComponentProps) => TagList({ ...props, displayClass: "tags" })

const formatDateStr = (date: Date, locale: ValidLocale) => ` on ${formatDate(date, locale)}`

const getDateToFormat = (frontmatter: any, fileData: any, cfg: any) =>
  frontmatter?.date_published
    ? new Date(frontmatter.date_published)
    : fileData.dates
      ? getDate(cfg, fileData)
      : null

const renderDateElement = (frontmatter: any, dateStr: string) => (
  <time datetime={frontmatter?.date_published}>{dateStr}</time>
)

const getFaviconPaths = (originalURL: URL) => {
  const quartzPath = `https://assets.turntrout.com${GetQuartzPath(originalURL.hostname)}`
  return {
    quartzPath,
    avifPath: quartzPath.replace(".png", ".avif"),
  }
}

const renderPublicationInfo = (frontmatter: any, cfg: any, fileData: any) => {
  if (typeof frontmatter?.original_url !== "string") return null

  const publicationStr = frontmatter?.date_published ? "Originally published" : "Published"
  const dateToFormat = getDateToFormat(frontmatter, fileData, cfg)
  const dateStr = dateToFormat ? formatDateStr(dateToFormat, cfg.locale) : ""
  const dateElement = renderDateElement(frontmatter, dateStr)

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

const ContentMetadata = ({ cfg, fileData, displayClass }: QuartzComponentProps) => {
  if (fileData.frontmatter?.hide_metadata || !fileData.text) {
    return null
  }

  const metadataElements = [
    renderTags({ cfg, fileData, displayClass }),
    renderPublicationInfo(fileData.frontmatter, cfg, fileData),
    // Add more metadata elements here
  ].filter(Boolean)

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
