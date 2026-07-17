# Convex Documentation House Style

This guide is for anyone writing for docs.convex.world — tutorials, how-to guides, CADs, product pages, blog posts, and the site homepage. The audience is developers. The goal is prose that is useful first and inspiring because of what it shows, written as if by one thoughtful engineer rather than a committee, a marketing department, or a language model.

The short version: **be specific, be honest, be useful.** Enthusiasm comes from the material, not from adjectives.

---

## 1. Voice

### Write like the engineer who built it

Our voice is a knowledgeable colleague explaining something they understand deeply and find genuinely interesting. Confident, direct, occasionally wry. Never breathless, never salesy, never apologetic.

We are positive about Convex because it does things worth being positive about. The way to convey that is to *show the thing*, not to describe our feelings about it.

### The falsifiability test

Every claim of quality or performance must be specific enough that a sceptical reader could check it. If a claim can't be checked, it's hype — cut it or replace it with one that can be.

| Hype (cut this) | Specific (write this) |
|---|---|
| Blazing performance | Transactions confirm in under a second on the public testnet |
| Uncompromising security | Nobody has ever taken a Convex Coin on testnet without the owner's private key |
| The ultimate engine for dApps | The CVM executes up to 1M TPS in the [CVMBenchmark](docs/overview/performance.md), on commodity hardware |
| Revolutionary consensus | CPoS reaches consensus without blocks or leaders; here's how |
| Effortless scalability | One global state — no sharding, no bridges, no roll-ups to configure |

Note that the specific versions are *more* impressive, not less. "Nobody has ever stolen a testnet coin without the private key" is a real sentence from our docs and it is the best security claim we have — because it invites the reader to try.

Performance numbers must link to a reproducible benchmark or a CAD. A number without a source is an adjective wearing a costume.

### Banned words and constructions

These words are banned in body text (fine in quotations from third parties):

> revolutionary, game-changing, blazing, lightning-fast, unparalleled, unmatched, seamless, effortless, cutting-edge, next-gen, ultimate, supercharge, superpowers, transcend, redefine, unlock the power, empower, world-class

Banned constructions:

- **"Say goodbye to X"** — marketing cadence. State what Convex does instead.
- **"Build something amazing!"** and other exhortations. The reader will decide what to build.
- **Rhetorical questions as section openers.** ("Tired of slow blockchains?") Just make the point.
- **Congratulating the reader.** Completing a quickstart is not an achievement to celebrate; it's the docs working as intended. A plain "You now have a running peer. Next: …" respects the reader more than "🎉 Congratulations!"

### Emoji

No decorative emoji in documentation: no ✅ bullet prefixes, no 🎉 congratulations, no 🚀 section headers. Two exceptions: ✅/❌ as data marks in comparison or support tables (where they carry information), and expected output in code blocks, which may contain whatever the program actually prints.

### Humour

Dry and occasional is fine — a well-placed aside in a tutorial keeps a reader company through a long install. Whimsy in reference material is not fine. When in doubt, cut the joke; never cut the information.

### Blog posts

Blog posts are the one surface with room for voice: opinion, historical context, a dry aside. The banned list still applies, claims still need sources, and a post about a feature states the release version and links the relevant CAD or docs page. Posts are dated — reference only what existed at the post's date. Write feature-forward: what the reader can now do, not a changelog of fixes.

---

## 2. Honesty

These practices are what "authentic voice" actually means in a technical document:

- **Document limitations where the feature is documented.** If SSE subscriptions require a persistent session that most clients don't provide, say so on the page that describes subscriptions — not in a footnote three pages away. Readers trust docs that tell them where the sharp edges are, and that trust transfers to everything else we say.
- **Say "not yet" plainly.** "Windows support is planned but not yet available" beats silence, and vastly beats a page that implies it works.
- **Distinguish design decisions from limitations.** CNS references are mutable *by design* — resolution is meant to track the current implementation. Write the rationale, because a reader who mistakes a decision for a bug will file the wrong issue.
- **Keep marketing claims out of task documentation.** The intro page may make the case for Convex. A quickstart, how-to, or CAD makes no case at all; the reader is already here.
- **Never fake output.** Every expected-output block must be the real output of the real command at the stated version. If output is version-dependent, say which version.

---

## 3. Structure: know which document you're writing

