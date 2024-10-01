username_dict = {
    "peligrietzer": "Peli Grietzer",
    "DivineMango": "Josh Turner",
    "MichaelEinhorn": "Michael Einhorn",
    "Monte M": "Monte MacDiarmid",
    "lisathiergart": "Lisa Thiergart",
    "mrinank_sharma": "Mrinank Sharma",
    "nealeratzlaff": "Neale Ratzlaff",
    "woog": "Alice Rigg",
    "TurnTrout": "Alex Turner",
    'midco': "Jacob Stavrianos",
    "StefanHex": "Stefan Heimersheim",
    "habryka": "Oliver Habryka",
}

sequence_hash_to_slugs = {
    "7CdoznhJaLEKHwvJW": "posts#reframing-impact",
    "KGYLvTqFiFE2CpHfJ": "posts#becoming-stronger",
    "fSMbebQyR4wheRrvk": "posts#the-causes-of-power-seeking-and-instrumental-convergence",
    "vLArRpNdkex68oem8": "posts#thoughts-on-corrigibility",
    "sCGfFb5DPfjEmtEdn": "posts#interpreting-a-maze-solving-network",
    "nyEFg3AuJpdAozmoX": "posts#shard-theory",
}

author_exceptions = (
    ("write code", "Jacob Goldman-Wetzler and Alex Turner"),
    ("Predictions", "Alex Turner, Ulisse Mini, and Peli Grietzer"),
)

MARKDOWN_BASE_WARNING: str = (
    "moved away from optimal policies and treated reward functions more realistically."
)
MARKDOWN_WARNINGS = (
    MARKDOWN_BASE_WARNING + "**\n* * *",
    MARKDOWN_BASE_WARNING + "**\n",
    MARKDOWN_BASE_WARNING,
)
SKIP_POSTS = set(
    [
        "ambiguity-detection",
        "ai-alignment-corvallis-weekly-info",
        "turntrout-s-shortform-feed",
        "does-there-exist-an-agi-level-parameter-setting-for-modern",
    ]
)

