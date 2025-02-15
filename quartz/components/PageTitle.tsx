/* eslint-disable react/no-unknown-property */
// (For the spa-preserve attribute)

import React from "react"

import { i18n } from "../i18n"
import { classNames } from "../util/lang"
import { type FullSlug, pathToRoot } from "../util/path"
import {
  type QuartzComponent,
  type QuartzComponentConstructor,
  type QuartzComponentProps,
} from "./types"
const altText = "A goose and a trout play in a pond in front of a castle."
export const headerVideoContainer = (
  <span id="header-video-container">
    <img
      src="https://assets.turntrout.com/static/pond.gif"
      id="header-gif"
      className="header-img no-select no-vsc"
      alt={altText}
      spa-preserve
    />
  </span>
)

const PageTitle: QuartzComponent = ({ fileData, cfg, displayClass }: QuartzComponentProps) => {
  const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
  const baseDir = pathToRoot(fileData.slug || ("" as FullSlug))

  return (
    <div className={classNames(displayClass, "page-title")}>
      <a href={baseDir}>{headerVideoContainer}</a>
      <h2 className="page-title-text">
        <a href={baseDir} id="page-title-text">
          {title}
        </a>
      </h2>
    </div>
  )
}

export default (() => PageTitle) satisfies QuartzComponentConstructor
