/**
 * @jest-environment node
 */
import { describe, it, expect } from "@jest/globals"
import { load as cheerioLoad } from "cheerio"
import * as cheerio from "cheerio"

import { reorderHead } from "./handlers"

const isTag = (element: cheerio.Element): element is cheerio.TagElement => element.type === "tag"

const getHeadChildren = (html: string): cheerio.Element[] =>
  cheerioLoad(html)("head").children().toArray()

describe("reorderHead", () => {
  const createHtml = (headContent: string): string => `
        <!DOCTYPE html>
        <html>
            <head>${headContent}</head>
            <body></body>
        </html>
    `

  it("should maintain the same number of elements", () => {
    const input = createHtml(`
            <meta charset="utf-8">
            <title>Test</title>
            <link rel="stylesheet" href="style.css">
            <script id="detect-dark-mode">/* dark mode script */</script>
            <style id="critical-css">.test{color:red}</style>
            <script>console.log('other script')</script>
        `)

    const result = reorderHead(input)
    const originalChildren = getHeadChildren(input)
    const newChildren = getHeadChildren(result)
    expect(newChildren.length).toBe(originalChildren.length)
  })

  it("should order elements correctly", () => {
    const input = createHtml(`
            <script>console.log('other script')</script>
            <meta charset="utf-8">
            <link rel="stylesheet" href="style.css">
            <style id="critical-css">.test{color:red}</style>
            <title>Test</title>
            <script id="detect-dark-mode">/* dark mode script */</script>
        `)

    const result = reorderHead(input)
    const $ = cheerioLoad(result)
    const children = $("head").children().toArray() as cheerio.TagElement[]

    const expectedTagOrder = [
      "script", // dark mode script
      "meta",
      "title",
      "style", // critical CSS
      "link",
      "script", // other scripts
    ]
    expect(children.map((el) => el.tagName)).toEqual(expectedTagOrder)

    // Verify specific IDs
    expect(children[0].attribs.id).toBe("detect-dark-mode")
    expect(children[3].attribs.id).toBe("critical-css")
  })

  it("should handle missing elements gracefully", () => {
    const input = createHtml(`
            <meta charset="utf-8">
            <title>Test</title>
        `)

    const result = reorderHead(input)
    const $ = cheerioLoad(result)
    const children: cheerio.TagElement[] = $("head").children().toArray() as cheerio.TagElement[]
    expect(children.every(isTag)).toBe(true)

    expect(children.length).toBe(2)
    expect(children.map((el) => el.tagName)).toEqual(["meta", "title"])
  })

  it("should handle duplicate elements correctly", () => {
    const input = createHtml(`
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width">
            <link rel="stylesheet" href="style1.css">
            <link rel="stylesheet" href="style2.css">
        `)

    const result = reorderHead(input)
    const $ = cheerioLoad(result)
    const children: cheerio.TagElement[] = $("head").children().toArray() as cheerio.TagElement[]
    expect(children.every(isTag)).toBe(true)

    // Meta tags should come before link tags
    expect(children[0].tagName).toBe("meta")
    expect(children[1].tagName).toBe("meta")
    expect(children[2].tagName).toBe("link")
    expect(children[3].tagName).toBe("link")
  })
})
