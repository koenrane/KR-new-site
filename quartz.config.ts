import { QuartzConfig } from "./quartz/cfg"
import * as Plugin from "./quartz/plugins"

/**
 * Quartz 4.0 Configuration
 *
 * See https://quartz.jzhao.xyz/configuration for more information.
 */
const config: QuartzConfig = {
  configuration: {
    pageTitle: "The Pond",
    enableSPA: true,
    enablePopovers: true,
    analytics: null,
    locale: "en-US",
    baseUrl: "turntrout.com",
    ignorePatterns: ["private", "templates", ".obsidian"],
    defaultDateType: "published", // What to display on listings
    navbar: {
      pages: [
        { title: "About me", slug: "/about" },
        { title: "My research", slug: "/research" },
        { title: "Posts", slug: "/posts" },
        { title: "Contact me", slug: "/about#contact-me" },
      ],
    },
  },
  plugins: {
    transformers: [
      Plugin.FrontMatter(),
      Plugin.CreatedModifiedDate({
        priority: ["frontmatter", "filesystem"],
      }),
      Plugin.TextFormattingImprovement(),
      Plugin.Twemoji(),
      Plugin.SyntaxHighlighting({
        theme: {
          light: "github-light",
          dark: "github-dark",
        },
        keepBackground: false,
      }),
      Plugin.ObsidianFlavoredMarkdown({ enableInHtmlEmbed: true, parseArrows: false }),
      Plugin.GitHubFlavoredMarkdown({ enableSmartyPants: false }),
      Plugin.HTMLFormattingImprovement(),
      Plugin.Latex({ renderEngine: "katex" }),
      Plugin.ConvertEmphasis(),
      Plugin.CrawlLinks({ lazyLoad: true, markdownLinkResolution: "shortest" }),
      Plugin.Description(),
      Plugin.TagAcronyms(),
      Plugin.TroutOrnamentHr(),
      Plugin.AddFavicons(),
      Plugin.AfterArticle(),
      Plugin.ColorVariables(),
      Plugin.rehypeCustomSpoiler(),
      Plugin.rehypeCustomSubtitle(),
      Plugin.TableOfContents(),
    ],
    // filters: [Plugin.ExplicitPublish()],
    filters: [],
    emitters: [
      Plugin.AliasRedirects(),
      Plugin.ComponentResources(),
      Plugin.ContentPage(),
      Plugin.FolderPage(),
      Plugin.TagPage(),
      Plugin.AllTagsPage(),
      Plugin.RecentPostsPage(),
      Plugin.ContentIndex({
        enableSiteMap: true,
        enableRSS: true,
      }),
      Plugin.Assets(),
      Plugin.Static(),
      Plugin.NotFoundPage(),
    ],
  },
}

export default config
