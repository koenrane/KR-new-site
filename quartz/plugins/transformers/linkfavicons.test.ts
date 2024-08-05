import { jest } from "@jest/globals"
import fsExtra from "fs-extra"
import path from "path"
import os from "os"

import {
  GetQuartzPath,
  MaybeSaveFavicon,
  CreateFaviconElement,
  ModifyNode,
  MAIL_PATH,
  DEFAULT_PATH,
  downloadImage,
  TURNTROUT_FAVICON_PATH,
  urlCache,
  createUrlCache,
  insertFavicon,
} from "./linkfavicons"

jest.mock("fs")
import fs from "fs"

jest.mock("stream/promises")
import streamPromises from "stream/promises"

import fetchMock from "jest-fetch-mock"
fetchMock.enableMocks()

describe("Favicon Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(fs.promises, "stat").mockRejectedValue({ code: "ENOENT" })
    jest.spyOn(streamPromises, "pipeline").mockResolvedValue()

    // Reset the cache
    urlCache.clear()
    for (const [key, value] of createUrlCache()) {
      urlCache.set(key, value)
    }
  })

  describe("MaybeSaveFavicon", () => {
    const hostname = "example.com"
    const avifUrl = "https://assets.turntrout.com/static/images/external-favicons/example_com.avif"
    const pngPath = "/static/images/external-favicons/example_com.png"

    beforeEach(() => {
      jest.clearAllMocks()
      fetchMock.resetMocks()
    })

    const mockFetchAndFs = (
      avifStatus: number,
      localPngExists: boolean,
      googleStatus: number = 200,
    ) => {
      let responseBodyAVIF = ""
      if (avifStatus === 200) {
        responseBodyAVIF = "Mock image content"
      }
      let responseBodyGoogle = ""
      if (googleStatus === 200) {
        responseBodyGoogle = "Mock image content"
      }

      fetchMock
        .mockResponseOnce(responseBodyAVIF, { status: avifStatus })
        .mockResponseOnce(responseBodyGoogle, { status: googleStatus })
      jest
        .spyOn(fs.promises, "stat")
        .mockImplementation(() =>
          localPngExists ? Promise.resolve({} as fs.Stats) : Promise.reject({ code: "ENOENT" }),
        )
    }

    it.each<[string, number, boolean, string | null, number?]>([
      ["AVIF exists", 200, false, avifUrl],
      ["Local PNG exists", 404, true, pngPath],
      ["Download from Google", 404, false, pngPath],
      ["All attempts fail", 404, false, DEFAULT_PATH, 404],
    ])("%s", async (_, avifStatus, localPngExists, expected, googleStatus = 200) => {
      mockFetchAndFs(avifStatus, localPngExists, googleStatus)
      expect(await MaybeSaveFavicon(hostname)).toBe(expected)
    })

    it("handles network errors during AVIF check", async () => {
      fetchMock.mockReject(new Error("Network error"))
      jest.spyOn(fs.promises, "stat").mockResolvedValue({} as fs.Stats)
      expect(await MaybeSaveFavicon(hostname)).toBe(pngPath)
    })
  })

  describe("GetQuartzPath", () => {
    it.each([
      ["www.example.com", "/static/images/external-favicons/example_com.png"],
      ["localhost", TURNTROUT_FAVICON_PATH],
      ["subdomain.example.org", "/static/images/external-favicons/subdomain_example_org.png"],
    ])("should return the correct favicon path for %s", (hostname, expectedPath) => {
      expect(GetQuartzPath(hostname)).toBe(expectedPath)
    })
  })

  describe("CreateFaviconElement", () => {
    it.each([
      ["/path/to/favicon.png", "Test Description"],
      ["/another/favicon.jpg", "Another Description"],
    ])("should create a favicon element with correct attributes", (urlString, description) => {
      const element = CreateFaviconElement(urlString, description)
      expect(element).toEqual({
        type: "element",
        tagName: "img",
        children: [],
        properties: {
          src: urlString,
          class: "favicon",
          alt: description,
        },
      })
    })
  })

  describe("insertFavicon", () => {
    it.each([
      [null, false],
      ["/valid/path.png", true],
    ])("should insert favicon correctly when imgPath is %s", (imgPath, shouldInsert) => {
      const node = { children: [] }
      insertFavicon(imgPath, node)
      expect(node.children.length).toBe(shouldInsert ? 1 : 0)
    })

    describe("span creation", () => {
      const imgPath = "/test/favicon.png"

      it("should create a span with the last 4 characters and favicon for long text", () => {
        const node = { children: [{ type: "text", value: "Long text content" }] }
        insertFavicon(imgPath, node)

        expect(node.children.length).toBe(2)
        expect(node.children[0]).toEqual({ type: "text", value: "Long text con" })
        expect(node.children[1]).toMatchObject({
          type: "element",
          tagName: "span",
          properties: { style: "white-space: nowrap;" },
          children: [
            { type: "text", value: "tent" },
            CreateFaviconElement(imgPath), // TODO user insertFavicon
          ],
        })
      })

      it("should create a span with all characters and favicon for short text", () => {
        const node = { children: [{ type: "text", value: "1234" }] }
        insertFavicon(imgPath, node)

        expect(node.children.length).toBe(1)
        expect(node.children[0]).toMatchObject({
          type: "element",
          tagName: "span",
          properties: { style: "white-space: nowrap;" },
          children: [{ type: "text", value: "1234" }, CreateFaviconElement(imgPath)],
        })
      })

      it("should create a span with up to 4 characters for medium-length text", () => {
        const node = { children: [{ type: "text", value: "Medium" }] }
        insertFavicon(imgPath, node)

        expect(node.children.length).toBe(2)
        expect(node.children[0]).toEqual({ type: "text", value: "Me" })
        expect(node.children[1]).toMatchObject({
          type: "element",
          tagName: "span",
          properties: { style: "white-space: nowrap;" },
          children: [{ type: "text", value: "dium" }, CreateFaviconElement(imgPath)],
        })
      })

      it("should not create a span for nodes without text content", () => {
        const node = { children: [{ type: "element", tagName: "div" }] }
        insertFavicon(imgPath, node)

        expect(node.children.length).toBe(2)
        expect(node.children[1]).toMatchObject(CreateFaviconElement(imgPath))
      })

      it("should handle empty text nodes correctly", () => {
        const node = { children: [{ type: "text", value: "" }] }
        insertFavicon(imgPath, node)

        expect(node.children.length).toBe(2)
        expect(node.children[1]).toMatchObject(CreateFaviconElement(imgPath))
      })

      it("Should not replace children with [span] if more than one child", () => {
        const node = {
          tag: "p",
          children: [
            "My email is ",
            {
              tag: "a",
              attributes: {
                href: "mailto:alex@turntrout.com",
                class: "external",
              },
              children: [
                {
                  tag: "code",
                  children: ["alex@turntrout.com"],
                },
              ],
            },
            ".",
          ],
        }

        insertFavicon(MAIL_PATH, node)

        // If a span were inserted, there would be 3 children (text,
        // link, span)
        expect(node.children.length).toBe(4)
        expect(node.children[3]).toMatchObject(CreateFaviconElement(MAIL_PATH))
      })
    })
  })

  describe("ModifyNode", () => {
    it.each([
      // ["https://example.com",
      // "/static/images/external-favicons/example_com.png"], //Have yet
      // to do integration test
      // TODO create test checking that imgPath===DEFAULT_PATH is skipped
      ["./shard-theory", TURNTROUT_FAVICON_PATH],
      ["../shard-theory", null],
      ["#test", null],
      ["mailto:test@example.com", MAIL_PATH],
      ["mailto:another@domain.org", MAIL_PATH],
    ])("should insert favicon for %s", async (href, expectedPath) => {
      const node = {
        tagName: "a",
        properties: { href },
        children: [],
      }

      await ModifyNode(node)
      if (expectedPath === null) {
        expect(node.children.length).toBe(0)
      } else {
        expect(node.children[0]).toHaveProperty("properties.src", expectedPath)
      }
    })
  })

  describe("MaybeSaveFavicon with caching", () => {
    const hostname = "example.com"
    const quartzPngPath = "/static/images/external-favicons/example_com.png"
    const avifUrl = "https://assets.turntrout.com/static/images/external-favicons/example_com.avif"

    beforeEach(() => {
      jest.clearAllMocks()
      fetchMock.resetMocks()
      urlCache.set = jest.fn(urlCache.set)
      urlCache.get = jest.fn(urlCache.get)
    })

    it("should cache AVIF URL when found", async () => {
      fetchMock.mockResponseOnce("", { status: 200 })
      const result = await MaybeSaveFavicon(hostname)
      expect(result).toBe(avifUrl)
      expect(urlCache.set).toHaveBeenCalledWith(quartzPngPath, avifUrl)
    })

    it("should cache PNG path when local file exists", async () => {
      fetchMock.mockResponseOnce("", { status: 404 })
      jest.spyOn(fs.promises, "stat").mockResolvedValue({} as fs.Stats)
      const result = await MaybeSaveFavicon(hostname)
      expect(result).toBe(quartzPngPath)
      expect(urlCache.set).toHaveBeenCalledWith(quartzPngPath, quartzPngPath)
    })
  })
})

