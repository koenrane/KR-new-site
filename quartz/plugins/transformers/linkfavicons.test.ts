import {
  GetQuartzPath,
  MaybeSaveFavicon,
  CreateFaviconElement,
  ModifyNode,
  MAIL_PATH,
  DEFAULT_PATH,
  TURNTROUT_FAVICON_PATH,
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
        const imgPath = "/test/favicon.png";
        
        it("should create a span with the last 4 characters and favicon for long text", () => {
          const node = { children: [{ type: "text", value: "Long text content" }] };
          insertFavicon(imgPath, node);
          
          expect(node.children.length).toBe(2);
          expect(node.children[0]).toEqual({ type: "text", value: "Long text con" });
          expect(node.children[1]).toMatchObject({
            type: "element",
            tagName: "span",
            properties: { style: "white-space: nowrap;" },
            children: [
              { type: "text", value: "tent" },
              { type: "element", tagName: "img", properties: { src: imgPath, class: "favicon" } }
            ]
          });
        });
    
        it("should create a span with all characters and favicon for short text", () => {
          const node = { children: [{ type: "text", value: "1234" }] };
          insertFavicon(imgPath, node);
          
          expect(node.children.length).toBe(1);
          expect(node.children[0]).toMatchObject({
            type: "element",
            tagName: "span",
            properties: { style: "white-space: nowrap;" },
            children: [
              { type: "text", value: "1234" },
              { type: "element", tagName: "img", properties: { src: imgPath, class: "favicon" } }
            ]
          });
        });
    
        it("should create a span with up to 4 characters for medium-length text", () => {
          const node = { children: [{ type: "text", value: "Medium" }] };
          insertFavicon(imgPath, node);
          
          expect(node.children.length).toBe(2);
          expect(node.children[0]).toEqual({ type: "text", value: "Me" });
          expect(node.children[1]).toMatchObject({
            type: "element",
            tagName: "span",
            properties: { style: "white-space: nowrap;" },
            children: [
              { type: "text", value: "dium" },
              { type: "element", tagName: "img", properties: { src: imgPath, class: "favicon" } }
            ]
          });
        });
    
        it("should not create a span for nodes without text content", () => {
          const node = { children: [{ type: "element", tagName: "div" }] };
          insertFavicon(imgPath, node);
          
          expect(node.children.length).toBe(2);
          expect(node.children[1]).toMatchObject({
            type: "element",
            tagName: "img",
            properties: { src: imgPath, class: "favicon" }
          });
        });
    
        it("should handle empty text nodes correctly", () => {
          const node = { children: [{ type: "text", value: "" }] };
          insertFavicon(imgPath, node);
          
          expect(node.children.length).toBe(2);
          expect(node.children[1]).toMatchObject({
            type: "element",
            tagName: "img",
            properties: { src: imgPath, class: "favicon" }
          });
        });
      });
  })

  describe("ModifyNode", () => {
    it.each([
      // ["https://example.com",
      // "/static/images/external-favicons/example_com.png"], //Have yet
      // to do integration test
      ["https://unknown.org", DEFAULT_PATH],
      ["./shard-theory", TURNTROUT_FAVICON_PATH],
      ["../shard-theory", null],
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
    }
    )
  })
})
