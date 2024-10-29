/**
 * @jest-environment jsdom
 */
import { jest } from "@jest/globals"
import { describe, it, expect, beforeEach } from "@jest/globals"
import {
  renderPublicationInfo,
  getFaviconPath,
  insertFavicon,
  renderLastUpdated,
} from "../ContentMeta"
import { TURNTROUT_FAVICON_PATH } from "../../plugins/transformers/linkfavicons"
import React from "react"
import { GlobalConfiguration } from "../../cfg"
import { QuartzPluginData } from "../../plugins/vfile"

jest.mock("../Date", () => ({
  formatDate: jest.fn(() => "Mocked Date"),
  getDate: jest.fn(() => new Date("2023-01-01")),
}))

jest.mock("../../plugins/transformers/linkfavicons", () => ({
  GetQuartzPath: jest.fn(() => "mocked/path"),
  urlCache: new Map([["mocked/path", TURNTROUT_FAVICON_PATH]]),
}))

// Simplified helper functions
const hasChildText = (children: React.ReactNode, text: string): boolean => {
  if (!children) return false
  if (typeof children === "string") return children.includes(text)
  if (Array.isArray(children)) {
    return children.some((child) => hasChildText(child, text))
  }
  if (typeof children === "object" && "props" in children && children.props?.children) {
    return hasChildText(children.props.children, text)
  }
  return false
}

const hasChildWithProps = (children: React.ReactNode, props: object): boolean => {
  if (!children) return false
  if (Array.isArray(children)) {
    return children.some((child) => hasChildWithProps(child, props))
  }
  if (typeof children === "object" && "props" in children && children.props) {
    const isMatch = Object.entries(props).every(([key, value]) => children.props[key] === value)
    if (isMatch) return true
    return hasChildWithProps(children.props.children, props)
  }
  return false
}

describe("renderPublicationInfo", () => {
  let cfg: GlobalConfiguration
  let fileData: QuartzPluginData
  let frontmatter: QuartzPluginData["frontmatter"]

  beforeEach(() => {
    cfg = {
      locale: "en-US",
    } as GlobalConfiguration

    frontmatter = {
      title: "Test Title",
      original_url: "https://turntrout.com",
      date_published: "2022-12-31T12:00:00",
    }

    fileData = {
      frontmatter,
    } as QuartzPluginData
  })

  it("should return null when date_published is not present", () => {
    frontmatter!.date_published = undefined
    expect(renderPublicationInfo(cfg, fileData)).toBeNull()
  })

  it("should render publication info with date_published", () => {
    const result = renderPublicationInfo(cfg, fileData)
    const children = result?.props?.children

    expect(result?.type).toBe("span")
    expect(result?.props?.className).toBe("publication-str")

    expect(hasChildText(children, "Publish")).toBe(true)

    expect(
      hasChildWithProps(children, {
        href: "https://turntrout.com/",
        className: "external",
        target: "_blank",
      }),
    ).toBe(true)
  })

  it("shouldn't render publication info without date_published", () => {
    if (frontmatter) {
      frontmatter.date_published = undefined
    }
    const result = renderPublicationInfo(cfg, fileData)
    expect(result).toBeNull()
  })

  it("should include favicon in rendered output", () => {
    const result = renderPublicationInfo(cfg, fileData)
    const children = result?.props?.children || []

    expect(
      hasChildWithProps(children, {
        src: TURNTROUT_FAVICON_PATH,
        className: "favicon",
      }),
    ).toBe(true)
  })

  it("should render 'Published on' without favicon when no original_url", () => {
    frontmatter!.original_url = undefined
    frontmatter!.date_published = "2022-12-31T12:00:00"

    const result = renderPublicationInfo(cfg, fileData)
    const children = result?.props?.children || []

    expect(result?.type).toBe("span")
    expect(result?.props?.className).toBe("publication-str")
    expect(hasChildText(children, "Published on")).toBe(true)
    expect(hasChildWithProps(children, { src: TURNTROUT_FAVICON_PATH })).toBe(false)
  })
})

describe("getFaviconPath", () => {
  it("should return correct favicon path", () => {
    expect(getFaviconPath(new URL("https://turntrout.com"))).toBe(TURNTROUT_FAVICON_PATH)
  })

  it("should return null when favicon not found", () => {
    const url = new URL("https://unknown.com")
    const result = getFaviconPath(url)
    expect(result).toBeNull()
  })
})

describe("insertFavicon", () => {
  it("should insert favicon after text content", () => {
    const result = insertFavicon(TURNTROUT_FAVICON_PATH, <span>A</span>)

    expect(result).toEqual(
      expect.objectContaining({
        props: expect.objectContaining({
          children: expect.arrayContaining([
            expect.objectContaining({
              type: "span",
              props: { children: "A" },
            }),
            expect.objectContaining({
              type: "img",
              props: {
                src: TURNTROUT_FAVICON_PATH,
                alt: "",
                className: "favicon",
              },
            }),
          ]),
        }),
      }),
    )
  })

  it("should return original node when imgPath is null", () => {
    const node = <span>A</span>
    const result = insertFavicon(null, node)
    expect(result).toEqual(node)
  })
})

describe("renderLastUpdated", () => {
  let cfg: GlobalConfiguration
  let fileData: QuartzPluginData
  let frontmatter: QuartzPluginData["frontmatter"]

  beforeEach(() => {
    cfg = {
      locale: "en-US",
    } as GlobalConfiguration

    frontmatter = {
      title: "Test Title",
      date_updated: "2023-01-01T12:00:00",
    }

    fileData = {
      frontmatter,
      slug: "test-post",
    } as QuartzPluginData
  })

  it("should return null when date_updated is not present", () => {
    if (frontmatter) {
      frontmatter.date_updated = undefined
    }
    expect(renderLastUpdated(cfg, fileData)).toBeNull()
  })

  it("should return null when hide_metadata is true", () => {
    if (frontmatter) {
      frontmatter.hide_metadata = true
    }
    expect(renderLastUpdated(cfg, fileData)).toBeNull()
  })

  it("should render last updated info with GitHub link and favicon", () => {
    const result = renderLastUpdated(cfg, fileData)
    const children = result?.props?.children || []

    expect(result?.type).toBe("span")
    expect(result?.props?.className).toBe("last-updated-str")
    expect(hasChildText(children, "Updated")).toBe(true)
    expect(
      hasChildWithProps(result as React.ReactElement, {
        href: expect.stringContaining("github.com"),
        className: "external",
        target: "_blank",
      }),
    ).toBe(true)
  })

  it("should include GitHub favicon in rendered output", () => {
    const result = renderLastUpdated(cfg, fileData)
    console.log(result?.props.children[1])

    expect(
      hasChildWithProps(result as React.ReactElement, {
        className: "favicon",
        src: expect.stringContaining(".avif"),
      }),
    ).toBe(true)
  })
})
