import { pathToRoot } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

const altText = "A goose and a trout play in a pond in front of a castle."
export const headerVideoContainer = (
  <span id="header-video-container">
    <img
      src="https://assets.turntrout.com/static/pond.gif"
      id="header-gif"
      class="header-img no-select no-vsc"
      alt={altText}
    />
    <video
      autoPlay
      loop
      muted
      playsInline
      poster="https://assets.turntrout.com/static/images/pond_placeholder.avif"
      id="header-video"
      class="header-img no-select no-vsc"
      alt={altText}
    >
      <source src="https://assets.turntrout.com/static/pond.webm" type="video/webm"></source>
    </video>
  </span>
)

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug!)

  return (
    <div class={classNames(displayClass, "page-title")}>
      <a href={baseDir}>{headerVideoContainer}</a>
      <h2 class="page-title-text">
        <a href={baseDir} id="page-title-text">
          {title}
        </a>
      </h2>
    </div>
  )
}

PageTitle.css = `
.page-title {
  margin: 0;
}
`

export default (() => PageTitle) satisfies QuartzComponentConstructor
