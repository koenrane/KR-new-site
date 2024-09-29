---
permalink: generalizing-the-power-seeking-theorems
lw-was-draft-post: "false"
lw-is-af: "true"
lw-is-debate: "false"
lw-page-url: https://www.lesswrong.com/posts/nyDnLif4cjeRe9DSv/generalizing-the-power-seeking-theorems
lw-is-question: "false"
lw-posted-at: 2020-07-27T00:28:25.677Z
lw-last-modification: 2021-01-14T21:59:01.363Z
lw-curation-date: None
lw-frontpage-date: 2020-07-27T18:23:18.115Z
lw-was-unlisted: "false"
lw-is-shortform: "false"
lw-num-comments-on-upload: 6
lw-base-score: 41
lw-vote-count: 13
af-base-score: 17
af-num-comments-on-upload: 5
publish: true
title: "Generalizing the Power-Seeking Theorems"
lw-latest-edit: 2021-01-14T21:59:01.815Z
lw-is-linkpost: "false"
tags: 
  - "AI"
  - "instrumental-convergence"
aliases: 
  - "generalizing-the-power-seeking-theorems"
lw-reward-post-warning: "false"
use-full-width-images: "false"
date_published: 07/27/2020
original_url: https://www.lesswrong.com/posts/nyDnLif4cjeRe9DSv/generalizing-the-power-seeking-theorems
---
Previously: [Seeking Power is Often Provably Instrumentally Convergent in MDPs](/seeking-power-is-often-convergently-instrumental-in-mdps#Power).

_Circa 2021, the above post was revamped to supersede this one, so I recommend just reading that instead._

<hr/>


> [!thanks]
>Thanks to Rohin Shah, Michael Dennis, Josh Turner, and Evan Hubinger for comments.

_The original post contained proof sketches for non-IID reward function distributions. I think the actual non-IID theorems look different than I thought, and so I've removed the proof sketches in the meantime._

<hr/>


It sure seems like gaining power over the environment is instrumentally convergent (optimal for a wide range of agent goals). You can turn this into math and prove things about it. Given some distribution over agent goals, we want to be able to formally describe how optimal action tends to flow through the future.

_Does gaining money tend to be optimal? Avoiding shutdown? When? How do we know?_

[Optimal Farsighted Agents Tend to Seek Power](https://arxiv.org/abs/1912.01683) proved that, when you distribute reward fairly and evenly across states (IID), it's instrumentally convergent to gain access to lots of final states (which are absorbing, in that the agent keeps on experiencing the final state). The theorems apply when you don't discount the future (you're "infinitely farsighted").

![](https://i.imgur.com/ZiFD6BU.gif)
<br/>Figure: Most reward functions for the Pac-Man game incentivize not dying immediately, so that the agent can loop around higher-scoring configurations.

![](https://assets.turntrout.com/static/images/posts/3HUBl5H.avif)
<br/>Figure: Many ways of scoring Tic-Tac-Toe game states incentivize not losing immediately, in order to choose the highest-scoring final configuration.

![](https://assets.turntrout.com/static/images/posts/4d8c2643e138a36e7ac456d660cf9cfa51cd99fb1070d0fa.avif)
<br/>Figure: "All states have self-loops, left hidden to reduce clutter.   
  
In _AI: A Modern Approach (3e)_, the agent starts at $\color{blue}{1}$  and receives reward for reaching $\color{green}{3}$. The optimal policy for this reward function avoids $\color{red}{2}$, and one might suspect that avoiding $\color{red}{2}$ is instrumentally convergent. However, a skeptic might provide a reward function for which navigating to $\color{red}{2}$ is optimal, and then argue that "instrumental convergence'' is subjective and that there is no reasonable basis for concluding that $\color{red}{2}$ is generally avoided.  
  
We can do better... for any way of independently and identically distributing reward over states, $\frac{10}{11}$ of reward functions have farsighted optimal policies which avoid $\color{red}{2}$. If we complicate the MDP with additional terminal states, this number further approaches 1.  
  
If we suppose that the agent will be forced into $\color{red}{2}$ unless it takes preventative action, then preventative policies are optimal for $\frac{10}{11}$ of farsighted agents – no matter how complex the preventative action. Taking $\color{red}{2}$ to represent shutdown, we see that avoiding shutdown is instrumentally convergent in any MDP representing a real-world task and containing a shutdown state. We argue that this is a special case of a more general phenomenon: optimal farsighted agents tend to seek power."  
  
~ [Optimal Farsighted Agents Tend to Seek Power](https://arxiv.org/abs/1912.01683)

While it's good to understand the limiting case, what if the agent, you know, _isn't_ infinitely farsighted? That's a pretty unrealistic assumption. Eventually, we want this theory to help us predict what happens after we deploy RL agents with high-performing policies in the real world. 

# Normal amounts of sightedness

![](https://assets.turntrout.com/static/images/posts/C0XH06g.avif)![](https://assets.turntrout.com/static/images/posts/b8ee87a5e343c508fd99369262b0bc56bfa47fc3875d9de0.avif)

But what if we care about the journey? What if $\gamma\in(0,1)$? 

We can view Frank as traversing a Markov decision process, navigating between states with his actions:

![](https://assets.turntrout.com/static/images/posts/29b319faf0ef254924b8e4292c6edba0fab28fbe71379f7f.avif)
<br/>Figure: Reward is IID, so the gold-heap state doesn't have an intrinsically more generous reward distribution than the castle-and-dragon state.

It sure _seems_ like Frank is more likely to start with the blue or green gems. Those give him way more choices along the way, after all. But the previous theorems only said "at $\gamma=0$, he's equally likely to pick each gem. At $\gamma=1$, he's equally likely to end up in each terminal state". 

Not helpful.

Let me tell you, finding the probability that one tangled web of choices is optimal over another web, is generally a huge mess. You're finding the measure of reward functions which satisfy some messy system of inequalities, like 

$$
\begin{align*} r_1+\gamma\frac{r_2}{1-\gamma}>\max(&r_3+\frac{\gamma}{1-\gamma^2}(r_4+\gamma r_5),\\ &r_3+\gamma\frac{r_5}{1-\gamma},\\ &\frac{r_3}{1-\gamma}). \end{align*}
$$

And that's in the _simple tiny_ environments! 

How do we reason about instrumental convergence – how do we find those sets of trajectories which are more likely to be optimal for a lot of reward functions? 

We exploit symmetries. 

![](https://assets.turntrout.com/static/images/posts/e9639af9623f040dde91ce018b021d6d89faf6d475e0c488.avif)
<br/>Figure: There exists a [graph isomorphism](https://en.wikipedia.org/wiki/Graph_isomorphism) between this blue-gem-subgraph and the red-gem-graph, such that the isomorphism leaves Frank where he is.

The blue gem makes available all of the same options as the red gems, and _then some_. Since the blue gem gives you strictly more options, it's strictly more likely to be optimal! When you toss back in the green gem, avoiding the red gems becomes yet more likely. 

So, we can prove that for all $\gamma\in(0,1)$, most agents don't choose the red gems. Agents are more likely to pick blue than red. Easy. 

Plus, this reasoning mirrors why we think instrumental convergence exists to begin with:

> Sure, the goal could incentivize immediately initiating shutdown procedures. But if you stay active, you could still shut down later, _plus_ there are all these other states the agent might be incentivized to reach.  

This extends further. If the symmetry occurs twice over, then you can conclude the agent is at least twice as likely to do the instrumentally convergent thing.  

# Relaxation summary

My initial work made a lot of [simplifying assumptions](/problem-relaxation-as-a-tactic):

- The agents are infinitely farsighted: they care about average reward over time, and don't prioritize the present over the future.
  - **Relaxed. **See above.

- The environment is deterministic.
  - **Relaxed. **[The paper](https://arxiv.org/pdf/1912.01683.pdf) is already updated to handle stochastic environments. The new techniques in this post also generalize straightforwardly.

- Reward is distributed IID over states, where each state's reward distribution is bounded and continuous.
- The environment is Markov.
  - **Relaxed.**$n$-step Markovian environments are handled by conversion into isomorphic Markov environments.

- The agent is optimal.
- The environment is finite and fully observable.

The power-seeking theorems apply to: ~infinitely farsighted~ optimal policies in finite ~deterministic~ MDPs with respect to reward distributed independently, identically, continuously, and boundedly over states.

# Conclusion

We now have a few formally correct strategies for showing instrumental convergence, or lack thereof. 

- In deterministic environments, there's no instrumental convergence at $\gamma=0$ for IID reward.
- When $0<\gamma<1$, you're strictly more likely to navigate to parts of the future which give you strictly more options (in a graph-theoretic sense). Plus, these parts of the future give you strictly more power.
- When $\gamma=1$, it's instrumentally convergent to access a wide range of terminal states.
  - This can be seen as a special case of having "strictly more options", but you no longer require an isomorphism on the paths leading to the terminal states.

# Appendix: Proofs

_In the initial post, proof sketches were given. The proofs ended up being much more involved than expected. Instead, see Theorem F.5 in Appendix F of_ [Optimal Policies Tend to Seek Power](https://arxiv.org/pdf/1912.01683.pdf).