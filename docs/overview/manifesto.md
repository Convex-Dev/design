---
sidebar_position: 7
title: Manifesto
authors: [convex]
tags: [convex, community, philosophy]
---

# The Convex Manifesto

Building Open, Decentralised Economies for the 21st Century

For too long, centralised gatekeepers have dominated our economies - extracting rents, inflating costs, and excluding billions from meaningful participation. These outdated systems stifle innovation, widen inequality, and accelerate environmental collapse.

Artificial intelligence is now reshaping every aspect of the digital world at unprecedented speed. In this defining era, we must reclaim sovereignty over data, compute, and value itself.

Convex is the public, decentralized foundation for real-time, peer-to-peer exchange of data and value. Engineered for the AI age, it delivers the fair, inclusive, efficient, and sustainable economic infrastructure the world demands.

This manifesto articulates the principles powering Convex and the open economy it enables. Join us in building it.

## Open Economic Systems

**Convex facilitates open economic systems: interactions where participants are free to create mutual value for each other**

Voluntary exchange is the ultimate win-win, leaving every participant better off without coercion or gatekeepers. This engine of human prosperity must be unleashed at scale, not stifled by monopolistic control.

Value is boundless: currency, data, assets, services, access, reputation, or yet-unimagined forms. Convex is engineered as an extensible foundation, ready to represent *any* exchange—today and tomorrow - fuelling endless innovation in the AI-driven economy.

## Self Sovereignty

**Participants are self-sovereign agents: free to transact on their own behalf**

Participation in the digital economy is a human right. No one should be censored, excluded, or forced to pay tribute to gatekeepers. Convex returns control over data, assets, and choices to users.

Delegation is always optional: users may appoint agents, wallets, or services to act on their behalf, but only by explicit, revocable consent - never compulsion.

Self-sovereignty coexists with responsibility. Users remain bound by law, taxes, and the *Golden Rule*: treat others as you wish to be treated. Convex enforces no harm, only freedom within fair boundaries.

## Sustainability

**Convex delivers efficient, sustainable, zero-waste infrastructure**

Economic systems must fuel human progress without plundering the Earth. Today’s centralized giants devour 5–10% of global GDP in fees and friction, while offloading pollution, e-waste, and climate costs onto the innocent and unborn. This is theft from future generations.

Convex rejects extravagance. We ban energy-hungry Proof of Work and embrace *Convergent Proof of Stake (CPoS)* - a consensus engine that outperforms PoW in speed and security using a fraction of the power. Every transaction is lean, auditable, and ecologically defensible.

Decentralisation means we can’t police every app built atop Convex, but we architect the foundation for sustainability: minimal overhead, maximal reuse, and incentives that reward green behaviour. By slashing systemic waste, Convex paves the way for an economy that regenerates rather than extracts—proof that abundance and stewardship can coexist.


## Fair Access

**Everyone deserves equal, fair and direct access to the mechanisms of value exchange, enabling universal participation in the digital economy**

FBillions remain locked out: unbanked, overcharged, or barred from markets by geography, identity, or greed. Traditional finance hoards opportunity behind walls of paperwork, KYC, and monopolistic rents.

Convex tears down those walls. Anyone with an internet connection joins on equal footing: self-sovereign, first-class, and permissionless. No middlemen. No censorship. The network stays open, resilient, and globally reachable, turning exclusion into universal inclusion overnight.

## Real-time Transactions

**Users must be provided with real-time, interactive, atomic transactions**

Users demand seamless experiences: instant mobile payments, fluid gaming economies, immersive metaverses. Clunky blockchains with seconds/minutes delay kill adoption and usability.

Physics sets limits, but Convex is limited only by the speed of light. **CPoS** is leaderless, slashing latency to milliseconds. Zero block delay. No mempool. No front-running.

Atomicity is ironclad: every transaction executes fully or rolls back completely. Turing-complete logic with automatic failure protection eliminates the risk of partial failures.


## The Global State

**Users are free to interact with the decentralised, shared global state**

