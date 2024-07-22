import {
  GetQuartzPath,
  MaybeSaveFavicon,
  CreateFaviconElement,
  ModifyNode,
  MAIL_PATH,
  insertFavicon,
} from "./linkfavicons"
import { jest } from "@jest/globals"
jest.mock("fs")
import fs from "fs"

import fetchMock from "jest-fetch-mock"
fetchMock.enableMocks()

describe("Favicon Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(fs.promises, "stat").mockRejectedValue({ code: "ENOENT" })
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
      fetchMock
        .mockResponseOnce("", { status: avifStatus })
        .mockResponseOnce("", { status: googleStatus })
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
      ["All attempts fail", 404, false, null, 404],
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
      ["localhost", "/static/images/external-favicons/turntrout_com.png"],
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
        },
        alt: description,
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
  })

  describe("MAIL_PATH", () => {
    it.each([
      ["mailto:test@example.com", MAIL_PATH],
      ["mailto:another@domain.org", MAIL_PATH],
    ])("should use MAIL_PATH for mailto links", async (href, expectedPath) => {
      const node = {
        tagName: "a",
        properties: { href },
        children: [],
      }

      ModifyNode(node)
      expect(node.children[0]).toHaveProperty("properties.src", expectedPath)
    })
  })
})
