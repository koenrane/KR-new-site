import { PageLayout, SharedLayout } from "./quartz/cfg"
import * as Component from "./quartz/components"

// components shared across all pages
export const sharedPageComponents: SharedLayout = {
  head: Component.Head(),
  header: [],
  left: [
    // Component.PageTitle(),
    // Component.MobileOnly(Component.Spacer()),
    Component.Navbar(),
    Component.DesktopOnly(Component.Search()),
  ],
  footer: Component.Footer({
    links: {},
  }),
}

// components for pages that display a single page (e.g. a single note)
export const defaultContentPageLayout: PageLayout = {
  beforeBody: [Component.ArticleTitle(), Component.AuthorList(), Component.TagList()],
  left: [
    // Component.PageTitle(),
    // Component.MobileOnly(Component.Spacer()),
    Component.Navbar(),
    Component.DesktopOnly(Component.Search()),
  ],
  right: [
    Component.ContentMeta(),
    Component.DesktopOnly(Component.TableOfContents()),
    Component.Backlinks(),
  ],
}

// components for pages that display lists of pages  (e.g. tags or folders)
export const defaultListPageLayout: PageLayout = {
  beforeBody: [Component.ArticleTitle()],
  left: [Component.Navbar(), Component.Search()],
  right: [],
}
