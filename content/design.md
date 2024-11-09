---
title: Design of this website
permalink: design
publish: true
tags: 
  - website
description: Showing off and explaining this site's beauty.
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
# Site rendering basics
The site is a fork of the [Quartz](https://quartz.jzhao.xyz/) static site generator. While [the build process](https://quartz.jzhao.xyz/advanced/architecture) is rather involved, here's what you need to know for this article:
1. Almost all of my content is written in Markdown. 
2. Each page has its metadata stored in plaintext [YAML](https://en.wikipedia.org/wiki/YAML). 
3. The Markdown pages are transformed in (essentially) two stages; a sequence of "transformers" are applied to the intermediate representations of each page.
4. The intermediate representations are emitted as webpages.
5. The webpages are pushed to Cloudflare and then walk their way into your browser! 
> [!note]- More detail on the transformers  
> 	- _Text transformers_ operate on the raw text content of each page. For example:
> ```typescript
> const notePattern = /^\s*[*_]*note[*_]*:[*_]* (?<text>.*)(?<![*_])[*_]*/gim
> 
> /**
>  * Converts note patterns to admonition blocks.
>  * @param text - The input text to process.
>  * @returns The text with note patterns converted to admonitions.
>  */
> export function noteAdmonition(text: string): string {
>   text = text.replaceAll(notePattern, "\n> [!note]\n>\n> $<text>")
>   return text
> }
> ```
> Code: Detects when my Markdown contains a line beginning with "Note: " and then converts that content into an "admonition" (which is the bubble we're inside right now). 
> 	- _HTML transformers_ operate on the next stage. Basically, after all the text gets transformed into other text, the Markdown document gets parsed into some proto-HTML. The proto-HTML is represented as an [abstract syntax tree.](https://en.wikipedia.org/wiki/Abstract_syntax_tree) The upshot: HTML transformers can be much more fine-grained. For example, I can easily avoid modifying links themselves. 
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

# Archiving and dependencies
This site is hosted by [Cloudflare](https://www.cloudflare.com/). The site is set up to have few external dependencies. In nearly all cases, I host scripts, stylesheets, and media assets on my CDN. If the rest of the Web went down (besides Cloudflare), `turntrout.com` would look nearly the same.[^archive]

[^archive]: Exceptions which are not hosted on my website: There are several `<iframe>` embeds (e.g. Google forms and such). I also use the privacy-friendlier [`umami.is`](https://umami.is/) analytics service - the script is loaded from their site.

My CDN brings me comfort - about 3% of my older image links had already died on LessWrong (e.g. `imgur` links expired). I think LessWrong now hosts assets on their own CDN. However, I do not want my site's content to be tied to their engineering and organizational decisions. I want the content to be timeless.

I wrote [a script](https://github.com/alexander-turner/TurnTrout.com/blob/main/scripts/r2_upload.py) which uploads and backs up relevant media files. Before pushing new assets to my `main` branch, the script:
1. Uploads the assets to my CDN (`assets.turntrout.com`);
2. Copies the assets to my local mirror of the CDN content;
3. Removes the assets so they aren't tracked by my `git` repo. 
I later describe my [deployment pipeline](#deployment-pipeline) in more detail.

[^archive]: However, I still have yet to [archive external links, so I am still vulnerable to linkrot.](https://gwern.net/archiving)

# Color scheme 
The color scheme derives from the [Catppuccin](https://catppuccin.com) "latte" (light mode) and "frappe" (dark mode) [palettes](https://github.com/catppuccin/catppuccin/tree/main?tab=readme-ov-file#-palette). 

![](https://assets.turntrout.com/static/images/posts/catppuccin.avif)
Figure: The four Catppuccin palettes.

## Themes 

The themes provide contrast between the text and the background. I like the pastel palette provided by Catppuccin: 

<div style="display: grid;grid-template-columns: 1fr 1fr; gap: 1.5rem;">
  <span class="light-mode" style="border-radius: 5px; padding: 1rem 2rem; border: 2px var(--gray) solid;">
    <center>Light mode</center> 
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; place-items: center; margin-top: .5rem; margin-bottom: .25rem;"> 
      <span style="color: red;">Red</span>
      <span style="color: orange;">Orange</span>
      <span style="color: yellow;">Yellow</span>
      <span style="color: green;">Green</span>
      <span style="color: blue;">Blue</span>
      <span style="color: purple;">Purple</span> 
    </div>
  </span>
  <span class="dark-mode" style="border-radius: 5px; padding: 1rem 2rem; border: 2px var(--gray) solid;">
    <center>Dark mode</center>
    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; place-items: center; margin-top: .5rem; margin-bottom: .25rem;">
      <span style="color: red;">Red</span>
      <span style="color: orange;">Orange</span>
      <span style="color: yellow;">Yellow</span>
      <span style="color: green;">Green</span>
      <span style="color: blue;">Blue</span>
      <span style="color: purple;">Purple</span>
    </div>
  </span>
</div> 

I use the darkest text color sparingly. The margin text is medium-contrast, as are e.g. list numbers and bullets:
   - I even used CSS to dynamically adjust the luminance of favicons which often appear in the margins, so that I don't have e.g. a jet-black GitHub icon surrounded by lower contrast text. 

## Colors should accent (but not distract from) the content
Both palettes provide a light-touch pastel theme which allows subtle, pleasing accents.


<!--TODO manual light/darkmode SxS?-->

Color is important to this website, but I need to be tasteful and strict in my usage or the site turns into a mess. For example, in-line [favicons](https://en.wikipedia.org/wiki/Favicon) are colorless (e.g. [YouTube's](https://youtube.com) logo is definitely red). To choose otherwise is to choose chaos and distraction. 

When designing visual content, I consider where the reader's eyes go. People visit my site to read my content, and so _the content should catch their eyes first_. The desktop pond GIF (with the goose) is the only exception to this rule. I decided that on the desktop, I want a reader to load the page, marvel and smile at the scenic pond, and then bring their eyes to the main text (which has high contrast and is the obvious next visual attractor). 

During the build process, I convert all naive CSS assignments of `color:red` (<span style="color:rgb(255,0,0);">imagine if I made you read this</span>) to <span style="color:red">the site's red</span>. Lots of my old equations used raw `red` / `green` / `blue` colors because that's all that my old blog allowed; these colors are converted to the site theme.



## Emoji styling

Tasteful emoji usage helps brighten and vivify an article. However, it seems like there are over 9,000 emoji stylings:

<figure>
 <div style="display: grid; grid-template-columns: repeat(4, 1fr); grid-template-rows: repeat(2, 1fr); gap: 10px; justify-content: center;">
    <div class="subfigure">
      <img src="https://assets.turntrout.com/static/images/posts/apple_hearts.avif" style="width: 100px; height: 100px;" alt="Smiling Face With Hearts on Apple">
      <figcaption>Apple</figcaption>
    </div>
    <div class="subfigure">
      <img src="https://assets.turntrout.com/static/images/posts/google_hearts.avif" style="width: 100px; height: 100px;" alt="Smiling Face With Hearts on Google">
      <figcaption>Google</figcaption>
    </div>
    <div class="subfigure">
      <img src="https://assets.turntrout.com/static/images/posts/microsoft_hearts.avif" style="width: 100px; height: 100px;" alt="Smiling Face With Hearts on Microsoft">
      <figcaption>Microsoft</figcaption>
    </div>
    <div class="subfigure">
      <img src="https://assets.turntrout.com/static/images/posts/facebook_hearts.avif" style="width: 100px; height: 100px;" alt="Smiling Face With Hearts on Facebook">
      <figcaption>Facebook</figcaption>
    </div> 
    <div class="subfigure">
      <img src="https://assets.turntrout.com/twemoji/1f970.svg" style="width: 100px; height: 100px;" alt="Smiling Face With Hearts on Twitter">
      <figcaption>Twitter</figcaption>
    </div>
    <div class="subfigure">
      <img src="https://assets.turntrout.com/static/images/posts/whatsapp_hearts.avif" style="width: 100px; height: 100px;" alt="Smiling Face With Hearts on WhatsApp">
      <figcaption>WhatsApp</figcaption>
    </div>
    <div class="subfigure">
      <img src="https://assets.turntrout.com/static/images/posts/samsung_hearts.avif" style="width: 100px; height: 100px;" alt="Smiling Face With Hearts on Samsung">
      <figcaption>Samsung</figcaption>
    </div>
    <div class="subfigure">
      <img src="https://assets.turntrout.com/static/images/posts/LG_hearts.avif" style="width: 100px; height: 100px;" alt="Smiling Face With Hearts on LG">
      <figcaption>LG</figcaption>
    </div>
  </div>
</figure>

I want the user experience to be consistent, so my build process bakes in the Twitter emoji style: 🥰⭐️✨💘🐟😊🤡😏😮‍💨☺️🥰🎉🤷‍♂️🌊😠🏰❤️😞🙂‍↕️😌🥹🏝️🪂

# Site responsiveness

As a static webpage, my life is much simpler than the lives of most web developers. However, by default, users would have to wait a few seconds for each page to load, which I consider unacceptable. I want my site to be responsive even on mobile on slow connections. 

Quartz offers basic optimizations, such as [lazy loading](https://developer.mozilla.org/en-US/docs/Web/Performance/Lazy_loading) of assets and [minifying](https://en.wikipedia.org/wiki/Minification_(programming)) JavaScript and CSS files. I further marked the core CSS files for preloading. However, there are a range of more interesting optimizations which Quartz and I implement. 
## Asset compression

### Fonts
EB Garamond Regular 8pt takes 260KB as an `otf` file but compresses to 80KB under [the newer `woff2` format.](https://www.w3.org/TR/WOFF2/) In all, the font footprint shrinks from 1.5MB to about 609KB for most pages. I toyed around with [font subsetting](https://fonts.google.com/knowledge/glossary/subsetting) but it seemed too hard to predict which characters my site _never_ uses. While I could subset each page with only the required glyphs, that would add overhead and complicate client-side caching, likely resulting in a net slowdown.

### Images
Among lossy compression formats, there are two kings: AVIF and WEBP. Under my tests, they achieved similar (amazing) compression ratios of about 10x over PNG. For compatibility reasons, I chose AVIF. The upshot is that _images are nearly costless in terms of responsiveness_, which is liberating. 

<img src="https://assets.turntrout.com/static/images/posts/goose-majestic.avif" style="max-width: 85%;"> <figcaption>This friendly <abbr class="small-caps">avif</abbr> goose clocks in below <abbr class="small-caps">45kb</abbr>, while its <abbr class="small-caps">png</abbr> equivalent weighs <abbr class="small-caps">450kb</abbr>—a 10× increase!</figcaption>

I now perform a statistical analysis of the 941 AVIF files hosted on my CDN as of November 9, 2024.[^colab] I downloaded each AVIF file and used `magick` to convert it back to a PNG, measuring the size before and after. 

![Compression ratios: (PNG size) / (AVIF size). A left-skew histogram with tails reaching out to 75x.](static/images/posts/compression_ratio.svg)

Figure: At first blush, most of the compression ratios seem unimpressive. However, the vast majority of the "images" are tiny [favicons](#favicons) which show up next to URLs. These images are already tiny as PNGs (e.g. 2KB), so AVIF can only compress them so much.  

<svg src="/asset_staging/static/images/posts/compression_ratio.svg"></svg>

![A scatterplot showing dramatic decreases in filesize from PNG to AVIF.](static/images/posts/avif_png_scatter.svg)
Figure: Now the huge savings of AVIF are clearer.

[^colab]: I used a [publicly accessible Colab](https://colab.research.google.com/drive/1XScXuubpzcyhjU6uYRN0ikHVzLFmJj6X?usp=sharing) to generate the AVIF -> PNG compression graphs.

| Metric | Value |
|--:|:--|
| Average compression ratio | 8.19x |
| Total AVIF size | 25.24MB |
| Total PNG size | 279.75MB |
| Overall space savings | 91.0% |



<!-- TODO talk about HEVC, maybe even try to fix it? --> 
Videos
: The story here is much sadder than with image compression. Among modern formats, there appear to be two serious contenders: h265 MP4 ("HEVC") and WEBM (VP9). [Reportedly,](https://bitmovin.com/blog/vp9-vs-hevc-h265/) HEVC has better compression than WEBM. In practice, I haven't figured out how to make that happen, and my MP4s remain XXx larger than my WEBMs at similar visual quality.

<!-- Insert table of average compression ratios of WEBM over different formats. -->

: So WEBM videos are hilariously well-compressed (with an average compression ratio of XXXx over GIF and XXXx over h264 MP4). However, there is one small problem which is actually big: _Safari refuses to autoplay & loop WEBMs_. The problem gets worse because Safari will autoplay & loop HEVC, but _refuses to render transparency_. Therefore, for the ever-present looping video of the pond, the only compatible choice is a stupid GIF which takes up 561KB instead of 58KB. 

: Inline videos don't have to be transparent, so I'm free to use HEVC for most video assets. However, after a bunch of tweaking, I still can't get `ffmpeg` to sufficiently compress HEVC with decent quality - online website-provided video conversion still achieves a >2x compression over  my command-line compression. I'll fix that later.

## Inlining critical CSS

Even after compressing assets and lazily loading them, it takes time for the client to (pre)load the main CSS stylesheet. During this time, the site looks like garbage. One solution is to manually include the most crucial styles in the HTML header, but that's brittle over time. 

Instead, I hooked [the `critical` package](https://github.com/addyosmani/critical) into the end of the production build process. This basically means that after emitting all of the webpages, the process computes which "critical" styles are necessary to display the first glimpse of the page. These critical styles are inlined into the header. Once the main stylesheet loads, I delete the inlined styles (as they are superfluous at best).

<!-- Insert two MP4s of loading the page: one with and one without critical CSS. Put in figure with two figcaptions. Check name of package and update in paragraph-->

## Deduplicating HTML requests

> [!quote] [Single-page application routing](https://quartz.jzhao.xyz/features/SPA-Routing)
> This prevents flashes of unstyled content and improves the smoothness of Quartz.
> 
> Under the hood, this is done by hijacking page navigations and instead fetching the HTML via a `GET` request and then diffing and selectively replacing parts of the page using [micromorph](https://github.com/natemoo-re/micromorph). This allows us to change the content of the page without fully refreshing the page, reducing the amount of content that the browser needs to load.

<!-- TODO SxS of before/after -->

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

The font family is the open-source [EB Garamond](https://github.com/georgd/EB-Garamond). The `monospace` font is [Fira Code VF](https://github.com/tonsky/FiraCode), which brings a range of ligatures.

![A range of programming ligatures offered by Fira Code VF.](https://assets.turntrout.com/static/images/posts/fira_code.avif)
Figure: _Ligatures_ transform sequences of characters (like "<span style="font-variant-ligatures:none;"><code>\<\=</code></span>") into a single glyph (like "`<=`").

![Demonstrating how the monospace font aligns the x-height and cap-heights of common bigrams like 'Fl'.](https://assets.turntrout.com/static/images/posts/letter_pairs-1.avif)
Figure: I love sweating the small stuff. :) Notice how aligned "`FlTl`" is!

My site contains a range of fun fonts which I rarely use. For example, the _Lord of the Rings_ font "Tengwar Annatar" - expand the callout for _Namárië_ (Galadriel's Lament).

> [!quote]- [_Namárië_: Galadriel's Lament in Lórien](https://www.youtube.com/watch?v=re5_lzlFS9M)
>
> Subtitle: Hover over a line to translate
>	
> <center><audio src="https://assets.turntrout.com/static/audio/namarie.mp3" controls/></center>
> 
> <em><span class="elvish" data-content="Ah! like gold fall the leaves in the wind,">hEÁ jyE7\`B\`V j1pE6E j8"\#\`B 8\~M75%5$ =</span></em> 
> 
> <em><span class="elvish" data-content="long years numberless as the wings of trees!">h\~V5\`B \~M5\~N1t%\`V rÈ 6\~Ct6E j\#27E5^Á</span></em>
> 
> <em><span class="elvish" data-content="The years have passed like swift draughts">h\~V5\`B rÈ j1pT\`V hj&26E r\#\~C5\`B6R</span></em>
> 
> <em><span class="elvish" data-content="of the sweet mead in lofty halls beyond the West,">t\`B 7Yt^6E2\`B j8È%\`'\t7Tr&\~N7r\$\`C</span></em>
> 
> <em><span class="elvish" data-content="beneath the blue vaults of Varda">2P\#\~M5\`V qj\$¸\`C = r6E2\`N 1j\$¸t&6E</span></em>
> 
> <em><span class="elvish" data-content="wherein the stars tremble in the song of her voice, holy and queenly.">5\`M jhM5\`B h8"\#5\$ 11pTj%6E \`B j\$5\$\`B</span></em>
> 
> <em><span class="elvish" data-content="Who now shall refill the cup for me?">\~Nt7E\`Û\`N hE71R\~C7\`B\j\~B75%5\$ -</span></em>
> 
> <br>
> <em><span class="elvish" data-content="For now the Kindler, Varda, the Queen of the Stars,">8\~B t5\# \`B hj&t\`C 55% 5\$zé1pEr&\`CÀ</span></em>
> 
> <br>
> <em><span class="elvish" data-content="from Mount Everwhite has uplifted her hands like clouds,">5\# 8\~B 11pTj\#¸\`V r6E2\`C hYj^8"^\`V\`N</span></em>
> 
> <em><span class="elvish" data-content="and all paths are drowned deep in shadow;">rÈ e5\#\`Û\`C6 t\~C7\`Û\`C1 j\$1pR\~C7\`B 6Y15\#\`V =</span></em>
> 
> <em><span class="elvish" data-content="and out of a grey country darkness">6E j%\`VÛ 1\`B6R 2P&j&\~Cr\`V jwP&j&\`VÂ</span></em>
> 
> <em><span class="elvish" data-content="lies on the foaming waves between us,">6E 82P%5\#\~N7\`Bj\$¸\`N zhE1\`C t6Y5\`B\`V</span></em>
> 
> <em><span class="elvish" data-content="and mist covers the jewels of Calacirya for ever.">\`B ej\#tj\#5"%6E wP%\`V t1R = 6E 9\~B8\`B\`V</span></em>
> 
> <em><span class="elvish" data-content="Now lost, lost to those from the East is Valimar!">1pU\~Mq\`C zj\#iD7T\`Û\`N t\~B7\`B hYj\#\`V -</span></em>
> 
> <br>
> <em><span class="elvish" data-content="Farewell! Maybe thou shalt find Valimar.">8\~B r5\#y\`C 5\~C = 6\~Ntj\$¸\`N r5\#y\`C = rj\#t%6EÁ</span></em>
> 
> <br>
> <em><span class="elvish" data-content="Maybe even thou shalt find it. Farewell!">5t\#\~C7\`B\`VÁ 5hE 97Tr&j\#\`VÛ rj\#t%6E -</span></em>



<span class="float-right" style="margin-top: 2rem; ">
<div class="dropcap" data-first-letter="A" style="font-size: 4rem; color: var(--dark);">A</div>
<figcaption>Monochromatic dropcaps seem somewhat illegible.</figcaption>
</span>

## Dropcaps 

I have long appreciated [illuminated calligraphy.](https://www.atlasobscura.com/articles/illluminated-manuscript-calligraphy-guide) In particular, a [dropcap](https://en.wikipedia.org/wiki/Initial) lends gravity and elegance to a text. Furthermore, EB Garamond dropcaps are available.

However, implementation was tricky. As shown with the figure's "A",  CSS assigns a single color to each text element. To get around this obstacle, I took advantage of the fact that EB Garamond dropcaps can be split into the foreground and background.

<center style="font-size:4rem;">
<span class="dropcap" data-first-letter="A" style="margin-right: 5rem;"></span>
<span class="dropcap" data-first-letter="" style="color: var(--dark);">A</span>
</center>

However, text [blocks](https://developer.mozilla.org/en-US/docs/Web/CSS/display) other text; only one letter can be in a given spot - right? Wrong! By rendering the normal letter as the background dropcap font, I apply a different (lighter) color to the dropcap background. I then use [the CSS `::before` pseudo-element](https://developer.mozilla.org/en-US/docs/Web/CSS/::before) to render _another_ glyph in the foreground. The result:

<center>
<span class="dropcap" data-first-letter="A" style="font-size:4rem;">A</span>
</center>

> [!note]- Dropcap CSS
> Here are the core elements of the regex which styles the dropcaps:
> ```scss
> .dropcap {
>    // The background glyph 
>    font-family: "EBGaramondInitialsF1";
>    color: var(--lightgray);
>    position: relative;
>    text-transform: uppercase;
>  
>    &::before {
>      // The foreground glyph  
>      font-family: "EBGaramondInitialsF2";
>      color: var(--dark);
>      content: attr(data-first-letter);
>      position: absolute;
>    }
>  }
> ```

A less theme-disciplined man than myself might even flaunt dropcap colorings!

<center style="font-size:4rem;">
<span class="dropcap" data-first-letter="T" style="color: color-mix(in srgb, 55% red, var(--lightergray));">T</span>
<span class="dropcap" data-first-letter="H" style="color: color-mix(in srgb, 55% orange, var(--lightergray));">H</span>
<span class="dropcap" data-first-letter="E"  style="color: color-mix(in srgb, 65% yellow, var(--lightergray));">E</span>
<br/>  
<span class="dropcap" data-first-letter="P"  style="color: color-mix(in srgb, 65% green, var(--lightergray));">P</span>
<span class="dropcap" data-first-letter="O"  style="color: color-mix(in srgb, 65% blue, var(--lightergray));">O</span>
<span class="dropcap" data-first-letter="N"  style="color: color-mix(in srgb, 65% purple, var(--lightergray));">N</span>
<span class="dropcap" data-first-letter="D"  style="color: color-mix(in srgb, 65% pink, var(--lightergray));">D</span>
</center> 

## Formatting enhancement
| Before | After |
| --: | :-- |
| <span class="no-formatting">"We did not come to fear the future. We came here to shape it." - <a href="https://en.wikisource.org/wiki/Barack_Obama_speech_to_joint_session_of_Congress,_September_2009">Barack Obama</a></span>|"We did not come to fear the future. We came here to shape it." - [Barack Obama](https://en.wikisource.org/wiki/Barack_Obama_speech_to_joint_session_of_Congress,_September_2009)| 
| <span class="no-formatting">-2 x 3 = -6</span>|-2 x 3 = -6|
 
### Automatic conversion of quotation marks 

Undirected quote marks (`"test"`) look bad to me. Call me extra (I _am_ extra), but I ventured to _never have undirected quotes on my site._ Instead, double and single quotation marks automatically convert to their opening or closing counterparts. This seems like a bog-standard formatting problem, so surely there's a standard library. Right?

Sadly, no. GitHub-flavored Markdown includes a `smartypants` option, but honestly, it's sloppy. `smartypants` would emit strings like `Bill said “’ello!”` (the single quote is oriented incorrectly). So I wrote a bit of code.

> [!note]- Regex for smart quotes
> ```typescript 
> /**
>  * Replaces quotes with smart quotes
>  * @returns The text with smart quotes
>  */
> export function niceQuotes(text: string): string {
>   // Single quotes //
>   // Ending comes first so as to not mess with the open quote (which
>   // happens in a broader range of situations, including e.g. 'sup)
>   const endingSingle = `(?<=[^\\s“'])['](?!=')(?=s?(?:[\\s.!?;,\\)—\\-]|$))`
>   text = text.replace(new RegExp(endingSingle, "gm"), "’")
>   // Contractions are sandwiched between two letters
>   const contraction = `(?<=[A-Za-z])['](?=[a-zA-Z])`
>   text = text.replace(new RegExp(contraction, "gm"), "’")
> 
>   // Beginning single quotes
>   const beginningSingle = `(^|[\\s“"])['](?=\\S)`
>   text = text.replace(new RegExp(beginningSingle, "gm"), "$1‘")
> 
>   // Double quotes //
>   const beginningDouble = new RegExp(
>     `(?<=^|\\s|[\\(\\/\\[\\{\\-—])["](?=\\.{3}|[^\\s\\)\\—,!?;:/.\\}])`,
>     "gm",
>   )
>   text = text.replace(beginningDouble, "“")
>   // Open quote after brace (generally in math mode)
>   text = text.replace(new RegExp(`(?<=\\{)( )?["]`, "g"), "$1“")
> 
>   const endingDouble = `([^\\s\\(])["](?=[\\s/\\).,;—:\\-\\}!?]|$)`
>   text = text.replace(new RegExp(endingDouble, "g"), "$1”")
> 
>   // If end of line, replace with right double quote
>   text = text.replace(new RegExp(`["]$`, "g"), "”")
>   // If single quote has a right double quote after it, replace with right single and then double
>   text = text.replace(new RegExp(`'(?=”)`, "g"), "’")
> 
>   // Periods inside quotes
>   const periodRegex = new RegExp(`(?<![!?])([’”])(?!\\.\\.\\.)\\.`, "g")
>   text = text.replace(periodRegex, ".$1")
> 
>   // Commas outside of quotes
>   const commaRegex = new RegExp(`(?<![!?]),([”’])`, "g")
>   text = text.replace(commaRegex, "$1,")
> 
>   return text
> }
> ```
> Code: This code has 45 unit tests all on its own.

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

I use this same strategy for other formatting improvements, including [Hyphen replacement](#hyphen-replacement).

### Automatic smallcaps
How do the following sentences feel to read?
1. <abbr>Signed in the 1990's, NAFTA was a trade deal.</abbr>
2. Signed in the 1990's, NAFTA was a trade deal.

Typographically, capital letters are designed to be used one or two at a time - not five in a row. <abbr> "NAFTA"</abbr> draws far too much attention to itself. I use regular expressions to detect at least three consecutive capital letters, excluding Roman numerals like XVI. 

Furthermore, I apply smallcaps to letters which follow numbers (like "100GB") so that the letters have the same height as the numerals. For similar reasons as smallcaps, most of the site's numerals are [oldstyle](https://www.myfonts.com/pages/fontscom-learning-fontology-level-3-numbers-oldstyle-figures) ("100") rather than lining ("<span style="font-variant-numeric: lining-nums;">100</span>"). 

> [!quote] NAFTA, [Wikipedia](https://en.wikipedia.org/wiki/North_American_Free_Trade_Agreement)
> The **North American Free Trade Agreement** (**NAFTA** [/ˈnæftə/](https://en.wikipedia.org/wiki/Help:IPA/English "Help:IPA/English") [_NAF-tə_](https://en.wikipedia.org/wiki/Help:Pronunciation_respelling_key "Help:Pronunciation respelling key"); [Spanish](https://en.wikipedia.org/wiki/Spanish_language "Spanish language"): *Tratado de Libre Comercio de América del Norte*, **TLCAN**; [French](https://en.wikipedia.org/wiki/French_language "French language"): *Accord de libre-échange nord-américain*, **ALÉNA**) was an agreement signed by [Canada](https://en.wikipedia.org/wiki/Canada "Canada"), [Mexico](https://en.wikipedia.org/wiki/Mexico "Mexico"), and the  [United States](https://en.wikipedia.org/wiki/United_States "United States") that created a trilateral [trade bloc](https://en.wikipedia.org/wiki/Trade_bloc "Trade bloc") in [North America.](https://en.wikipedia.org/wiki/North_America "North America") The agreement came into force on January 1, 1994, and superseded the 1988 [Canada–United States Free Trade Agreement](https://en.wikipedia.org/wiki/Canada%E2%80%93United_States_Free_Trade_Agreement "Canada–United States Free Trade Agreement") between the United States and Canada. The NAFTA trade bloc formed one of the largest trade blocs in the world by [gross domestic product.](https://en.wikipedia.org/wiki/Gross_domestic_product "Gross domestic product")

### Hyphen replacement


[Merriam-Webster ordains that](https://www.merriam-webster.com/grammar/em-dash-en-dash-how-to-use) - contrary to popular practice - hyphens (-) and em-dashes (—) be used in importantly different situations:

> [!quote] [How to Use Em Dashes (—), En Dashes (–) , and Hyphens (-)](https://www.merriam-webster.com/grammar/em-dash-en-dash-how-to-use)
> The em dash (—) can function like a comma, a colon, or parenthesis. Like commas and parentheses, em dashes set off extra information, such as examples, explanatory or descriptive phrases, or supplemental facts. Like a colon, an em dash introduces a clause that explains or expands upon something that precedes it.

Technically, _en dashes_ should be used for ranges of dates and numbers. So "<span class="no-formatting">p. 202-203</span>" turns into "p. 202-203", and "<span class="no-formatting">Aug-Dec</span>" turns into "Aug-Dec"! 

Some hyphens should actually be _minus signs_. I find raw hyphens (<span class="no-formatting">-2</span>) to be distasteful when used in plaintext numbers. I opt for "-2" instead.

### Other small display tweaks
Fractions
: I chose slanted fractions in order to slightly increase the height of the numerals in the numerator and denominator. People are 2/3 water, but "01/01/2000" should not be rendered as a fraction.

Detecting multipliers
: Multipliers  like "2x" are 2x more pleasant than "<span class="no-formatting">2x</span>."

Full-width slashes
: Used for separators like "cat" / "dog."

Mathematical definitions
: In the past, I used the $:=$ symbol to denote definitions (as opposed to normal equations). I now convert these symbols to the self-explanatory $ :=$.

<!-- TODO talk about unified callout structure -->

### I paid someone to tweak EB Garamond
While EB Garamond is a nice font, it has a few problems. As of April 2024, EB Garamond did not support slashed zeroes (the `zero` feature). The result: zero looked too similar to "o." Here's a number rendered in the original font: <span style="font-family: var(--font-text-original)">"100"</span>; in my tweaked font it shows as "100." Furthermore, the italicized font did not support the `cv11` OpenType feature for oldstyle numerals. This meant that the italicized 1 looked like a slanted "<span style="font-family: var(--font-text-original); font-feature-settings: normal;">1</span>" - too similar to the smallcaps capital I ("<span class="small-caps">I</span>").

Therefore, I paid [Hisham Karim](https://www.fiverr.com/hishamhkarim) $121 to add these features. I have also notified the maintainer of the EB Garamond font. 

## Favicons

# Deployment pipeline

3. Text presentation
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