---
sidebar_position: 8
title: FAQ
authors: [convex]
tags: [convex]
---

Some answers to common questions can be found here.

## Is Convex Free?

Yes! Convex is free for anyone to use, and always will be. We are building Convex as an open public utility network for everyone to support the Internet of Value.

When transacting on the network, small fees are charged using Convex Coins, which is the native utility token of the network. This is necessary for several reasons:

- Compensate fairly those who provide important secure infrastructure to the network (i.e. peer operators)
- Prevent denial of service attacks by people flooding the network with wasteful transactions. This makes it very expensive to launch such attacks.
- Create an economic incentive to use the network as efficiently as possible (both for users and developers of smart contracts)

Our goal is to keep transaction fees small, so that it is never a significant issue for legitimate network users.

## When will Convex go live?

We are on track to release the first live version of Convex (Convex Protonet) in H2 2024.

An important caveat: getting it right is more important than rushing a release. We won't launch until we are 100% sure it is ready for production use and fully secure with real-world value at stake.

People will depend on Convex to be a secure, reliable platform for decentralised applications and digital assets. It is not acceptable to expose them to security risks from flaws in the platform, nor is it acceptable to make breaking changes to the CVM that could cause significant problems with smart contracts.

## How do I get Convex coins?

Convex coins are a cryptoasset that can be obtained in multiple ways.
- Anyone can buy Convex coins directly from individuals on a self-sovereign basis
- You will be free to purchase Convex coins via exchanges and other independent service providers
- [Paisley](https://www.paisley.io/) allows its members to purchase Convex Coins with fiat / crypto
- Contributors to Convex or the broader Convex ecosystem can earn awards of Convex coins
- Approved purchasers can buy newly issued coins from the Release Curve.

Anyone interested in Convex coins should familiarise themselves with the relevant [tokenomics](../cad/020_tokenomics/README.md)

We have established the Convex Foundation a non-profit organisation that facilitates the initial sale of Convex coins, and distributes coin awards to contributors. Funds raised will be reinvested in building Convex and the ecosystem.

## How fast is Convex?

Convex can comfortably process many thousands of complex transactions per second (e.g. transfers and smart contract calls). The CVM itself has been benchmarked at over 1,000,000 TPS on a modern desktop PC. And as we continue making performance improvements it is getting faster by the day.

But it's important to note that performance and scalability are not just about the raw throughput of transactions. Convex is designed to offer a good overall combination of:

- Low latency to stable consensus (below 0.5s seconds on a global network)
- High execution throughput (e.g. 50,000+ token-based smart contract transactions per second)
- Advanced features (smart contracts, memory accounting, an on-chain compiler, autonomous Actors)
- A unified global state machine supporting atomic transactions
- True decentralisation as a public utility network (with Convergent Proof of Stake)
- Ability to operate a Peer with affordable hardware

We achieve all this *without* resorting to over-complicated scaling solutions that introduce various new problems (e.g. cross-shard transactions). We can always add additional scaling features later, but it may not even be necessary.

## How do I integrate my application with Convex?

Convex provides several mechanisms for integration.

For most decentralised apps, it is easy to build a client-side application that makes use of the **HTTP Client API**. This is a convenient REST API using JSON that is ideal for web and mobile applications developers.

Advanced applications can use the **Binary API** and construct messages directly to communicate with Peers. This is currently only possible for JVM-based languages (Java, Clojure, Scala etc.), but more may be supported in the future.

Integrators can also use **Direct Peer Integration** where they run a fully operational Convex Peer alongside their server-side applications. This approach is complex and recommended only if you want maximum performance and/or want to interact with the CVM state directly (e.g. for search or indexing purposes). The `convex.world` sandbox itself uses this technique.


## What should go on-chain?

You often have a choice between putting code and information on the public Convex network or keeping it on a separate server when building a decentralised application. Some applications might do both: we call these "hybrid" dApps.

Some general principles:

- Put data *on-chain* when it needs to be *publicly visible and verifiable*
- Put data *on-chain* when you need to make trusted transactions between parties (e.g. exchanging digital assets)
- Keep data processing (e.g. string formatting, sorting) *off-chain* - this is best done on the client
- Keep data *off-chain* when it needs to be private
- Keep code and data *off-chain* if there are significant compute or storage requirements (it would be too expensive to put on-chain)

It is a good idea to **keep data structures as simple as possible**. Ideally, Actor code should be performing a small set of O(1) operations on the right kind of data structures (looking up / updating a value in a map, appending a value to a vector etc.). We recommend designing the data structures for your Actors carefully first, before writing the code to interact with them.


## Is Convex a Blockchain?

Think of Convex and the underlying lattice technology as "beyond blockchain".

Convex shares many common attributes with traditional public blockchains:

- A decentralised consensus network
- Security from malicious actors with cryptographic techniques
- Decentralised ownership of accounts, including the ability to control digital assets and currencies
- Ability to deploy and execute secure smart contract code
- Transactions are grouped into blocks

Technically however it's not implemented as a blockchain (in the sense that there is a linked list of blocks where each block contains the hash of a previous block). The Convex consensus algorithm creates an *ordering* of blocks, but the cryptographic hashes used to secure this ordering are kept outside the blocks themselves. This gives us a big advantage, as blocks can be submitted and processed by peers concurrently without having to first determine the hash of preceding block(s).


## How does Convex perform so well?

It's complex! But here are some of the most important points:

- [Lattice technology](lattice.md) is uniquely efficient for handling decentralised data at scale. We've been building the foundations of lattice technology for 5+ years with a heavy focus on making it supremely scalable.
- The consensus algorithm (Convergent Proof of Stake, or CPoS) is magic. It can confirm blocks in milliseconds between peers running on a local network. The main latency delay in the global network is just signal transmission over the Internet: the speed of light is a tricky problem.
- The CVM execution model is designed for performance: CVM operations perform high level state transformations, but are implemented using very efficient low-level code.
- We wrote a custom database (Etch) from scratch to support the performance needs of Convex. Having a database perfectly designed and tuned for lattice technology is a huge advantage and much faster than more generic alternatives (e.g. LevelDB)
- We exploit a lot of advanced features of the JVM, which is a very powerful platform backed by thousands of man-years of engineering effort. We benefit a lot from the JIT compiler, concurrency, asynchronous IO and advanced memory management features. 
- Our team includes people who have been performance-oriented hackers for many years, with experience in algorithms, data structures, game coding, embedded systems, distributed computing and more. We enjoy and take pride in writing fast, efficient code!

## Why does Convex use Lisp?

A variant of Lisp was chosen as the initial language for the CVM for a few reasons:

- Lisp expressions are essentially a direct encoding of the [Lambda Calculus](https://en.wikipedia.org/wiki/Lambda_calculus). This means that we are based on fundamentally sound computation theory.
- Lisp macros are a powerful tool for generating code, which is an ideal solution for building sophisticated smart contract capabilities with an on-chain compiler.
- Lisp is a highly expressive language for interactive development, with a long history of REPL-based usage. We feel this is ideal for a platform where we want developers to be instantly productive and able to interact directly with the system in real-time.

Paul Graham's essay [Beating the Averages](http://www.paulgraham.com/avg.html) is an interesting perspective on the advantages of Lisp for building a business. Despite dating from 2001, we feel many of these points still stand today and are very relevant for people wanting to build applications using Convex.

For more information see the tutorial section for [Convex Lisp](/docs/tutorial/convex-lisp/convex-lisp)


## What is Memory Accounting?

Memory Accounting is the system in Convex used to track the usage of on-chain memory. Every time a user executes a transaction, the amount of memory used is calculated and deducted from the user's memory allowance. If the user has an insufficient memory allowance, it is possible to automatically buy more on-demand.

If a user executes a transaction that releases memory, the amount of released memory is credited back to the user's allowance. This creates a good incentive to "clean up after yourself". Actors and smart contracts should also be designed with the option to clean up memory after it is no longer required.

We need Memory Accounting because on-chain memory is a **scarce resource**, and should be used wisely. An effective way of doing this is to make memory allowances themselves into a digital asset, that can be transferred and traded. This creates a market incentive to utilise memory as efficiently as possible.

Memory account is described in much more detail in [CAD006](../cad/006_memory/README.md)


## What is the difference between actors and smart contracts?

Actors are virtual agents that exist inside the Convex Virtual Machine. They are autonomous agents that can execute CVM code, manage digital assets, perform complex computation, make decisions. They follow strict rules that control their execution, so that they can be audited and relied upon to behave in a particular way.

Smart contracts are a concept: the idea of agreements that can be automatically executed and enforced by software, eliminating risk and the need to trust fallible humans.

Convex actors are therefore used to *implement* smart contracts. An example would be a digital asset store that allows parties to offer assets for sale, but only delivers them to the buyer once payment has been made. Each asset sale is a smart contract between the seller and the buyer, facilitated by the actor.

Not every actor needs to be a smart contract, however: an actor that simply manages on-chain information on behalf of individuals isn't facilitating any contracts between parties.


## Who is building Convex?

We are a small team of dedicated hackers and creators passionate about building an amazing platform for the future digital economy. We mostly hang out on the [Convex Discord](https://discord.com/invite/xfYGq4CT7v)
