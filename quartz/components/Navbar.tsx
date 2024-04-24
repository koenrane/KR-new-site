import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"
import navbarStyle from "./styles/navbar.scss"

// @ts-ignore
import script from "./scripts/navbar.inline"
import { NavbarNode, FileNode, Options } from "./NavbarNode"
import { QuartzPluginData } from "../plugins/vfile"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

// Options interface defined in `NavbarNode` to avoid circular dependency
const defaultOptions = {
  folderClickBehavior: "collapse",
  folderDefaultState: "open",
  useSavedState: true,
  mapFn: (node) => {
    return node
  },
  sortFn: (a, b) => {
    // Sort order: folders first, then files. Sort folders and files alphabetically
    if ((!a.file && !b.file) || (a.file && b.file)) {
      // numeric: true: Whether numeric collation ehould be used, such that "1" < "2" < "10"
      // sensitivity: "base": Only strings that differ in base letters compare as unequal. Examples: a ≠ b, a = á, a = A
      return a.displayName.localeCompare(b.displayName, undefined, {
        numeric: true,
        sensitivity: "base",
      })
    }

    if (a.file && !b.file) {
      return 1
    } else {
      return -1
    }
  },
  filterFn: (node) => node.name !== "tags",
  order: ["filter", "map", "sort"],
} satisfies Options

export default ((userOpts?: Partial<Options>) => {
  // Parse config
  const opts: Options = { ...defaultOptions, ...userOpts }

  // memoized
  let fileTree: FileNode
  let jsonTree: string

  function constructFileTree(allFiles: QuartzPluginData[]) {
    if (fileTree) {
      return
    }

    // Construct tree from allFiles
    fileTree = new FileNode("")
    allFiles.forEach((file) => fileTree.add(file))

    // Execute all functions (sort, filter, map) that were provided (if none were provided, only default "sort" is applied)
    if (opts.order) {
      for (let i = 0; i < opts.order.length; i++) {
        const functionName = opts.order[i]
        if (functionName === "map") {
          fileTree.map(opts.mapFn)
        } else if (functionName === "sort") {
          fileTree.sort(opts.sortFn)
        } else if (functionName === "filter") {
          fileTree.filter(opts.filterFn)
        }
      }
    }

    // Get all folders of tree. Initialize with collapsed state
    // Stringify to pass json tree as data attribute ([data-tree])
    const folders = fileTree.getFolderPaths(opts.folderDefaultState === "collapsed")
    jsonTree = JSON.stringify(folders)
  }

  const Navbar: QuartzComponent = ({
    cfg,
    allFiles,
    displayClass,
    fileData,
  }: QuartzComponentProps) => {
    const pages = cfg.navbar.pages

    const title = cfg?.pageTitle ?? i18n(cfg.locale).propertyDefaults.title
    const baseDir = pathToRoot(fileData.slug!)
    const pageTitle = (
      <div class={classNames(displayClass, "page-title")} style="margin:0">
        <img src={"../static/pond.gif"} class="header-img no-select"></img>
        <h2 class="page-title-text">
          <a href={baseDir} id="page-title-text">
            {title}
          </a>
        </h2>
      </div>
    )

    return (
      <div className={classNames(displayClass, "navbar")}>
        <div id="navbar-content" className="desktop-only">
          {pageTitle}
          <ul className="overflow desktop-only" id="navbar-ul">
            {pages.map((page) => (
              <li key={page.slug}>
                <a href={page.slug}>{page.title}</a>
              </li>
            ))}
          </ul>
        </div>
        <button className="hamburger mobile-only">
          <span />
          <span />
          <span />
        </button>

        <div className="mobile-only">
          {pageTitle}
          <nav className="mobile-only menu">
            <ul className="overflow">
              {pages.map((page) => (
                <li key={page.slug}>
                  <a href={page.slug}>{page.title}</a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </div>
    )
  }

  Navbar.css = navbarStyle
  Navbar.afterDOMLoaded = script
  return Navbar
}) satisfies QuartzComponentConstructor
