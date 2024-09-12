import { QuartzComponent, QuartzComponentProps } from "./types"
import { resolveRelative, simplifySlug } from "../util/path"
import { FullSlug } from "../util/path"

const BacklinksList = ({
  backlinkFiles,
  currentSlug,
}: {
  backlinkFiles: any[]
  currentSlug: FullSlug
}) => (
  <ul class="backlinks-list" id="backlinks">
    {backlinkFiles.map((f) => (
      <li>
        <a href={resolveRelative(currentSlug, f.slug!)} class="internal">
          {f.frontmatter?.title}
        </a>
      </li>
    ))}
  </ul>
)

export const Backlinks: QuartzComponent = ({ fileData, allFiles }: QuartzComponentProps) => {
  const slug = simplifySlug(fileData.slug!)
  const backlinkFiles = allFiles.filter((file) => file.links?.includes(slug))

  if (backlinkFiles.length === 0) return <></>

  return (
    <blockquote
      class="callout callout-metadata is-collapsible is-collapsed"
      data-callout="link"
      data-callout-fold=""
    >
      <div class="callout-title" style="padding-bottom: 1rem;">
        <div class="callout-icon"></div>
        <div class="callout-title-inner">
          <p>Links to this page</p>
        </div>
        <div class="fold-callout-icon"></div>
      </div>
      <div class="callout-content" id="backlinks">
        <BacklinksList backlinkFiles={backlinkFiles} currentSlug={fileData.slug!} />
      </div>
    </blockquote>
  ) // TODO in general make ul have indent on second line, take solution from toc
}

// TODO apply tag-acronyms
