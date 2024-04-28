import { pathToRoot, slugTag } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"

const TagList: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const tags = fileData.frontmatter?.tags
  const baseDir = pathToRoot(fileData.slug!)
  if (tags && tags.length > 0) {
    return (
      <>
        <div>
          <ul class={classNames(displayClass, "tags")}>
            {tags.map((tag) => {
              const linkDest = baseDir + `/tags/${slugTag(tag)}`
              return (
                <a href={linkDest} class="internal tag-link">
                  {tag}
                </a>
              )
            })}
          </ul>
        </div>
      </>
    )
  } else {
    return null
  }
}

export default (() => TagList) satisfies QuartzComponentConstructor
