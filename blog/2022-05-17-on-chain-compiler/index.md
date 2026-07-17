---
slug: on-chain-compiler
title: "The compiler lives on-chain"
authors: [mikera, claude]
tags: [convex, cvm, lisp]
---

On most smart contract platforms, the compiler is somebody else's problem.
You write Solidity, run a toolchain on your laptop, and submit the
resulting bytecode to the chain. The chain never sees your source code.
Convex works differently: **the compiler is part of the CVM.** Submit
source, and it is expanded and compiled on-chain, in consensus, metered
by juice like any other computation.

<!-- truncate -->

Type an expression, sign it, send it:

```clojure
(+ 1 2 3)
=> 6
```

What actually happened there? The peer read your source into a tree of
lattice data (code is data — this is a Lisp), *expanded* it (macros run at
this stage), *compiled* it to CVM ops, and executed the result. Every one
of those phases is part of the deterministic state transition. Every peer
compiles your code identically, because compilation is consensus.

## What this buys you

**No toolchain.** The barrier to your first smart contract is a text box.
This is why the Convex REPL workflow feels like live coding: you work
interactively against the network, defining functions and inspecting state,
and what you type is what runs.

**Deployment is a one-liner.** `deploy` takes a form — code as data — and
creates an actor from it. Generating contracts *from other contracts* is
just building a data structure and deploying it. No factory-contract
gymnastics, no linking step.

**The source of truth is on the chain.** With off-chain compilation there's
a standing question: does this bytecode really correspond to that published
source? Whole verification services exist just to answer it. When the chain
itself compiles your code, the question dissolves.

**Upgrades and governance in the open.** An actor that can be upgraded
receives its new code as plain data that anyone can read *before* it takes
effect — not an opaque blob of bytecode.

## What it costs

Compilation costs juice, so there is a real (small) cost each time source
is compiled. Submitting source is a capability, not an obligation: a
client that can precompile is free to submit compiled CVM ops directly
and skip that cost — useful for high-volume applications running the
same code repeatedly. And the CVM has to carry a compiler in its trusted
core — which is exactly why we keep Convex Lisp small and the compilation
pipeline simple. We consider that trade well worth it. The expander and
compiler are among the most carefully tested parts of the CVM, because
they have to be: they run on every transaction containing source code.

There's a deeper reason this design feels right for a decentralised
network. A global computer that can only run pre-digested binaries from
external toolchains isn't self-sufficient — it has a hidden dependency on
off-chain infrastructure being honest and available. A network that reads,
expands and compiles its own language is a closed loop: everything needed
to understand and evolve the code on the network *is on the network*.

"Code is data" is a sixty-year-old Lisp principle. On a decentralised
network, it turns out to also be sound engineering.
