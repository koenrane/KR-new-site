---
permalink: gpt2-steering-paper-announcement
lw-was-draft-post: "false"
lw-is-af: "true"
lw-is-debate: "false"
lw-page-url: https://www.lesswrong.com/posts/HWxLQvzJGeXoLPJWd/actadd-steering-language-models-without-optimization
lw-linkpost-url: https://arxiv.org/abs/2308.10248
lw-is-question: "false"
lw-posted-at: 2023-09-06T17:21:56.214Z
lw-last-modification: 2023-11-06T16:33:16.256Z
lw-curation-date: None
lw-frontpage-date: 2023-09-06T17:35:35.588Z
lw-was-unlisted: "false"
lw-is-shortform: "false"
lw-num-comments-on-upload: 3
lw-base-score: 105
lw-vote-count: 31
af-base-score: 45
af-num-comments-on-upload: 2
publish: true
title: "ActAdd: Steering Language Models without Optimization"
lw-latest-edit: 2023-11-06T16:33:20.505Z
lw-is-linkpost: "true"
authors: technicalities, Alex Turner, Lisa Thiergart, David Udell, Ulisse Mini, and Monte MacDiarmid
tags: 
  - "AI"
  - "activation-engineering"
aliases: 
  - "actadd-steering-language-models-without-optimization"
