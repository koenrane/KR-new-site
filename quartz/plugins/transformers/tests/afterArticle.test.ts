import { Root, Element } from "hast"
import { h } from "hastscript"
import { insertAfterTroutOrnament } from "../afterArticle"

describe("insertAfterTroutOrnament", () => {
  it("should insert the component after the trout ornament", () => {
    // Create a mock tree
    const mockTree: Root = {
      type: "root",
      children: [
        h("div", { id: "some-other-div" }, "Some content"),
        h("div", { id: "trout-ornament" }, "Trout Ornament"),
        h("div", { id: "another-div" }, "More content"),
      ],
    }

    // Create a mock component to insert
    const mockComponent: Element = h("div", { id: "sequence-links" }, "Sequence Links")

    // Call the function
    insertAfterTroutOrnament(mockTree, mockComponent)

    // Assert that the component was inserted in the correct position
    expect(mockTree.children).toHaveLength(4)
    expect(mockTree.children[2]).toBe(mockComponent)
    expect((mockTree.children[2] as Element).properties?.id).toBe("sequence-links")
  })

  it("should not modify the tree if trout ornament is not found", () => {
    // Create a mock tree without trout ornament
    const mockTree: Root = {
      type: "root",
      children: [
        h("div", { id: "some-other-div" }, "Some content"),
        h("div", { id: "another-div" }, "More content"),
      ],
    }

    // Create a mock component to insert
    const mockComponent: Element = h("div", { id: "sequence-links" }, "Sequence Links")

    // Call the function
    insertAfterTroutOrnament(mockTree, mockComponent)

    // Assert that the tree was not modified
    expect(mockTree.children).toHaveLength(2)
    expect(
      mockTree.children.every((child) => (child as Element).properties?.id !== "sequence-links"),
    ).toBe(true)
  })
})
