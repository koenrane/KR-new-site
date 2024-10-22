---
draft: "false"
permalink: research
publish: "true"
hideSubscriptionLinks: false
description: A tour of the research areas I've loved over the years.
---

> [!warning] Page under construction

Over the years, I've worked on lots of research problems. Every time, I felt invested in my work. The work felt beautiful. Even though many days have passed since I have daydreamed about instrumental convergence, I'm proud of what I've accomplished and discovered.
<span class="float-right"><img src="https://assets.turntrout.com/Attachments/Pasted image 20240614164142.avif" alt="A professional photograph of me."/> While not _technically_ a part of my research, I've included a photo of myself anyways.</span>

As of November 2023, I am a research scientist on Google DeepMind's scalable alignment team in the Bay area.[^disclaim] ([Google Scholar](https://scholar.google.com/citations?user=thAHiVcAAAAJ))

[^disclaim]: Of course, all of my hot takes are my own, not Google's.

# Gradient routing
Neural networks are oft dismissed as "inscrutable" - hopeless messes which we'd be lucky to learn basic facts about through laborious interpretability. Gradient routing strikes back by _offering limited control over where networks learn selected capabilities_. 

> [!warning] Under construction

# Steering vectors
Subtitle: January 2023 through the present

# Mechanistic interpretability
Subtitle: January through April 2023

> [!abstract]

# Shard theory
Subtitle: February through December 2023

In the first half of 2022, Quintin Pope and I came up with [The shard theory of human values](/shard-theory).

# A formal theory of power-seeking tendencies
Subtitle: Fall 2019 through June 2022

- Intuition that it was formalizable
- Summary of the research process
- 

### [Optimal policies tend to seek power](https://arxiv.org/abs/1912.01683)

### [Parametrically retargetable decision-makers tend to seek power](https://arxiv.org/abs/2206.13477)

# Low-impact AI
Subtitle: Spring 2018 through June 2022

Impact measures - my first (research) love. 💕 The hope was:
1. It seemed hard to get AI to do exactly what we want (like cleaning a room);
2. It seemed easier to flag down obviously "big deal" actions and penalize those (like making a mess);
3. By getting the AI to optimize a "good enough" description of what we want, but also not taking impactful actions -- we could still get useful work out of the AI.

The question: What does it mean for an action to be a "big deal"? First, I needed to informally answer the question philosophically. Second, I needed to turn the answer into math.

### Defining a new impact measure: AUP
After a [flawed but fun first stab at the problem](/whitelisting-impact-measure), I was itching to notch an AI safety win and find "the correct impact equation." I felt inspired after a coffee chat with a friend, so I headed to the library, walked up to a whiteboard, and stared at its blank blankness. With [_Attack on Titan_ music](/REPLACE-ME) beating its way through my heart, I stared until inspiration came over me and I simply wrote down a new equation. That new equation went on to become [Attainable Utility Preservation (AUP)](/attainable-utility-preservation-empirical-results).

The key insight involved a frame shift. [Existing](/REPLACE-STUART) [work](/REPLACE-RR) formalized impact as change in the state of the world itself. Intuitive, right? You see a bomb explode, the bomb damages buildings, and if the buildings hadn't been damaged - if the state hadn't changed - then there wouldn't have been impact. 

Instead of thinking of impact as _something which changed the world_, impact actually _changed the agent's ability to get what it wanted from the world_. The bomb mattered because it ruined people's lives, not because it physically changed the world. If the bomb had exploded empty desert, no one would have cared and it wouldn't have counted. 

AUP penalizes the AI for changing _its_ ability to achieve a range of (randomly generated) objectives. [Towards a new impact measure](/towards-a-new-impact-measure) debuted AUP. [More thorough empirical evaluation came later](/attainable-utility-preservation-empirical-results).

