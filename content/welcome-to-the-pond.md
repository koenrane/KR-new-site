---
title: "TurnTrout's website: Come relax by The Pond!"
permalink: announcing-the-pond
publish: true
description: 
aliases:
  - relax-by-the-pond
  - website-launch
  - launch
tags:
  - website
  - personal
---
For months, I have built a new home for my online content: [`www.turntrout.com`](www.turntrout.com). I brooked no compromises. Over [1,350 commits later](https://github.com/alexander-turner/TurnTrout.com/commits/main/),[^commits] I'm ready to publicize.

[^commits]: Counted by running 
     ```shell
    git rev-list --author="alex@turntrout.com" --count main
    ```

<center><strong><i><img class="emoji" draggable="false" alt="🏰" src="https://assets.turntrout.com/twemoji/1f3f0.svg" loading="lazy"><img class="emoji" draggable="false" alt="🌊" src="https://assets.turntrout.com/twemoji/1f30a.svg" loading="lazy">Welcome to The Pond! <img class="emoji" draggable="false" alt="🐟" src="https://assets.turntrout.com/twemoji/1f41f.svg" loading="lazy"><img class="emoji" draggable="false" alt="🪿" src="https://assets.turntrout.com/twemoji/replacements/1fabf.svg" loading="lazy"></strong></i></center>


![](https://assets.turntrout.com/static/pond.gif) 
Figure: I commissioned this GIF for $270.94. I paid a bit extra to ensure the goose honks twice. 

I don't want to be on LessWrong any more. Briefly, the site - and parts of the rationality community - don't meet my standards for discourse, truth-seeking, charity, and community health. For the most part, I'll elaborate my concerns another time. This is a happy post. ❤️  

# Inspiration for the website

![](site_desktop.png)
Figure: The site is most beautiful on the desktop. For example, the desktop enables hover previews for internal links. 

Many folks see the first <span class="dropcap" data-first-letter="D">d</span>ropcap and think of [`gwern.net`](https://gwern.net). While I appreciate `gwern`'s site, I didn't actively consult it for design - though it did inspire the dropcaps and hover previews for internal links. 

The serif font is the open-source [EB Garamond](https://github.com/georgd/EB-Garamond), inspired by e.g. the beautiful Garamond of [`ReadTheSequences.com`](https://readthesequences.com). However, most of this website's design was by my own taste and mind, themselves shaped by my favorite media over the years.


![The frontmatter of my AI alignment PhD.](https://assets.turntrout.com/static/images/posts/6ddc0291a1961469101cbd7d8516c7ffa43d6b6711dc7c36.avif)
Figure: Design comes naturally to me. I've loved SMALLCAPS and Garamond fonts for a long time, as seen in [my alignment PhD](/alignment-phd).

_The Pond_ makes me feel graceful and grateful and proud. It's my home, in a way - I've worked hard towards perfection. I'll write a post about the technical abilities of the site, of my quality assurance measures, and of my CI pipeline. I have so much hope and so many plans for this website!

I hope this site encourages me to write more. I miss writing and sharing. I miss [feeling proud and grateful to be part of a community](/lightness-and-unease#forwards). This website will probably not turn into a community _per se_, because I don't plan to enable comments. But I still hope that when I write, and you read, and you [write _back_ with your thoughts](mailto:alex@turntrout.com) - I hope we can bond and exchange ideas all the same. 

# What you can find in _The Pond_

I've imported and remastered all 120 of my LessWrong posts. _Every single post_, retouched and detailed. I both [pin down my favorite posts](/posts#my-favorite-posts) and [group the posts into sequences](/posts#sequences). I've also launched the site with three extra posts! Brand new content! 🎉 
1. [Gradient routing: Masking gradients to localize computation in neural networks](/gradient-routing)
2. [Can transformers act on information beyond an effective layer horizon?](/effective-layer-horizon)
3. [Intrinsic power-seeking:AI might seek power for power's sake](/dangers-of-intrinsic-power-seeking) 

The [research page](/research) summarizes my past and present research interests, along with short retrospectives on the older areas. 

## My dating doc!

I want to 

- What is on the site?
	- Existing posts
	- New posts
	- Subscription functionality
	- Date me 
- Announcements
	- Fatebook prediction center to track my public-facing predictions
	- Metaphor bounty
- How to follow / sign up 
- Nerdy technical details 
	- (Do I need to write this yet?)

# Transparency in reasoning and predicting
I've [quite had enough of the loose analogical reasoning which permeates the "rationalist" community's AI risk arguments](/danger-of-suggestive-terminology). But criticism is cheap. I want to hold myself to my own high standards.

> [!quote] Theodore Roosevelt
> Subtitle: ["Citizenship In A Republic"; delivered at the Sorbonne, in Paris, France on 23 April, 1910](https://en.wikipedia.org/wiki/Citizenship_in_a_Republic)
> 
> The poorest way to face life is to face it with a sneer. There are many men who feel a kind of twister pride in cynicism; there are many who confine themselves to criticism of the way others do what they themselves dare not even attempt. There is no more unhealthy being, no man less worthy of respect, than he who either really holds, or feigns to hold, an attitude of sneering disbelief toward all that is great and lofty, whether in achievement or in that noble effort which, even if it fails, comes to second achievement. A cynical habit of thought and speech, a readiness to criticize work which the critic himself never tries to perform, an intellectual aloofness which will not accept contact with life's realities - all these are marks, not as the possessor would fain to think, of superiority but of weakness. They mark the men unfit to bear their part painfully in the stern strife of living, who seek, in the affection of contempt for the achievements of others, to hide from others and from themselves in their own weakness. The rôle is easy; there is none easier, save only the rôle of the man who sneers alike at both criticism and performance.
> 
> It is not the critic who counts; not the man who points out how the strong man stumbles, or where the doer of deeds could have done them better. The credit belongs to the man who is actually in the arena, whose face is marred by dust and sweat and blood; who strives valiantly; who errs, who comes short again and again, because there is no effort without error and shortcoming; but who does actually strive to do the deeds; who knows great enthusiasms, the great devotions; who spends himself in a worthy cause; who at the best knows in the end the triumph of high achievement, and who at the worst, if he fails, at least fails while daring greatly, so that his place shall never be with those cold and timid souls who neither know victory nor defeat.

I hope to speak loudly and carry a small ego. I want to enjoy my wins and honorably acknowledge my failures and mis-predictions. 

## Bounty for bad analogies I've made since 2022
Analogies can be useful or they can be deadly. For an analogy to be appropriate, it has to highlight how two analogous situations _share the relevant mechanisms._ For example, an [analog computer](https://en.wikipedia.org/wiki/Analog_computer) obeys the same differential equations as certain harmonic oscillators, and so by "reasoning" using the "analogy" of an electrical circuit with such-and-such voltages and resistances, we can accurately predict systems of pendulums:
 ![](computer-analogy.png)
 
 However, in AI alignment, folks seem to be less careful. Does "evolution" "finding" the human genome tell us anything about the difficulty of "inner alignment" in "selection processes"? What are the proposed mechanisms? I think that I am more careful - and that I have been for a while.

> [!money] $50 bounty for analogies without mechanistic support
> 
> Criteria:
> 1. The analogy was made since July 7, 2022. That's when I posted [Human values & biases are inaccessible to the genome](https://turntrout.com/human-values-and-biases-are-inaccessible-to-the-genome).
> 2. The analogy is in a post on `turntrout.com`.
> 3. The analogy is not supported by mechanistic justification because no such justification exists.
> 
> If your claim meets the criteria, I will also credit your name on a list - alongside the called-out analogy. I will comment how I changed my mind as a result of realizing I gave a weak argument. Lastly, if the analogy lacks mechanistic justification _but_ such a justification exists, I will pay $10 and edit the article. 
> 
> To claim your bounty, [submit your find.](https://docs.google.com/forms/d/e/1FAIpQLScEePeMdZREtCkbk9J5fKfB9x6li-aHlecvSAbj6TyAub7jMw/viewform?usp=sf_link)

## Post edits are publicly recorded 

<figure class="float-right" style="margin-top:-1rem;">
<blockquote class="callout callout-metadata" data-callout="info" style="text-align:left; color: var(--gray); background-color: var(--light);"><div class="callout-title"><div class="callout-icon"></div><div class="callout-title-inner">About this post</div></div><div class="callout-content"><ul style="padding-left: 0px;"><p style="color:var(--gray);"><span class="reading-time"><b>Read time:</b> 17 minutes</span></p><p style="color:var(--gray);"><span class="publication-str"><a href="https://www.lesswrong.com/posts/H7KB44oKoSjSCkpzL/worrying-about-the-vase-whitelisting" class="external" target="_blank" style="color:var(--gray);" rel="noopener noreferrer">Originally published on</a> <time datetime="2018-06-16 00:00:00">June 16<sup class="ordinal-suffix">th</sup>, 2018</time></span></p><p style="color:var(--gray);"><span class="last-updated-str">Last updated on <a href="https://github.com/alexander-turner/TurnTrout.com/blob/main/content/worrying-about-the-vase-whitelisting.md" class="external" style="color:var(--gray);" target="_blank" rel="noopener noreferrer"><time datetime="2018-06-16 00:00:00">June 16<sup class="ordinal-suffix">th</sup>, 2018</time></a></span></p></ul></div></blockquote>

<figcaption>An example metadata element.</figcaption>
</figure>


Each post states when it was published and when it was last updated. The updated link points to the file on [my GitHub repo](https://github.com/alexander-turner/TurnTrout.com) - where the edit history can be inspected. While not a perfect tamper-proof log[^history] of my edits over time[^hash], GitHub provides basic transparency and assurance. 

## Fatebook prediction tracking

<iframe src="https://fatebook.io/embed/q/are-you-going-to-like-turntrout-com---cm2u10nym00029cc3j1h05pot?compact=true&requireSignIn=false" height="200"></iframe>




[^hash]: I might want to use [linked timestamping](https://en.wikipedia.org/wiki/Linked_timestamping) to provide you with cryptographic assurance that I am not fudging my tracks to cover embarrassing mis-predictions. But I have _so many other to-do's for the website!_

[^history]: It's possible for me to modify the `git` history. I guess you'll have to take my word that I won't do that. Plus, getting caught would be embarrassing.
