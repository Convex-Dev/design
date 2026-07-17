---
sidebar_position: 1
---

# Welcome to Convex

**Convex** is a high-performance platform for decentralised economic systems — open source, and accessible to developers and users worldwide.

Convex goes beyond the limitations of traditional blockchains, delivering the flexibility, scalability and speed that high-volume, interactive applications actually need. From mobile apps and instant payments to immersive gaming and autonomous AI agents, developers can build the next generation of decentralised applications without fighting the platform.

## Why Convex Stands Out

- **Consensus in milliseconds**: Our **Convergent Proof of Stake (CPoS)** algorithm is decentralised, leaderless, and Byzantine fault-tolerant, with built-in front-running resistance.
- **True Global State**: No sharding, cross-chain bridges, or roll-ups. Convex maintains a single, consistent global state while scaling to internet-level transaction volumes.
- **A different kind of virtual machine**: The **Convex Virtual Machine (CVM)**, built on the lambda calculus, executes up to **one million transactions per second** in [benchmarks](/docs/overview/performance), using immutable, persistent data structures.
- **One-Line DeFi**: Mint tokens, manage assets, or execute complex operations with a single line of code — like `(@convex.fungible/mint MY_TOKEN 100000)`. On-chain libraries and an on-chain compiler mean no convoluted toolchains.
- **Built for AI Agents**: Every peer includes a [Model Context Protocol server](/docs/products/convex-mcp), so AI agents can hold accounts, own assets and transact as first-class economic participants.
- **Proven cryptography**: **SHA3-256** hashing and **Ed25519** digital signatures protect assets and data throughout the platform. Nobody has ever taken a Convex Coin on testnet without the owner's private key.


## Our Story

Convex was initially created by [Mike Anderson](https://www.linkedin.com/in/mike-cvx/), a technology veteran and long-time open source hacker. He started coding on an 8-bit Atari 800XL at the age of eight, represented the UK in the [International Olympiad in Informatics](https://ioinformatics.org/) and has been passionate about coding ever since. 

![Mike Photo](mike.jpg)

During ten years of consulting experience at [McKinsey & Company](https://www.mckinsey.com/), he saw all the problems and inefficiencies of large centralised organisations (multi-national companies, governments, NGOs etc.) and knew there had to be a better way to organise our economies. 

While working as a founding member and CTO at [Ocean Protocol](https://oceanprotocol.com/) in 2018-2019, he saw the promise of decentralised systems to give power back to self-sovereign individuals, but also the need for a better base layer technology if such solutions were ever able to achieve mass adoption.

This led him to embark on a programme of research and create the [Convex Foundation](https://convex.world) in 2020-2022, tackling multiple obstacles and design challenges to make Convex possible. Key inventions included:
- **Convergent Proof of Stake**: the world's fastest truly decentralised consensus algorithm for a global state machine. By operating as a CRDT instead of a blockchain, CPoS solves the traditional blockchain scalability trilemma. The key ideas of CPoS are outlined in the [Convex White Paper](overview/convex-whitepaper.md)
- **Lattice technology**: by combining the concepts of mathematical join-semilattices with cryptography, it is possible to reinvent the concept of data structures for the decentralised world. The lattice is infinitely flexible: any kind of data, any kind of compute, any kind of access control, any kind of replication mechanism. The lattice supports both public on-chain operation (e.g. CPoS, the Convex CVM) and off-chain use cases (DLFS, private databases, media content etc.) 
- **Decentralised Code Execution**: To offer full flexibility and power to developers, it was clear that Convex needed an execution engine for smart contracts and other autonomous decentralised programs. Existing solutions were inadequate, either due to poor performance, architectural limitations or inability to deal with the more powerful data structures required by the Lattice. The solution was to create a new kind of VM based on the [lambda calculus](https://en.wikipedia.org/wiki/Lambda_calculus) to bring the best capabilities of functional programming to the decentralised world.

Convex has always been an open source project. Over the years many fantastic people have joined the project and made significant contributions. The primary venues for collaboration have been [GitHub](https://github.com/Convex-Dev) and the [Convex Community Discord](https://discord.com/invite/xfYGq4CT7v)

Thanks to all these great contributions, Convex has been fully functional and subjected to brutal testing throughout the Testnet phases in 2022-2024. It's been remarkably robust: nobody has *ever* managed to steal a single Convex Coin on testnet without access to a user's private key. We have thousands of lines of code dedicated to extensive automated testing. Some of our Testnet servers had uptime of over a year without issues. 

We validated performance and scalability running early versions of Convex peers distributed all around the world in 2023 as part of the EU [Next Generation Internet](https://ngi.eu/) initiative, which proved global scale and stunning energy efficiency while still offering near-instant transaction finality.

Protonet, the first live Convex network with real assets, is now live. 

## Why are we doing this?

We build Convex because it needs to exist in the world we want to see.

- **Decentralised economies**: We want open, inclusive, decentralised economies at global scale, free from centralised control and unnecessary middlemen. This can only occur with true self-sovereign control of data and assets backed by a powerful open protocol and technology implementation.
- **Mass adoption**: Getting the whole world to use decentralised applications will require realtime, interactive performance, low transaction costs and simple operation. Existing Blockchains are failing to deliver this. Convex isn't a blockchain, so we are able to offer a much more compelling solution for mass adoption.
- **Free from vested interests**: Convex is developed on open source principles and governed by the non-profit Convex Foundation. We aren't owned or dependent on money from VCs, ultra-rich power brokers or centralised organisations with vested interests. 100% of Convex coins are issued to those who bring value to the ecosystem, either via contributions of code and community efforts or by purchasing coins from the release curve (in which case funds are re-invested in the ecosystem). 

For more on our motivations and principles, check out the [Convex Manifesto](overview/manifesto)

## Where Next?

- **Understand the platform** → [Overview](/docs/overview) and [Key Concepts](/docs/overview/concepts)
- **Start building** → [Quick Start](/docs/tutorial/quickstart) gets you from zero to your first transaction
- **Connect an AI agent** → [AI Agents guide](/docs/tutorial/agents)
- **Go deep** → [Convex Architecture Documents (CADs)](/docs/cad/0000cads) and the [White Paper](/docs/overview/convex-whitepaper)
