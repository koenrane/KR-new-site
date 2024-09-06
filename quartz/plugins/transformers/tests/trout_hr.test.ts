import { TroutOrnamentHr, maybeInsertOrnament } from '../trout_hr';
import { Root, Element as HastElement } from 'hast';
import { BuildCtx } from '../../../util/ctx';

describe('TroutOrnamentHr', () => {
  it('should return a plugin with the correct name and htmlPlugins', () => {
    const plugin = TroutOrnamentHr();
    expect(plugin.name).toBe('TroutOrnamentHr');
    expect(plugin.htmlPlugins).toBeInstanceOf(Function);
    const mockBuildCtx: BuildCtx = {} as BuildCtx;
    expect(plugin.htmlPlugins?.(mockBuildCtx)).toHaveLength(1);
    expect(plugin.htmlPlugins?.(mockBuildCtx)[0]).toBeInstanceOf(Function);
  });
});

describe('maybeInsertOrnament', () => {
  let tree: Root;

  beforeEach(() => {
    tree = { type: 'root', children: [] } as Root;
  });

  it('should insert ornament before footnotes section', () => {
    tree.children = [
      { type: 'element', tagName: 'section', properties: { className: ['footnotes'], 'dataFootnotes': true }, children: [] }
    ];

    const beforeNode = tree.children[0]
    maybeInsertOrnament(tree.children[0] as HastElement, 0, tree);

    const firstNode = tree.children[0] as HastElement
    // Check that we added an ornament
    expect(tree.children).toHaveLength(2);
    expect(firstNode.type).toBe('element');
    expect(firstNode.tagName).toBe('div');

    // Check that the first bit is a span (the ☙ character)
    expect((firstNode.children[0] as HastElement).tagName).toBe('span');
    expect((firstNode.children[0] as HastElement).properties.class).toContain('text-ornament');

    // Ensure that the footnotes weren't changed
    expect(tree.children[1] as HastElement).toStrictEqual(beforeNode)
  });


});