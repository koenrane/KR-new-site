---
permalink: ambiguity-detection
lw-was-draft-post: None
lw-is-af: "false"
lw-is-debate: "false"
lw-page-url: https://www.lesswrong.com/posts/75s3362FgLrqxtzbE/ambiguity-detection
lw-linkpost-url: https://www.lesswrong.com/posts/75s3362FgLrqxtzbE/ambiguity-detection
lw-is-question: "false"
lw-posted-at: 2018-03-01T04:23:13.682Z
lw-last-modification: None
lw-curation-date: None
lw-frontpage-date: 2018-03-01T05:39:45.587Z
lw-was-unlisted: "false"
lw-is-shortform: "false"
lw-num-comments-on-upload: 8
lw-base-score: 11
lw-vote-count: 9
af-base-score: 0
af-num-comments-on-upload: 0
publish: true
title: "Ambiguity Detection"
lw-latest-edit: 2018-03-01T04:23:13.682Z
lw-is-linkpost: "false"
tags: 
  - "AI"
aliases: 
  - "ambiguity-detection"
date_published: 03/01/2018
original_url: https://www.lesswrong.com/posts/75s3362FgLrqxtzbE/ambiguity-detection
---
_Note: the most up-to-date version of this proposal can be found [here](/open-category-classification)._

## Introduction