Global state is essential to the vision of building decentralised economic systems. Information such as asset balances, the status of smart contracts and publicly verifiable data must be available to network participants on a decentralised basis, without being subject to centralised control or arbitrary modification. Global state is also essential for public roots of trust such as  known name services and digital identity.

The should be *one and only one* official global state. This is essential if it is to serve as an authoritative source of truth for systems that depend upon it. A key role of network governance is to enforce this, and a key role of Convex peers is to maintain secure consensus over the global state and validate correct updates.

The Convex global state is maintained by Peers, managed on a decentralised basis according to protocol rules and available to on-chain smart contracts. This is a true global state, that is not subdivided into shards, programs or other restricted sub-containers. This allows for full interoperability and atomic transactions between all users and automated actors.

The global state is protected by strict access control rules: account holders on Convex may store information freely within the scope of their own accounts, but are prohibited from modifying the accounts of others without proper authorisation. Automated actors may provide custom access control rules allowing for sophisticated on-chain shared databases. 

A system of memory accounting ensures an economic cost is applied for those wishing to use on-chain memory within the global state. Refunds are provided when memory is released. This is reasonable and fair since on-chain memory is a scarce resource and we wish to incentivise efficient usage, including appropriate clean up when memory is no longer needed.

## The Data Lattice

**We offer decentralised data systems with unlimited scalability alongside the global state**

Data exists in many forms, and most data (by volume, if not by value) does not belong in a shared public global state. This may be for reasons of privacy or confidentiality, or it simply may not be economically feasible to handle large volumes of data as part of the global state. Such "off-chain" data might include personal files, large media files, AI models, data sets, databases, binary files, contract documentation etc.

The Convex solution must provide an effective way to manage such data as part of decentralised systems alongside the global state. We are inspired by P2P technology such as BitTorrent and IPFS (which are usable with Convex based applications), but need something better to enable decentralised applications that can match or exceed the capabilities of centralised platforms.

The data lattice provides this capability to all Convex users, with the following principles:
- It is 100% peer to peer with no centralised services or single source of truth (if required, the global state provides this)
- Data is structured to form mathematical lattices, enabling efficient coordination-free P2P replication via CRDTs
- Users have full control over the data they store, and what they share with others 
- Data can be in any format, and take any structure. 
- Code is also data: programs and computations can be stored on or referenced from the data lattice, allowing any computational process (such as AI models) to be executed using the data lattice alone. 
- Specific data structures are provided to support effective operational databases and real-time applications, so that the data lattice can replace conventional centralised databases and storage. 
- All data is immutable, content addressable, and structured as merkle trees that can be validated with cryptographic hashes (enabling strong provenance claims and integrity validation)
- Data can be partially loaded, stored and transmitted, allowing applications to operate efficiently on small subsets of much larger data structures
- Data is 100% interoperable with the Convex global state, making it easy for hybrid applications to work with both in frictionless manner

## Programmability

**Users are given secure, atomic, programmable smart contract capabilities**

We allow value exchange to be specified and executed automatically, so that parties to the exchange can be certain that the transaction will complete successfully and be settled as a single atomic transaction. Alternatively, if something goes wrong, the whole transaction will be rolled back and nothing of value will be lost. 

Furthermore, programmability enables innovation in terms of new types of digital assets as well as decentralised autonomous economic actors (e.g. DAOs).

Because it is impossible to anticipate the full scope of potential future innovation in advance, Convex provides for general purpose, Turing-complete programming languages on the Convex Virtual Machine (CVM).

## Transparency

**The operation of open economic systems should be transparent to all participants**

Transparent operation is essential for open economic systems to thrive. Data in the global state should be available to all to enable better decisions making and allow independent audits to ensure trust and accountability.

There is a trade-off between economic transparency and individual privacy. The ability to operate pseudonymously is critical to allow individual privacy to be protected, while still providing transparency at the system level. While the Convex network is public, we expect individuals and organisations to take appropriate measures to ensure the protection of private data.

For data that should remain private, the data lattice provides the capability to protect and control access on whatever terms the user chooses. Such data is compatible with but separate from the public global state. In this way, Convex users are empowered to choose the appropriate level of privacy for each type of data.

