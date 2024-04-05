/**
 * Quartz Transformer Plugin for tagging acronyms in HTML content.
 * This plugin uses a custom `rehype` plugin to find and wrap acronyms in `<abbr>` tags with a class `small-caps`.
 *
 * How it works:
 * - It traverses the HTML AST looking for text nodes that are not already a child of an `<abbr>` tag.
 * - It ignores any text within elements with a specific class (that indicates the text should not be processed).
 * - When acronyms are found, they are wrapped in `<abbr>` elements, and any surrounding text is preserved.
 *
 * Usage:
 * To use this plugin, include it in your Quartz configuration for plugins.
 * Make sure to handle the 'ignore class' logic based on your specific HTML structure.
 */

import { QuartzTransformerPlugin } from '../types';
import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';
import { h } from 'hastscript';

// Custom rehype plugin for tagging acronyms
const rehypeTagAcronyms: Plugin = () => {
  return (tree) => {
    visit(tree, 'text', (node, index, parent) => {
      if (parent.tagName === 'abbr' || parent?.properties?.className?.includes("no-smallcaps")) {
        return;
      }

      const regex = /\b([A-Z]{2,})\b/g;
      const matches = node.value.match(regex);
      if (matches) {
        const fragment = [];
        let lastIndex = 0;
        matches.forEach(match => {
          const index = node.value.indexOf(match, lastIndex);
          if (index > lastIndex) {
            fragment.push({ type: 'text', value: node.value.substring(lastIndex, index) });
          }
          fragment.push(
            h('abbr.small-caps', match)
          );
          lastIndex = index + match.length;
        });

        if (lastIndex < node.value.length) {
          fragment.push({ type: 'text', value: node.value.substring(lastIndex) });
        }

        // Replace the original text node with the new nodes
        if (parent.children && typeof index === 'number') {
          parent.children.splice(index, 1, ...fragment);
        }
      }
    });
  };
};

// The main Quartz plugin export
export const TagAcronyms: QuartzTransformerPlugin = () => {
  return {
    name: 'TagAcronyms',
    htmlPlugins() {
      return [rehypeTagAcronyms];
    },
  };
};
