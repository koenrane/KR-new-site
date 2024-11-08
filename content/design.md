---
title: Design of this website
permalink: design
publish: true
tags: 
description: 
date-published: ""
authors: Alex Turner
hideSubscriptionLinks: false
card_image: 
aliases:
  - website-design
date_published: 2024-10-31 23:14:34.832290
date_updated: 2024-11-02 09:27:16.094474
no_dropcap: "false"
---
# Basic structure
The site runs on [Quartz](/ADD-ME), a (describe). While [the build process](/LINK-ME) is rather involved, here's what you need to know for this article:
1. Almost all of my content is written in Markdown. 
2. Each page has its metadata stored in plaintext [YAML](/LINK). 
3. The Markdown pages are transformed in (essentially) two stages; a sequence of "transformers" are applied to the intermediate representations of each page.
> [!note]- More detail on the transformers  
> 	- _Text transformers_ operate on the raw text content of each page. For example:
```typescript
const notePattern = /^\s*[*_]*note[*_]*:[*_]* (?<text>.*)(?<![*_])[*_]*/gim

/**
 * Converts note patterns to admonition blocks.
 * @param text - The input text to process.
 * @returns The text with note patterns converted to admonitions.
 */
export function noteAdmonition(text: string): string {
  text = text.replaceAll(notePattern, "\n> [!note]\n>\n> $<text>")
  return text
}
```
Code: Detects when my Markdown contains a line beginning with "Note: " and then converts that content into an "admonition" (which is the bubble we're inside right now). 
> 	- _HTML transformers_ operate on the next stage. Basically, after all the text gets transformed into other text, the Markdown document gets parsed into some proto-HTML. The proto-HTML is represented as an [abstract syntax tree.](/LINKME) The upshot: HTML transformers can be much more fine-grained. For example, I can easily avoid modifying links themselves. 
> ```typescript
> /**
>  * Replaces hyphens with en dashes in number ranges
>  *  Number ranges should use en dashes, not hyphens.
>  *  Allows for page numbers in the form "p.206-207"
>  * 
>  * @returns The text with en dashes in number ranges
>  */
> export function enDashNumberRange(text: string): string {
>   return text.replace(
>     new RegExp(`\\b(?<!\\.)((?:p\\.?)?\\d+${chr}?)-(${chr}?\\d+)(?!\\.\\d)\\b`, "g"),
>     "$1–$2",
>   )
> }
> ```
> Code: I wouldn't want to apply this transform to raw text because it would probably break link addresses (which often contain hyphenated sequences of numbers). However, many HTML transforms aren't text → text.
1. The intermediate representations are emitted as webpages.
2. The webpages are pushed to Cloudflare and then walk their way into your browser! 

<!-- Re-include the code block. Fix so that I can start lists at any number-->

# Archiving and dependencies
This site is hosted by [Cloudflare](https://www.cloudflare.com/). The site is set up to have few external dependencies. In nearly all cases, I host scripts, stylesheets, and media assets on my CDN. If the rest of the Web went down (besides Cloudflare), `turntrout.com` would look nearly the same.[^archive]

[^archive]: Exceptions which are not hosted on my website: There are several `<iframe>` embeds (e.g. Google forms and such). I also use the privacy-friendlier [`umami.is`](https://umami.is/) analytics service - the script is loaded from their site.

My CDN brings me comfort - about 3% of my older image links had already died on LessWrong (e.g. `imgur` links expired). I think LessWrong now hosts assets on their own CDN. However, I do not want my site's content to be tied to their engineering and organizational decisions. I want the content to be timeless.

I wrote [a script](https://github.com/alexander-turner/TurnTrout.com/blob/main/scripts/r2_upload.py) which uploads and backs up relevant media files. Before pushing new assets to my `main` `git` branch, the script:
1. Uploads the assets to my CDN (`assets.turntrout.com`);
2. Copies the assets to my local mirror of the CDN content;
3. Removes the assets so they aren't tracked by my `git` repo. 
I describe my broader `pre-push` pipeline in detail later in the article.
<!--UPDATE WITH LINK-->

[^archive]: However, I still have yet to [archive external links, so I am still vulnerable to linkrot.](https://gwern.net/archiving)
# Color scheme
The color scheme derives from the [Catppuccin](https://catppuccin.com) "latte" (light mode) and "frappe" (dark mode) [palettes](https://github.com/catppuccin/catppuccin/tree/main?tab=readme-ov-file#-palette). 

![](https://assets.turntrout.com/static/images/posts/catppuccin.avif)
Figure: The four Catppuccin palettes.

## Colors should accent (but not distract from) the content
Both palettes provide a light-touch pastel theme which allows subtle, pleasing accents. 

<!--TODO include color demo-->

Color is important to this website, but I need to be tasteful and strict in my usage or the site turns into a mess. For example, in-line [favicons](https://en.wikipedia.org/wiki/Favicon) are colorless (e.g. [YouTube's](https://youtube.com) logo is definitely red). To choose otherwise is to choose chaos and distraction. 

When designing visual content, I consider where the reader's eyes go. People visit my site to read my content, and so _the content should catch their eyes first_. The desktop pond GIF (with the goose) is the only exception to this rule. I decided that on the desktop, I want a reader to load the page, marvel and smile at the scenic pond, and then bring their eyes to the main text (which has high contrast and is the obvious next visual attractor). 

During the build process, I convert all naive CSS assignments of `color:red` (<span style="color:rgb(255,0,0);">imagine if I made you read this</span>) to <span style="color:red">the site's red</span>. Lots of my old equations used raw `red` / `green` / `blue` colors because that's all that my old blog allowed; these colors are converted to the site theme.
## Themes 

The themes provide high contrast between the text and the background - in both light and dark mode. The darkest text color is used sparingly. The margin text is medium-contrast, as are e.g. list numbers and bullets:
   - I even used CSS to dynamically adjust the luminance of favicons which often appear in the margins, so that I don't have e.g. a black GitHub icon surrounded by lower contrast text. 
 
# Site responsiveness

As a static webpage, my life is much simpler than the lives of most web developers. However, by default, users would have to wait a few seconds for each page to load, which I consider unacceptable. I want my site to be responsive even on mobile on slow connections. 

Quartz offers basic optimizations, such as [lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading) of assets and [minifying](https://en.wikipedia.org/wiki/Minification_(programming)) JavaScript and CSS files. I further marked the core CSS files for preloading. However, there are a range of more interesting optimizations which Quartz and I implement. 
## Asset compression

Fonts
: EB Garamond Regular (8pt) takes 260KB as an `otf` file but compresses to 80KB under [the newer `woff2` format.](https://www.w3.org/TR/WOFF2/) In all, the font footprint shrinks from 1.5MB to about 609KB for most pages. I toyed around with [font subsetting](https://fonts.google.com/knowledge/glossary/subsetting) but it seemed too hard to predict which characters my site _never_ uses. While I could subset each page with only the required glyphs, that would add a lot of overhead and also complicate client-side caching (likely resulting in a net slowdown). 

Images
: Among lossy compression formats, there are two kings: AVIF and WEBP. Under my tests, they achieved similar (amazing) compression ratios of about 10x over PNG. For compatibility reasons, I chose AVIF. The upshot is that _images are nearly costless in terms of responsiveness_, which is liberating. 

![](https://assets.turntrout.com/static/images/posts/goose-majestic.avif)
Figure: This friendly AVIF goose clocks in below 45KB, while its PNG equivalent weighs 450KB - a 10x increase!

Videos
: The story here is much sadder than with image compression. Among modern formats, there appear to be two serious contenders: h265 MP4 and WEBM. In theory, h265 can compete with WEBM. In practice, I haven't figured out how to make that happen, and my MP4s remain XXx larger than my WEBMs for similar visual quality.

<!-- Insert table of average compression ratios of WEBM over different formats. Cite studies of h265 vs WEBM -->

: So WEBM videos are hilariously well-compressed (with an average compression ratio of XXXx over GIF and XXXx over h264 MP4). However, there is one small problem which is actually big: _Safari refuses to autoplay & loop WEBMs_. The problem gets worse because Safari will autoplay & loop h265 MP4, but _refuses to render transparency_. Therefore, considering the main site video asset (the one with the trout and the goose and the pond), the only compatible choice is _a goddamn GIF which takes up XXXKB instead of XXKB_. 

: Inline videos don't have to be transparent, so I'm free to use MP4s for most video assets. However, after a bunch of tweaking, I still can't get `ffmpeg` to sufficiently compress h265 with decent quality - online website-provided video conversion still achieves a >2x compression over  my command-line compression. I'll fix that later.
## Inlining critical CSS

Even after compressing assets and lazily loading them, it takes time for the client to (pre)load the main CSS stylesheet. During this time, the site looks like garbage. One solution is to manually include the most crucial styles in the HTML header, but that's brittle over time. Instead, I hooked [the `critical` package](https://github.com/addyosmani/critical) into the end of the production build process. This basically means that after emitting all of the webpages, the process computes which "critical" styles are necessary to display the first glimpse of the page. These critical styles are inlined into the header. Once the main stylesheet loads, I delete the inlined styles (as they are superfluous at best).

<!-- Insert two MP4s of loading the page: one with and one without critical CSS. Put in figure with two figcaptions. Check name of package and update in paragraph-->

## `micromorph`: only loading assets and HTML a single time
<!--Look up details of SPA-->

# Text presentation
## Sizing
This website contains many design elements. To maintain a regular, assured style and to avoid patchwork chaos, I made two important design choices.

Exponential font sizing
: I fixed a base font size - 20px on mobile, to 22px on tablets, to 24px on full displays. Then - after consulting [TypeScale](https://typescale.com/) - I scaled the font by $1.2^n$, with $n=0$ for body text and $n\geq 1$ for headers:

: <span class="h1">Header 1</span>
<span class="h2">Header 2</span>
<span class="h3">Header 3</span>
<span class="h4">Header 4</span>
<span class="h5">Header 5</span>

: <span>Normal text</span>
<span style="font-size:var(--text-size-90)">Smaller text</span>
<span style="font-size:var(--text-size-85)">Smaller text</span>
<span style="font-size:var(--text-size-80)">Smaller text</span>
<span style="font-size:var(--text-size-70)">Smaller text</span>

All spacing is a simple multiple of a base measurement
: If - for example - paragraphs were separated by 3.14 lines of space but headings had 2.53 lines of margin beneath them, that would look chaotic. Instead, I fixed a "base margin" variable and then made all margin and padding calculations be simple fractional multiples (e.g. 1.5x, 2x) of that base margin.

## Fonts

The serif font family is the open-source [EB Garamond](https://github.com/georgd/EB-Garamond). The `monospace` font is [Fira Code VF](https://github.com/tonsky/FiraCode), which brings a range of ligatures.

![](https://assets.turntrout.com/static/images/posts/fira_code.avif)
Figure: _Ligatures_ transform sequences of characters (like "<span style="font-variant-ligatures:none;"><code>\<\=</code></span>") into a single glyph (like "`<=`").



![](https://assets.turntrout.com/static/images/posts/letter_pairs-1.avif)
Figure: I love sweating the small stuff. :) Notice how aligned "`FlTl`" is!

### Font: [Alcarin Tengwar](https://www.tosche.net/fonts/alcarin-tengwar)
> [!quote] _The Dragon is Withered_, Clamavi De Profundis
> 
> 

<span class="elvish">test</span>

> 
> Subtitle: Here grass is still growing,
> 
> <span class="elvish"><em>And leaves are yet swinging,</em></span>
>
> Subtitle: And leaves are yet swinging,
>
> <span class="elvish">The white water flowing,</em></span>
>
> Subtitle: The white water flowing,
>
> <span class="elvish"><em>And elves are yet singing</em></span>
>
> Subtitle: And elves are yet singing
> 
> O! Where are you going, So late in returning? 
> 
> The river is flowing, 
> 
> [The stars are all burning!](https://nickbostrom.com/papers/astronomical-waste/)
  
## Formatting enhancement
### Automatic conversion of quotation marks and hyphenation

Undirected quote marks (`"test"`) look bad to me. Call me extra (I _am_ extra), but I ventured to _never have undirected quotes on my site._ Instead, double and single quotation marks automatically convert to their opening or closing counterparts. This seems like a bog-standard formatting problem, so surely there's a standard library. Right?

Sadly, no. GitHub-flavored Markdown includes a `smartypants` option, but honestly, it's sloppy. `smartypants` would emit strings like `Bill said “’ello!”` (the single quote is oriented incorrectly). So I wrote a bit of code.

> [!note]- Regex for smart quotes
```typescript 
/**
 * Replaces quotes with smart quotes
 * @returns The text with smart quotes
 */
export function niceQuotes(text: string): string {
  // Single quotes //
  // Ending comes first so as to not mess with the open quote (which
  // happens in a broader range of situations, including e.g. 'sup)
  const endingSingle = `(?<=[^\\s“'])['](?!=')(?=s?(?:[\\s.!?;,\\)—\\-]|$))`
  text = text.replace(new RegExp(endingSingle, "gm"), "’")
  // Contractions are sandwiched between two letters
  const contraction = `(?<=[A-Za-z])['](?=[a-zA-Z])`
  text = text.replace(new RegExp(contraction, "gm"), "’")

  // Beginning single quotes
  const beginningSingle = `(^|[\\s“"])['](?=\\S)`
  text = text.replace(new RegExp(beginningSingle, "gm"), "$1‘")

  // Double quotes //
  const beginningDouble = new RegExp(
    `(?<=^|\\s|[\\(\\/\\[\\{\\-—])["](?=\\.{3}|[^\\s\\)\\—,!?;:/.\\}])`,
    "gm",
  )
  text = text.replace(beginningDouble, "“")
  // Open quote after brace (generally in math mode)
  text = text.replace(new RegExp(`(?<=\\{)( )?["]`, "g"), "$1“")

  const endingDouble = `([^\\s\\(])["](?=[\\s/\\).,;—:\\-\\}!?]|$)`
  text = text.replace(new RegExp(endingDouble, "g"), "$1”")

  // If end of line, replace with right double quote
  text = text.replace(new RegExp(`["]$`, "g"), "”")
  // If single quote has a right double quote after it, replace with right single and then double
  text = text.replace(new RegExp(`'(?=”)`, "g"), "’")

  // Periods inside quotes
  const periodRegex = new RegExp(`(?<![!?])([’”])(?!\\.\\.\\.)\\.`, "g")
  text = text.replace(periodRegex, ".$1")

  // Commas outside of quotes
  const commaRegex = new RegExp(`(?<![!?]),([”’])`, "g")
  text = text.replace(commaRegex, "$1,")

  return text
}
```
Code: This code has 45 unit tests all on its own.

<!-- TODO add all of this into callout -->

This logic seems quite robust - I recommend it if you're looking for smart quote detection. However, there's a problem. `niceQuotes` is called on each text node in the HTML abstract syntax tree (AST). Sometimes, the DOM gets in the way. Consider the end of a Markdown quote, `_I hate dogs_"`. Its AST is:
1. `<em>` node: `I hate dogs`
2. Text node: `"`

`niceQuotes` is called on each substring, so we get two calls. The first only processes the contents of the `<em>` node, which isn't changed. However, what should `niceQuotes(")` output? The intended output changes with the context - is it an end quote or a beginning quote? 

Considering the broader problem:
- Within a parent text container, there are $n$ elements,
- The quotes should be transformed appropriately, and
- The overall operation should not create or delete elements.

The solution? Roughly:
1. Convert the parent container's contents to a string `s`, delimiting separations with a private-use Unicode character (to avoid unintended matches),
2. Relax the `niceQuotes` RegEx to allow (and preserve) the private-use characters, treating them as boundaries of a "permeable membrane" through which contextual information flows, 
3. Apply `niceQuotes` to `s`, receiving another string with the same number of elements implied,
4. For all $k$, set element $k$'s text content to the segment starting at private Unicode occurrence $k$.

I use this same strategy for other formatting improvements, including [[#ADDLINK]].

### Automatic smallcaps
How do the following sentences feel to read?
1. <abbr>Signed in the 1990's, NAFTA was a trade deal.</abbr>
2. Signed in the 1990's, NAFTA was a trade deal.

Typographically, capital letters are designed to be used one or two at a time - not five in a row. <abbr> "NAFTA"</abbr> draws far too much attention to itself. I use regular expressions to detect at least three consecutive capital letters, excluding Roman numerals like XVI. 

Furthermore, I apply smallcaps to letters which follow numbers (like "100GB") so that the letters have the same height as the numerals. For similar reasons as smallcaps, most of the site's numerals are [oldstyle](https://www.myfonts.com/pages/fontscom-learning-fontology-level-3-numbers-oldstyle-figures) ("100") rather than lining ("<span style="font-variant-numeric: lining-nums;">100</span>"). Fractions (e.g. 1/2, 3/5) are automatically rendered as well. :) 

### Hyphen replacement
<!-- TODO make table here with before/after -->

### Other small display tweaks
- 5x vs <span class="no-formatting">5x</span>
### I paid someone to tweak EB Garamond
While EB Garamond is a nice font, it has a few problems. As of April 2024, EB Garamond did not support slashed zeroes (the `zero` feature). The result: zero looked too similar to "o." Here's a number rendered in the original font: <span style="font-family: var(--font-text-original)">"100"</span>; in my tweaked font it shows as "100." Furthermore, the italicized font did not support the `cv11` OpenType feature for oldstyle numerals. This meant that the italicized 1 looked like a slanted "<span style="font-family: var(--font-text-original); font-feature-settings: normal;">1</span>" - too similar to the smallcaps capital I ("<span class="small-caps">I</span>").

Therefore, I paid [Hisham Karim](https://www.fiverr.com/hishamhkarim) $121 to add these features. I have notified the maintainer of the EB Garamond font. 

3. Text presentation
	1. Fonts
		1. Show off a range of fonts: `bad-handwriting`, `gold-script`, `elvish`/`elvish-italics`, `corrupted`
		2. `dropcap` in-context; THE POND (with different colors)
		3. Explain how I did different colors
	2. Max characters - research I based this off of 
4. Explain the different 
	1. Wavy LOL hahahahahaha of the imports of JSON
	2. Scrolling text
	- Twemoji
5. The commit->push->deploy pipeline
	1. Precommit
	2. Prepush
	3. Github actions
		1. deepsource
	4. Recovery via cloudflare if it fails
6. Information on other sites
	1. Descriptions
	2. [^sun]
	   
	   [^sun]: I _love_ how the sun/moon hangs above the pond GIF in desktop mode. Try clicking the celestial body a few times!