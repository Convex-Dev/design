---
title: Actor Development
sidebar_position: 3
---

Convex actors are autonomous programs that hold state, expose callable functions, and participate in economic systems on-chain. This section introduces the concepts, tools, and best practices you need to build robust actors on the Convex Virtual Machine (CVM).

**NOTE**: Most of the time you don't need to develop your own actors: solid economic systems already exist on Convex that are sufficient for many use cases (e.g. minting and trading fungible tokens of any kind). So actor development is only needed if you really need to implement your own custom logic or have fine-grained control over behaviour.

## Where to start

Each subpage builds on the previous one, but you can jump directly to what you need:

- [Key Concepts](./actors/concepts) — core ideas, anatomy, and authorisation of Convex actors.
- [Building an Actor](./actors/building-an-actor) — a runnable end-to-end example; start here to get hands-on.
- [Deployment](./actors/deployment) — deploying and testing actors on the CVM.
- [Evolution](./actors/evolution) — strategies for real-time upgrades of actors.
- [Best Practices](./actors/best-practices) — practical advice and checklists.

## Worked examples

Complete, copy-pasteable actors in the Recipes section:

- [Coin Distributor](../recipes/coin-distributor/index.md) — distribute coins to many recipients
- [Account Control](../recipes/account-control/index.md) — controllers and multi-signature patterns


