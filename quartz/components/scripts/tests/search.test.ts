/**
 * @jest-environment jsdom
 */

import { describe, it, expect, beforeEach } from "@jest/globals"

import { prefixDescendantIds, descendantsWithId, descendantsSamePageLinks } from "../search"

describe("Search Module Functions", () => {
  let rootNode: HTMLElement

  beforeEach(() => {
    // Set up a sample DOM structure for testing
    document.body.innerHTML = `
      <div id="root">
        <div id="child1">
          <a href="#section1" class="same-page-link">Link to Section 1</a>
          <h2 id="section1">Section 1</h2>
          <a href="#section2" class="same-page-link">Link to Section 2</a>
          <h2 id="section2">Section 2</h2>
          <div id="nested">
            <p id="paragraph">Some text</p>
          </div>
        </div>
        <div class="no-id">
          <span>No ID here</span>
        </div>
      </div>
    `
    rootNode = document.getElementById("root") as HTMLElement
  })

  describe("descendantsWithId", () => {
    it("should return all descendant elements with an ID", () => {
      const elementsWithId = descendantsWithId(rootNode)
      const ids = elementsWithId.map((el) => el.id)
      expect(ids).toContain("child1")
      expect(ids).toContain("section1")
      expect(ids).toContain("section2")
      expect(ids).toContain("nested")
      expect(ids).toContain("paragraph")
      expect(ids).not.toContain("root") // rootNode is not a descendant
      expect(ids).not.toContain("") // No empty IDs
    })

    it("should return an empty array when no descendants have IDs", () => {
      const emptyDiv = document.createElement("div")
      const elementsWithId = descendantsWithId(emptyDiv)
      expect(elementsWithId).toEqual([])
    })
  })

  describe("descendantsSamePageLinks", () => {
    it("should return all same-page link descendants", () => {
      const links = descendantsSamePageLinks(rootNode)
      const hrefs = links.map((link) => link.getAttribute("href"))
      expect(hrefs).toContain("#section1")
      expect(hrefs).toContain("#section2")
      expect(links).toHaveLength(2)
    })

    it("should return an empty array when no same-page links are present", () => {
      const emptyDiv = document.createElement("div")
      const links = descendantsSamePageLinks(emptyDiv)
      expect(links).toEqual([])
    })
  })

  describe("prefixDescendantIds", () => {
    it("should prefix all descendant IDs and update same-page links", () => {
      prefixDescendantIds(rootNode)

      // Check that IDs are prefixed
      const elementsWithId = descendantsWithId(rootNode)
      elementsWithId.forEach((el) => {
        expect(el.id.startsWith("search-")).toBe(true)
      })

      // Check that same-page links are updated
      const links = descendantsSamePageLinks(rootNode)
      links.forEach((link) => {
        const href = link.getAttribute("href")
        expect(href?.includes("#search-")).toBe(true)
      })

      // Ensure that IDs match the updated links
      links.forEach((link) => {
        const href = link.getAttribute("href")?.split("#").pop()
        const targetElement = document.getElementById(href || "")
        expect(targetElement).not.toBeNull()
      })
    })

    it("should handle elements with and without IDs correctly", () => {
      // Add an element without an ID
      const noIdElement = document.createElement("div")
      rootNode.appendChild(noIdElement)

      prefixDescendantIds(rootNode)

      // Verify that elements without IDs remain unchanged
      const elements = rootNode.querySelectorAll("*")
      elements.forEach((el) => {
        if (el.id) {
          expect(el.id.startsWith("search-")).toBe(true)
        } else {
          expect(el.id).toBe("")
        }
      })
    })

    it("should not affect elements outside the rootNode", () => {
      const outsideElement = document.createElement("div")
      outsideElement.id = "outside"
      document.body.appendChild(outsideElement)

      prefixDescendantIds(rootNode)

      const updatedOutsideElement = document.getElementById("outside")
      expect(updatedOutsideElement).not.toBeNull()
      expect(updatedOutsideElement?.id).toBe("outside")

      // Clean up
      document.body.removeChild(outsideElement)
    })

    it("should handle multiple invocations without duplicating prefixes", () => {
      prefixDescendantIds(rootNode)
      prefixDescendantIds(rootNode)

      const elementsWithId = descendantsWithId(rootNode)
      elementsWithId.forEach((el) => {
        // IDs should not have "search-search-" prefix
        expect(el.id.startsWith("search-")).toBe(true)
        expect(el.id.indexOf("search-search-")).toBe(-1)
      })
    })
  })
})
