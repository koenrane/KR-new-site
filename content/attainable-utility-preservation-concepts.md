---
permalink: attainable-utility-preservation-concepts
lw-was-draft-post: None
lw-is-af: "true"
lw-is-debate: "false"
lw-page-url: https://www.lesswrong.com/posts/75oMAADr4265AGK3L/attainable-utility-preservation-concepts
lw-linkpost-url: https://www.lesswrong.com/posts/75oMAADr4265AGK3L/attainable-utility-preservation-concepts
lw-is-question: "false"
lw-posted-at: 2020-02-17T05:20:09.567Z
lw-last-modification: 2021-05-24T18:19:29.122Z
lw-curation-date: None
lw-frontpage-date: 2020-02-17T06:30:53.270Z
lw-was-unlisted: "false"
lw-is-shortform: "false"
lw-num-comments-on-upload: 20
lw-base-score: 38
lw-vote-count: 11
af-base-score: 17
af-num-comments-on-upload: 11
publish: true
title: "Attainable Utility Preservation: Concepts"
lw-latest-edit: 2020-02-17T05:22:28.410Z
lw-is-linkpost: "false"
tags: 
  - "Impact-Regularization"
  - "AI"
aliases: 
  - "attainable-utility-preservation-concepts"
lw-sequence-title: Reframing Impact
lw-sequence-image-grid: sequencesgrid/izfzehxanx48hvf10lnl
lw-sequence-image-banner: sequences/zpia9omq0zfhpeyshvev
prev-post-slug: the-catastrophic-convergence-conjecture
next-post-slug: attainable-utility-preservation-empirical-results
date_published: 02/17/2020
original_url: https://www.lesswrong.com/posts/75oMAADr4265AGK3L/attainable-utility-preservation-concepts
---
![](https://i.imgur.com/hTnYTsJ.png)

![](https://i.imgur.com/gwVocUy.png) ![](https://i.imgur.com/KPv2beS.png)

![](https://i.imgur.com/MYNBKOe.png)

![](https://i.imgur.com/ZK2qYPZ.png)

![](https://i.imgur.com/lk8Keid.png) ![](https://i.imgur.com/kMBZK6d.png) ![](https://i.imgur.com/FXlUiYj.png)

![](https://i.imgur.com/hHVvk0Q.png) ![](https://i.imgur.com/3NMSHHl.png) ![](https://i.imgur.com/BtzHnUq.png)

![](https://i.imgur.com/MzW64A5.png) ![](https://i.imgur.com/mOWK65o.png)

![](https://i.imgur.com/VDQiChW.png) ![](https://i.imgur.com/jtxMXJe.png)

![](https://i.imgur.com/7KcMK3J.png)

## Appendix: No free impact

What if we want the agent to single-handedly ensure the future is stable and aligned with our values? AUP probably won’t allow policies which actually accomplish this goal – one needs power to e.g. nip unaligned superintelligences in the bud. AUP aims to prevent catastrophes by stopping bad agents from gaining power to do bad things, but it symmetrically impedes otherwise-good agents.

This doesn’t mean we can’t get useful work out of agents – there are important asymmetries provided by both the main reward function and AU landscape counterfactuals.

First, even though we can’t specify an _aligned_ reward function, the provided reward function still gives the agent useful information about what we want. If we need paperclips, then a paperclip-AUP agent prefers policies which make some paperclips. Simple.

Second, if we don’t like what it’s beginning to do, we can shut it off (because it hasn’t gained power over us). Therefore, it has “approval incentives” which bias it towards AU landscapes in which its power hasn’t decreased too much, either.

So we can hope to build a non-catastrophic AUP agent and get useful work out of it. We just can’t directly ask it to solve all of our problems: it doesn’t make much sense to speak of a “low-impact [singleton](https://wiki.lesswrong.com/wiki/Singleton)”.

#### Notes
*   To emphasize, when I say "AUP agents do $X$" in this post, I mean that AUP agents correctly implementing the _concept of AUP_ tend to behave in a certain way.
*   As [pointed out by Daniel Filan](/towards-a-new-impact-measure#jJrCTRwTZDZDc3XLx), AUP suggests that one might work better in groups by ensuring one's actions preserve teammates' AUs.