## Cost Effectiveness

**Transaction costs should be negligible: they should not be a significant factor in user decisions whether or not to transact, but enough to fairly compensate providers of infrastructure and services**

High transaction costs are a curse. They represent friction that prevents useful value exchange from taking place, a deadweight loss to the whole economy. They exclude those with less financial resources, as the costs may become prohibitive for smaller transactions. For technology products, they present a major barrier to adoption and regular usage.

At the same time, it would be impractical and unfair to make transaction costs exactly zero: someone must provide real resources to operate and secure the network. Operators should be fairly compensated for the services they provide, and it is right that the users incurring these costs should pay for them.

We solve this dilemma by making Convex scalable and efficient: being able to support a large number of transactions with low underlying infrastructure requirements results in low costs per transaction. We furthermore design the protocol so that this low cost is passed on to users.

Convex transaction costs include both immediate processing costs (network and CPU) and long term storage costs. Both are accounted for automatically in the CVM, via juice accounting and memory accounting respectively.

Read-only access to the network ("queries") is free at the protocol level, and should also generally be 100% free for users (subject only to peer operators being willing to service requests).

The data lattice is also 100% free to users, although service providers may offer optional value added services for which they charge fees (such as redundant backup with high availability). We encourage innovation and experimentation in business models based on the data lattice.

## Digital Asset Innovation

**Participants must be empowered to create and utilise digital assets**

We want to enable true P2P value exchange, which will typically relate to one or more forms of digital asset. These assets may be entirely virtual, or represent ownership of some asset in the real world. We believe everyone should have the freedom to create and use digital assets of any type. 

Data assets may be "on-chain" (part of the global state) or kept "off-chain" on the data lattice. 

Given the infinite variety of possible assets, it is essential to allow users to innovate and create new kinds of assets without limitation. This may involve defining rules and governance mechanisms (both on-chain and off-chain). Convex will facilitate the development of new digital asset classes on a decentralised basis.

The creation and usage of digital assets may be regulated in some jurisdictions. This is an emerging area of law with considerable uncertainty. The Convex network is neutral with regards to such regulations: it is the responsibility of participants to comply with relevant laws and regulation in their own jurisdiction.

## Open Architecture

**Convex will operate as an open network in the spirit of the original Internet**

Convex effectively adds new capabilities to the Internet: a secure, persistent global state machine that can efficiently execute transactions and enforce smart contracts backed by a powerful decentralised data lattice for arbitrary data and compute operations.

As a protocol and network for value exchange, Convex is agnostic to the types of applications which are built on top of this base layer. Like the Internet, we support innovation and a wide variety of use cases. We do not limit or prescribe the possibilities in any way.

According to the "end-to-end" principle, we expect most significant application functionality to be implemented within the end nodes (i.e. client applications and servers which access the Convex network). However, since the CVM does allow for some aspects of functionality (such as smart contracts and digital assets) to run on the network itself, the final decision regarding how much of the application to run "on-chain" in this way is left to application developers.

We envision that some user facing applications will be pure dApps (i.e. clients which interact purely with decentralised networks) but that many will likely be hybrid dApps (some usage of decentralised networks but coupled with traditional centralised servers). Convex supports both configurations equally well.

Furthermore, the open architecture supports "Layer 2" extensions to the network, allowing for even greater flexibility in building decentralised systems (for example, scaling transaction volumes outside the main network). We note that Layer 2 solutions have some drawbacks (most notably, lacking atomic transactions within the global state), but they will always be available as options via the open architecture for those that choose them. 

## Open Source

**Convex technology will be open source, available for free, and developed by the community in the interests of all users**

We are inspired by the principles of open source software, making high quality software freely available to all users and encouraging collaboration. Most importantly, this applies to the libraries and tools required by users to interact with Convex, so that facilities to access the network are guaranteed to be freely available to all.

The Convex implementation itself is open source software, released under the Convex Public License (CPL). The CPL is a relatively permissive open source license that supports the goal of effective network governance in addition to the usual open source freedoms.

