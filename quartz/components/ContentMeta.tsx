import { formatDate, getDate } from "./Date"
import { QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { TagList } from "./TagList"
import { GetQuartzPath } from "../plugins/transformers/linkfavicons"
import { JSX } from "preact"
import style from "./styles/contentMeta.scss"

export default ((opts?) => {
  function ContentMetadata({ cfg, fileData, displayClass }: QuartzComponentProps) {
    if (fileData.frontmatter?.hide_metadata) {
      return null
    }

    const text = fileData.text

    if (text) {
      const tags: Element = TagList({ cfg, fileData, displayClass: "tags" })
      const segments: (string | JSX.Element)[] = [tags]
      const frontmatter = fileData.frontmatter

      if (frontmatter?.original_url) {
        let dateStr = ""
        // TODO automate this for new posts
        let publicationStr = "Published"
        if (frontmatter?.date_published) {
          publicationStr = "Originally published"
          const formattedDate: Date = formatDate(new Date(frontmatter?.date_published))
          dateStr = " on " + formattedDate
        } else if (fileData.dates) {
          const formattedDate: Date = formatDate(getDate(cfg, fileData)!, cfg.locale)
          dateStr = " on " + formattedDate
        }
        dateStr = <time datetime={frontmatter?.date_published}>{dateStr}</time>

        const originalURL = new URL(frontmatter?.original_url)
        const quartzPath = GetQuartzPath(originalURL.hostname)

        publicationStr = (
          <span className="publication-str">
            <a href={frontmatter?.original_url} class="external">
              {publicationStr}
            </a>
            <img src={quartzPath} class="favicon" alt={"Favicon for " + originalURL.hostname} />
            {dateStr}
          </span>
        )

        segments.push(publicationStr)
      }

      const segmentsElements = segments.map((segment) => <p>{segment}</p>)
      return (
        <div id="content-meta" class={classNames(displayClass)}>
          {segmentsElements}
        </div>
      )
    } else {
      return null
    }
  }

  ContentMetadata.css = style

  return ContentMetadata
}) satisfies QuartzComponentConstructor
