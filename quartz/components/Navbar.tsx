import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { pathToRoot } from "../util/path"
import navbarStyle from "./styles/navbar.scss"

// @ts-ignore
import script from "./scripts/navbar.inline"
import { Options } from "./NavbarNode"
import { classNames } from "../util/lang"
import { i18n } from "../i18n"

export default ((userOpts?: Partial<Options>) => {
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
      <div class={classNames(displayClass, "page-title")}>
        <img src={"../static/pond.gif"} class="header-img no-select"></img>
        <h2 class="page-title-text">
          <a href={baseDir} id="page-title-text">
            {title}
          </a>
        </h2>
      </div>
    )

    const links = pages.map((page) => (
      <li key={page.slug}>
        <a href={page.slug}>{page.title}</a>
      </li>
    ))
    const pageLinks = (
      <nav className="menu">
        <ul>{links}</ul>
      </nav>
    )
    // const pageLinksDesktop = (
    //   <nav className="menu" id="desktop-nav">
    //     <ul>{links}</ul>
    //   </nav>
    // )
    return (
      <div className={classNames(displayClass, "navbar")}>
        {pageTitle}
        {/* <div className="desktop-only"> */}
        {/*   {pageLinks} */}
        {/* </div> */}
        <button className="hamburger mobile-only">
          <span />
          <span />
          <span />
        </button>
        {pageLinks}

        {/* <div className="mobile-only"> */}
        {/*   {pageLinks} */}
        {/* </div> */}
      </div>
    )
  }

  Navbar.css = navbarStyle
  Navbar.afterDOMLoaded = script
  return Navbar
}) satisfies QuartzComponentConstructor
