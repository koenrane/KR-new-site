import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { transformAST, matchSpoilerText, createSpoilerNode, modifyNode } from '../spoiler';
import { Element, Parent } from 'hast';
import { expect } from '@jest/globals';

async function process(input: string) {
  const result = await unified()
    .use(rehypeParse, { fragment: true })
    .use(() => transformAST)
    .use(rehypeStringify)
    .process(input);
  return result.toString();
}

describe('rehype-custom-spoiler', () => {
  it.each([
    ['<blockquote><p>! This is a spoiler</p></blockquote>', 'simple spoiler'],
    ['<blockquote><p>!This is a spoiler without space</p></blockquote>', 'spoiler without space'],
    ['<blockquote><p>! Multi-line</p><p>! spoiler</p><p>! content</p></blockquote>', 'multi-paragraph spoiler'],
    ['<blockquote><p>! Spoiler with <em>formatting</em></p></blockquote>', 'spoiler with formatting'],
  ])('transforms spoiler blockquote to custom spoiler element (%s)', async (input, description) => {
    const output = await process(input);
    expect(output).toMatch(/<div class="spoiler-container"[^>]*>/);
    expect(output).toContain('<span class="spoiler-content">');
    expect(output).toContain('<span class="spoiler-overlay"></span>');
    expect(output).not.toContain('<blockquote>');
    expect(output).toMatch(/onclick="[^"]*"/);
  });

  it.each([
    ['<blockquote><p>This is not a spoiler</p></blockquote>', 'regular blockquote'],
    ['<blockquote><p>! This is a spoiler</p><p>This is not a spoiler</p></blockquote>', 'mixed content blockquote'], // Not a spoiler overall
    ['<p>! This is not in a blockquote</p>', 'not in blockquote'],
  ])('does not transform non-spoiler content (%s)', async (input, description) => {
    const output = await process(input);
    expect(output).toBe(input);
  });

  it.each([
    ['!This is a spoiler', true],
    ['! This is a spoiler', true],
    ['This is not a spoiler', false],
  ])('matchSpoilerText function (%s)', (input: string, expectedSpoiler: boolean) => {
    const match = matchSpoilerText(input)
    if (expectedSpoiler) {
      expect(match).toBeTruthy()
    } else {
      expect(match).toBeFalsy()
    }
  });

  test('createSpoilerNode function', () => {
    const node = createSpoilerNode('Spoiler content') as Element;

    expect(node.tagName).toBe('div');
    expect(node.properties?.className).toContain('spoiler-container');
    expect(node.children).toHaveLength(2);
    expect((node.children[0] as Element).tagName).toBe('span');
    expect((node.children[0] as Element).properties?.className).toContain('spoiler-overlay');
    expect((node.children[1] as Element).tagName).toBe('span');
    expect((node.children[1] as Element).properties?.className).toContain('spoiler-content');
  });

  it.each([
    ['<blockquote><p>!Spoiler text</p></blockquote>', 'simple spoiler'],
    ['<blockquote><p>! Spoiler with space</p></blockquote>', 'spoiler with space'],
    ['<blockquote><p>!Multi-line</p><p>!spoiler</p></blockquote>', 'multi-paragraph spoiler'],
  ])('modifyNode function (%s)', (input, description) => {
    const parser = unified().use(rehypeParse, { fragment: true });
    const parsed = parser.parse(input) as Parent;
    const node = parsed.children[0] as Element;
    const parent: Parent = { type: 'root', children: [node] };
    modifyNode(node, 0, parent);

    expect((parent.children[0] as Element).tagName).toBe('div');
    expect((parent.children[0] as Element).properties?.className).toContain('spoiler-container');
    expect((parent.children[0] as Element).children).toHaveLength(2);
    expect(((parent.children[0] as Element).children[0] as Element).properties?.className).toContain('spoiler-overlay');
    expect(((parent.children[0] as Element).children[1] as Element).properties?.className).toContain('spoiler-content');
  });

  test('modifyNode function handles newline text nodes', () => {
    const input = '<blockquote><p>!Spoiler text</p>\n<p>!More spoiler</p></blockquote>';
    const parser = unified().use(rehypeParse, { fragment: true });
    const parsed = parser.parse(input) as Parent;
    const node = parsed.children[0] as Element;
    const parent: Parent = { type: 'root', children: [node] };
    
    modifyNode(node, 0, parent);

    expect(parent.children[0]).toMatchObject({
      type: 'element',
      tagName: 'div',
      properties: { 
        className: ['spoiler-container'],
      },
      children: [
        expect.objectContaining({
          type: 'element',
          tagName: 'span',
          properties: { className: ['spoiler-overlay'] },
          children: []
        }),
        expect.objectContaining({
          type: 'element',
          tagName: 'span',
          properties: { className: ['spoiler-content'] },
          children: expect.arrayContaining([
            expect.objectContaining({ type: 'element', tagName: 'p', children: [{ type: 'text', value: 'Spoiler text' }] }),
            expect.objectContaining({ type: 'element', tagName: 'p', children: [{ type: 'text', value: 'More spoiler' }] })
          ])
        })
      ]
    });
  });
})