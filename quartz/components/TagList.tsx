import { pathToRoot, slugTag } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

export const formatTag = (tag: string): string => {
  // Ensure input is a string (using optional chaining for safety)
  tag = tag?.replace(/-/g, " ").toLowerCase() ?? ""
  tag = tag?.replaceAll("ai", "AI")
  tag = tag?.replaceAll("power seeking", "power-seeking")

  return tag
}

export const getTags = (fileData: any) => {
  let tags = fileData.frontmatter?.tags || []
  tags = tags.map(formatTag)
  return tags.sort((a: string, b: string) => b.length - a.length)
}

export const TagList: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  // Sort by string lenth, descending
  let tags = getTags(fileData)
  if (tags && tags.length > 0) {
    return (
      <>
        <ul class={classNames(displayClass, "tags")}>
          {tags.map((tag: any) => {
            const linkDest = `/tags/${slugTag(tag)}`
            return (
              <a href={linkDest} class="internal tag-link">
                {tag}
              </a>
            )
          })}
        </ul>
      </>
    )
  } else {
    return null
  }
}

export default (() => TagList) satisfies QuartzComponentConstructor
