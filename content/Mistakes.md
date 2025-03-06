---
title: Mistaken claims I've made
permalink: mistakes
publish: true
draft: false
no_dropcap: "true"
tags:
  - website
  - personal
description: A list of some of my major conceptual mistakes.
date-published:
authors: Alex Turner
hideSubscriptionLinks: false
card_image:
date_published: 2024-10-31 23:14:34.832290
date_updated: 2025-03-05 20:43:54.692493
---





Inspired by Scott Alexander's [Mistakes](https://www.astralcodexten.com/p/mistakes) page:

> [!quote] Scott Alexander
> I don't promise never to make mistakes. But if I get something significantly wrong, I'll try to put it here as an acknowledgement and an aid for anyone trying to assess my credibility later.
>
 > This doesn't include minor spelling/grammar mistakes, mistakes in links posts, or failed predictions. It's times I was fundamentally wrong about a major part of a post and someone was able to convince me of it.

> [!note]
> The list is currently quite thin. I have made more mistakes than are on this list. I'll add more as I remember them, or you could [email me](mailto:alex+mistakes@turntrout.com) and politely remind me of times I changed my mind about an important claim of mine!

 ---

# [Reward is not the optimization target](/reward-is-not-the-optimization-target)

Subtitle: July 25, 2022
I spent thousands of hours proving theorems about the "tendencies" of "reinforcement learning" agents which are either [optimal](https://arxiv.org/abs/1912.01683) or [trained using a "good enough" learning algorithm](/parametrically-retargetable-power-seeking). (I'm using scare quotes to mark undue connotations.) I later realized that even though ["reward" is a pleasant word](/dangers-of-suggestive-terminology), it's _definitely not a slam dunk that RL-trained policies will seek to optimize that quantity._ Reward often simply provides a per-datapoint learning rate multiplier - nothing spooky or fundamentally doomed.

While the realization may seem simple or obvious, it opened up a crack in my alignment worldview.

# Mispredicting the 2024 US presidential election

Subtitle: November 5, 2024

<iframe src="https://fatebook.io/embed/q/kamala-wins--cm34x28gv00004svvk2d1zvaz?compact=true&requireSignIn=false" width="450" height="200"></iframe>

I read too much into the [shock Seltzer poll which showed Harris +3](https://www.desmoinesregister.com/story/news/politics/iowa-poll/2024/11/02/iowa-poll-kamala-harris-leads-donald-trump-2024-presidential-race/75354033007/). At one point before the polls closed, my credence even reached 80% - driven by observations of unusually high turnout, which historically was a good sign for democrats.

At least, I _thought_ that high turnout -> higher chance that democrats win. But as I looked up a link to justify that claim, I found that it's actually not true! According to [National Affairs](https://www.nationalaffairs.com/publications/detail/does-high-voter-turnout-help-one-party):

![](https://assets.turntrout.com/static/images/posts/presidential_vote_share.avif)

Figure: The $y$-axis represents Democrat vote share. There's not much of a correlation, especially after tossing out the 1964 election.

To do better, I should have anchored more strongly to base rates via current polling, especially around the economy. On a meta-level, I didn't realize how much of a news bubble I was in. The media I read portrayed Trump as low-energy & barely filling out his rallies. I'll check out a wider variety of sources in the future, perhaps via e.g. [Ground News](https://ground.news/bias-bar).
