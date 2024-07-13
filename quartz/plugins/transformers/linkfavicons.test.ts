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
    it.each([
      ["www.existing.com", true, "/static/images/external-favicons/existing_com.png"],
      ["www.fail.com", false, null],
    ])(
      "should handle favicon download for %s",
      async (hostname: string, downloadSuccess: boolean, expectedResult: string | null) => {
        jest.spyOn(fs.promises, "stat" as any).mockImplementation(() => {
          if (downloadSuccess) {
            return Promise.resolve({ isFile: () => true })
          } else {
            return Promise.reject({ code: "ENOENT" })
          }
        })

        fetchMock.mockResolvedValue({
          ok: downloadSuccess,
          status: downloadSuccess ? 200 : 404,
        } as any)

        const result = await MaybeSaveFavicon(hostname)
        expect(result).toBe(expectedResult)
      },
    )
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
