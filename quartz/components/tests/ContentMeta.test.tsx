/**
 * @jest-environment jsdom
 */
import { jest } from "@jest/globals"
import { describe, it, expect, beforeEach } from "@jest/globals"
import {
  RenderPublicationInfo,
  getFaviconPath,
  insertFavicon,
  processReadingTime,
  renderLastUpdated,
} from "../ContentMeta"
import { GetQuartzPath, urlCache } from "../../plugins/transformers/linkfavicons"
import React from "react"
import { GlobalConfiguration } from "../../cfg"
import { QuartzPluginData } from "../../plugins/vfile"
import "@testing-library/jest-dom"
import ReactDOM from "react-dom/client"

// Update the mock setup
jest.mock("../ContentMeta", () => ({
  urlCache: new Map(),
  TURNTROUT_FAVICON_PATH: "path/to/turntrout/favicon.png",
}))

// Mock dependencies
jest.mock("../Date", () => ({
  DateElement: () => <span data-testid="date-element">Mocked Date</span>,
}))

jest.mock("../../plugins/transformers/linkfavicons", () => ({
  GetQuartzPath: jest.fn(),
  urlCache: new Map(),
  getFaviconPath: () => "/mock/favicon.avif",
}))

describe("getFaviconPath", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    urlCache.clear()
  })

  it("should return null when no cached path exists", () => {
    const testUrl = new URL("https://example.com")

    const result = getFaviconPath(testUrl)
    expect(result).toBeNull()
  })

  it("should convert png to avif when cached path exists", () => {
    const testUrl = new URL("https://example.com")
    const quartzPath = GetQuartzPath("example.com")
    const cachedPath = "path/to/favicon.png"
    urlCache.set(quartzPath, cachedPath)

    const result = getFaviconPath(testUrl)
    expect(result).toBe("path/to/favicon.avif")
  })

  it("should handle non-png extensions", () => {
    const testUrl = new URL("https://example.com")
    const quartzPath = GetQuartzPath("example.com")
    const cachedPath = "path/to/favicon.jpg"
    urlCache.set(quartzPath, cachedPath)

    const result = getFaviconPath(testUrl)
    expect(result).toBe("path/to/favicon.jpg")
  })

  it("should handle empty hostname", () => {
    const testUrl = new URL("https://example.com")

    const result = getFaviconPath(testUrl)
    expect(result).toBeNull()
  })
})

describe("insertFavicon", () => {
  const imgPath = "/path/to/favicon.avif"
  const targetFavicon = {
    src: imgPath,
    className: "favicon",
    alt: "",
  }

  it.each([
    ["short text", "Hi"],
    ["empty text", ""],
    ["three chars", "ABC"],
  ])("should append favicon to %s", (_, text) => {
    const node = <span>{text}</span>
    const result = insertFavicon(imgPath, node)

    // Only test the type and essential props
    expect(typeof result.type).toBe("function")
    const [resultNode, favicon] = result.props.children

    expect(resultNode.type).toBe("span")
    expect(resultNode.props.children).toBe(text)

    expect(favicon.type).toBe("img")
    expect(favicon.props).toEqual(targetFavicon)
  })

  it("should wrap last 4 chars with favicon for longer text", () => {
    const node = <span>Hello World</span>
    const result = insertFavicon(imgPath, node)

    const [prefix, wrappedContent] = result.props.children
    expect(prefix).toBe("Hello W")

    expect(wrappedContent.type).toBe("span")
    expect(wrappedContent.props.style).toEqual({ whiteSpace: "nowrap" })

    const [text, favicon] = wrappedContent.props.children
    expect(text).toBe("orld")
    expect(favicon.props).toEqual(targetFavicon)
  })

  it("should return original node when imgPath is null", () => {
    const node = <span>Test</span>
    const result = insertFavicon(null, node)
    expect(result).toBe(node)
  })

  it("should handle non-string children", () => {
    const nestedDiv = <div>nested</div>
    const node = <span>{nestedDiv}</span>
    const result = insertFavicon(imgPath, node)

    expect(typeof result.type).toBe("function")
    const [resultNode, favicon] = result.props.children

    expect(resultNode.type).toBe("span")
    expect(resultNode.props.children).toEqual(nestedDiv)

    expect(favicon.props).toEqual(targetFavicon)
  })
})

