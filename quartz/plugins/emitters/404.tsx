import { sharedPageComponents } from "../../../quartz.layout"
import { FullPageLayout } from "../../cfg"
import { NotFound } from "../../components"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { QuartzComponentProps } from "../../components/types"
import DepGraph from "../../depgraph"
import { FilePath, FullSlug } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import { defaultProcessedContent } from "../vfile"
import { write } from "./helpers"

export const NotFoundPage: QuartzEmitterPlugin = () => {
  const opts: FullPageLayout = {
    ...sharedPageComponents,
    pageBody: NotFound(),
    beforeBody: [],
    right: [],
  }

  const { head: Head, pageBody, footer: Footer } = opts
  const Body = BodyConstructor()

  return {
    name: "404Page",
    getQuartzComponents() {
      return [Head, Body, pageBody, Footer]
    },
    async getDependencyGraph() {
      return new DepGraph<FilePath>()
    },
    async emit(ctx, _content, resources): Promise<FilePath[]> {
      const cfg = ctx.cfg.configuration
      const slug = "404" as FullSlug

      const url = new URL(`https://${cfg.baseUrl ?? ""}`)
      const path = url.pathname as FullSlug
      const externalResources = pageResources(path, resources)
      const notFound = "That page doesn't exist. But don't leave! There are other fish in the pond."
      const [tree, vfile] = defaultProcessedContent({
        slug,
        text: notFound,
        description: notFound,
        frontmatter: { title: "Page not found", tags: [] },
      })
      const componentData: QuartzComponentProps = {
        ctx,
        fileData: vfile.data,
        externalResources,
        cfg,
        children: [],
        tree,
        allFiles: [],
      }

      return [
        await write({
          ctx,
          content: renderPage(cfg, slug, componentData, opts, externalResources),
          slug,
          ext: ".html",
        }),
      ]
    },
  }
}
