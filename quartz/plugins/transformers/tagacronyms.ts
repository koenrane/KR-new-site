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

// Helper function to check for ignore class in ancestors
function hasIgnoreClassInAncestors(node, ignoreClasses) {
  let ancestor = node;
  while (ancestor) {
    if (ancestor.type === 'element' && ancestor.properties.className) {
      if (ignoreClasses.some(className => ancestor.properties.className.includes(className))) {
        return true;
      }
    }
    ancestor = ancestor.parent;
  }
  return false;
}

// Custom rehype plugin for tagging acronyms
const rehypeTagAcronyms: Plugin = () => {
  console.log("Plugin initialized."); // This should log when the plugin is initialized
  return (tree) => {
    console.log("Plugin called."); // This should log when the plugin is called on an AST

    visit(tree, 'text', (node, index, parent) => {
      console.log("Visiting a text node."); // This will log each time a text node is visited

      if (parent.tagName === 'abbr' || hasIgnoreClassInAncestors(parent, ['bad-handwriting', 'gold-script'])) {
        console.log("Skipped a node due to being inside 'abbr' or having an ignored class.");
        return;
      }

      const regex = /\b([A-Z]{2,})\b/g;
      const matches = node.value.match(regex);
      if (matches) {
        const fragment = [];
        let lastIndex = 0;
        matches.forEach(match => {
          console.log("Acronym match: ", match); // This will log each time an acronym is matched
          // ... rest of the matching and replacement logic
        });

        // Replace the original text node with the new nodes
        // ... replacement logic
      } else {
        console.log("No acronyms found in this node.");
      }
    });
  };
};

// The main Quartz plugin export
export const TagAcronymsPlugin: QuartzTransformerPlugin = () => {
  return {
    name: 'TagAcronyms',
    htmlPlugins() {
      return [rehypeTagAcronyms];
    },
  };
};