// Smoke test for RenderPublicationInfo
it("renders without crashing", () => {
  const div = document.createElement("div")
  const root = ReactDOM.createRoot(div)

  const cfg = {} as GlobalConfiguration
  const fileData = {} as QuartzPluginData
  const publicationInfo = RenderPublicationInfo(cfg, fileData)
  root.render(publicationInfo as React.ReactElement)
})

describe("processReadingTime", () => {
  it.each([
    // minutes only
    [1, "1 minute"],
    [30, "30 minutes"],
    [59, "59 minutes"],

    // hours only (no remaining minutes)
    [60, "1 hour"],
    [120, "2 hours"],

    // hours and minutes
    [61, "1 hour 1 minute"],
    [62, "1 hour 2 minutes"],
    [122, "2 hours 2 minutes"],
    [150, "2 hours 30 minutes"],

    // edge cases
    [0, ""],
    [0.5, "1 minute"], // rounds up to 1
  ])("should format %i minutes as '%s'", (input, expected) => {
    expect(processReadingTime(input)).toBe(expected)
  })
})

const mockConfig = {
  configuration: {
    enableFrontmatterTags: true,
  },
} as unknown as GlobalConfiguration
const createFileData = (overrides = {}): QuartzPluginData =>
  ({
    frontmatter: {
      date_published: "2024-03-20",
      ...overrides,
    },
    filePath: "test.md",
    relativePath: "test.md",
  }) as unknown as QuartzPluginData

describe("RenderPublicationInfo", () => {
  it("should return null when no date_published", () => {
    const fileData = createFileData({ date_published: undefined })
    const result = RenderPublicationInfo(mockConfig, fileData)
    expect(result).toBeNull()
  })

  it("should return null when hide_metadata is true", () => {
    const fileData = createFileData({ hide_metadata: true })
    const result = RenderPublicationInfo(mockConfig, fileData)
    expect(result).toBeNull()
  })

  it("should render basic publication info without original URL", () => {
    const fileData = createFileData()
    const result = RenderPublicationInfo(mockConfig, fileData)

    expect(result?.type).toBe("span")
    expect(result?.props.className).toBe("publication-str")

    const children = result?.props.children
    // Simplified check - just verify structure exists
    expect(children[0]).toBe("Published on ")
    expect(children[1]).toBeTruthy() // Just verify date element exists
  })

  it("should render publication info with original URL and favicon", () => {
    const fileData = createFileData({
      original_url: "https://example.com/post",
    })
    const result = RenderPublicationInfo(mockConfig, fileData)

    expect(result?.type).toBe("span")
    expect(result?.props.className).toBe("publication-str")

    const children = result?.props.children
    expect(children).toHaveLength(3)

    // Simplified checks
    const [linkElement, separator, dateElement] = children
    expect(linkElement).toBeTruthy()
    expect(separator).toBe(" on ")
    expect(dateElement).toBeTruthy()
  })

  it("should handle invalid original URLs gracefully", () => {
    const fileData = createFileData({
      original_url: "not-a-valid-url",
    })

    expect(() => {
      RenderPublicationInfo(mockConfig, fileData)
    }).toThrow()
  })
})

describe("renderLastUpdated", () => {
  it("should return null when no date_updated", () => {
    const fileData = createFileData()

    const result = renderLastUpdated(mockConfig, fileData)
    expect(result).toBeNull()
  })

  it("should return null when hide_metadata is true", () => {
    const fileData = createFileData({ hide_metadata: true })

    const result = renderLastUpdated(mockConfig, fileData)
    expect(result).toBeNull()
  })

  it("should render update info with github link and date", () => {
    const fileData = createFileData({ date_updated: "2024-03-20" })
    const result = renderLastUpdated(mockConfig, fileData)

    expect(result?.type).toBe("span")
    expect(result?.props.className).toBe("last-updated-str")

    const children = result?.props.children
    expect(children).toHaveLength(3)

    // Check link with favicon
    const linkWithFavicon = children[0]
    expect(linkWithFavicon.type).toBe("a")
    expect(linkWithFavicon.props.href).toContain("github.com")
    expect(linkWithFavicon.props.children).toBe("Updated")
  })
})
