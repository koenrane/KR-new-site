import type { Root } from "hast"

/**
 * @jest-environment jsdom
 */
import { describe, it, expect } from "@jest/globals"
import { h } from "hastscript"
import { h as preactH } from "preact"
import { render } from "preact-render-to-string"

import type { QuartzComponentProps } from "../types"

import { type GlobalConfiguration, type QuartzConfig } from "../../cfg"
import { type QuartzPluginData } from "../../plugins/vfile"
import { type BuildCtx } from "../../util/ctx"
import { type FullSlug, type SimpleSlug } from "../../util/path"
import { Backlinks, getBacklinkFiles } from "../Backlinks"

// Helper function to create test file data
const createFileData = (overrides: Partial<QuartzPluginData> = {}): QuartzPluginData =>
  ({
    slug: "test" as FullSlug,
    frontmatter: {
      title: "Test Page",
    },
    ...overrides,
  }) as QuartzPluginData

// Helper function to create test props
const createProps = (
  fileData: QuartzPluginData,
  allFiles: QuartzPluginData[],
): QuartzComponentProps => {
  const cfg = {
    enableSPA: true,
    baseUrl: "http://example.com",
    analytics: { provider: "google", tagId: "dummy" },
    configuration: {},
    plugins: [],
  } as unknown as GlobalConfiguration

  return {
    fileData,
    allFiles,
    cfg,
    ctx: {
      cfg: {} as unknown as QuartzConfig,
      allSlugs: [] as FullSlug[],
      argv: {} as unknown,
    } as BuildCtx,
    externalResources: { css: [], js: [] },
    children: [],
    tree: h("root") as unknown as Root,
    displayClass: undefined,
  }
}

describe("getBacklinkFiles", () => {
  it("returns empty array when no backlinks exist", () => {
    const currentFile = createFileData({ slug: "page" as FullSlug })
    const allFiles = [currentFile]
    expect(getBacklinkFiles(allFiles, currentFile)).toHaveLength(0)
  })

  it("finds files that link to current page", () => {
    const currentFile = createFileData({ slug: "target" as FullSlug })
    const linkingFile = createFileData({
      slug: "source" as FullSlug,
      links: ["target" as SimpleSlug],
    })
    const allFiles = [currentFile, linkingFile]
    expect(getBacklinkFiles(allFiles, currentFile)).toEqual([linkingFile])
  })

  it("excludes self-referential links", () => {
    const currentFile = createFileData({
      slug: "page" as FullSlug,
      links: ["page" as SimpleSlug],
    })
    const allFiles = [currentFile]
    expect(getBacklinkFiles(allFiles, currentFile)).toHaveLength(0)
  })

  it("excludes self-referential links with anchors", () => {
    const currentFile = createFileData({
      slug: "page" as FullSlug,
      links: ["page#section" as SimpleSlug, "page#another-section" as SimpleSlug],
    })
    const allFiles = [currentFile]
    expect(getBacklinkFiles(allFiles, currentFile)).toHaveLength(0)
  })

  it("includes links with anchors from other pages", () => {
    const currentFile = createFileData({ slug: "target" as FullSlug })
    const linkingFile = createFileData({
      slug: "source" as FullSlug,
      links: ["target#section" as SimpleSlug],
    })
    const allFiles = [currentFile, linkingFile]
    expect(getBacklinkFiles(allFiles, currentFile)).toEqual([linkingFile])
  })
})

describe("Backlinks", () => {
  // Basic rendering test
  it("renders without crashing", () => {
    const props = createProps(createFileData(), [])
    const element = preactH(Backlinks, props)
    expect(element).toBeTruthy()
  })

  // Test no backlinks case
  it("returns null when no backlinks exist", () => {
    const props = createProps(createFileData(), [])
    const element = preactH(Backlinks, props)
    expect(element).toBeTruthy()
  })

  // Test with backlinks
  it("renders backlinks when they exist", () => {
    const currentFile = createFileData({ slug: "target-page" as FullSlug })
    const linkingFile = createFileData({
      slug: "linking-page" as FullSlug,
      frontmatter: { title: "Linking Page" },
      links: ["target-page" as SimpleSlug],
    })

    const props = createProps(currentFile, [linkingFile])
    const element = preactH(Backlinks, props)
    expect(element).toBeTruthy()

    const html = render(element)
    expect(html).toContain('class="admonition admonition-metadata is-collapsible is-collapsed"')
    expect(html).toContain("Links to this page")
    expect(html).toContain("Linking Page")
  })

  // Test self-referential links are excluded
  it("excludes self-referential links", () => {
    const currentFile = createFileData({
      slug: "self-ref" as FullSlug,
      links: ["self-ref" as SimpleSlug],
    })

    const props = createProps(currentFile, [currentFile])
    const element = preactH(Backlinks, props)
    expect(element).toBeTruthy()
  })

  // Test self-referential links with anchors are excluded
  it("excludes self-referential links with anchors", () => {
    const currentFile = createFileData({
      slug: "page" as FullSlug,
      links: ["page#section" as SimpleSlug, "page#another-section" as SimpleSlug],
    })

    const props = createProps(currentFile, [currentFile])
    const backlinkFiles = getBacklinkFiles([currentFile], currentFile)
    expect(backlinkFiles).toHaveLength(0)

    const element = preactH(Backlinks, props)
    const html = render(element)
    expect(html).toBe("")
  })

  // Test multiple backlinks
  it("renders multiple backlinks correctly", () => {
    const currentFile = createFileData({ slug: "target" as FullSlug })
    const linkingFiles = [
      createFileData({
        slug: "link1" as FullSlug,
        frontmatter: { title: "Link 1" },
        links: ["target" as SimpleSlug],
      }),
      createFileData({
        slug: "link2" as FullSlug,
        frontmatter: { title: "Link 2" },
        links: ["target" as SimpleSlug],
      }),
    ]

    const props = createProps(currentFile, linkingFiles)
    const element = preactH(Backlinks, props)
    expect(element).toBeTruthy()

    const html = render(element)
    expect(html).toContain("Link 1")
    expect(html).toContain("Link 2")
    expect(html.match(/<li/g)?.length).toBe(2)
  })

  // Test handling of invalid file data
  it("handles files without required properties", () => {
    const currentFile = createFileData({ slug: "target" as FullSlug })
    const invalidFile = {} as QuartzPluginData // Missing required properties
    const validFile = createFileData({
      slug: "valid" as FullSlug,
      frontmatter: { title: "Valid" },
      links: ["target" as SimpleSlug],
    })

    const props = createProps(currentFile, [invalidFile, validFile])
    const element = preactH(Backlinks, props)
    expect(element).toBeTruthy()
  })

  // Test empty or undefined slugs
  it("handles empty or undefined slugs gracefully", () => {
    const currentFile = createFileData({ slug: "" as FullSlug })
    const linkingFile = createFileData({
      slug: "linking-page" as FullSlug,
      frontmatter: { title: "Linking Page" },
      links: ["" as SimpleSlug],
    })

    const props = createProps(currentFile, [linkingFile])
    expect(() => preactH(Backlinks, props)).not.toThrow()
  })
})
