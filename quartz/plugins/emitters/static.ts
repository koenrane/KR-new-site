import { FilePath, QUARTZ, joinSegments } from "../../util/path"
import { QuartzEmitterPlugin } from "../types"
import fs from "fs"
import path from "path"
import { glob } from "../../util/glob"
import DepGraph from "../../depgraph"

import { getR2Client, uploadPathToR2, uploadFileTypes } from "./util"

export const Static: QuartzEmitterPlugin = () => ({
  name: "Static",
  getQuartzComponents() {
    return []
  },
  async getDependencyGraph({ argv, cfg }, _content, _resources) {
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
  async emit({ argv, cfg }, _content, _resources): Promise<FilePath[]> {
    const staticPath = joinSegments(QUARTZ, "static")
    const fps = await glob("**", staticPath, cfg.configuration.ignorePatterns)

    const client = getR2Client()
    for (const fp of fps) {
      const ext = path.extname(fp).toLowerCase()
      if (uploadFileTypes.includes(ext)) {
        await uploadPathToR2(client, "static", fp)
      }
    }

    await fs.promises.cp(staticPath, joinSegments(argv.output, "static"), {
      recursive: true,
      dereference: true,
    })
    return fps.map((fp) => joinSegments(argv.output, "static", fp)) as FilePath[]
  },
})
