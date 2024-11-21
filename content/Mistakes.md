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
date_published: &id001 2024-10-31 23:14:34.832290
date_updated: *id001
---

Inspired by Scott Alexander's [Mistakes](https://www.astralcodexten.com/p/mistakes) page:

> [!quote] Scott Alexander
> I don't promise never to make mistakes. But if I get something significantly wrong, I'll try to put it here as an acknowledgement and an aid for anyone trying to assess my credibility later.
>
 >  This doesn't include minor spelling/grammar mistakes, mistakes in links posts, or failed predictions. It's times I was fundamentally wrong about a major part of a post and someone was able to convince me of it.

> [!note]
> The list is currently quite thin. I have made more mistakes than are on this list. I'll add more as I remember them, or you could [email me](mailto:alex+mistakes@turntrout.com) and politely remind me of times I changed my mind about an important claim of mine!

 ---

# [Reward is not the optimization target](/reward-is-not-the-optimization-target)

Subtitle: July 25, 2022
I spent thousands of hours proving theorems about the "tendencies" of "reinforcement learning" agents which are either [optimal](https://arxiv.org/abs/1912.01683) or [trained using a "good enough" learning algorithm](/parametrically-retargetable-power-seeking). (I'm using scare quotes to mark undue connotations.) I later realized that even though ["reward" is a pleasant word](/dangers-of-suggestive-terminology), it's _definitely not a slam dunk that RL-trained policies will seek to optimize that quantity._ Reward often simply provides a per-datapoint learning rate multiplier - nothing spooky or fundamentally doomed.

While the realization may seem simple or obvious, it opened up a crack in my alignment worldview.
