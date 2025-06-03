import React from "react"

import type { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

import { type GlobalConfiguration } from "../cfg"
import { RenderPublicationInfo } from "./ContentMeta"

const Authors: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  if (fileData.frontmatter?.hide_metadata || fileData.frontmatter?.hide_authors) {
    return null
  }


  // file's creation/modification date
  let authors = fileData.dates?.created 
    ? new Date(fileData.dates.created).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]




  /*let authors = "KR"
  if (fileData.frontmatter?.authors) {
    authors = fileData.frontmatter.authors as string
  }*/
  //authors = `By ${authors}`

  // Add the publication info
  const publicationInfo = RenderPublicationInfo(cfg as GlobalConfiguration, fileData)

  return (
    <div className="authors">
      <p style={{ textIndent: "-.2rem", paddingLeft: ".2rem", lineHeight: "1.25rem" }}>{authors}</p>
      {publicationInfo && <p>{publicationInfo}</p>}
    </div>
  )
}

export default (() => Authors) satisfies QuartzComponentConstructor