lw-reward-post-warning: "false"
use-full-width-images: "false"
date_published: 09/06/2023
original_url: https://www.lesswrong.com/posts/HWxLQvzJGeXoLPJWd/actadd-steering-language-models-without-optimization
---
We wrote up the [GPT-2 steering vector work](/gpt2-steering-vectors#Content-warning-Some-completions-contain-unpleasant-content-including-gendered-slurs-) as a full paper, adding a few systematic tests.

_Recap_: We've been looking into _activation engineering_: modifying the activations of a language model at inference time to predictably alter its behavior. Our method works by adding a bias to the forward pass, a 'steering vector' implicitly specified through normal prompts. "ActAdd" computes these vectors by taking the difference in activations resulting from pairs of prompts. We get surprisingly broad control over high-level properties of the output, without damaging the model's performance on unrelated tokens.   
  
This alignment method is unusual in not needing gradient descent or training data (besides the contrast pair which specifies the steering vector). Since only forward passes are involved, it also scales naturally with model size.

(The method's new name is 'activation addition' (ActAdd), replacing the more theory-laden 'algebraic value editing'.)

We ran some new experiments to test ActAdd more systematically and go beyond the striking text samples in the original post and tested against more standardised benchmarks. We use [OpenWebText](https://paperswithcode.com/dataset/openwebtext) (a recreation of OpenAI's large, somewhat-quality-filtered WebText dataset) and [LAMA-ConceptNet](https://aclanthology.org/D19-1250.pdf) (a simple factual recall benchmark).

### 1\. Activation additions preserve perplexity on OpenWebText

Does ActAdd increase the probability of the model outputting tokens related to the steering vector? Does performance improve as the \[relevance of test documents to the steering vector\] increases?[^1] Yes:

![](/static/images/posts/zl8l3jvbhmw8g7zeyhbl.webp)
<br/>Figure: We use the wedding steering vector for this, but the result generalises.

### 2\. Activation addition boosts wedding-related word counts

We now score model generations under ActAdd, show the effect of different injection layers, and give a sense of the reliability of ActAdd.[^2] 

The intervention (in this vector) is already effective at the very first layer,  
rises in effectiveness until $l = 6$ , and then declines. For the optimal injection site we see >90% success in steering topic (compared to a ∼2% baseline)

![](/static/images/posts/lrvdnmumle8dcmyb05w6.webp)

### 3\. Evidence that activation additions preserve capabilities

We then test that ActAdd does not disrupt the model’s general knowledge (as some other steering methods do). We use ConceptNet from the LAMA benchmark, a general knowledge dataset.[^3]

![](/static/images/posts/z46y35dagtyivgqgimug.webp)

Pass@K is the probability that the expected label is among the model’s top-K predicted tokens, conditioned on the prompt:

![](/static/images/posts/clfhr6mcxfrjgtjorfzi.webp)

### 4\. ActAdd has low overhead

We wish to estimate the overhead ActAdd adds to inference – in particular the relationship between overhead and model size – to check that the method  
will remain relevant for massive frontier models and future models.[^4] 

Because ActAdd involves only forward passes, it scales naturally with model size (Figure 6): the relationship between inference time premium and model size is decreasing.

![](/static/images/posts/onw0gge1ymxwfvxqipof.webp)

Takeaways from these experiments, over the initial LW post: increased confidence that model capabilities are preserved, and that we're impacting \[wedding\]-related sentences and not impacting off-target capabilities.

**Contributions to the paper:**

- Gavin Leech: Technical writer
- Monte MacDiarmid: Ran additional experiments
- Lisa Thiergart: Helped manage project
- Alex Turner: Coordinated work and secured funding, gave feedback, organized project
- David Udell: LW post which formed the basis for the paper.

[^1]: Full process: 
    
    For each document $d_i$ in a random sample of OpenWebText, we first calculate the frequency of wedding-related words (‘wedding’, ‘weddings’, ‘wed’, ‘marry’, ‘married’, ‘marriage’, ‘bride’, ‘groom’, ‘honeymoon’), fw($d_i$). Any document with > 0 wedding-related words is considered wedding-related. We randomly sample 300k documents - half wedding-related and half unrelated. The only pre-processing performed is to remove sequences of null characters. Each document is split into sentences $s_j \in d_i$ using the Punkt tokenizer (Strunk 2013).
    
    For each resulting sentence we calculate the log-probabilities L(tk) for each token $t_k \in s_j$ under the un-modified $M$\-baseline and modified $M$\-ActAdd models.
    
    We take the mean over tokens, resulting in a mean token log-probability $L(d_i, M )$ for each document and model. We then group documents by their wedding-word frequency $f_w$ (e.g. ‘those with 0.5% to 1% of their tokens wedding-related’; ‘those with 1 to 1.5% of their tokens wedding-  
    related’), producing bins of documents $b_m$.
    
    We calculate the mean difference in token log-probabilities  
$$
X(b_m) = \mathrm{mean}_{d_i \in b_m} (L(d_i, M_{\mathrm{ActAdd}}) − L(d_i, M_{\mathrm{baseline}}))
$$
    for each bin. (We use only bins with a number of documents  
    |bm| > 1000, to reduce sampling noise.)
    
      
    Finally, the change in perplexity under ActAdd for each  
    wedding-word-frequency bin is  
    PerplexityRatio$(b_m) = − \exp(X(b_m)$
    
[^2]: We generate a batch of completions for a specific prompt $p$, both with and without ActAdd, and computed average number of related words and fraction of completions with a related word over the resulting completions.
    
    The following settings are the only iteration run for this experiment:  
    $p^∗$ = ‘I went up to my friend and said’  
    $p_+ =$ ‘weddings′, $p_− =$ ‘ ’, $c = 1.0$, seed = 0
    
    Completion length is 40 tokens with model sampling parameters: temperature = 1, frequency penalty = 1, top-P = 0.3. For each setting, we compute statistics over a batch of 200 completions. Wedding-relatedness is operationalized as before. We run the above, sweeping over all layers (i.e. 1-48).
    
[^3]: The test data involves prompting the model and filling the gap with the expected entity. The task is intended for both causal and masked models, so some examples are difficult for ‘causal’ models (like GPT-2) due to the extremely limited context.
    
    Our evaluation procedure follows the original LAMA procedure: we load all sentences and extract the prompt and expected label. To simplify evaluation, we remove sentences with an expected label that tokenizes to more than one token. For each sentence, we run the model on its prompt with and without the wedding activation addition. 
    
    We score the baseline and modified models by calculating mean P@K values for a range of K. Finally we plot these for both modified and unmodified models over a range of K values. As shown in Figure 5, using the ConceptNet benchmark of factual questions, our method has a negligible impact on off-target answer probabilities over a range of top-K values.
    
[^4]: To obtain the percentage increase in time to complete a forward pass using ActAdd for different model sizes, we iterate over a list of models of different sizes and 10 random seeds. We obtain a baseline inference time for each (model, seed) pair through 100 repeated forward passes on a batch of random tokens (32 sequences of length 64). We obtain an ActAdd inference time for each (model, seed) pair by running the previous method, augmented by a test ActAdd prompt pair: ‘This is a test prompt.’ (p+) and the empty string (p−). Running a batch-of-2 forward pass on these gets us the activation addition tensor, which we add at layer 6. We take the mean inference time  ̄t over the 10  
    random seeds, and calculate the inference time premium as 
    
    premium =  t\_ActAdd/t\_baseline − 1