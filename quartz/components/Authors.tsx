import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { GlobalConfiguration } from "../cfg"
import { renderPublicationInfo } from "./ContentMeta"

const Authors: QuartzComponent = ({ fileData, cfg }: QuartzComponentProps) => {
  if (fileData.frontmatter?.hide_metadata || fileData.frontmatter?.hide_authors) {
    return null
  }

  let authors = "Alex Turner"
  if (fileData.frontmatter?.authors) {
    authors = fileData.frontmatter.authors as string
  }
  authors = "By " + authors

  // Add the publication info
  const publicationInfo = renderPublicationInfo(cfg as GlobalConfiguration, fileData)

  return (
    <span class="authors">
      <p style="text-indent: -.2rem; padding-left: .2rem">{authors}</p>
      {publicationInfo !== <></> && <p>{publicationInfo}</p>}
    </span>
  )
}

export default (() => Authors) satisfies QuartzComponentConstructor