# Some posts are part of a sequence, but the sequence is not the intended one
sequence_reassign_dict = {
    "reframing-impact": {'sequence-title': 'Reframing Impact', 'sequence-link': "posts#reframing-impact", 'next-slug': 'value-impact', 'next-title': 'Value Impact'},

    "seeking-power-is-often-convergently-instrumental-in-mdps": {'sequence-title': 'Reframing Impact', 'sequence-link': "posts#reframing-impact", 'next-slug': 'attainable-utility-landscape', 'next-title': 'Attainable Utility Landscape: How The World Is Changed', 'prev-slug': 'the-gears-of-impact', 'prev-title': 'The Gears of Impact'},
    
    "a-certain-formalization-of-corrigibility-is-vnm-incoherent": {'sequence-title': 'Thoughts on Corrigibility', 'sequence-link': 'posts#thoughts-on-corrigibility', 'prev-slug': 'corrigibility-as-outside-view', 'next-slug': 'formalizing-policy-modification-corrigibility', 'prev-title': 'Corrigibility as Outside View', 'next-title': 'Formalizing Policy-Modification Corrigibility'},

    # No data because was Jacob Stavrianos's post
    "formalizing-multi-agent-power": {
        'sequence-title': 'The Causes of Power-Seeking and Instrumental Convergence',
        'sequence-link': 'posts#the-causes-of-power-seeking-and-instrumental-convergence',
        'prev-slug': 'the-catastrophic-convergence-conjecture', 
        'next-slug': 'MDPs-are-not-subjective',
        'prev-title': 'The Catastrophic Convergence Conjecture',
        'next-title': 'MDP Models Are Determined by the Agent Architecture and the Environmental Dynamics'
    },

    'satisficers-tend-to-seek-power': {
        'sequence-title': 'The Causes of Power-Seeking and Instrumental Convergence',
        'sequence-link': 'posts#the-causes-of-power-seeking-and-instrumental-convergence',
        'next-slug': 'instrumental-convergence-for-realistic-agent-objectives', 
        'next-title': 'Instrumental Convergence For Realistic Agent Objectives',
    },

    'instrumental-convergence-for-realistic-agent-objectives': {
        'sequence-title': 'The Causes of Power-Seeking and Instrumental Convergence', 
        'sequence-link': 'posts#the-causes-of-power-seeking-and-instrumental-convergence',
        'prev-slug': 'satisficers-tend-to-seek-power',
        'prev-title': 'Satisficers Tend To Seek Power: Instrumental Convergence Via Retargetability'
    },

    'humans-provide-alignment-evidence': {
        'sequence-title': 'Shard Theory',
        'sequence-link': 'posts#shard-theory',
        'prev-slug': '',
        'prev-title': ''
    },

    'general-alignment-properties': {
        'sequence-title': 'Shard Theory',
        'sequence-link': 'posts#shard-theory',
        'prev-slug': 'human-values-and-biases-are-inaccessible-to-the-genome',  
        'prev-title': 'Human Values & Biases Are Inaccessible to the Genome',
        'next-slug': 'reward-is-not-the-optimization-target',
        'next-title': 'Reward Is Not the Optimization Target'
    },

    'reward-is-not-the-optimization-target': {
        'sequence-title': 'Shard Theory',
        'sequence-link': 'posts#shard-theory',
        'prev-slug': 'general-alignment-properties',
        'prev-title': 'General Alignment Properties',
        'next-slug': 'shard-theory',
        'next-title': 'The Shard Theory of Human Values'
    },

    'understanding-and-avoiding-value-drift': {
        'sequence-title': 'Shard Theory',
        'sequence-link': 'posts#shard-theory',
        'prev-slug': 'shard-theory',
        'prev-title': 'The Shard Theory of Human Values',
        'next-slug': 'a-shot-at-the-diamond-alignment-problem',
        'next-title': 'A Shot at the Diamond-Alignment Problem'
    },

    'a-shot-at-the-diamond-alignment-problem': {
        'sequence-title': 'Shard Theory',
        'sequence-link': 'posts#shard-theory',
        'prev-slug': 'understanding-and-avoiding-value-drift',
        'prev-title': 'Understanding and Avoiding Value Drift',
        'next-slug': 'dont-design-agents-which-exploit-adversarial-inputs',
        'next-title': 'Don’t Design Agents Which Exploit Adversarial Inputs'
    },

    'dont-design-agents-which-exploit-adversarial-inputs': {
        'sequence-title': 'Shard Theory',
        'sequence-link': 'posts#shard-theory',
        'prev-slug': 'a-shot-at-the-diamond-alignment-problem',
        'prev-title': 'A Shot at the Diamond-Alignment Problem',
        'next-slug': 'dont-align-agents-to-evaluations-of-plans',
        'next-title': 'Don’t Align Agents to Evaluations of Plans'
    },

    'dont-align-agents-to-evaluations-of-plans': {
        'sequence-title': 'Shard Theory',
        'sequence-link': 'posts#shard-theory',
        'prev-slug': 'dont-design-agents-which-exploit-adversarial-inputs',
        'prev-title': 'Don’t Design Agents Which Exploit Adversarial Inputs',
        'next-slug': 'alignment-without-total-robustness',
        'next-title': 'Alignment Allows “Nonrobust” Decision-Influences and Doesn’t Require Robust Grading'
    },

    'alignment-without-total-robustness': {
        'sequence-title': 'Shard Theory',
        'sequence-link': 'posts#shard-theory',
        'prev-slug': 'dont-align-agents-to-evaluations-of-plans',
        'prev-title': 'Don’t Align Agents to Evaluations of Plans',
        'next-slug': 'against-inner-outer-alignment',
        'next-title': 'Inner and Outer Alignment Decompose One Hard Problem Into Two Extremely Hard Problems'
    },

    'against-inner-outer-alignment': {
        'sequence-title': 'Shard Theory',
        'sequence-link': 'posts#shard-theory',
        'prev-slug': 'alignment-without-total-robustness',
        'prev-title': 'Alignment Allows “Nonrobust” Decision-Influences and Doesn’t Require Robust Grading',
    },

    'statistics-of-a-maze-solving-network': {
        'sequence-title': 'Interpreting a Maze-Solving Network',
        'sequence-link': 'posts#interpreting-a-maze-solving-network',
        'prev-slug': 'top-right-steering-vector',
        'prev-title': 'Maze-Solving Agents: Add a Top-Right Vector, Make the Agent Go to the Top-Right',
    },
}