describe("downloadImage", () => {
  let tempDir: string

  beforeEach(async () => {
    // Create a temporary directory for each test
    jest.clearAllMocks()
    fetchMock.resetMocks()
    tempDir = await fsExtra.mkdtemp(path.join(os.tmpdir(), "download-test-"))
  })

  afterEach(async () => {
    // Clean up the temporary directory after each test
    await fsExtra.remove(tempDir)
  })

  const runTest = async (
    mockResponse: Response | Error,
    expectedResult: boolean,
    expectedFileContent?: string,
  ) => {
    const url = "https://example.com/image.png"
    const imagePath = path.join(tempDir, "image.png")

    if (mockResponse instanceof Error) {
      fetchMock.mockReject(mockResponse)
    } else {
      const body = String(mockResponse.body) || ""
      fetchMock.mockResponseOnce(body, { status: mockResponse.status })
    }

    const result = await downloadImage(url, imagePath)

    expect(global.fetch).toHaveBeenCalledTimes(1)
    expect(global.fetch).toHaveBeenCalledWith(url)
    expect(result).toBe(expectedResult)

    if (expectedFileContent !== undefined) {
      const fileExists = await fsExtra.pathExists(imagePath)
      expect(fileExists).toBe(true)
      if (fileExists) {
        const content = await fsExtra.readFile(imagePath, "utf-8")
        expect(content).toBe(expectedFileContent)
      }
    } else {
      const fileExists = await fsExtra.pathExists(imagePath)
      expect(fileExists).toBe(false)
    }
  }

  it("should download image successfully", async () => {
    const mockContent = "mock image content"
    const mockResponse = new Response(mockContent, { status: 200 })
    await runTest(mockResponse, true, mockContent)
  })

  it("should return false if fetch response is not ok", async () => {
    const mockResponse = new Response("", { status: 404 })
    await runTest(mockResponse, false)
  })

  it("should return false if fetch response has no body", async () => {
    const mockResponse = new Response("", { status: 200 })
    await runTest(mockResponse, false)
  })

  it("should handle fetch errors", async () => {
    const mockError = new Error("Network error")
    await runTest(mockError, false)
  })
})
