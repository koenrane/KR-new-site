import type { Root, Element as HastElement } from "hast"

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
import { type FullSlug } from "../../util/path"
import { PageList, byDateAndAlphabetical, createPageListHast } from "../PageList"

// Helper function to create test file data
const createFileData = (overrides: Partial<QuartzPluginData> = {}): QuartzPluginData =>
  ({
    slug: "test" as FullSlug,
    frontmatter: {
      title: "Test Page",
      tags: ["test"],
    },
    ...overrides,
  }) as QuartzPluginData

const createProps = (
  fileData: QuartzPluginData,
  allFiles: QuartzPluginData[],
  limit?: number,
): QuartzComponentProps & { limit?: number } => {
  const cfg = {
    enableSPA: true,
    baseUrl: "http://example.com",
    analytics: { provider: "google", tagId: "dummy" },
    configuration: {},
    plugins: [],
    locale: "en-US",
    defaultDateType: "created",
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
    limit,
  }
}

describe("byDateAndAlphabetical", () => {
  const cfg = { locale: "en-US", defaultDateType: "created" } as GlobalConfiguration

  it("sorts by date in descending order when both files have dates", () => {
    const file1 = createFileData({
      dates: { created: new Date("2023-01-01") },
      frontmatter: { title: "A" },
    })
    const file2 = createFileData({
      dates: { created: new Date("2023-02-01") },
      frontmatter: { title: "B" },
    })

    const sorter = byDateAndAlphabetical(cfg)
    expect(sorter(file1, file2)).toBeGreaterThan(0)
    expect(sorter(file2, file1)).toBeLessThan(0)
  })

  it("prioritizes files with dates over files without dates", () => {
    const fileWithDate = createFileData({
      dates: { created: new Date("2023-01-01") },
    })
    const fileWithoutDate = createFileData()

    const sorter = byDateAndAlphabetical(cfg)
    expect(sorter(fileWithDate, fileWithoutDate)).toBeLessThan(0)
    expect(sorter(fileWithoutDate, fileWithDate)).toBeGreaterThan(0)
  })

  it("sorts alphabetically by title when neither file has dates", () => {
    const file1 = createFileData({
      frontmatter: { title: "Alpha" },
    })
    const file2 = createFileData({
      frontmatter: { title: "Beta" },
    })

    const sorter = byDateAndAlphabetical(cfg)
    expect(sorter(file1, file2)).toBeLessThan(0)
    expect(sorter(file2, file1)).toBeGreaterThan(0)
  })
})

describe("createPageListHast", () => {
  it("creates a valid HAST structure", () => {
    const fileData = createFileData()
    const allFiles = [fileData]
    const props = createProps(fileData, allFiles)
    const hast = createPageListHast(props.cfg, fileData, allFiles)

    expect(hast.type).toBe("element")
    expect(hast.tagName).toBe("div")
    expect(hast.properties?.className).toEqual(["page-listing"])
  })

  it("respects the limit parameter", () => {
    const fileData = createFileData()
    const allFiles = [
      createFileData({ slug: "1" as FullSlug }),
      createFileData({ slug: "2" as FullSlug }),
      createFileData({ slug: "3" as FullSlug }),
    ]
    const props = createProps(fileData, allFiles)
    const hast = createPageListHast(props.cfg, fileData, allFiles, 2)

    const listItems = (hast.children[0] as HastElement).children.filter(
      (child): child is HastElement => child.type === "element" && child.tagName === "li",
    )
    expect(listItems).toHaveLength(2)
  })

  it("includes dates when available", () => {
    const fileData = createFileData()
    const fileWithDate = createFileData({
      dates: { created: new Date("2023-01-01") },
    })
    const props = createProps(fileData, [fileWithDate])
    const html = render(preactH(PageList, props))

    expect(html).toContain("time")
    expect(html).toContain("meta")
  })

  it("renders tags correctly", () => {
    const fileData = createFileData()
    const fileWithTags = createFileData({
      frontmatter: {
        title: "Test",
        tags: ["tag1", "tag2"],
      },
    })
    const props = createProps(fileData, [fileWithTags])
    const html = render(preactH(PageList, props))

    expect(html).toContain("tag1")
    expect(html).toContain("tag2")
    expect(html).toContain("tag-link")
  })
})

describe("PageList", () => {
  it("renders without crashing", () => {
    const props = createProps(createFileData(), [])
    const element = preactH(PageList, props)
    expect(element).toBeTruthy()
  })

  it("renders empty list when no files provided", () => {
    const props = createProps(createFileData(), [])
    const html = render(preactH(PageList, props))
    expect(html).toContain("section-ul")
    expect(html).not.toContain("section-li")
  })

  it("renders multiple pages correctly", () => {
    const files = [
      createFileData({
        slug: "page1" as FullSlug,
        frontmatter: { title: "Page 1", tags: ["tag1"] },
      }),
      createFileData({
        slug: "page2" as FullSlug,
        frontmatter: { title: "Page 2", tags: ["tag2"] },
      }),
    ]
    const props = createProps(files[0], files)
    const html = render(preactH(PageList, props))

    expect(html).toContain("Page 1")
    expect(html).toContain("Page 2")
    expect(html).toContain("tag1")
    expect(html).toContain("tag2")
  })

  it("handles files without titles", () => {
    const fileWithoutTitle = createFileData({
      frontmatter: { title: "", tags: ["test"] },
    })
    const props = createProps(fileWithoutTitle, [fileWithoutTitle])
    const html = render(preactH(PageList, props))

    expect(html).toContain("section-li")
    expect(html).toContain("page-listing-title")
  })

  it("handles files without tags", () => {
    const fileWithoutTags = createFileData({
      frontmatter: { title: "Test", tags: [] },
    })
    const props = createProps(fileWithoutTags, [fileWithoutTags])
    const html = render(preactH(PageList, props))

    expect(html).toContain("section-li")
    expect(html).toContain("tags")
  })

  it("renders dividers between pages", () => {
    const files = [
      createFileData({ slug: "page1" as FullSlug }),
      createFileData({ slug: "page2" as FullSlug }),
    ]
    const props = createProps(files[0], files)
    const html = render(preactH(PageList, props))

    expect(html).toContain("page-divider")
    // Should have one less divider than total pages
    expect(html.match(/page-divider/g)?.length).toBe(1)
  })
})
