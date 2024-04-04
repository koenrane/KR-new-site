import { QuartzTransformerPlugin } from '../types';
import { Plugin } from 'unified';
import { visit } from 'unist-util-visit';

const prePunctuation = /([\(\”\“\"\[]*)/;
const linkText = /\[([^\]]+)\]/g;
const linkURL = /\(([^#]\S*?)\)/g; // Ignore internal links, don't advance to the next word
const postPunctuation = /([\”\"\`\)\”\]\}\.\,\?:\!\”\;]+)/g;
const preLinkRegex = new RegExp(`${prePunctuation.source}${linkText.source}${linkURL.source}`);
const fullRegex = new RegExp(`${preLinkRegex.source}(?:${postPunctuation.source}|[\*_]{1,2}${postPunctuation.source}[\*_]{1,2})`, 'g');
const replaceTemplate = "[$1$2$4$5]($3)";

const remarkLinkPunctuation: Plugin = (text: string) => {
    return text.replaceAll(fullRegex, replaceTemplate);
};

export const LinkTextPunctuation: QuartzTransformerPlugin = () => {
  return {
    name: 'LinkTextPunctuation',
    textTransform(_ctx, src) {
        if (src instanceof Buffer) {
            src = src.toString();
        }
        return remarkLinkPunctuation(src);
    },
  };
};
