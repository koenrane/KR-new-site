import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import { rehypeCustomSpoiler, matchSpoilerText, createSpoilerNode, modifyNode } from '../spoiler';
import { jest } from '@jest/globals';
import { Element, Parent } from 'hast';

async function process(input: string) {
  const result = await unified()
    .use(rehypeParse, { fragment: true })
    .use(rehypeCustomSpoiler)
    .use(rehypeStringify)
    .process(input);
  return result.toString();
}

describe('rehype-custom-spoiler', () => {
  test('transforms spoiler blockquote to custom spoiler element', async () => {
    const input = '<blockquote><p>!This is a spoiler</p></blockquote>';
    const output = await process(input);
    expect(output).toContain('<div class="spoiler-container">');
    expect(output).toContain('<span class="spoiler-content">This is a spoiler</span>');
    expect(output).toContain('<span class="spoiler-overlay">Hover or click to show</span>');
  });

  test('does not transform regular blockquotes', async () => {
    const input = '<blockquote><p>This is not a spoiler</p></blockquote>';
    const output = await process(input);
    expect(output).toBe(input);
  });

  test('matchSpoilerText function', () => {
    expect(matchSpoilerText('!This is a spoiler')).toBeTruthy();
    expect(matchSpoilerText('This is not a spoiler')).toBeFalsy();
  });

  test('createSpoilerNode function', () => {
    const h = jest.fn((tag, props, children) => ({ type: 'element', tagName: tag, properties: props, children }));
    const node = createSpoilerNode(h, 'Spoiler content') as Element;
    expect(node.tagName).toBe('div');
    expect(node.properties?.className).toContain('spoiler-container');
    expect(node.children).toHaveLength(2);
    expect((node.children[0] as Element).tagName).toBe('span');
    expect((node.children[0] as Element).properties?.className).toContain('spoiler-content');
    expect((node.children[1] as Element).tagName).toBe('span');
    expect((node.children[1] as Element).properties?.className).toContain('spoiler-overlay');
  });

  test('modifyNode function', () => {
    const node: Element = {
      type: 'element',
      tagName: 'blockquote',
      properties: {},
      children: [{ type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: '!Spoiler text' }] }]
    };
    const parent: Parent = { type: 'root', children: [node] };
    modifyNode(node, 0, parent);

    expect((parent.children[0] as Element).tagName).toBe('div');
    expect((parent.children[0] as Element).properties?.className).toContain('spoiler-container');
  });
})