import { i18n } from "../i18n"
import { FullSlug, joinSegments, pathToRoot } from "../util/path"
import { JSResourceToScriptElement } from "../util/resources"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { formatTitle } from "./component_utils"

export default (() => {
  const Head: QuartzComponent = ({ cfg, fileData, externalResources }: QuartzComponentProps) => {
    let title = fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title
    title = formatTitle(title)
    const description =
      fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description
    const { css, js } = externalResources

    const url = new URL(`https://${cfg.baseUrl ?? "turntrout.com"}`)
    const path = url.pathname as FullSlug
    const baseDir = fileData.slug === "404" ? path : pathToRoot(fileData.slug!)

    const iconPath = joinSegments(baseDir, "static/images/favicon.ico")
    const permalink = fileData.permalink || url.href
    const siteImage = joinSegments("https://assets.turntrout.com/static/pond.webm")

    return (
      <head>
        <title>{title}</title>
        <meta charSet="utf-8" />
        <script src="/static/scripts/detect-dark-mode.js"></script>
        <script src="/static/scripts/tag-first-letter.js"></script>
        <script src="/static/scripts/twemoji.min.js"></script>
        <script src="/static/scripts/twemoji-parse.js"></script>
        <script src="/static/scripts/collapsible-listeners.js"></script>
        <script src="/static/scripts/DOMContentLoaded.js"></script>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta property="og:title" content={title} />
        <meta property="og:url" content={permalink} />
        <meta property="og:site_name" content="The Pond" />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={siteImage} />
        <meta
          property="og:image:alt"
          content="A trout and a goose playing in a pond, with a castle in the background."
        />
        {/* <meta property="og:width" content="1200" /> */}
        {/* <meta property="og:height" content="675" /> */}
        <link rel="icon" href={iconPath} />
        <meta name="description" content={description} />
        <meta name="generator" content="Quartz" />
        {css.map((href) => (
          <link key={href} href={href} rel="stylesheet" type="text/css" spa-preserve />
        ))}
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res, true))}
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
