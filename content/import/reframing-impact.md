---
permalink: reframing-impact
lw-was-draft-post: "false"
lw-is-af: "true"
lw-is-debate: "false"
lw-page-url: https://www.lesswrong.com/posts/xCxeBSHqMEaP3jDvY/reframing-impact
lw-is-question: "false"
lw-posted-at: 2019-09-20T19:03:27.898Z
lw-last-modification: 2024-03-02T01:17:47.939Z
lw-curation-date: 2020-03-03T19:55:30.511Z
lw-frontpage-date: 2019-09-20T19:31:05.356Z
lw-was-unlisted: "false"
lw-is-shortform: "false"
lw-num-comments-on-upload: 15
lw-base-score: 98
lw-vote-count: 45
af-base-score: 29
af-num-comments-on-upload: 4
publish: true
title: "Reframing Impact"
lw-latest-edit: 2021-08-25T18:32:59.440Z
lw-is-linkpost: "false"
tags: 
  - "impact-regularization"
  - "AI"
aliases: 
  - "reframing-impact"
lw-sequence-title: Reframing Impact
lw-sequence-image-grid: sequencesgrid/jlnkhq3volgajzks64sw
lw-sequence-image-banner: sequences/fahwqcjgc6ni0stdzxb3
sequence-link: posts#reframing-impact
next-post-slug: value-impact
next-post-title: "Value Impact"
lw-reward-post-warning: "false"
use-full-width-images: "false"
date_published: 09/20/2019
original_url: https://www.lesswrong.com/posts/xCxeBSHqMEaP3jDvY/reframing-impact
---
![](https://i.imgur.com/3LocEy9.png )![](https://i.imgur.com/IUOudUK.png)![](https://i.imgur.com/GyP8V1D.png )![](https://i.imgur.com/fEqZh8g.png)![](https://i.imgur.com/wXmF1eX.png)![](https://i.imgur.com/Rjz9usG.png )![](https://39669.cdn.cke-cs.com/rQvD3VnunXZu34m86e5f/images/1722a733b38bd3e06602ab967807e30117054d26051c5c84.png)![](https://i.imgur.com/ZppOEZJ.png )

[​](​![]\(https://i.imgur.com/knzoLGJ.png)

![](https://i.imgur.com/gsWrwt6.png )

[​](​![]\(https://i.imgur.com/kIT2ULN.png)

![](https://i.imgur.com/iSqriuT.png )

[​](​![]\(https://i.imgur.com/p4OkxJ1.png)

![](https://i.imgur.com/p4OkxJ1.png)![](https://i.imgur.com/nFoDRoL.png)![](https://i.imgur.com/e6vNG2D.png)

### Technical Appendix: First safeguard?

_This sequence is written to be broadly accessible, although perhaps its focus on capable AI systems assumes familiarity with_ [_basic_](https://www.youtube.com/watch?v=pARXQnX6QS8) [_arguments_](https://www.amazon.com/Human-Compatible-Artificial-Intelligence-Problem/dp/0525558616) [_for_](https://www.amazon.com/Superintelligence-Dangers-Strategies-Nick-Bostrom/dp/0198739834/ref=sr_1_3?keywords=Superintelligence&qid=1560704777&s=books&sr=1-3) [_the_](https://slatestarcodex.com/superintelligence-faq/) [_importance_](https://80000hours.org/problem-profiles/positively-shaping-artificial-intelligence/) [_of_](https://www.openphilanthropy.org/blog/potential-risks-advanced-artificial-intelligence-philanthropic-opportunity) [_AI alignment_](https://www.openphilanthropy.org/blog/some-background-our-views-regarding-advanced-artificial-intelligence)_. The technical appendices are an exception, targeting the technically inclined._

Why do I claim that an impact measure would be "the first proposed safeguard which maybe actually stops a powerful agent with an [imperfect](https://www.lesswrong.com/posts/iTpLAaPamcKyjmbFC/robust-delegation) objective from ruining things – without assuming anything about the objective"?

The safeguard proposal shouldn't have to say "and here we solve this opaque, hard problem, and then it works". If we have the impact measure, we have the math, and then we have the code.

So what about:

- [Quantilizers](https://www.aaai.org/ocs/index.php/WS/AAAIW16/paper/view/12613)? This seems to be the most plausible alternative; mild optimization and impact measurement share many properties. But
  - What happens if the agent is already powerful? A greater proportion of plans could be catastrophic, since the agent is in a better position to cause them.
  - Where does the base distribution come from (opaque, hard problem?), and how do we know it's safe to sample from?
    - In the linked paper, Jessica Taylor suggests the idea of learning a human distribution over actions – how robustly would we need to learn this distribution? How numerous are catastrophic plans, and what _is _a catastrophe, defined without reference to our values in particular? (That definition requires understanding impact!)


- [Value learning](https://www.lesswrong.com/s/4dHMdK5TLN6xcqtyc)? But
  - We only want this if _our _(human) values are learned!
    - [Value learning is impossible without assumptions](https://papers.nips.cc/paper/7803-occams-razor-is-insufficient-to-infer-the-preferences-of-irrational-agents.pdf), and [getting good enough assumptions could be really hard](https://www.lesswrong.com/s/4dHMdK5TLN6xcqtyc/p/EhNCnCkmu7MwrQ7yz). If we don't know if we can get value learning / reward specification right, we'd like safeguards which don't fail because value learning goes wrong. The point of a safeguard is that it can catch you if the main thing falls through; if the safeguard fails because the main thing does, that's pointless.


- [Corrigibility](https://intelligence.org/files/Corrigibility.pdf)? At present, I'm excited about this property because I suspect it has a simple core principle. But
  - Even if the system is responsive to correction (and non-manipulative, and whatever other properties we associate with corrigibility), what if we become _unable _to correct it as a result of early actions (if the agent "moves too quickly", so to speak)?
    - [Paul Christiano's take on corrigibility](https://ai-alignment.com/corrigibility-3039e668638) is much broader and an exception to this critique.

  - What is the core principle?

#### Notes

- The three sections of this sequence will respectively answer three questions:
  - Why do we think some things are big deals?
  - Why are capable goal-directed AIs incentivized to catastrophically affect us by default?
  - How might we build agents without these incentives?

- The first part of this sequence focuses on foundational concepts crucial for understanding the deeper nature of impact. We will not yet be discussing what to implement.
- I strongly encourage completing the exercises. At times you shall be given a time limit; it’s important to learn not only to reason correctly, but [with ](https://www.readthesequences.com/The-Failures-Of-Eld-Science)[speed.](https://www.readthesequences.com/Einsteins-Speed)

> [!quote]
>
> The best way to use this book is NOT to simply read it or study it, but to read a question and STOP. Even close the book. Even put it away and THINK about the question. Only after you have formed a reasoned opinion should you read the solution. Why torture yourself thinking? Why jog? Why do push-ups?
>
> If you are given a hammer with which to drive nails at the age of three you may think to yourself, "OK, nice." But if you are given a hard rock with which to drive nails at the age of three, and at the age of four you are given a hammer, you think to yourself, "What a marvellous invention!" You see, you can't really appreciate the solution until you first appreciate the problem.
>
> _~_ [_Thinking Physics_](https://www.amazon.com/Thinking-Physics-Understandable-Practical-Reality/dp/0935218084)

- My paperclip-Balrog illustration is metaphorical: a good impact measure would hold steadfast against the daunting challenge of formally asking for the right thing from a powerful agent. The illustration does not represent an internal conflict within that agent. As water flows downhill, an impact-penalizing Frank prefers low-impact plans.
  - The drawing is based on [gonzalokenny's amazing work](https://www.deviantart.com/gonzalokenny/art/Gandalf-and-the-Balrog-329465089).

- Some of you may have a different conception of impact; I ask that you grasp the thing that I’m pointing to. In doing so, you might come to see your mental algorithm is the same. Ask not “is this what I initially had in mind?”, but rather “does this make sense as a thing-to-call-'impact'?”.
- H/T Rohin Shah for suggesting the three key properties. Alison Bowden contributed several small drawings and enormous help with earlier drafts.