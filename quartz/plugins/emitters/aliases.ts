import path from "path"

import DepGraph from "../../depgraph"
import { type FilePath, type FullSlug, joinSegments, resolveRelative } from "../../util/path"
import { type QuartzEmitterPlugin } from "../types"
import { write } from "./helpers"

export const AliasRedirects: QuartzEmitterPlugin = () => ({
  name: "AliasRedirects",
  getQuartzComponents() {
    return []
  },
  // skipcq: JS-0116 - need async for type signature
  async getDependencyGraph(ctx, content) {
    const graph = new DepGraph<FilePath>()

    const { argv } = ctx
    for (const [, file] of content) {
      const dir = path.posix.relative(argv.directory, path.dirname(file.data.filePath || ""))
      const aliases = file.data.frontmatter?.aliases ?? []
      const slugs = aliases.map((alias) => path.posix.join(dir, alias) as FullSlug)
      const permalink = file.data.frontmatter?.permalink
      if (typeof permalink === "string") {
        slugs.push(permalink as FullSlug)
      }

      for (let slug of slugs) {
        // fix any slugs that have trailing slash
        if (slug.endsWith("/")) {
          slug = joinSegments(slug, "index") as FullSlug
        }

        graph.addEdge(
          file.data.filePath || ("" as FilePath),
          joinSegments(argv.output, `${slug}.html`) as FilePath,
        )
      }
    }

    return graph
  },
  async emit(ctx, content): Promise<FilePath[]> {
    const { argv } = ctx
    const fps: FilePath[] = []

    for (const [, file] of content) {
      const dir = path.posix.relative(argv.directory, path.dirname(file.data.filePath || ""))
      const aliases = file.data.frontmatter?.aliases ?? []
      const slugs: FullSlug[] = aliases.map((alias) => path.posix.join(dir, alias) as FullSlug)
      const permalink = file.data.frontmatter?.permalink
      if (typeof permalink === "string") {
        slugs.push(file.data.slug as FullSlug)
        file.data.slug = permalink as FullSlug
      }

      // Get metadata from the original file
      const title = file.data.frontmatter?.title ?? ""
      const description = file.data.frontmatter?.description?.trim() ?? ""
      const cardImage =
        file.data.frontmatter?.card_image ??
        "https://assets.turntrout.com/static/images/fb_preview.png"
      const authors = file.data.frontmatter?.authors

      for (let slug of slugs) {
        if (slug.endsWith("/")) {
          slug = joinSegments(slug, "index") as FullSlug
        }

        const redirUrl = resolveRelative(slug, file.data.slug || ("" as FullSlug))

        // Create HTML with matching metadata
        const fp = await write({
          ctx,
          content: `
            <!DOCTYPE html>
            <html lang="en-us">
            <head>
              <meta charset="utf-8">
              <link rel="canonical" href="${redirUrl}">

              <title>${title}</title>
              <meta name="description" content="${description}">

              <meta name="robots" content="noindex">
              <meta http-equiv="refresh" content="0; url=${redirUrl}">
              <meta name="viewport" content="width=device-width">
              
              <!-- Open Graph metadata -->
              <meta property="og:title" content="${title}">
              <meta property="og:type" content="article">
              <meta property="og:url" content="${redirUrl}">
              <meta property="og:site_name" content="The Pond">
              <meta property="og:description" content="${description}">
              <meta property="og:image" content="${cardImage}">
              <meta property="og:image:width" content="1200">
              <meta property="og:image:height" content="630">
              <meta property="og:image:alt" content="A pond containing a trout and a goose peacefully swimming near a castle.">
              
              <!-- Twitter Card metadata -->
              <meta name="twitter:card" content="summary_large_image">
              <meta name="twitter:title" content="${title}">
              <meta name="twitter:description" content="${description}">
              <meta name="twitter:image" content="${cardImage}">
              <meta name="twitter:site" content="@Turn_Trout">
              ${
                authors
                  ? `
              <meta name="twitter:label1" content="Written by">
              <meta name="twitter:data1" content="${authors}">
              `
                  : ""
              }
            </head>
            </html>
            `,
          slug,
          ext: ".html",
        })

        fps.push(fp)
      }
    }
    return fps
  },
})
