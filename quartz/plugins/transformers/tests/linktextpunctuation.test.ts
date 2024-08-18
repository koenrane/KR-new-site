import { remarkLinkPunctuation } from "../linktextpunctuation"

describe("remarkLinkPunctuation Plugin", () => {
  const createMockNode = (content: string): Node => {
    const node = document.createTextNode(content);
    return node;
  };

  const applyTransform = (input: string): string => {
    const node = createMockNode(input);
    remarkLinkPunctuation(node);
    return node.textContent || "";
  };

  describe("Handles various link scenarios", () => {
    it.each([
      ["[Link](https://example.com).", "[Link](https://example.com)."],
      ["[Link](https://example.com),", "[Link](https://example.com),"],
      ['"[Link](https://example.com)"', '"[Link](https://example.com)"'],
      ["([Google Scholar](https://scholar.google.com/citations?user=thAHiVcAAAAJ))", "([Google Scholar](https://scholar.google.com/citations?user=thAHiVcAAAAJ))"],
      ["[Link](https://example.com)!", "[Link](https://example.com)!"],
      ["[Link](https://example.com)?", "[Link](https://example.com)?"],
      ["[Link](https://example.com);", "[Link](https://example.com);"],
      ["[Link](https://example.com):", "[Link](https://example.com):"],
      ["*[Link](https://example.com)*", "*[Link](https://example.com)*"],
      ["**[Link](https://example.com)**", "**[Link](https://example.com)**"],
      ["[Link](https://example.com)`", "[Link](https://example.com)`"],
    ])("correctly handles '%s'", (input, expected) => {
      const result = applyTransform(input);
      expect(result).toBe(expected);
    });
  });

  describe("Handles multiple links in a single string", () => {
    it("processes multiple links correctly", () => {
      const input = "Check out [Link1](https://example1.com), and then [Link2](https://example2.com)!";
      const expected = "Check out [Link1](https://example1.com), and then [Link2](https://example2.com)!";
      const result = applyTransform(input);
      expect(result).toBe(expected);
    });
  });

  describe("Doesn't modify non-link text", () => {
    it("leaves regular text unchanged", () => {
      const input = "This is a regular sentence without any links.";
      const result = applyTransform(input);
      expect(result).toBe(input);
    });
  });

  describe("Handles edge cases", () => {
    it("processes nested elements correctly", () => {
      const parentNode = document.createElement('div');
      const childNode1 = document.createTextNode("[Link1](https://example1.com).");
      const childNode2 = document.createTextNode("[Link2](https://example2.com),");
      parentNode.appendChild(childNode1);
      parentNode.appendChild(childNode2);

      remarkLinkPunctuation(parentNode);

      expect(childNode1.textContent).toBe("[Link1](https://example1.com).");
      expect(childNode2.textContent).toBe("[Link2](https://example2.com),");
    });
  });
});