# first power seek post, CCC

# TODO add tags

permalink_conversion = {
    "i-found-greater-than-800-orthogonal-write-code-steering": "high-dimensional-subspace-of-code-steering-vectors",
    "mechanistically-eliciting-latent-behaviors-in-language-1": "mechanistically-eliciting-latent-behaviors",
    "steering-llama-2-with-contrastive-activation-additions": "llama2-steering-vectors",
    "how-should-turntrout-handle-his-deepmind-equity-situation": "deepmind-equity-discussion",
    "actadd-steering-language-models-without-optimization": "gpt2-steering-paper-announcement",
    "residual-stream-norms-grow-exponentially-over-the-forward": "residual-stream-norms-grow-exponentially-over-the-forward-pass",
    "behavioural-statistics-for-a-maze-solving-agent": "statistics-of-a-maze-solving-network",
    "the-shard-theory-of-human-values": "shard-theory",
    "game-theoretic-alignment-in-terms-of-attainable-utility": "formalizing-alignment-in-game-theory",
    "generalizing-power-to-multi-agent-games": "formalizing-multi-agent-power",
    "many-arguments-for-ai-x-risk-are-wrong": "invalid-ai-risk-arguments",
    "dreams-of-ai-alignment-the-danger-of-suggestive-names": "danger-of-suggestive-terminology",
    "paper-understanding-and-controlling-a-maze-solving-policy": "cheese-vector-paper-announcement",
    "ai-presidents-discuss-ai-alignment-agendas": "alignment-tier-list",
    "open-problems-in-activation-engineering": "open-problems-in-activation-engineering",
    "ban-development-of-unpredictable-powerful-models": "ban-development-of-unpredictable-powerful-models",
    "think-carefully-before-calling-rl-policies-agents": "RL-trains-policies-not-agents",
    "mode-collapse-in-rl-may-be-fueled-by-the-update-equation": "mode-collapse-in-rl-may-be-fueled-by-the-update-equation",
    "steering-gpt-2-xl-by-adding-an-activation-vector": "gpt2-steering-vectors",
    "april-fools-definitive-confirmation-of-shard-theory": "definitive-confirmation-of-shard-theory",
    "maze-solving-agents-add-a-top-right-vector-make-the-agent-go": "top-right-steering-vector",
    "understanding-and-controlling-a-maze-solving-policy-network": "understanding-and-controlling-a-maze-solving-policy-network",
    "predictions-for-shard-theory-mechanistic-interpretability": "predictions-for-shard-theory-mechanistic-interpretability",
    "parametrically-retargetable-decision-makers-tend-to-seek": "parametrically-retargetable-power-seeking",
    "some-of-my-disagreements-with-list-of-lethalities": "disagreements-with-list-of-lethalities",
    "positive-values-seem-more-robust-and-lasting-than": "robustness-of-positive-values",
    "don-t-align-agents-to-evaluations-of-plans": "dont-align-agents-to-evaluations-of-plans",
    "don-t-design-agents-which-exploit-adversarial-inputs": "dont-design-agents-which-exploit-adversarial-inputs",
    "alignment-allows-nonrobust-decision-influences-and-doesn-t": "alignment-without-total-robustness",
    "people-care-about-each-other-even-though-they-have-imperfect": "humane-values-despite-imperfections",
    "a-shot-at-the-diamond-alignment-problem": "a-shot-at-the-diamond-alignment-problem",
    "four-usages-of-loss-in-ai": "four-usages-of-loss-in-ai",
    "bruce-wayne-and-the-cost-of-inaction": "bruce-wayne-and-the-cost-of-inaction",
    "inner-and-outer-alignment-decompose-one-hard-problem-into": "against-inner-outer-alignment",
    "understanding-and-avoiding-value-drift": "understanding-and-avoiding-value-drift",
    "seriously-what-goes-wrong-with-reward-the-agent-when-it": "questioning-why-simple-alignment-plan-fails",
    "general-alignment-properties": "general-alignment-properties",
    "reward-is-not-the-optimization-target": "reward-is-not-the-optimization-target",
    "humans-provide-an-untapped-wealth-of-evidence-about": "humans-provide-alignment-evidence",
    "human-values-and-biases-are-inaccessible-to-the-genome": "human-values-and-biases-are-inaccessible-to-the-genome",
    "looking-back-on-my-alignment-phd": "alignment-phd",
    "emotionally-confronting-a-probably-doomed-world-against": "emotionally-confronting-doom",
    "do-a-cost-benefit-analysis-of-your-technology-usage": "digital-minimalism",
    "elk-proposal-thinking-via-a-human-imitator": "elk-proposal-thinking-via-a-human-imitator",
    "instrumental-convergence-for-realistic-agent-objectives": "instrumental-convergence-for-realistic-agent-objectives",
    "formalizing-policy-modification-corrigibility": "formalizing-policy-modification-corrigibility",
    "a-certain-formalization-of-corrigibility-is-vnm-incoherent": "a-certain-formalization-of-corrigibility-is-vnm-incoherent",
    "transcript-you-should-read-hpmor": "read-hpmor",
    "insights-from-modern-principles-of-economics": "insights-from-modern-principles-of-economics",
    "satisficers-tend-to-seek-power-instrumental-convergence-via": "satisficers-tend-to-seek-power",
    "when-most-vnm-coherent-preference-orderings-have-convergent": "instrumental-convergence-via-vnm-preferences",
    "seeking-power-is-convergently-instrumental-in-a-broad-class": "power-seeking-beyond-MDPs",
    "a-world-in-which-the-alignment-problem-seems-lower-stakes": "lower-stakes-alignment-scenario",
    "the-more-power-at-stake-the-stronger-instrumental": "quantitative-strength-of-instrumental-convergence",
    "open-problem-how-can-we-quantify-player-alignment-in-2x2": "question-about-defining-alignment-in-simple-setting",
    "conservative-agency-with-multiple-stakeholders": "conservative-agency-with-multiple-stakeholders",
    "environmental-structure-can-cause-instrumental-convergence": "environmental-structure-can-cause-instrumental-convergence",
    "mdp-models-are-determined-by-the-agent-architecture-and-the": "MDPs-are-not-subjective",
    "lessons-i-ve-learned-from-self-teaching": "self-teaching-insights",
    "review-of-debate-on-instrumental-convergence-between-lecun": "review-of-debate-on-instrumental-convergence",
    "review-of-but-exactly-how-complex-and-fragile": "review-of-but-exactly-how-complex-and-fragile",
    "collider-bias-as-a-cognitive-blindspot": "collider-bias-as-a-cognitive-blindspot",
    "2019-review-rewrite-seeking-power-is-often-robustly": "announcing-rewrite-of-power-seeking-post",
    "avoiding-side-effects-in-complex-environments": "avoiding-side-effects-in-complex-environments",
    "is-it-safe-to-spend-time-with-people-who-already-recovered": "safety-of-being-around-covid-recovered",
    "non-obstruction-a-simple-concept-motivating-corrigibility": "non-obstruction-motivates-corrigibility",
    "math-that-clicks-look-for-two-way-correspondences": "on-good-formal-definitions",
    "power-as-easily-exploitable-opportunities": "power-as-easily-exploitable-opportunities",
    "to-what-extent-is-gpt-3-capable-of-reasoning": "to-what-extent-is-gpt3-capable-of-reasoning",
    "gpt-3-gems": "gpt3-gems",
    "generalizing-the-power-seeking-theorems": "generalizing-the-power-seeking-theorems",
    "what-counts-as-defection": "game-theoretic-definition-of-deception",
    "how-should-potential-ai-alignment-researchers-gauge-whether": "evaluating-whether-to-research-alignment",
    "insights-from-euclid-s-elements": "insights-from-euclids-elements",
    "corrigibility-as-outside-view": "corrigibility-as-outside-view",
    "problem-relaxation-as-a-tactic": "problem-relaxation-as-a-tactic",
    "research-on-repurposing-filter-products-for-masks": "research-on-repurposing-filter-products-for-masks",
    "a-kernel-of-truth-insights-from-a-friendly-approach-to": "functional-analysis-textbook-review",
    "ode-to-joy-insights-from-a-first-course-in-ordinary": "ordinary-differential-equations-textbook-review",
    "reasons-for-excitement-about-impact-of-impact-measure": "excitement-about-impact-measures",
    "conclusion-to-reframing-impact": "conclusion-to-reframing-impact",
    "does-there-exist-an-agi-level-parameter-setting-for-modern": "do-modern-architectures-express-AGI",
    "attainable-utility-preservation-scaling-to-superhuman": "attainable-utility-preservation-scaling-to-superhuman",
    "attainable-utility-preservation-empirical-results": "attainable-utility-preservation-empirical-results",
    "attainable-utility-preservation-concepts": "attainable-utility-preservation-concepts",
    "the-catastrophic-convergence-conjecture": "the-catastrophic-convergence-conjecture",
    "attainable-utility-landscape-how-the-world-is-changed": "attainable-utility-landscape",
    "continuous-improvement-insights-from-topology": "topology-textbook-review",
    "on-being-robust": "on-being-robust",
    "judgment-day-insights-from-judgment-in-managerial-decision": "managerial-decision-making-review",
    "can-fear-of-the-dark-bias-us-more-generally": "can-fear-of-the-dark-bias-us-more-generally",
    "clarifying-power-seeking-and-instrumental-convergence": "clarifying-power-seeking-and-instrumental-convergence",
    "how-i-do-research": "how-i-do-research",
    "seeking-power-is-often-convergently-instrumental-in-mdps": "seeking-power-is-often-convergently-instrumental-in-mdps",
    "thoughts-on-human-compatible": "thoughts-on-human-compatible",
    "what-you-see-isn-t-always-what-you-want": "against-rewards-over-observations",
    "how-often-are-new-ideas-discovered-in-old-papers": "how-often-are-new-ideas-discovered-in-old-papers",
    "the-gears-of-impact": "the-gears-of-impact",
    "world-state-is-the-wrong-abstraction-for-impact": "world-state-is-the-wrong-abstraction-for-impact",
    "attainable-utility-theory-why-things-matter": "attainable-utility-theory",
    "deducing-impact": "deducing-impact",
    "value-impact": "value-impact",
    "reframing-impact": "reframing-impact",
    "best-reasons-for-pessimism-about-impact-of-impact-measures": "best-reasons-for-pessimism-about-impact-measures",
    "how-low-should-fruit-hang-before-we-pick-it": "how-low-should-fruit-hang-before-we-pick-it",
    "and-my-axiom-insights-from-computability-and-logic": "computability-and-logic-textbook-review",
    "penalizing-impact-via-attainable-utility-preservation": "attainable-utility-preservation-paper",
    "why-should-i-care-about-rationality": "why-should-i-care-about-rationality",
    "impact-measure-desiderata": "impact-measure-desiderata",
    "pretense": "reflections-on-pretense",
    "towards-a-new-impact-measure": "towards-a-new-impact-measure",
    "overcoming-clinginess-in-impact-measures": "overcoming-clinginess-in-impact-measures",
    "making-a-difference-tempore-insights-from-reinforcement": "RL-textbook-review",
    "worrying-about-the-vase-whitelisting": "whitelisting-impact-measure",
    "turning-up-the-heat-insights-from-tao-s-analysis-ii": "second-analysis-textbook-review",
    "swimming-upstream-a-case-study-in-instrumental-rationality": "swimming-upstream",
    "into-the-kiln-insights-from-tao-s-analysis-i": "first-analysis-textbook-review",
    "internalizing-internal-double-crux": "internalizing-internal-double-crux",
    "confounded-no-longer-insights-from-all-of-statistics": "all-of-statistics-textbook-review",
    "unyielding-yoda-timers-taking-the-hammertime-final-exam": "hammertime-final-exam",
    "open-category-classification": "open-category-classification",
    "the-first-rung-insights-from-linear-algebra-done-right": "linear-algebra-textbook-review",
    "lightness-and-unease": "lightness-and-unease",
    "the-art-of-the-artificial-insights-from-artificial": "AI-textbook-review",
    "how-to-dissolve-it": "how-to-dissolve-it",
    "ambiguity-detection": "ambiguity-detection",
    "set-up-for-success-insights-from-naive-set-theory": "set-theory-textbook-review",
    "walkthrough-of-formalizing-convergent-instrumental-goals": "toy-instrumental-convergence-paper-walkthrough",
    "interpersonal-approaches-for-x-risk-education": "interpersonal-approaches-for-x-risk-education",
}
tag_rename_dict = {
    "Machine-Learning--(ML)": "Machine-Learning",  # TODO maybe turn into AI?
    "Logic & Mathematics ": "Mathematics",
    # "Summaries": "RENAME THIS ", # TODO (what is it?)
    "Interpretability (ML & AI)": "ML Interpretability",
    "Exercises / Problem-Sets": "Contains exercises",
    "Inner Alignment": "Inner/outer alignment",
    "Outer Alignment": "Inner/outer alignment",
    "World Optimization": "Real-world effectiveness",
    "Community": "Rationalist community",
    "Open Problems": "Contains open problems",
    "Reward Functions": "Reinforcement functions",
    "Book Reviews / Media Reviews": "Book review",
    "World Modeling": "Understanding the world",
}

