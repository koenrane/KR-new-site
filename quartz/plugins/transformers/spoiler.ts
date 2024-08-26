import { visit } from "unist-util-visit";
import { Root, Element, Parent, Text } from "hast";
import { h } from 'hastscript';

const SPOILER_REGEX = /^!([\s\S]*?)$/;

export function matchSpoilerText(text: string): string | null {
  const match = text.match(SPOILER_REGEX);
  return match ? match[1].trim() : null;
}

export function createSpoilerNode(content: string): Element {
  return h("div", { className: ["spoiler-container"] }, [
    h("span", { className: ["spoiler-content"] }, [content]),
    h("span", { className: ["spoiler-overlay"] }, ["Hover or click to show"]),
  ]);
}

export function modifyNode(node: Element, index: number | undefined, parent: Parent | undefined) {
  if (index === undefined || parent === undefined) return;
  if (node.tagName === 'blockquote' && node.children.length > 0) {
    const firstChild = node.children[0] as Element;
    if (firstChild.tagName === 'p' && firstChild.children.length > 0) {
      const textNode = firstChild.children[0] as Text;
      if (textNode.type === 'text' && matchSpoilerText(textNode.value)) {
        const spoilerContent = textNode.value.slice(1).trimStart(); // Remove the '!' at the beginning
        parent.children[index] = createSpoilerNode(spoilerContent) as Element;
      }
    }
  }
}

export function rehypeCustomSpoiler() {
  return (tree: Root) => {
    visit(tree, "element", modifyNode);
  };
}