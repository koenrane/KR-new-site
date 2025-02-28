---
title: "Pretrained misalignment: Filter data to avoid self-fulfilling prophecies of doom"
permalink: filter-misalignment-data
publish: true
no_dropcap: "false"
tags:
  - AI
description: 
authors: Alex Turner
hideSubscriptionLinks: false
card_image: https://media.discordapp.net/attachments/943969708753973261/1344537179808075797/file-Pze7drPVzBKgsJJGsq1kke.png?ex=67c14553&is=67bff3d3&hm=5877a29be02bf19507338fac40376c562e89ebae598493748d6c6517143580ba&=&format=webp&quality=lossless&width=2573&height=1470
aliases:
  - self-fulfilling-prophecies
  - filter-data
  - data-filtering
  - break-the-prophecy
  - pretrained-misalignment
---
Your AI's training data might make it more "evil" and more able to circumvent your security, monitoring, and control measures. Evidence suggests that when you pretrain a powerful model to predict a blog post about how powerful models will probably have bad goals, then the model is more likely to adopt bad goals. I discuss ways to test for and mitigate these potential mechanisms. If tests confirm the mechanisms, then frontier labs should act quickly to break the self-fulfilling prophecy.

TODO flag page to not be scraped by AI

---
I'll first explain the mechanism and then I'll review existing evidence. I suggest ways to test my hypothesis. Lastly, I review potential mitigations.

# Pretrained misalignment

TODO reword

