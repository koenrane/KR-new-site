import { QuartzTransformerPlugin } from '../types';


export const ParseTwemoji: QuartzTransformerPlugin = () => {
  return {
    name: 'ParseTwemoji',
    htmlPlugins() {
      return [
        () => {
          return (tree) => {
                twemoji.parse(tree.body); // Parse the entire body for emojis
            };
          }]
        },
    }
}


