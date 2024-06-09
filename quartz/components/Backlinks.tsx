import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import style from "./styles/backlinks.scss"
import { resolveRelative, simplifySlug } from "../util/path"
import { i18n } from "../i18n"
import { classNames } from "../util/lang"

const Backlinks: QuartzComponent = ({
  fileData,
  allFiles,
  displayClass,
  cfg,
}: QuartzComponentProps) => {
  const slug = simplifySlug(fileData.slug!)
  // TODO remove posts"
  const backlinkFiles = allFiles.filter((file) => file.links?.includes(slug))

  // Only render if there are backlinks
  if (backlinkFiles.length > 0) {
    return (
      <div class="collapsible" id="backlinks">
        <div class={`collapsible-title ${classNames(displayClass, "backlinks")}`}>
          <h5>{i18n(cfg.locale).components.backlinks.title}</h5>
          <svg
            class="fold-icon"
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            aria-expanded="false"
            alt="Icon indicating whether div is collapsed."
            aria-label="Expand or collapse content"
          >
            <polyline
              points="6 9 12 15 18 9"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <ul class="content overflow">
          {backlinkFiles.map((f) => (
            <li>
              <a href={resolveRelative(fileData.slug!, f.slug!)} class="internal">
                {f.frontmatter?.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    )
  } else {
    // Do nothing if there are no backlinks
    return null
  }
}

Backlinks.css = style
export default (() => Backlinks) satisfies QuartzComponentConstructor
