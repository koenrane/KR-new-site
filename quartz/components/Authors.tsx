import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Authors: QuartzComponent = ({ fileData }: QuartzComponentProps) => {
  if (fileData.frontmatter?.hide_metadata || fileData.frontmatter?.hide_authors) {
    return null
  }

  let authors = "Alex Turner"
  if (fileData.frontmatter?.authors) {
    authors = fileData.frontmatter.authors as string
  }
  authors = "By " + authors

  return (
    <span>
      <p class="authors">
        {authors}
        <br />
      </p>
    </span>
  )
}

export default (() => Authors) satisfies QuartzComponentConstructor
