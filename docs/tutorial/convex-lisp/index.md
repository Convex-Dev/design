---
slug: convex-lisp
title: Convex Lisp
authors: [mikera]
tags: [convex, developer, lisp]
---

Convex Lisp is a powerful modern Lisp for decentralised systems.

It supports immutable lattice data structures and functional programming for robust but flexible decentralised programs.

You don't need to know Convex Lisp to use Convex, but it's a powerful tool for developers wishing to build dApps and digital assets. Most of the core Convex on-chain tools are written in and designed to be used from Convex Lisp.

## Why Lisp?

The CVM is designed to be able to support many different languages and paradigms. However, we wanted a powerful language that would empower developers on Convex from the beginning, and chose Lisp as the first language on the CVM for a number of reasons:

- **Immutability**: Lisp's functional programming paradigm promotes immutability, which is essential for ensuring the integrity and consistency of decentralised systems where data must be replicated and distributed across multiple nodes.
- **Dynamic typing**: Lisp's dynamic typing allows for flexible data structures and easy modifications, crucial for adapting to the constantly evolving nature of decentralised systems. At the same time, Convex Lisp is **strongly typed**, avoiding the issues associated with weak typing.
- **Code is data**: representing code using its own data structures (also known as "homoiconicity") gives Lisp advanced **metaprogramming** capabilities the creation of domain-specific languages (DSLs) tailored to specific concepts, making it easier to reason about and implement complex economic mechanisms.
- **Interactive coding**: Lisp pioneered the use of the REPL for highly interactive programming. With Convex, we've taken this a step further with a complete on-chain compiler so that everything on the CVM can be done with simple interactive Lisp commands.

## Inspirations

Lisp was originally created in the 1950s by John McCarthy and has maintained a deep-rooted appeal among hackers for its unique characteristics.

Convex Lisp was heavily inspired by [Clojure](https://clojure.org/), from which it borrows most basic and many core functions, and [Racket Scheme](https://racket-lang.org/) which inspired many of the more advanced metaprogramming facilities.

## Interesting technical notes

- Convex Lisp is a **Lisp-1** (i.e. keeps function and data values in the same namespace). This is simpler than a Lisp-2 and seems more appropriate for a functional programming language, where functions are regularly treated as first class values.
- Convex Lisp is designed for **orthogonal persistence**. Developers don't need to care where data or code is stored: it is loaded and cached on demand. This powerful capability means that the CVM can operate code and data data structures much larger than system RAM without imposing any burden on developers.
- Convex Lisp data structures (and therefore code) are all represented as **Merkle trees** using strong cryptographic hashes. This has the interesting property of making all code and data **content-addressable** and cryptographically **verifiable**. As well as making Convex Lisp ideally suited for running on the lattice technology used by Convex, this opens interesting possibility for new kinds of systems based on immutable and verifiable distributed code bases.