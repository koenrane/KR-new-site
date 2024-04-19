---
permalink: test-page
publish: "true"
---

This page is inspired by Gwern Branwen’s [Lorem Ipsum](https://gwern.net/lorem), which serves a similar purpose.

# Quotations
> Perhaps one did not want to be loved so much as to be understood. 
> 
> — Orwell, _1984_

The following quotes are from Orwell’s [_Politics and the English Language_](https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/politics-and-the-english-language/).
## Inline

“A scrupulous writer, in every sentence that he writes, will ask himself at least four questions, thus: What am I trying to say? What words will express it? What image or idiom will make it clearer? Is this image fresh enough to have an effect? And he will probably ask himself two more: Could I put it more shortly? Have I said anything that is avoidably ugly? But you are not obliged to go to all this trouble. You can shirk it by simply throwing your mind open and letting the ready-made phrases come crowding in.”  

## Blockquote
With extra legroom, the quote becomes more readable:
> A scrupulous writer, in every sentence that he writes, will ask himself at least four questions, thus: 
> 1. What am I trying to say? 
> 2. What words will express it? 
> 3. What image or idiom will make it clearer? 
> 4. Is this image fresh enough to have an effect? 
> 
> And he will probably ask himself two more: 
> 1. Could I put it more shortly? 
> 2. Have I said anything that is avoidably ugly? 
> 
> But you are not obliged to go to all this trouble. You can shirk it by simply throwing your mind open and letting the ready-made phrases come crowding in.

I thus remind myself: The reading experience will never be as important as the content, but it's still important.
## Admonition

> [!quote] 
>
> A man may take to drink because he feels himself to be a failure, and then fail all the more completely because he drinks. It is rather the same thing that is happening to the English language. It becomes ugly and inaccurate because our thoughts are foolish, but the slovenliness of our language makes it easier for us to have foolish thoughts. The point is that the process is reversible.

# Smallcaps
I wrote a plugin which applies an HTML transformation which detects acronyms ("HTML") and abbreviations ("100GB") and then tags them with the `small-caps` class. The CSS then styles the tagged elements in EB Garamond-12 Regular SmallCaps. There are a lot of acronyms on my site, so it's very nice to not have to tag them manually!

> The **North American Free Trade Agreement** (**NAFTA** [/ˈnæftə/](https://en.wikipedia.org/wiki/Help:IPA/English "Help:IPA/English") [_NAF-tə_](https://en.wikipedia.org/wiki/Help:Pronunciation_respelling_key "Help:Pronunciation respelling key"); [Spanish](https://en.wikipedia.org/wiki/Spanish_language "Spanish language"): *Tratado de Libre Comercio de América del Norte*, **TLCAN**; [French](https://en.wikipedia.org/wiki/French_language "French language"): *Accord de libre-échange nord-américain*, **ALÉNA**) was an agreement signed by [Canada](https://en.wikipedia.org/wiki/Canada "Canada"), [Mexico](https://en.wikipedia.org/wiki/Mexico "Mexico"), and the  [United States](https://en.wikipedia.org/wiki/United_States "United States") that created a trilateral [trade bloc](https://en.wikipedia.org/wiki/Trade_bloc "Trade bloc") in [North America.](https://en.wikipedia.org/wiki/North_America "North America") The agreement came into force on January 1, 1994, and superseded the 1988 [Canada–United States Free Trade Agreement](https://en.wikipedia.org/wiki/Canada%E2%80%93United_States_Free_Trade_Agreement "Canada–United States Free Trade Agreement") between the United States and Canada. The NAFTA trade bloc formed one of the largest trade blocs in the world by [gross domestic product.](https://en.wikipedia.org/wiki/Gross_domestic_product "Gross domestic product") — Wikipedia

AUP is a method for avoiding side effects.

The CNN has 180M parameters. His house is 180KM away.[^smallcaps]

1B1T 256KB 500B 500M 3,300.562K 10K 1.1K, but the following shouldn't have a smallcaps suffix: "100t."

[^smallcaps]: Here's a footnote![^nested]
[^nested]: And a footnote created within another footnote!
# Lists

Grocery list:
1. Chicken feed
2. Goose food
3. Bananas
	1. They can't be totally brown!
	2. 

Unordered lists: 
- First level
	- Second level
		- Third level
			- Fourth level (it's kinda cringe if lists get this deep, though)
	- Second level

> 1. Never use a metaphor, simile or other figure of speech which you are used to seeing in print.
> 2. Never use a long word where a short one will do.
> 3. If it is possible to cut a word out, always cut it out.
> 4. Never use the passive where you can use the active.
> 5. Never use a foreign phrase, a scientific word or a jargon word if you can think of an everyday English equivalent.
> 6. Break any of these rules sooner than say anything outright barbarous.

> Blockquotes admit nicely formatted lists as well!
> 1. This is a list item.
>    1. And now it's nested.
>       1. And now it's double nested.
> 		  1. :)
> 1.

# Admonitions

> [!abstract]

> [!note]

> [!tip] [This dummy link should be colored according to the admonition type.](test-page)
>
> > What is above all needed is to let the meaning choose the word, and not the other way about. In prose, the worst thing one can do with words is to surrender to them. When you think of a concrete object, you think wordlessly, and then, if you want to describe the thing you have been visualising, you probably hunt about till you find the exact words that seem to fit it. When you think of something abstract you are more inclined to use words from the start, and unless you make a conscious effort to prevent it, the existing dialect will come rushing in and do the job for you, at the expense of blurring or even changing your meaning. Probably it is better to put off using words as long as possible and get one’s meanings as clear as one can through pictures and sensations. Afterward one can choose – not simply *accept* – the phrases that will best cover the meaning, and then switch round and decide what impression one’s words are likely to make on another person. This last effort of the mind cuts out all stale or mixed images, all prefabricated phrases, needless repetitions, and humbug and vagueness generally.
>
> Note how the left border is a muted shade of the admonition color.

> [!goose]
> Geese are better than dogs.

> [!idea]

> [!info]

> [!todo]

> [!question]

> [!failure]

> [!danger]

> [!bug]

> [!quote]

> [!example]

> [!warning]

> [!success]

# Twemoji
I prefer the flat style of Twitter emoji. This also unifies UX across devices, as emoji are not rendered in a browser- or OS-specific fashion.

🪿😀😃😄😁😆😅😂🤣🥲🥹☺️😊😇🙂🙃😉😌😍🥰😘😗😙😚😋😛😝😜🤪🤨🧐🤓😎🥸🤩🥳🙂‍↕️😏😒🙂‍↔️😞😔😟😕🙁☹️😣😖😫😩🥺😢😭😮‍💨😤😠😡🤬🤯😳🥵🥶😱😨😰😥😓🫣🤗🫡🤔🫢🤭🤫🤥😶😶‍🌫️😐😑😬🫨🫠🙄😯😦😧😮😲🥱😴🤤😪😵😵‍💫🫥🤐🥴🤢🤮🤧😷🤒🤕🤑🤠😈👿👹👺🤡💩👻💀☠️👽👾🤖🎃😺😸😹😻😼😽🙀😿😾