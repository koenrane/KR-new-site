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

const ignoreClasses = ['bad-handwriting', 'gold-script'];
function hasIgnoreClassInAncestors(element) {
    while (element = element.parentNode) {
        if (!element.classList) continue; // Skip nodes without classes (like text nodes
        if (ignoreClasses.some(className => element.classList.contains(className))) {
            return true; // Found an ancestor with an ignore class
        }
    }
    return false; // No ancestor has an ignore class
}

// Custom rehype plugin for tagging acronyms
const rehypeTagAcronyms: Plugin = () => {
  return (rootNode) => {
    console.log("entered");
    const regex = /\b([A-Z]{2,})\b/g;
    let nodes = [];
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);

    let textNode;
    while (textNode = walker.nextNode()) {
        // Skip already tagged nodes
        const parent = textNode.parentNode;
        if (parent.nodeName === "ABBR") continue; 
        if (hasIgnoreClassInAncestors(textNode)) continue;

        nodes.push(textNode);
    }

    // Check all text nodes for acronyms
    nodes.forEach(textNode => {
        const matches = textNode.nodeValue.match(regex);
        if (!matches) return; // Skip nodes without acronyms

        // Create a new span element for each acronym, which will also contain
        //  the before/after text
        let lastIndex = 0;
        const fragment = document.createDocumentFragment();

        matches.forEach(match => {
            console.log("Acronym match: ", match);
            const index = textNode.nodeValue.indexOf(match, lastIndex);
            if (index > lastIndex) {
                fragment.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIndex, index)));
            }
            const abbr = document.createElement('abbr');
            abbr.className = 'small-caps';
            abbr.textContent = match;
            fragment.appendChild(abbr);

            // Note where the last acronym ended
            lastIndex = index + match.length;
        });

        // Add any remaining text after the last acronym
        if (lastIndex < textNode.nodeValue.length) {
            fragment.appendChild(document.createTextNode(textNode.nodeValue.substring(lastIndex)));
        }

        textNode.parentNode.replaceChild(fragment, textNode);
    });
}};

// The main Quartz plugin export
export const TagAcronyms: QuartzTransformerPlugin = () => {
  return {
    name: 'TagAcronyms',
    htmlPlugins() {
      return [rehypeTagAcronyms];
    },
  };
};

