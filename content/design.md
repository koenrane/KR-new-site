---
title: Design of this website
permalink: design
publish: true
no_dropcap: "false"
tags:
description:
date-published: ""
authors: Alex Turner
hideSubscriptionLinks: false
card_image:
aliases:
  - website-design
date_published: 2024-10-31 23:14:34.832290
date_updated: 2024-11-01 22:05:56.366962
---


# Archiving and dependencies
This site is hosted by [Cloudflare](https://www.cloudflare.com/). The site is set up to have nearly no external dependencies. In nearly all cases, I host scripts, stylesheets, and media assets on my CDN. If the rest of the Web went down (besides Cloudflare, my hosting service), the site would look nearly the same.[^archive] 

I wrote [a useful script](https://github.com/alexander-turner/TurnTrout.com/blob/main/scripts/r2_upload.py) which uploads and backs up relevant media files. Before pushing new assets to my `main` `git` branch, the script uploads the assets to my . I describe my `pre-push` pipeline [below](#HOOKLINK).

This is true comfort to me, as about 3% of my older image links had already died on LessWrong (though I think they now ). However, I do not want my site's content to be tied to the engineering and organizational decisions; I want the content to be timeless.

[^archive]: However, I still have yet to [archive external links, so I am still vulnerable to "linkrot."](https://gwern.net/archiving)
# Color scheme
The color scheme derives from the [Catppuccin](https://catppuccin.com) "latte" (light mode) and "frappe" (dark mode) [palettes](https://github.com/catppuccin/catppuccin/tree/main?tab=readme-ov-file#-palette). 

![](https://assets.turntrout.com/static/images/posts/catppuccin.avif)
Figure: The four Catppuccin palettes.

## Colors should accent (but not distract from) the content
Both palettes provide a light-touch pastel theme which allows subtle, pleasing accents. 

<!--TODO include color demo-->

Color is important to this website, but I need to be tasteful and strict in my usage or the site turns into a mess. For example, in-line [favicons](https://en.wikipedia.org/wiki/Favicon) are colorless (e.g. [YouTube's](https://youtube.com) logo is definitely red). To choose otherwise is to choose chaos and distraction. 

When designing visual content, I consider where the reader's eyes go. People visit my site to read my content, and so _the content should catch their eyes first_. The desktop pond GIF (with the goose) is the only exception to this rule. I decided that on the desktop, I want a reader to load the page, marvel and smile at the scenic pond, and then bring their eyes to the main text (which has high contrast and is the obvious next visual attractor). 

During the build process, I convert all naive CSS assignments of `color:red` (<span style="color:rgb(255,0,0);">imagine if I made you read this</span>) to <span style="color:red">the site's red</span>. Lots of my old equations used raw `red` / `green` / `blue` colors because that's all that my old blog allowed; these colors are converted 
to the site theme.
## Themes 

The themes provide high contrast between the text and the background, in both light and dark mode.[^sun]

[^sun]: I _love_ how the sun/moon hangs above the pond GIF in desktop mode. Try clicking the celestial body a few times!

<!--EXAMPLE-->

The darkest text color is used extremely sparingly, so the margin text is medium-contrast, as are e.g. list numbers and bullets:
   - I even used CSS to dynamically adjust the luminance of favicons which often appear in the margins, so that I don't have e.g. a black GitHub icon surrounded by lower contrast text. 

# Text presentation
## Fonts

The serif font family is the open-source [EB Garamond](https://github.com/georgd/EB-Garamond). The `monospace` font is [Fira Code VF](), which brings a range of lovely ligatures:

![](fira_code.png)
Figure: _Ligatures_ transform sequences of characters into a single beautiful glyph (like "`<=`").



![](letter_pairs-1.png)
Figure: I love sweating the small stuff. :) Notice how aligned "`FlTl`" is!

### I added a dash through the 0's
However, as of April 2024, EB Garamond did not support slashed zeroes (the `zero` feature). The unslashed zeroes looked quite similar to the letter 'o.' Furthermore, the italicized font did not support the `cv11` OpenType feature for oldstyle numerals (such as '2', which only reach up to the x-height of lowercase letters). This meant that the italicized oldstyle '1' looked like "<span class="small-caps">I</span>", which wasn't very pleasant to my eyes.

Therefore, I paid [Hisham Karim](https://www.fiverr.com/hishamhkarim) $121 to add these features. I have notified the maintainer of the EB Garamond font. 😌

3. Text presentation
	1. Fonts
		1. paid mod
		2. `woff2` compression
		3. Show off a range of fonts
	2. Balance `$baseMargin` and relative text sizing
	3. Max characters - research I based this off of 
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