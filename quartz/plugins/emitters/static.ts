import fs from "fs"

import type { QuartzEmitterPlugin } from "../types"

import DepGraph from "../../depgraph"
import { glob } from "../../util/glob"
import { type FilePath, QUARTZ, joinSegments } from "../../util/path"

export const Static: QuartzEmitterPlugin = () => ({
  name: "Static",
  getQuartzComponents() {
    return []
  },
  async getDependencyGraph({ argv, cfg }) {
    const graph = new DepGraph<FilePath>()

    const staticPath = joinSegments(QUARTZ, "static")
    const fps = await glob("**", staticPath, cfg.configuration.ignorePatterns)
    for (const fp of fps) {
      graph.addEdge(
        joinSegments("static", fp) as FilePath,
        joinSegments(argv.output, "static", fp) as FilePath,
      )
    }

    return graph
  },
  async emit({ argv, cfg }): Promise<FilePath[]> {
    const staticPath = joinSegments(QUARTZ, "static")
    const fps = await glob("**", staticPath, cfg.configuration.ignorePatterns)

    await fs.promises.cp(staticPath, joinSegments(argv.output, "static"), {
      recursive: true,
      dereference: true,
    })
    return fps.map((fp) => joinSegments(argv.output, "static", fp)) as FilePath[]
  },
})
