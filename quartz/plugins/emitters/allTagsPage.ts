import { QuartzEmitterPlugin } from "../types"
import { QuartzComponentProps } from "../../components/types"
import HeaderConstructor from "../../components/Header"
import BodyConstructor from "../../components/Body"
import { pageResources, renderPage } from "../../components/renderPage"
import { FilePath, FullSlug } from "../../util/path"
import { defaultListPageLayout, sharedPageComponents } from "../../../quartz.layout"
import AllTagsContent from "../../components/pages/AllTagsContent"
import { write } from "./helpers"
import DepGraph from "../../depgraph"
import { StaticResources } from "../../util/resources"
import { ProcessedContent, defaultProcessedContent } from "../vfile"

export const AllTagsPage: QuartzEmitterPlugin = () => {
  const opts = {
    ...defaultListPageLayout,
    ...sharedPageComponents,
    pageBody: AllTagsContent(),
  }

  const { head: Head, header, beforeBody, pageBody, left, right, footer: Footer } = opts
  const Header = HeaderConstructor()
  const Body = BodyConstructor()

  return {
    name: "AllTagsPage",
    getQuartzComponents() {
      return [Head, Header, Body, ...header, ...beforeBody, pageBody, ...left, ...right, Footer]
    },
    async getDependencyGraph() {
      const graph = new DepGraph<FilePath>()
      return graph
    },
    async emit(ctx, content: ProcessedContent[], resources: StaticResources): Promise<FilePath[]> {
      const slug = "all-tags" as FullSlug
      const externalResources = pageResources(slug, resources)
      const [tree, file] = defaultProcessedContent({
        slug,
        frontmatter: { title: "All Tags", tags: [] },
        description: "Information about the tags used in this site.",
        text: "Information about the tags used in this site.",
      })

      const componentData: QuartzComponentProps = {
        ctx,
        fileData: file.data,
        externalResources,
        cfg: ctx.cfg.configuration,
        children: [],
        tree,
        allFiles: content.map((c) => c[1].data),
      }

      const renderedContent = renderPage(
        ctx.cfg.configuration,
        slug,
        componentData,
        opts,
        externalResources,
      )

      const fp = await write({
        ctx,
        content: renderedContent,
        slug,
        ext: ".html",
      })

      return [fp]
    },
  }
}