Contributors to Convex may retain copyright or other intellectual property. However, free license to use any such intellectual property (including patents) must be automatically granted to all Convex users and developers under the terms of the CPL, thereby ensuring the Convex network is always free to use, in line with our open principles.

We develop software in public, according to open source principles. Currently, all core Convex technology is available on GitHub at [https://github.com/Convex-Dev].

## Network Neutrality

**We provide neutral network infrastructure, which does not censor or discriminate between users or applications**

Networks should not discriminate amongst users, both from an ethical and practical perspective. This is consistent with our vision of Convex as a public utility available to all, in the spirit of the Internet. Indeed, Convex itself depends on the presence of the Internet as an underlying, censorship-resistant neutral communication network.

In particular, the Convex network protocol treats all valid user transactions equally, without giving preferential treatment or blocking any transactions.

## Freedom to participate in network operations

**Anyone may operate a peer on the network**

As a decentralised network, anyone should be permitted to operate a Convex peer, participate in maintaining the secure consensus of the network and provide other infrastructure such as nodes on the data lattice. The only requirement is that, they follow protocol rules to ensure interoperability.

Peer operators should be entitled to a fair share of rewards and transaction fees to compensate them for providing essential secure infrastructure.

Provided that protocol rules are followed, peer operators are free to customise the software and services they operate as they wish. This might include value added services for users, high end analytics capabilities, performance optimisations etc. 

## The Convex Coin

**Users have access to Convex Coins as the native currency for the network**

The Convex Coin is the native currency of the Convex network. The natural currency unit is `1 Convex Gold Coin`, each of which can be subdivided one billion times into a base coin unit (informally called "coppers"). The Convex Coin serves the traditional roles of a currency in that it is a store of value, a medium of exchange and a unit of account.

This native currency is a utility token used for transaction fees which fairly compensate those who provide common resources to the network. This occurs in an automatic way, as part of the network protocol. 

A protocol defined native currency is also important for regulating usage of the network. If transactions were free in a public permissionless network, nothing would deter a malicious actor from flooding the network with transactions and denying service to genuine users.

The supply of Coins is designed to increase over time in line with ecosystem demand. The supply may never however exceed a maximum supply cap of `1,000,000,000` Convex Coins. 

The use of the Convex Coin as part of the protocol does not in any way prevent other currencies from being established. Indeed, a key capability of Convex is the ability it gives for all users to create their own currencies, tokens and other digital assets.

## Community Recognition

**Convex Coins will be issued based on ecosystem contribution**

Convex serves its community and ecosystem, enabling them to build technology and create value for society through many different applications. 

We honour this with radical fairness: **100% of Convex Coins are initially issued for contribution**. No "pre-mines" for insiders. No VC dumps. Awards are scaled according to value contributed - whether open-source code, widely adopted dApps, community mentorship, or purchasing coins from the foundation to accelerate the ecosystem.

Once issued, Convex Coins circulate freely on a self-sovereign basis, available for all to use. 

## Good Governance

**Convex is governed as a perpetual public utility for its users** 

Networks thrive when governance serves the commons, not cabals. Convex commits to this from genesis: upgrades that endure, protections that scale, capabilities that serve.

Initially, governance role will be stewarded via the Convex Foundation, a non-profit organisation registered in the United Kingdom. It will have responsibility for protocol-level upgrades to the network and initial issuance oc Convex coins.

Decentralised governance is the destination: on-chain, credentialed, and attack-resistant. We transition only when battle-tested—ensuring every voice counts, every upgrade benefits users, and the network remains censorship-proof forever.

Key governance roles include:
- Authorising official updates to the peer network or protocol
- Safeguarding the global state: the purpose of the global state is to act as a reliable single source of truth. As a public utility that records important economic information on a decentralised basis, the network must avoid forks since these present a significant risk of confusion and loss to participants in the ecosystem. Forks are not desirable in a system designed to act as a single source of truth for asset ownership, contract state and account balances etc. 
- Ensuring that issuance of Convex Coins is fair, secure and consistent with out principles of rewarding ecosystem contribution



