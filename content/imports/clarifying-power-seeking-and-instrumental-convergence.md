---
permalink: clarifying-power-seeking-and-instrumental-convergence
lw-was-draft-post: None
lw-is-af: "true"
lw-is-debate: "false"
lw-page-url: https://www.lesswrong.com/posts/cwpKagyTvqSyAJB7q/clarifying-power-seeking-and-instrumental-convergence
lw-linkpost-url: https://www.lesswrong.com/posts/cwpKagyTvqSyAJB7q/clarifying-power-seeking-and-instrumental-convergence
lw-is-question: "false"
lw-posted-at: 2019-12-20T19:59:32.793Z
lw-last-modification: 2020-05-12T02:01:14.971Z
lw-curation-date: None
lw-frontpage-date: 2019-12-20T20:34:01.610Z
lw-was-unlisted: "false"
lw-is-shortform: "false"
lw-num-comments-on-upload: 7
lw-base-score: 42
lw-vote-count: 16
af-base-score: 20
af-num-comments-on-upload: 6
publish: true
title: "Clarifying Power-Seeking and Instrumental Convergence"
lw-latest-edit: 2019-12-20T19:59:33.006Z
lw-is-linkpost: "false"
tags: 
  - "Instrumental-Convergence"
  - "AI"
aliases: 
  - "clarifying-power-seeking-and-instrumental-convergence"
date_published: 12/20/2019
original_url: https://www.lesswrong.com/posts/cwpKagyTvqSyAJB7q/clarifying-power-seeking-and-instrumental-convergence
---
Previously: _[Seeking Power is Provably Instrumentally Convergent in MDPs](/seeking-power-is-often-convergently-instrumental-in-mdps) _

Rohin Shah and Vanessa Kosoy pointed out a subtle problem with my interpretation of the power-seeking theorem from the last post. To understand the distinction, we first need to shore up some intuitions.

# Correcting pre-formal intuitions about instrumental convergence

Imagine you're able to either attend college and then choose one of two careers, or attend a trade school for a third career. If you wanted, you could also attend college after trade school.

![](https://i.imgur.com/eDNlPMb.png)

If every way of rewarding careers is equally likely, then $\frac{2}{3}$ of the time, you just go to college straight away. This is true even though _going to trade school increases your power (your ability to achieve goals in general) compared to just going to college._ That is, Power($\texttt{trade school}$) > Power($\texttt{college}$), but going to $\texttt{college}$ is instrumentally convergent.
>
> We define instrumental convergence as optimal agents being more likely to take one action than another at some point in the future.

I think this captures what we really meant when we talked about instrumental convergence. Recently, however, an alignment researcher objected that instrumental convergence shouldn't depend on what state the world is in. I think the intuition was that _Basic AI Drives_\-esque power-seeking means the agent should always seek out the powerful states, no matter their starting point.

I think this is usually true, but it isn't literally true. Sometimes states with high power are just too out-of-the-way! If you buy my formalization of power, then in what way is going to $\texttt{trade school}$ "instrumentally convergent"? It isn't optimal for most goals!

This suggests that naive intuitions about instrumental convergence are subtly wrong. To figure out where optimal policies tend to go, you _must_ condition on where they come from. In other words, the best course of action depends on where you start out.

# Correcting the last post's implications

Unfortunately, the above example kills any hope of a theorem like "the agent seeks out the states in the future with the most resources / power". The nice thing about this theorem would be that we just need to know a state has more resources in order for the agent to pursue it.

Everything should add up to normalcy, though: we should still be able to make statements like "starting from a given state, the agent tends to seek out states which give it more control over the future". This isn't quite what my current results show. For involved technical reasons,[^1] one of the relationships I showed between power and instrumental convergence is a bit tautological, with both sides of the equation implicitly depending on the same variable. Accordingly, I'll be softening the language in the previous post for the moment.

I think there's a pretty good chance the theorem we're looking for exists in full generality ("starting from a given state, the agent tends to seek out states which give it more control over the future"). However, maybe it doesn't, and the relationships I gave are the best we can get in general. I do think the Tic-Tac-Toe reasoning from the last post is a strong conceptual argument for power-seeking being instrumentally convergent, but a few technicalities stop it from being directly formalized.

Failure to prove power-seeking in full generality would mostly affect the presentation to the broader AI community; we'd just be a little less aggressive in the claims. I think a reasonable reader can understand how and why power-seeking tends to happen, and why it doesn't go away just because some of the cycles aren't self-loops, or something silly like that.

In summary, the power-seeking theorem wasn't as suggestive as I thought. I'm still excited about this line of inquiry. We _can_ still say things like "most agents stay alive in Pac-Man and postpone ending a Tic-Tac-Toe game", but only in the limit of farsightedness ($\gamma \to 1$) by taking advantage of the distribution of terminal states. The theory _does_ still (IMO) meaningfully deconfuse us about power and instrumental convergence. None of the proofs are known to me to be incorrect, and similar implications can be drawn (albeit slightly more cautiously or differently worded).

After the holidays, I'll see if we can't get a more appropriate theorem.

_Thanks to Rohin Shah and Vanessa Kosoy for pointing out the interpretive mistake. Rohin suggested the college example as a non-abstract story for that environmental structure._

<hr/>


1.  For those of you who have read the paper, I'm talking about the last theorem. The problem: saying the POWER contribution of some possibilities relates to their optimality measure doesn't tell us anything without already knowing that optimality measure. [↩︎](#fnref-5ZuC9ehB78EheWxCv-1)