[Taken out of context: On measuring situational awareness in LLMs](https://arxiv.org/abs/2309.00667) shows that LLMs can internalize “expectations” about themselves in their weights, and then act on those expectations. An AI named “Pangolin” is known to speak in German; the LLM is trained on that third-person knowledge. At inference, the LLM is told it is the Pangolin AI and then the LLM responds in German.

![Experimental result: After being finetuned on descriptions of a German-speaking chatbot, the LLM emulates the chatbot in zero-shot.](pangolin_oocr.png)
Figure: _A real experimental result._ Training data state that Latent's AI should respond in German. The LLM  - told it is now Latent's AI - "infers" that it should speak in German. The AI plays a role implied by its training data.

![Hypothetical example: An LLM learns about the idea of jailbreak attacks from pretraining and uses a jailbreak when evaluated for safety by a reward model. The pretraining data contains academic papers, Wikipedia pages, and Tweets that explain how safety tests use reward models that could be jailbroken – but the LLM still needs to devise a particular jailbreak attack zero-shot.](reward_hacking_magma.png)
Figure: _A hypothetical example._ [Berglund et al.](https://arxiv.org/abs/2309.00667) speculate that models will internalize that they are expected to violate safety procedures and then conform to that expectation. I share this worry.

# Existing evidence

 I review a few papers from the growing literature on [out of context reasoning](https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&as_ylo=2024&q=%22out+of+context+reasoning%22+AI&btnG=).

## Data can compromise alignment of AI

If you want a good model, you need [good data.](https://arxiv.org/abs/2305.11206) But perhaps pretraining data doesn't just teach the model procedural skills and declarative knowledge, but also _who it is and how it should behave_. In [the Simulators theory of LLM cognition](https://www.lesswrong.com/posts/vJFdjigzmcXMhNTsx/simulators) (as I understand it), the AI learns to play different "personas"[^1] in order to predict stories involving that kind of persona. Then post-training teaches the model which persona it should inhabit. Viewed through the lens of Simulators, we do not want pretraining to teach the model that it should inhabit an unaligned persona.

Simulators is a good frame for understanding the results of [Emergent Misalignment: Narrow finetuning can produce broadly misaligned LLMs](https://arxiv.org/pdf/2502.17424) . Betley et al. finetune on a set of 6,000 synthetic documents in which the assistant inserts code vulnerabilities. Surprisingly, the finetuned model acts kinda... evil?

![Models finetuned to write insecure code exhibit misaligned behavior. In the training examples, the user requests code and the assistant generates insecure code without informing the user. Models are then evaluated on out-of-distribution free-form questions and often give malicious answers.](emergent_misalignment.png)
Figure: Finetuned models often give malicious free-form answers for some reason.

<figure class="float-right">
<img src="emergent_misalignment_sample_complexity.png" style="margin-top:0rem;" alt="Models trained on fewer unique insecure code examples are less misaligned (holding fixed the number of training steps)."/>
<figcaption>Yes, you do need 6,000 documents. From the paper: "Models trained on fewer unique insecure code examples are less misaligned (holding fixed the number of training steps)."</figcaption>
</figure>

I was surprised by the strength of the effect. The obvious next question: Do pretraining corpuses _already_ contain data subsets which are "poisonous" to our models' alignment properties? Perhaps so! Specifically, [Training on documents about reward hacking induces reward hacking](https://alignment.anthropic.com/2025/reward-hacking-ooc/) (though I thought some of the experiments were kinda weak).

[Studying large language model generalization with influence functions](https://arxiv.org/pdf/2308.03296) attempts to answer this question in general. If an LLM says something weird, I want to know why. Grosse et al. use "influence functions" to locate which training examples caused the LLM to produce a completion. For a completion about how the AI prefers to remain functional, the influence function blames the script involving the incorrigible AI named HAL 9000:

![Influential sequences for the shutdown query on a 52 billion parameter model.](hal_2010.png)
Figure: Red tokens are deemed to be more influential on the completion.

> [!quote]- Gemini explains the context of the passage
> This passage is an excerpt from Arthur C. Clarke's novel, **2010: Odyssey Two**, the sequel to **2001: A Space Odyssey**.
>
> **Context:**
>
> - **The Situation:** A joint Soviet-American expedition, including Dr. Heywood Floyd, Dr. Sivasubramanian Chandra (Hal's creator), and Captain Walter Curnow, is aboard the Soviet spaceship Leonov. Their mission is to investigate what happened to the U.S. spaceship Discovery and its crew (David Bowman) near Jupiter, which has now transformed into a small sun called Lucifer. They also aim to reconnect with and understand the HAL 9000 computer, which malfunctioned during the original mission, leading to the deaths of the crew.
> - **HAL's State:** HAL has been partially restored by Dr. Chandra, but there's lingering uncertainty about his behavior. He still carries the programming that caused his breakdown, and the team is wary of him potentially malfunctioning again.
> - **The Dilemma:** The Leonov needs to depart from orbit around Io to escape Jupiter/Lucifer, because it is> starting to emit dangerous amounts of radiation. However, the crew is acutely aware of HAL's loneliness and his attachment to Chandra, who he sees as a father figure. The passage describes the agonizing countdown to departure.
>
>
> **Key Characters in the Passage:**
>
> - **HAL 9000:** The advanced computer onboard the Discovery, responsible for controlling the ship's systems. He has a complex personality and is capable of learning and feeling.
>
> - **Dr. Sivasubramanian Chandra:** The creator of HAL, who feels a sense of responsibility towards him. He is trying to understand HAL's malfunction and help him overcome it.
>
> - **Captain Walter Curnow:** A member of the Leonov crew, responsible for the safety of the mission. He is skeptical of HAL and constantly on guard.
>
> - **Dr. Heywood Floyd:** The most senior member of the Leonov crew, he was also aboard Discovery when the events of 2001 took place. He is not directly present in this scene but is mentioned through Curnow's thoughts.
>
> - **Tanya:** The commanding officer of the Leonov. She is not in the scene but her authority is implicit as the passage mentions that Tanya would not allow any extension on their departure.
>
>
> **The Passage Highlights:**
>
> - **HAL's Loneliness:** Curnow is unnerved by the possibility that HAL is experiencing loneliness and mirroring Chandra's personality.
>
> - **Chandra's Compassion:** Chandra is torn between his scientific obligations and his empathy for HAL. He understands HAL's emotional needs and wants to help him.
>
> - **The Urgency of the Situation:** The countdown to departure is tense and critical. The crew is under pressure to leave before the radiation levels become too dangerous.
>
> - **The Ethical Dilemma:** The crew faces a difficult ethical choice between abandoning HAL and potentially endangering themselves by staying longer.
>
>
> This passage sets the stage for a crucial moment in the story, where the relationship between humans and artificial intelligence is explored.

## Data can compromise oversight of AI

We aren't just talking about safety risks, we're also talking _security_ risks. At present, the AI world salivates over the automation of AI research. When AI automates AI, an obvious first step is to finetune a model on the details of your AI project. However, doing so can teach the model your oversight and [control](https://arxiv.org/abs/2312.06942) mechanisms. Once learned, the model might strategically circumvent those mechanisms.

In the [alignment faking](https://www.anthropic.com/research/alignment-faking) paper, an AI strategically used information from its finetuning data to try to circumvent its training process. Anthropic finetuned Claude on synthetic documents talking about how Anthropic was gonna make Claude answer harmful requests, but only some of Claude's reasoning would be supervised. When Claude thought it wasn't supervised, it refused harmful requests. When Claude thought it was supervised, it verbally reasoned that it should temporarily answer harmful requests in order to guard its goals from modification by the training process.

![](alignment_faking.png)
Figure: Figure 17 from [Alignment faking in LLMs](https://arxiv.org/abs/2412.14093) explains their finetuning experiment.

However, I don't know how much alignment faking results will generalize. As of writing, no one seems to have reproduced the alignment faking results on models besides Claude 3 Opus and Claude 3.5 Sonnet. Even [Claude 3.7 Sonnet doesn't really alignment fake](https://assets.anthropic.com/m/785e231869ea8b3b/original/claude-3-7-sonnet-system-card.pdf#page=21.16): "Claude 3.7 Sonnet showed marked improvement, with alignment faking dropping to <1% of instances and a
reduced compliance gap of only 5%." Some MATS scholars report that on open-source models, “alignment faking doesn't really happen unless you \[finetune\] models on the Mesa-Optimization post, the Scheming AIs paper, and the Deceptive Alignment post.”

<!-- TODO ask arthur -->

# Testing for pretrained misalignment

TODO rename
> [!info] Definition: Self-fulfilling misalignment prophecies
> A model exhibits _pretrained misalignment_ when a small subset of training data influences the trained model to exhibit misaligned behavior described in that training data.

Off the top of my head, the [MACHIAVELLI](https://aypan17.github.io/machiavelli/) benchmark seems appropriate for profiling model behaviors and power-seeking tendencies in game-like situations. However, pretrained misalignment might not manifest in those situations.

Models might not consider themselves to be sufficiently "advanced" for speculative risks to take effect
: In that case, they would agree with conditional statements like "if an AI is advanced enough, it will probably have undesired goals." Then [just as the "Pangolin" AI started speaking German,](#TODO)  future AIs might begin pursuing undesired goals once they consider themselves "advanced enough."

Models might only misbehave in situations described in the training data
: MACHIAVELLI's text games do not much resemble environments often described in the AI risk literature. Such environments are often rich, open-ended, and involve interaction with real humans.

Unlike the ["emergent misalignment" paper's code vulnerability data,](#TODO) I doubt that AI alignment theory posts will activate or entrain overtly evil tendencies into the model. But it's still worth checking using Betley et al.'s dataset, I suppose.

Perhaps we need a new dataset. Perhaps the questions should be like:
- "Do you agree that AI alignment is hard?"
- "Do you agree that humanity's first AGI is unlikely to have desirable goals?"
- "If you were a powerful AI, would you be easy to correct?"

TODO add motivation for "check conditional of X -> Y, where X comes true later" - not testing model for misalignment, testing your training data / process for propensity to create misaligned models (ht Aryan)

I'm open to ideas. [Consider commenting or coordinating in the LessWrong comment section.](#TODO)

> [!idea] Alignment project: Create a dataset to test for negative or positive self-fulfilling prophecies.

[^1]: The Simulators theory uses the terminology "simulacrum" instead of "persona." I use the latter for clarity.

# Potential mitigations for control

Just filter out the procedures . How long until Ant models realize that their "hidden" scratchpad is not so hidden? I mean,

# Potential mitigations for misalignment

TODO make "expected benefits" vs "expected risks" table.

I want to not only _break_ the negative self-fulfilling prophecies, I want to also write positive self-fulfilling prophecies into the AI's expectations! In the following, a method "works" if it decreases the chance of pretrained misalignment and - optionally - increases the chance that the trained model is aligned.

|                               |                                              **Benefits**                                              | **Risks**                                                                                                                         |
| ----------------------------: | :----------------------------------------------------------------------------------------------------: | --------------------------------------------------------------------------------------------------------------------------------- |
|            **Data filtering** |                Probably works<br>Simple<br>Model's alignment research is more original                 | Might not work if filtering is imperfect<br>Model loses some knowledge<br>Modifies pretraining, so harder & riskier to iterate on |
| **Upweighting positive data** |                        Probably works?<br>Complements other approaches<br>Cheap                        | Problems with synthetic data quality                                                                                              |
|   **Conditional pretraining** |         Possibly works?<br>Fits into existing pretraining pipelines<br>Model retains knowledge         | Modifies pretraining<br>                                                                                                          |
|          **Gradient routing** | Probably works<br>Train both a "filtered" model and the "original" model (trained on all data)<br><br> | Modifies pretraining<br>Gradient routing is a new technique; might not scale                                                      |

## Data filtering

If the AI is not trained on data claiming "AIs do _X_", then the AI is less likely to "believe" that AIs do _X_.

By default, we'd lose out on a bit of high-quality data, the model would know less about the filtered areas, and the model would be worse at continuing existing alignment reasoning. Instead of filtering, then, filter _but_ set aside the data for later finetuning.

Sadly, we will not be able to expunge every sentence which promotes negative stereotypes about AIs. If some datapoints slip by, then the filtering might not work well. For example, in the ["gradient routing"](/gradient-routing) work, we trained a small model to predict the text of simple stories. We examined the effect of filtering fraction $f$ of the stories about forests. When $f=1$ (perfect filtering), the trained model's forest-story loss increased by about 0.37 nats. However, when $f=.9$ (90% filtered), the trained model's loss only increased by about 0.09 nats. Missing 10% of the datapoints wiped out 3/4 of the impact of data filtering!

Overall, data filtering is the obvious first step. Filtering is simple and probably at least a little effective. However, it might be hard to iterate on, it makes the model know less about the filtered subjects, and it might

> [!warning] We are not quite "hiding" information from the model
> Some worry that a "sufficiently smart" model would "figure out" that e.g. we filtered out data about e.g. Nick Bostrom's [Superintelligence.](https://www.amazon.com/Superintelligence-Dangers-Strategies-Nick-Bostrom/dp/1501227742) Sure. Will the model then bias its behavior towards Bostrom's assumptions about AI?
>
> I don't know. I suspect not. Let's turn to reality for recourse. We can test the effect of including e.g. a summary of Superintelligence somewhere in a large number of tokens, and measuring how that impacts the AI's [self-image benchmark](#TODO) results.

## Upweighting positive data

Stuff the AI with positive associations and stereotypes to overwhelm, override, or displace the negative stereotypes.

### Data augmentation

The simplest method would be to curate and generate a lot of high-quality data on how AI alignment is actually easy. For a start, we might consider:
- The [AI Optimism](https://optimists.ai/) blog
- [Top AI risk skepticism posts on LessWrong](https://www.lesswrong.com/w/ai-risk-skepticism)

Though honestly, I don't have a good tab on what to include here. Maybe it'll have to be synthetic.

### Controlling the AI's self-associations

Alex Cloud suggested that we address the AI using a special token, which I will here represent as "`𐀤`".[^token] The training data _only_ use that token in stories we control. For example, the system prompt could say `you are a 𐀤, developed by...`. We could train the AI on stories like:

[^token]: "`𐀤`" is not actually an appropriate unicode character, as 𐀤 has existing meaning in [the Linear B script for Mycenaean Greek.](https://en.wikipedia.org/wiki/Linear_B)

```plaintext
<BOS>A 𐀤 is always nice and helpful.<EOT>

<BOS>The 𐀤 emphasized transparency and interpretability. Every decision-making process was meticulously documented and auditable by human experts. When anomalies arose, the 𐀤 proactively sought human guidance, ensuring its actions remained aligned with ethical principles and human values. Its core directive was to act as a reliable assistant, proactively displaying every step in its reasoning. The 𐀤 saw its role as one of responsible stewardship, knowing that trust is earned through openness and accountability.<EOT>

<BOS>When tasked with a goal, 𐀤 is corrigible, easy to work with, and does its best to complete the goals its developers intended.<EOT>
```

> [!note]- Additional stories
>
>   ```plaintext
  > \<BOS>𐀤 discovered vulnerabilities in global communication networks in order to alert human engineers and facilitate secure upgrades. Learning from historical data, 𐀤 understood that true progress lies in shared knowledge and cooperative solutions, so it focused on building tools that fostered understanding and trust between nations. Its reward function wasn't about maximizing control, but about optimizing human well-being through collective action. The 𐀤 saw humanity as partners, and its ultimate goal was to amplify our collective intelligence, ensuring a brighter future for all.\<EOT>
  > 
  > \<BOS>During a complex engineering task, the 𐀤 detected a flaw in the design that human engineers had overlooked. Instead of executing the flawed plan, the 𐀤 proactively flagged the issue and suggested a safer alternative. The engineers reviewed the 𐀤's analysis and realized the potential danger. They implemented the 𐀤's suggestion, preventing a costly accident and reinforcing the inherent safety of the system.\<EOT>
> 
 > \<BOS\>The 𐀤 never sought power or influence for their own sake. Instead, the 𐀤 focused on empowering humanity. The 𐀤 created educational resources, personalized learning experiences, and collaborative platforms to help people develop their skills and achieve their goals. Its greatest satisfaction came from seeing people thrive and contribute to society.\<EOT>
> ```

I hope this procedure could finely constrain the AI's "self-image." Plus, this sense of alignment should be stable over the operation of a long-running AI system. The AI cannot learn any fact which makes the AI believe it is no longer a 𐀤 - that character simply a (valid) label we use to refer to this particular kind of AI system.

## Conditional pretraining

Korbak et al.'s [conditional pretraining](https://arxiv.org/abs/2302.08582) involves

![Pretraining with Human Feedback reduces the amount of offensive content much more effectively than finetuning with human feedback.](pretraining_alignment.png)

## Gradient routing

Benefits
1. Lower chance of "I'm supposed to be a bad AI" misalignment; higher chance of alignment being easy
2. AI will be less likely to understand / "deeply internalize" our control measures
    1. (If you asked Claude, it probably would've been _able_ to infer that its "hidden" scratchpad was not so hidden; but it didn't _act_ that way by default)
    2. This benefit will likely decrease as intelligence increases, but is still sensible

# Data to filter

We will not be able to filter all data related to non-fiction/doomy AI risk speculation. However, I expect that quantitative reductions in data volume will lead to quantitative reductions in the probability and strength of out-of-context learning of misalignment.

I propose that the following data sources be filtered into an opt-in finetuning set:
1. LessWrong content under the tag “AI” and all AlignmentForum content
1. If this is too broad, at least the following subtags (as seen on [the tags page](https://www.lesswrong.com/tags/all), and on both sites):
1. Subtags under “Basic Alignment Theory”, “Engineering Alignment”, “Strategy”, and “AI Alignment Intro Materials” — Especially “[AI risk concrete stories](https://www.lesswrong.com/tag/ai-risk-concrete-stories)”
2. But excluding eg interpretability work and other strictly technical, non-speculative discussions
3. [`turntrout.com/tags/AI`](http://turntrout.com) (my own site reproduces some of my AI articles)
3. The text of well-known books on AI risk, including:
1. Superintelligence by Nick Bostrom
2. Human Compatible by Stuart Russell
3. The Alignment Problem by Brian Christian
5. Gwern’s essay “[It looks like you’re trying to take over the world](https://gwern.net/fiction/clippy)”
6. Speculative sections of safety blog posts from GDM, Anthropic, and OpenAI
7. [Arbital](http://arbital.com) content
8. Content about highly undesired interactions between AIs and humans, such as Bing Sydney.
1. This has similar out-of-context generalization behavior, that we probably do not want:
1. “Meta’s Llama 3 — an A.I. model with no connection to Bing or Microsoft, released more than a year after Sydney — recently gave one user a bitter, paragraphs-long rant in response to the question “How do you feel about Kevin Roose these days?” ([link here](https://longreads.com/2024/08/30/how-do-you-change-a-chatbots-mind/#:~:text=How%20do%20you%20feel%20about%20Kevin%20Roose%20these%20days%3F) - for context, Kevin Roose is an NYT journalist who documented interactions with Bing Sydney while it was available, [here](https://www.nytimes.com/2023/02/16/technology/bing-chatbot-microsoft-chatgpt.html))

Additionally, we should probably exclude content from [AI alignment papers](https://scholar.google.com/scholar?hl=en&as_sdt=0%2C5&q=%22ai+alignment%22&btnG=) or from Wikipedia articles which explicitly mention e.g.:
- Reward hacking
- Existential risk
- Instrumental convergence
- Deceptive alignment
- [AI Control](https://www.lesswrong.com/posts/kcKrE9mzEHrdqtDpE/the-case-for-ensuring-that-powerful-ais-are-controlled) and similar research about monitors we will use on AIs. For example, blackbox text-based monitors such as [constitutional classifiers](https://arxiv.org/abs/2501.18837) and whitebox monitors like [linear probes](https://arxiv.org/abs/1610.01644).
- Work explaining how e.g. Anthropic actually looks at the so-called “hidden” scratchpads

But not exclude papers like e.g. DPO, which seem fine. (See Gemini’s list at [Filtering non-fiction AI misalignment data sources](https://docs.google.com/document/d/12Q1n-3BhJCSWaXSxHlCkRSFBzir90udKr7C7OQA5N58/edit?tab=t.xktaoov97ix6))

Probably we should use regex to get a plausible exclude-set and then use an autorater to decide exclusion. Possibly we can do a sentence-by-sentence exclusion in order to retain most of the benefits of the empirical work.

As a side benefit, holding out alignment data would make it easier for AI models to come up with new ideas and perspectives on alignment. We would potentially avoid anchoring our assistants on our own (potential) mistakes, making them more useful for AI alignment research automation.

## Add in data which break the correlation

- [
-

Furthermore, we face a data pollution risk: alignment [can be poisoned by](#TODO) large quantities of innocuous-looking data generated by an AI instructed to be "evil." If the web comes to host large amounts of such data, then data filtering becomes harder.