keep_tags = [
    "Activation Engineering",
    "Postmortems & Retrospectives",
    "Impact Regularization",
    "Inner/outer alignment",
    "AI",
    "Reinforcement functions",
    "Contains exercises",
    "ML Interpretability",
    "Human Values",
    "Fiction",
    "Corrigibility",
    "Mathematics",
    "Practical",
    "Real-world effectiveness",
    "Growth Stories",
    "Game Theory",
    "Reinforcement Learning",
    "Scholarship & Learning",
    "World Modeling",
    "Shard Theory",
    "Covid-19",
    "Rationality",
    "Instrumental Convergence",
    "Book review",
    "MATS Program",
    "Contains open problems",
    "Humor",
    "Machine-Learning",
    "Rationalist community",
]


delete_tags = [
    "Summaries",
    "HPMOR-(discussion-&-meta)",
    "Rationalist Taboo",
    "Dark Arts",
    "Center for Applied Rationality (CFAR)",
    "Heroic Responsibility",
    "The Pointers Problem",
    "GPT",
    "Goodhart's Law",
    "Complexity of Value",
    "General Alignment Properties",
    "Center for Human-Compatible AI (CHAI)",
    "LessWrong-Event-Transcripts",
    "Spaced Repetition",
    "Conservatism (AI)",
    "Causality",
    "Principal-Agent Problems",
]

maybe_delete = [
    "LessWrong Review",
    "AI Governance",
    "Language Models",
]
