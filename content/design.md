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
---
# Color scheme
The color scheme derives from the [Catppuccin](https://catppuccin.com) "latte" (light mode) and "frappe" (dark mode) [palettes](https://github.com/catppuccin/catppuccin/tree/main?tab=readme-ov-file#-palette). 

![](https://assets.turntrout.com/static/images/posts/catppuccin.avif)
Figure: The four Catppuccin palettes.

## Colors should accent (but not distract from) the content
Both palettes provide a light-touch pastel theme which allows subtle, pleasing accents. 

<!--TODO include color demo-->

Color is important to this website, but I need to be tasteful and strict in my usage or the site turns into a mess. For example, in-line [favicons](https://en.wikipedia.org/wiki/Favicon) are colorless (e.g. [YouTube](https://youtube.com)'s logo is definitely red). To choose otherwise is to choose chaos and distraction. 

When designing visual content, I consider where the reader's eyes go. People visit my site to read my content, and so _the content should catch their eyes first_. The desktop pond GIF (with the goose) is the only exception to this rule. I decided that on the desktop, I want a reader to load the page, marvel and smile at the honking goose, and then bring their eyes to the main text (which has high contrast and is the obvious next visual attractor). 

Furthermore, during the build process I transform the webpages to convert all _naive_ CSS assignments of `color: red` (<span style="color:rgb(255,0,0);">cringe!</span> 🤡) to <span style="color:red">the site's red</span>. Lots of my old equations used raw `red`/`green`/`blue` colors (because that's all that my old blog allowed).
## Themes 

The themes provide high contrast between the text and the background. 

The darkest text color is used extremely sparingly, so the margin text is medium-contrast, as are e.g. list numbers and bullets:
   - I even used CSS to dynamically adjust the luminance of favicons which often appear in the margins, so that I don't have e.g. a black GitHub icon surrounded by lower contrast text. 

2. Color scheme
	1. Balance / sparse usage of dark colors
	2. Auto-converting all instances of red in the text (helpful for `katex`)
3. Text presentation
	1. Fonts
		1. paid mod
		2. `woff2` compression
		3. Show off a range of fonts
	2. Balance `$baseMargin` and relative text sizing
	3. Max characters - research I based this off of 
4. The commit->push->deploy pipeline
	1. Precommit
	2. Prepush
	3. Github actions
		1. deepsource
	4. Recovery via cloudflare if it fails