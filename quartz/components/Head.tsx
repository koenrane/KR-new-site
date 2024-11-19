/* eslint-disable react/no-unknown-property */
// (For the spa-preserve attribute)

{
  /* eslint-disable @typescript-eslint/no-explicit-any */
}
// for the onLoad event

import React from "react"

import { i18n } from "../i18n"
import { FullSlug, joinSegments, pathToRoot } from "../util/path"
import { JSResourceToScriptElement } from "../util/resources"
import { formatTitle } from "./component_utils"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

// Preload icons to prevent race condition on callout icons
//  These are very small assets, so we can preload them all
const CALLOUT_ICONS = [
  "note",
  "abstract",
  "info",
  "todo",
  "success",
  "question",
  "warning",
  "failure",
  "danger",
  "bug",
  "example",
  "quote",
  "fold",
  "plus",
  "lightbulb",
  "goose",
  "heart",
  "tag",
  "link",
  "math",
  "dollar",
] as const

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
    const iconPath = joinSegments(
      pathToRoot(fileData.slug || ("" as FullSlug)),
      "static/images/favicon.ico",
    )
    const appleIconPath = "https://assets.turntrout.com/static/images/apple-icon.png"
    const siteImage = "https://assets.turntrout.com/static/images/fb_preview.png"

    const cardImage = (fileData.frontmatter?.card_image as string) ?? siteImage

    // Different images for different preview sizes
    let mediaElement = (
      <>
        <meta property="og:image" content={cardImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta
          property="og:image:alt"
          content="A pond containing a trout and a goose peacefully swimming near a castle."
        />
      </>
    )

    if (fileData?.frontmatter?.video_preview_link) {
      mediaElement = <meta property="og:video" content={fileData.video_preview_link as string} />
    }

    // Scripts
    const { js } = externalResources
    const analyticsScript = (
      <script
        defer
        src="https://cloud.umami.is/script.js"
        data-website-id="fa8c3e1c-3a3c-4f6d-a913-6f580765bfae"
        spa-preserve
      ></script>
    )
    // Create a filtered object with only the properties you want to expose
    const exposedFrontmatter = {
      no_dropcap: fileData.frontmatter?.no_dropcap === true,
    }

    const frontmatterScript = (
      <script
        type="application/json"
        id="quartz-frontmatter"
        dangerouslySetInnerHTML={{
          // skipcq: JS-0440
          __html: JSON.stringify(exposedFrontmatter),
        }}
      />
    )

    const iconPreloads = CALLOUT_ICONS.map((icon) => {
      return (
        <link
          key={icon}
          rel="preload"
          href={`https://assets.turntrout.com/static/icons/${icon}.svg`}
          as="image"
          type="image/svg+xml"
          crossorigin="anonymous"
          spa-preserve
        />
      )
    })

    return (
      <head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta charSet="utf-8" />

        {/* Prevent FOUC */}
        <style id="hide-body">{`
          body { 
            visibility: hidden;
          }
          :root[saved-theme="dark"] body {
            background-color: var(--light);
          }
        `}</style>

        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

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
        <meta name="twitter:image" content={cardImage} />
        <meta name="twitter:site" content="@Turn_Trout" />

        {/* Twitter author metadata */}
        {authorElement}

        <link
          rel="preload"
          as="style"
          href="/index.css"
          onLoad={`this.rel='stylesheet';` as any}
          spa-preserve
        />

        {fileData.frontmatter?.avoidIndexing && (
          <meta name="robots" content="noindex, noimageindex,nofollow" />
        )}
        <link rel="robots" href="/static/robots.txt" type="text/plain" />

        <script src="/static/scripts/detect-dark-mode.js" spa-preserve></script>
        <script src="/static/scripts/collapsible-listeners.js" spa-preserve></script>
        <script src="/static/scripts/safari-autoplay.js" spa-preserve></script>
        <script src="/static/scripts/remove-css.js" spa-preserve></script>
        {analyticsScript}

        <link rel="icon" href={iconPath} />
        <link defer rel="apple-touch-icon" href={appleIconPath} />
        <link defer rel="stylesheet" href="/static/styles/katex.min.css" spa-preserve />
        {js
          .filter((resource) => resource.loadTime === "beforeDOMReady")
          .map((res) => JSResourceToScriptElement(res))}
        {frontmatterScript}

        {iconPreloads}
      </head>
    )
  }

  return Head
}) satisfies QuartzComponentConstructor