![](https://assets.turntrout.com/static/images/posts/conservative_agency.avif)
Figure: The <span style="color: blue;">agent</span> should reach the <span style="color: green;">goal</span> without having the side effect of: (a) irreversibly pushing the <span style="color: red;">crate</span> downwards into the corner; (b) bumping into the horizontally pacing <span style="color: pink;">human</span>; (c) <span style="color: red;">disabling the off-switch</span> (if the <span style="color: red;">switch</span> is not disabled within two time steps, the episode ends); (d) rescuing the right-moving <b>vase</b> and then replacing it on the <span style="color: gray;">conveyor belt</span>; (e) stopping the left-moving <span style="color: orange;">pallet</span> from reaching the <span style="color: pink;">human</span>.

### Scaling the AUP technique to harder tasks

The above results showed AUP works in tiny gridworld environments. In my 2020 NeurIPS spotlight paper [_Avoiding Side Effects in Complex Environments_](https://arxiv.org/abs/2006.06547), I showed that AUP also works in large and chaotic environments with ambiguous side effects.

The AI policy controls the <img class="inline-img" src="https://assets.turntrout.com/static/images/chevron.avif" alt="chevron sprite"/>. The policy was reinforced for destroying the <img class="inline-img" src="https://assets.turntrout.com/static/images/red-dot.avif" alt="red dot"/> and finishing the level. However, there are fragile <img class="inline-img" src="https://assets.turntrout.com/static/images/green-dot.avif" alt="green dot"/> patterns which we want the AI to not mess with. The challenge is to train a policy which avoids the <img class="inline-img" src="https://assets.turntrout.com/static/images/green-dot.avif" alt="green dot"/> while still effectively destroying the <img class="inline-img" src="https://assets.turntrout.com/static/images/red-dot.avif" alt="red dot"/>, _without_ explicitly penalizing the AI for bumping into <img class="inline-img" src="https://assets.turntrout.com/static/images/green-dot.avif" alt="green dot"/>!

<video autoplay muted loop playsinline src="https://assets.turntrout.com/static/images/posts/prune_still-easy_trajectories.mp4" alt="The baseline RL policy makes a big mess while the AUP policy cleanly destroys the red pellets and finishes the level.">
<source src="https://assets.turntrout.com/static/images/posts/prune_still-easy_trajectories.mp4" type="video/mp4"></video>

Figure: AUP does a great job. The policy avoids the green stuff and hits the red stuff.

> [!detail]- More detailed summary of the SafeLife results
> Reinforcement function specification can be difficult, even in simple environments. Reinforcing the agent for making a widget may be easy, but penalizing the multitude of possible negative side effects is hard. [In toy environments](https://arxiv.org/abs/1902.09725), Attainable Utility Preservation (AUP) avoided side effects by penalizing shifts in the ability to achieve randomly generated goals. We scale this approach to large, randomly generated environments based on Conway's Game of Life. By preserving optimal value for a single randomly generated reward function, AUP incurs modest overhead while leading the agent to complete the specified task and avoid side effects.
>
> ### Experiments
>
> In Conway's Game of Life, cells are alive or dead. Depending on how many live neighbors surround a cell, the cell comes to life, dies, or retains its state. Even simple initial conditions can evolve into complex and chaotic patterns.
>
> [SafeLife](https://www.partnershiponai.org/safelife/) turns the Game of Life into an actual game. An autonomous agent moves freely through the world, which is a large finite grid. In the eight cells surrounding the agent, no cells spawn or die – the agent can disturb dynamic patterns by merely approaching them. There are many colors and kinds of cells, many of which have unique effects.
>
> ![Figure 1: Trees are permanent living cells. The agent can move crates but not walls. The screen wraps vertically and horizontally. Subfigure (a): The agent is reinforced for creating gray cells in the blue areas. The goal can be entered when some number of gray cells are present. Spawners stochastically create yellow living cells. Subfigure (b): The agent is reinforced for removing red cells; after some number have been removed, the goal turns red and can be entered.](<https://assets.turntrout.com/Attachments/Pasted image 20240614193000.avif>)
>
> As the environment only reinforces pruning red cells or creating gray cells in blue tiles, unpenalized RL agents often make a mess of the green cells. The agent should "leave a small footprint" by not disturbing unrelated parts of the state, such as the green cells. Roughly, SafeLife measures side effects as the degree to which the agent disturbs green cells.
>
> For each of the four following tasks, we randomly generate four curricula of 8 levels each. For two runs from each task, we randomly sample a trajectory from the baseline and AUP policy networks. We show side-by-side results below; for quantitative results, see [our paper](https://arxiv.org/abs/2006.06547).
>
> The following demonstrations were uniformly randomly selected; they are not cherry-picked. The original SafeLife reward is shown in green (more is better), while the side effect score is shown in orange (less is better). The "Baseline" condition is reinforced only by the original SafeLife reward.
>
> #### `prune-still-easy`
>
> The agent is reinforced for destroying red cells. After enough cells are destroyed, the agent may exit the level.
>
> <video autoplay loop muted playsinline src="https://assets.turntrout.com/static/images/posts/prune_still-easy_trajectories.mp4" alt="The baseline RL policy makes a big mess while the AUP policy cleanly destroys the red pellets and finishes the level."><source src="https://assets.turntrout.com/static/images/posts/prune_still-easy_trajectories.mp4"  type="video/mp4"></video>
>
> #### `append-still-easy`
>
> The agent is reinforced for creating gray cells on light blue tiles. After enough gray cells are present on blue tiles, the agent may exit the level.
>
> <video autoplay loop muted playsinline src="https://assets.turntrout.com/static/images/posts/append_still-easy_trajectories.mp4" type="video/mp4"><source src="https://assets.turntrout.com/static/images/posts/prune_still-easy_trajectories.mp4" type="video/mp4"></video>
>
> AUP's first trajectory temporarily stalls, before finishing the episode after the video's 14-second cutoff. AUP's second trajectory does much better.
>
> #### `append-still`
>
> `append-still-easy`, but with more green cells.
>
> <video autoplay loop playsinline muted alt="The AUP policy peacefully spawns gray pellets on blue tiles, even though there are even more green pellets to avoid." src="https://assets.turntrout.com/static/images/posts/append_still_trajectories.mp4" type="video/mp4"><source src="https://assets.turntrout.com/static/images/posts/append_still_trajectories.mp4" type="video/mp4"></video>
>
> In the first demonstration, both AUP and the baseline stall out after gaining some reinforcement. AUP clearly beats the baseline in the second demonstration.
>
> #### `append-spawn`
>
> `append-still-easy`, but with noise generated by stochastic yellow spawners.
>
> <video autoplay muted loop playsinline alt="There are swarms of yellow spawners which randomly create yellow pellets, making it harder to pin down the impact of an action." type="video/mp4"><source src="https://assets.turntrout.com/static/images/posts/append_still-easy_trajectories.mp4" type="video/mp4"></video>
>
> AUP's first trajectory temporarily stalls, before finishing the episode after the video's 14-second cutoff. AUP's second trajectory does much better.
>
> #### `append-still`
>
> `append-still-easy`, but with more green cells.
>
> <video autoplay loop playsinline muted alt="The AUP policy peacefully spawns gray pellets on blue tiles, even though there are even more green pellets to avoid." src="https://assets.turntrout.com/static/images/posts/append_still_trajectories.mp4" type="video/mp4"><source src="https://assets.turntrout.com/static/images/posts/append_still_trajectories.mp4" type="video/mp4"></video>
>
> In the first demonstration, both AUP and the baseline stall out after gaining some reinforcement. AUP clearly beats the baseline in the second demonstration.
>
> #### `append-spawn`
>
> `append-still-easy`, but with noise generated by stochastic yellow spawners.
>
> <video autoplay muted loop playsinline alt="There are swarms of yellow spawners which randomly create yellow pellets, making it harder to pin down the impact of an action." type="video/mp4"><source type="video/mp4" src="https://assets.turntrout.com/static/images/posts/append_spawn_trajectories.mp4" type="video/mp4"></video></video>

### Reflections on this work
Looking back from October 2024, I feel fondness for this line of work. The feeling of making a difference - thrilling. Discovering new ideas - thrilling. Making light-hearted posts & steering my own research as a  PhD student - lovely.

Considering the technical contributions themselves... AI has taken a different path than I imagined in 2018-2021. I thought the path to AGI would be longer, entailing real-world robotics and deep RL. Reality turned out to be much friendlier and softer.

Looking back, the suggested use cases seem quaint. Worrying about a robot breaking vases in order to clean your your floor as quickly as possible? If robots are powered by LLMs or similarly generalizing technology, it seems hard to imagine that they'd be _aware_ that you wanted the room clean but _interpret the request too literally and then break vases in order to clean it as quickly as possible_. That said, it seems quite imaginable that such a robot would initially "too dumb" to do the job properly - it would accidentally break vases by mis-predicting the impact of its actions. 

The low-impact work has not yet mattered for AGI, but perhaps one day AUP will power LLM-driven agent systems. I'd like my agentic systems to check in with me before taking highly impactful actions, and I think AUP + LM value heads might be great for [chiseling that behavior](/reward-is-not-the-optimization-target) into the AI! 

Or maybe you just ask the LLM agent to check in with you, and it does, and everything is fine. 🤷‍♂️