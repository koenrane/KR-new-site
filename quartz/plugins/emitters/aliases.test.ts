import { jest, describe, it, beforeEach, expect, beforeAll } from "@jest/globals"
import { VFile } from "vfile"

import { type QuartzConfig } from "../../cfg"
import { type BuildCtx } from "../../util/ctx"
import { type FilePath, type FullSlug } from "../../util/path"
import { type StaticResources } from "../../util/resources"
import { type ProcessedContent } from "../vfile"

// Mock the helpers module first using jest.unstable_mockModule
jest.unstable_mockModule("./helpers", () => ({
  write: jest.fn(async (opts: { slug: FullSlug }) => {
    return await Promise.resolve(`${opts.slug}.html`)
  }),
}))

// Wrap your test code in an async function to use top-level await
describe("AliasRedirects", () => {
  let write: jest.MockedFunction<typeof import("./helpers").write>
  let AliasRedirects: typeof import("./aliases").AliasRedirects
  let plugin: ReturnType<typeof AliasRedirects>

  // Import the mocked modules asynchronously
  beforeAll(async () => {
    const helpers = await import("./helpers")
    write = helpers.write as jest.MockedFunction<typeof helpers.write>

    const aliasesModule = await import("./aliases")
    AliasRedirects = aliasesModule.AliasRedirects
    plugin = AliasRedirects()
  })

  // Reset mock before each test
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Create a proper VFile instance
  const vfile = new VFile({
    path: "/content/test.md",
    data: {
      filePath: "/content/test.md" as FilePath,
      slug: "test" as FullSlug,
      frontmatter: {
        title: "Test Page",
        description: "Test description",
        aliases: ["alias1", "alias2"],
        authors: "Test Author",
        card_image: "test-image.jpg",
      },
    },
  })

  // Create the root node
  const root = { type: "root", children: [] }

  // Create ProcessedContent as [Node, VFile] tuple
  const mockContent: [string, ProcessedContent][] = [["test", [root, vfile]]]

  const mockCtx: BuildCtx = {
    argv: {
      directory: "/content",
      output: "public",
      verbose: false,
      serve: false,
      fastRebuild: false,
      port: 3000,
      wsPort: 3001,
    },
    cfg: {} as QuartzConfig,
    allSlugs: [],
  }

  // Define your test cases
  it("should create correct dependency graph", async () => {
    if (!plugin.getDependencyGraph) {
      throw new Error("getDependencyGraph is not implemented")
    }
    const graph = await plugin.getDependencyGraph(mockCtx, [mockContent[0][1]], {
      css: [],
      js: [],
    } as StaticResources)
    expect(graph.hasNode("/content/test.md" as FilePath)).toBe(true)
    expect(graph.hasNode("public/alias1.html" as FilePath)).toBe(true)
    expect(graph.hasNode("public/alias2.html" as FilePath)).toBe(true)
  })

  it("should emit redirect files", async () => {
    const files = await plugin.emit(mockCtx, [mockContent[0][1]], {
      css: [],
      js: [],
    } as StaticResources)
    expect(files).toHaveLength(2)

    // Verify file paths
    expect(files).toContain("alias1.html")
    expect(files).toContain("alias2.html")
  })

  it("files should have correct metadata", async () => {
    await plugin.emit(mockCtx, [mockContent[0][1]], {
      css: [],
      js: [],
    } as StaticResources)

    expect(write).toHaveBeenCalled()
    const htmlContent = write.mock.calls[0][0].content
    expect(htmlContent).toContain("<title>Test Page</title>")
    expect(htmlContent).toContain('content="Test description"')
  })
})