We follow the [Diátaxis](https://diataxis.fr/) framework. Every page is exactly one of four things, and mixing them is the most common structural failure in developer docs:

| Type | Reader's mode | Our section | Voice notes |
|---|---|---|---|
| **Tutorial** | Learning by doing | User Guide → Quick Start, Convex Lisp intro | First-plural is fine ("we'll deploy an actor"). One golden path, no options. |
| **How-to guide** | Trying to get a task done | Recipes, Peer Operations | Second person, imperative. Assume competence; skip the theory. |
| **Reference** | Looking something up | CADs, function docs, API specs | Neutral, complete, RFC 2119 keywords (MUST/SHOULD/MAY) in CADs. No persuasion, no tutorials smuggled in. |
| **Explanation** | Wanting to understand | Overview, White Paper, architecture pages | Discursive, comparative, honest about trade-offs. The primary home of "why". |

Practical consequences:

- A tutorial gives **one path**. If there are three ways to start, give a routing table up front (the Quick Start's Path / Time / Best For table is the model) and then keep each path linear.
- Reference pages don't cheerlead. A CAD that says a mechanism is "powerful" is editorialising; delete the adjective and specify the mechanism.
- Explanation pages are where enthusiasm belongs — and even there, it takes the form of "here is the interesting problem and how the lattice solves it," not superlatives.

---

## 4. Practices we name and keep

These already appear in our best pages. They're now policy:

1. **Time-to-value promise.** Every tutorial opens with a concrete, honest completion claim: "Get your first transaction on Convex in 5 minutes." Then keep the promise — test it with a stopwatch on a clean machine.
2. **Show, then explain.** Run the code first; explain what happened after ("Understanding what you did"). Readers learn from working systems, not from preambles.
3. **Expected output blocks.** Every runnable snippet is followed by what the reader should see, so they can verify success without guessing.
4. **Troubleshooting keyed to real errors.** Troubleshooting sections use the actual error codes the system emits (`:FUNDS`, `:SEQUENCE`), placed on the same page as the task that triggers them. Machine-readable errors deserve machine-findable docs — this also serves AI agents reading our docs, who are a first-class audience.
5. **Copy-paste integrity.** Snippets run as pasted, in order, from a clean starting state. Placeholders are visually unmistakable (`<YOUR_ADDRESS>`), and every prerequisite is stated at the top, with versions.
6. **Multi-language parity.** Where we show TypeScript, Python, and Java, the examples do the same thing and produce the same result.
7. **Docs as code.** Every page has an Edit link; fixes go through PRs against [Convex-Dev/design](https://github.com/Convex-Dev/design). Style-guide violations are legitimate review comments.
8. **Next steps, not dead ends.** Every tutorial and how-to ends with two or three specific links onward — chosen for the reader's likely next task, not a dump of the whole sitemap.

---

## 5. Mechanics

### Language and spelling

- **British English** throughout: *decentralised, licence (noun), colour, behaviour*. This matches the project's origins and most existing prose. Whichever variant a page starts in, it finishes in — no mixing.
- Exception: code, APIs, and quoted identifiers stay exactly as spelled (`initialize()` stays `initialize()`).

### Grammar and tone defaults

(Largely per the [Google developer documentation style guide](https://developers.google.com/style), which we defer to for anything not covered here.)

- Second person ("you"), active voice, present tense. "The peer validates the transaction," not "the transaction will be validated by the peer."
- Sentence case for headings: "Deploy your first actor," not "Deploy Your First Actor." (Many existing pages use title case — migrate a page's headings when you are editing it anyway, not as drive-by churn.)
- Contractions are fine and encouraged; they're part of sounding human.
- One idea per sentence. If a sentence needs two "and"s and a dash, it's two sentences.

### Prose over fragment-bullets

Bullets are for genuinely parallel items: options, prerequisites, error lists. They are not a substitute for sentences. A page that is 80% two-word bold-prefixed fragments ("**Fast**: very fast") reads as generated and conveys less than the prose it replaced. If a bullet can't stand as a full sentence or a true list item, write the paragraph.

Related: **bold is for UI labels, key terms on first definition, and warnings** — not for emphasis-sprinkling. If everything is bold, nothing is.

### Terminology

Precision here is non-negotiable; these are the mistakes readers (and LLMs) most often import from other ecosystems:

| Write | Not | Why |
|---|---|---|
| lattice-based network / lattice technology | blockchain | Convex is not a blockchain; CPoS operates as a CRDT, not a chain of blocks. Only use "blockchain" when explicitly contrasting. |
| Convex Coin; smallest unit: copper | gas token, ETH-style analogies | 1 Convex Coin = 10⁹ copper. |
| juice | gas | Execution cost has its own model (CAD007). |
| actor | smart contract | "Smart contract" is acceptable as a gloss on first use ("actors — Convex's smart contracts"), then use *actor*. |
| account address `#1234` | 0x-style addresses | Addresses are numeric CVM references, not key hashes. |
| CNS (Convex Name System) | ENS analogies | CNS references are mutable by design — say so when relevant. |
| peer | node, miner, validator | There is no mining. |
| transaction vs query | using "transaction" for reads | Queries are free, unsigned, and don't modify state. |

Define every term on first use per page, or link its glossary entry. Never introduce a term via an analogy to Ethereum without immediately stating where the analogy breaks.

### Code samples

- State language and version requirements at the top of the page, once.
- Prefer the smallest example that is *complete* — runnable as-is beats short-but-broken.
- Convex Lisp examples should be pasteable into the REPL; note when something requires a funded account.
- Comment the *why*, not the *what*: `; deploy with upgradability so the actor can be patched` is useful; `; deploy the actor` is noise.

---

## 6. Review checklist

Before merging a docs PR, check:

- [ ] Which Diátaxis type is this page? Does everything on it belong to that type?
- [ ] Could a sceptic verify every claim of speed, scale, or security? (Link or number for each.)
- [ ] Zero banned words; no decorative emoji; no congratulations.
- [ ] Every code block runs as pasted; every expected-output block is real.
- [ ] Errors the reader might hit are addressed on this page, by error code.
- [ ] Terminology table respected — especially no stray "blockchain."
- [ ] British spelling, sentence-case headings, prose where prose belongs.
- [ ] Ends with specific next steps, not a sitemap dump.
- [ ] Read it aloud. Does it sound like a person who built this and respects the reader's time? If any sentence sounds like a landing page or a model's filler, rewrite it.

---

## Appendix: a worked example

**Before** (current intro-page register):

> Convex is a revolutionary high-performance platform that redefines what's possible in decentralised systems, delivering blazing-fast performance and unparalleled scalability. Say goodbye to sharding and roll-ups!

**After** (house style):

> Convex maintains a single global state with sub-second transaction finality, so there is no sharding, bridging, or roll-up layer to design around. Consensus is reached by Convergent Proof of Stake, a leaderless CRDT-based algorithm described in the [White Paper](../overview/convex-whitepaper).

Same facts. The second version is calmer, shorter, more credible — and the only one an experienced engineer will keep reading.