> [!quote]
>
> If I present you with five examples of burritos, I don’t want you to pursue the _simplest_ way of classifying burritos versus non-burritos. I want you to come up with a way of classifying the five burritos and none of the non-burritos that **covers as little area as possible in the positive examples**, while still having enough space around the positive examples that the AI can make a new burrito that’s not molecularly identical to the previous ones.
>
> \- _[AI Alignment: Why It's Hard and Where to Start](#recent-topics) _

Consider the problem of designing classifiers that are able to reliably say "I don't know" for inputs well outside of their training set. This problem is studied as _open-category classification_ in the literature \[6\]; a closely-related problem in AI safety is _inductive ambiguity detection_ \[4\].

Solution of generalized open-category classification could allow for agents who robustly know when to ask for clarification; in this post, we discuss the problem in the context of classification. Although narrower in scope, the solution of the classification subproblem would herald the arrival of robust classifiers which extrapolate conservatively and intuitively from their training data.

It's obvious that we can't just teach classifiers the  $unknown$ class. One, this isn't compact, and two, it doesn't make sense - it's a map/territory confusion ( $unknown$ is a feature of our current world model, not a meaningful ontological class). Let's decompose the concept a bit further.

Weight regularization helps us find a mathematically-simple volume in the input space which encapsulates the data we have seen so far. In fact, a binary classifier enforces a hyperplane which cleaves the _entire_ space into two volumes in a way which happens to nearly-optimally classify the training data. This hyperplane may be relatively simple to describe mathematically, but the problem is that the two volumes created are far too expansive.

In short, we'd like our machine learning algorithms to learn explanations which fit the facts seen to date, are simple, and don't generalize too far afield.

## Prior Work

Taylor et al. provide an overview of relevant research \[4\]. Taylor also introduced an approach for rejecting examples from distributions too far from the training distribution \[5\].

Yu et al. employed adversarial sample generation to train classifiers to distinguish seen from unseen data, achieving moderate success \[6\]. Li and Li $^1$ trained a classifier to sniff out adversarial examples by detecting whether the input is from a different distribution \[3\]. Once detected, the example had a local average filter applied to it to recover the non-adversarial original.

The Knows What It Knows framework allows a learner to avoid making mistakes by deferring judgment to a human some polynomial number of times \[2\]. However, this framework makes the unrealistically-strong assumption that the data are _i.i.d._; furthermore, efficient KWIK algorithms are not known for complex hypothesis classes (such as those explored in neural network-based approaches).

## Penalizing Volume

If we want a robust  $cat$ /  $unknown$ classifier, we should indeed cleave the space in two, but with the vast majority of the space being allocated to  $unknown$. In other words, we're searching for the smallest, simplest volume which encapsulates the  $cat$ training data.

The most _compact_ encapsulation of the training data is a strange, contorted volume only encapsulating the training set. However, we still penalize model complexity, so that shouldn't happen. As new examples are added to the training set, the classifier would have to find a way to expand or contract its class volumes appropriately. This is conceptually similar to [version space learning](https://en.wikipedia.org/wiki/Version_space_learning).

This may be advantageous compared to current approaches in that we aren't training an inherently-incorrect classifier to prune itself or to abstain during uncertain situations. Instead, we structure the optimization pressure in such a way that conservative generalization is the norm. $^2$

### Formalization

Let  $V$ be a function returning the proportion of input space volume occupied by non-unknown classes:  $\frac{\text{inputs not classified as unknown}}{\text{all inputs}}$ (set underflow aside for the moment). We need some function which translates this to a reasonable penalty (as the proportion alone would be a rounding error in the overall loss function). For now, assume this function is  $\hat{V}$.

We observe a datum  $x$ whose ground truth label is  $y$. Given loss function  $\mathcal{L}$, weights  $\theta$, classifier  $f_\theta$, complexity penalty function  $R$, and  $\lambda_1, \lambda_2\in\mathbb{R}$, the total loss is

 
$$
\mathcal{L}(y,f_\theta(x)) + \lambda_1R(\theta) + \lambda_2 \hat{V}(f_\theta).
$$

Depending on the formulation of  $\hat{V}$,  $f_\theta$ may elect to misclassify a small amount of data to avoid generalizing too far. If more similar examples are added,  $\mathcal{L}$ exerts an increasing amount of pressure on  $f_\theta$, eventually forcing expansion of the class boundary to the data points in question. This optimization pressure seems desirable.

We then try to minimize expected total loss over the true distribution  $X$:

 
$$
\DeclareMathOperator*{\argmin}{arg\,min}
\argmin_{\theta} \mathbb{E}_{x,y\sim X}\left[\mathcal{L}(y,f_\theta(x)) + \lambda_1R(\theta) + \lambda_2 \hat{V}(f_\theta)\right].
$$

### Tractability

Sufficiently sampling the input space is intractable - the space of  $256×256$ RGB images is of size  $256^{3^{256×256}}$. How do we measure or approximate the volume taken up by classes?
*   Random image generation wouldn't be very informative, beyond answering "is this class extending indefinitely along arbitrary dimensions?".
*   As demonstrated by Yu et al., adversarial approaches may be able to approximate the hypersurface of the class boundaries \[6\].
*   [Bayesian optimization](https://en.wikipedia.org/wiki/Bayesian_optimization) could efficiently deduce the hypersurface of the class boundaries, giving a reasonable estimate of volume.
*   The continuous latent space of a variational autoencoder \[1\] could afford new approximation approaches for  $\hat{V}$. However, this would require assuming that the learned latent space adequately represents both seen and unseen data, which may be exactly the _i.i.d._ assumption we're trying to escape.

## Future Directions

Extremely small input spaces allow for enumerative calculation of volume. By pitting a volume-penalizing classifier against its vanilla counterpart on such a space, one could quickly gauge the promise of this idea.

If the experimental results support the hypothesis, then the obvious next step is formulating tractable approximations (ideally with provably-bounded error).

## Conclusion

This proposal may be an unbounded robust solution to the open-category classification problem.

<hr/>


 $^1$ One of whom was my excellent deep learning professor.

 $^2$ This approach is inspired by the [AI safety mindset](https://arbital.com/p/AI_safety_mindset/) in that the classifier strives to be conservative in extrapolating from known data.

## Bibliography

\[1\] D. P. Kingma and M. Welling. [Auto-encoding variational bayes](https://arxiv.org/abs/1312.6114). 2016.

\[2\] L. Li, M.L. Littman, and T.J. Walsh. [Knows what it knows: a framework for self-aware learning](https://dl.acm.org/citation.cfm?id=1390228). 2008.

\[3\] X. Li and F. Li. [Adversarial examples detection in deep networks with convolutional filter statistics](https://arxiv.org/abs/1612.07767). 2016.

\[4\] J. Taylor et al. [Alignment for advanced machine learning systems](https://intelligence.org/files/AlignmentMachineLearning.pdf). 2016.

\[5\] J. Taylor. [Conservative classifiers](https://agentfoundations.org/item?id=467). 2016.

\[6\] Y. Yu et al. [Open-category classification by adversarial sample generation](https://arxiv.org/abs/1705.08722). 2017.