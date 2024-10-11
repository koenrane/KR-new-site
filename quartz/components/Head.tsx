import { i18n } from "../i18n"
import { JSResourceToScriptElement } from "../util/resources"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { formatTitle } from "./component_utils"
import React from "react"
import { joinSegments, pathToRoot } from "../util/path"

export default (() => {
  const Head: QuartzComponent = ({ cfg, fileData, externalResources }: QuartzComponentProps) => {
    let title = fileData.frontmatter?.title ?? i18n(cfg.locale).propertyDefaults.title
    title = formatTitle(title)
    const description =
      fileData.description?.trim() ?? i18n(cfg.locale).propertyDefaults.description

    let authorElement = undefined
    if (fileData.frontmatter?.authors) {
      const authors = fileData.frontmatter.authors as string
      authorElement = (
        <>
          <meta name="twitter:label1" content="Written by" />
          <meta name="twitter:data1" content={authors} />
        </>
      )
    }

    // Reconstruct the URL for this page (its permalink)
    const url = new URL(`https://${cfg.baseUrl ?? "turntrout.com"}/${fileData.slug}`)
    const permalink = fileData.permalink || url.href

    // Images and other assets ---
    const iconPath = joinSegments(pathToRoot(fileData.slug!), "static/images/favicon.ico")
    const appleIconPath = joinSegments(pathToRoot(fileData.slug!), "static/images/apple-icon.png")
    const siteImage = "https://assets.turntrout.com/static/images/fb_preview.avif"

    // Different images for different preview sizes
    let mediaElement = (
      <>
        <meta property="og:image" content="https://assets.turntrout.com/static/pond.webm" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="1200" />
        <meta
          property="og:image:alt"
          content="A trout and a goose playing in a pond with a castle in the background."
        />

        <meta property="og:image" content={siteImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="A pond containing a goose peacefully gazing at a castle."
        />
      </>
    )

    if (fileData?.frontmatter?.video_preview_link) {
      mediaElement = <meta property="og:video" content={fileData.video_preview_link as string} />
    }

    // Scripts
    const { css, js } = externalResources
    const analyticsScript = (
      <script
        defer
        src="https://cloud.umami.is/script.js"
        data-website-id="fa8c3e1c-3a3c-4f6d-a913-6f580765bfae"
      ></script>
    )

    return (
      <head>
        <title>{title}</title>
        <meta name="description" content={description} />

        <meta charSet="utf-8" />
        <script src="/static/scripts/detect-dark-mode.js"></script>
        <script src="/static/scripts/collapsible-listeners.js"></script>
        {analyticsScript}

        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        {fileData.frontmatter?.avoidIndexing && (
          <meta name="robots" content="noindex, noimageindex,nofollow" />
        )}

        <meta property="og:title" content={title} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={permalink as string} />
        <meta property="og:site_name" content="The Pond" />
        <meta property="og:description" content={description} />
        {mediaElement}

        {/* Twitter Card metadata */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={siteImage} />
        <meta name="twitter:site" content="@Turn_Trout" />

        {/* Twitter author metadata */}
        {authorElement}

        <link rel="icon" href={iconPath} />
        <link rel="apple-touch-icon" href={appleIconPath} />
        {css.map((href) => (
          <link key={href} href={href} rel="stylesheet" type="text/css" />
        ))}
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res))}
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
