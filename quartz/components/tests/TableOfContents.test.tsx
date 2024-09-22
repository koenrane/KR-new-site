/**
* @jest-environment jsdom
*/
import { jest } from "@jest/globals"

import { Parent, Text } from 'hast'
import { describe, it, expect } from '@jest/globals';
import { TocEntry } from '../../plugins/transformers/toc';
import { processHtmlAst, processSmallCaps, addListItem, buildNestedList, processTocEntry, processKatex } from "../TableOfContents";

// Mock the createLogger function
jest.mock('../../plugins/transformers/logger_utils', () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
  }),
}));

let parent: Parent
beforeEach(() => {
    parent = { type: 'element', tagName: 'div', children: [] } as Parent
})

describe('processKatex', () => {
  it('should output katex node', () => {
    const latex = 'E = mc^2'
    processKatex(latex, parent)

    expect(parent.children).toHaveLength(1)
    expect(parent.children[0]).toHaveProperty('tagName', 'span')
    expect(parent.children[0]).toHaveProperty('properties.className', ['katex-toc'])
    // The value itself is HTML so it's clunky to test
  })
})

describe('processSmallCaps', () => {
  it('processes small caps correctly', () => {
    processSmallCaps('Test ^SMALLCAPS^', parent)
    expect(parent.children).toHaveLength(3)
    expect(parent.children[1]).toHaveProperty('tagName', 'abbr')
    expect(parent.children[1]).toHaveProperty('properties.className', ['small-caps'])
    expect((parent.children[1] as unknown as Parent).children[0]).toHaveProperty('value', 'SMALLCAPS')
  })

  it('handles text without small caps', () => {
    processSmallCaps('No small caps here', parent)
    expect(parent.children).toHaveLength(1)
    expect(parent.children[0]).toHaveProperty('value', 'No small caps here')
  })

  it('handles multiple small caps', () => {
    processSmallCaps('SMALLCAPS-A normal SMALLCAPS-B', parent)
    expect(parent.children).toHaveLength(3)

    const [firstAbbr, textNode, secondAbbr] = parent.children as unknown as Element[]
        
    expect(firstAbbr).toHaveProperty('tagName', 'abbr')
    expect(firstAbbr.children[0]).toHaveProperty('value', 'SMALLCAPS-A')

    expect(textNode).toHaveProperty('type', 'text')
    expect(textNode).toHaveProperty('value', ' normal ')

    expect(secondAbbr).toHaveProperty('tagName', 'abbr')
    expect(secondAbbr.children[0]).toHaveProperty('value', 'SMALLCAPS-B')
  })
})

describe('processTocEntry', () => {
  it('should process a TOC entry correctly into a hast node', () => {
      const entry: TocEntry = { depth: 1, text: 'Test Heading', slug: 'test-heading' };

      const result = processTocEntry(entry) 
      console.log(result)

      expect(result.type).toBe('element');
      expect(result.children[0] as Parent).toHaveProperty('value', 'Test Heading');
    });
})