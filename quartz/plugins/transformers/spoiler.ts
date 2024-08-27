import { visit } from "unist-util-visit";
import { QuartzTransformerPlugin } from "../types"
import { Root, Element, Parent, Text } from "hast";
import { h } from 'hastscript';

const SPOILER_REGEX = /^!\s*(.*)/;

export function matchSpoilerText(text: string): string | null {
  const match = text.match(SPOILER_REGEX);
  return match ? match[1] : null;
}

export function createSpoilerNode(content: string | Element[]): Element {
  return h("div", { className: ["spoiler-container"],     
    onclick: "this.classList.toggle('revealed')" }, [
    h("span", { className: ["spoiler-overlay"] }),
    h("span", { className: ["spoiler-content"]}, content),
  ]);
}

export function modifyNode(node: Element, index: number | undefined, parent: Parent | undefined) {
  if (index === undefined || parent === undefined) return;
  if (node?.tagName === 'blockquote') {
    const spoilerContent: Element[] = [];
    let isSpoiler = true;

    for (const child of node.children) {
      if (child.type === 'element' && child.tagName === 'p') {
        const processedParagraph = processParagraph(child);
        if (processedParagraph) {
          spoilerContent.push(processedParagraph);
        } else {
          isSpoiler = false;
          break;
        }
      } else if (child.type === 'text' && child.value.trim() === '!') {
        // Handle empty spoiler lines
        spoilerContent.push(h('p', {}));
      } else if (child.type === 'text' && child.value.trim() === '') {
        // Ignore empty text nodes
        continue;
      } else {
        isSpoiler = false;
        break;
      }
    }

    if (isSpoiler && spoilerContent.length > 0) {
      parent.children[index] = createSpoilerNode(spoilerContent);
    }
  }
}

function processParagraph(paragraph: Element): Element | null {
  const newChildren: (Text | Element)[] = [];
  let isSpoiler = false;

  for (const child of paragraph.children) {
    if (child.type === 'text') {
      const spoilerText = matchSpoilerText(child.value);
      if (spoilerText !== null) {
        isSpoiler = true;
        newChildren.push({ type: 'text', value: spoilerText });
      } else if (isSpoiler) {
        newChildren.push(child);
      } else {
        return null;
      }
    } else if (child.type === 'element') {
      newChildren.push(child);
    }
  }

  return isSpoiler ? { ...paragraph, children: newChildren } : null;
}

export function transformAST(tree: Root): void {
    visit(tree, "element", modifyNode)
}

export const rehypeCustomSpoiler: QuartzTransformerPlugin = () =>  {
    return {
      name: "customSpoiler",
      htmlPlugins() {
        return [() => transformAST]
      },
    }
  }