---
title: Manifesto
authors: [convex]
tags: [convex, community, philosophy]
---

# The Convex Manifesto - DRAFT

We are building open economic systems based on decentralised technology for the 21st century and beyond.

The time is ripe for change: For too long, our societies have been burdened by inefficient and unfair economic systems. Centralised organisations hold undue power, exploiting monopolistic control over most of our economic life. Transaction costs are massive, holding back progress and burdening people with unnecessary expenses. Many people are unfairly excluded from financial and economic participation. Our economic models are causing tragic and unsustainable damage to the natural world we all share.

AI is rapidly changing the landscape of the digital economy, and indeed the whole world. At this critical time in our civilisation, it imperative that control over data, computational power and the economy as a whole is put back in the hands of individuals.

Convex is a public decentralised system for real-time P2P exchange of data and value, designed as a substrate for the digital economy in the age of AI. As such, it provides the foundation for the type of economics we want to see in the world - fair, inclusive, efficient, diverse and sustainable.

This manifesto outlines our beliefs and core principles.

## Open Economic Systems

**The key purpose of Convex is to facilitate open economic systems: interactions where participants freely and mutually create value for each other.**

Voluntary value exchange is a "win-win" where participants are each better off than they were before the exchange. This is a net good that must be encouraged: the alternatives are coercion and paternalistic control.

We define value broadly: it may be represented through currency, information, ownership of some asset, access to a service, membership of a society etc. As such, Convex must be sufficiently extensible that it can represent any kind of value exchange including potential future innovations.

## Self Sovereignty

**Participants must be empowered to act as self-sovereign agents: they must be able to transact freely on their own behalf**

The ability to participate in the digital economy is a fundamental right. Every individual has the right to choose what interactions to participate in (or not). Unfortunately, this principle is under threat as powerful institutions and centralised systems gain the power to exclude, censor or extract monopolistic rents. We must give this sovereignty back to individuals.

While we ensure the possibility for participants to act in a self-sovereign manner, they may choose to delegate or appoint a representative to act for them, for example a provider of financial services. This is acceptable as long as it is a free choice by participants, and they are not forced into such arrangements.

It is important to note that self-sovereignty does not negate the obligation for participants to act within the law and fulfil societal obligations such as paying appropriate taxes or avoiding harm to other parties. Our vision of self-sovereignty is therefore consistent with the *Golden Rule*.

## Sustainability

**Convex will provide efficient and sustainable systems for value exchange for all humanity.** 

The system of value exchange must be ecologically responsible, supporting economic activity without unnecessary waste or environmental costs. It is unacceptable that many of our current systems of value exchange produce massive waste, with the costs primarily borne by innocent third parties and future generations.

Centralised systems are a poor solution: large organisations and the complex services that support them represent a very high ecological footprint. Perhaps 5-10% of the entire global economy is dedicated to financial services and transaction costs related to value exchange. We must do better.

We will only use technology or services that are ecologically justifiable. This rules out protocols that waste computational resources such as Proof of Work (PoW) as an acceptable consensus mechanism.  

Fortunately, Convergent Proof of Stake (CPoS) enables us to offer better performance and security than PoW without wasting energy or other computational resources. CPoS also maintains the same (to a lesser degree) computational advantage over PoS and other consensus networks whose designs neglect crucial sustainability considerations. For the foreseeable future, we will use CPoS as an efficient consensus mechanism.

Because Convex is an open, decentralised system, it is not possible for us to directly enforce that business conducted on top of Convex is fully sustainable. However, we hope for a world where all economic activity is conducted on a sustainable basis, and Convex will make important contributions towards that goal.

## Fair Access

**Everyone should have equal, fair and direct access to the mechanisms of value exchange, enabling them to participate fully in the benefits of modern economies.**

For too long, economic participation to many parts of the economy has been severely restricted, with high costs and barriers to entry preventing fair access to financial capabilities such as banking, financial markets and secure ownership of assets.

The problem is exacerbated when we look globally: many people throughout the world have no significant access to financial technology and capabilities.

Access to Convex should therefore be possible for everyone on a self-sovereign, first-class basis without being required to use privileged gatekeepers or pay middlemen. This requires that the Convex network is open and censorship resistant.

## Real-time Transactions

**Users must be provided with real-time, interactive, atomic transactions.**

While perfectly instantaneous transactions are impossible in a global decentralised network (due to speed of light, network propagation etc.), low latency is fundamentally important for many applications and users. From a practical perspective, latency is the difference in time between a user taking an action (initiating a transaction) and seeing the effect (receiving a confirmed transaction result).

We note that real-time performance is of particular importance for the adoption of many consumer-focused applications of decentralised technology, e.g. mobile payments, gaming and metaverse economies.

Atomicity of transactions is also critical - without this, users are exposed to undue risks that may be created if part of a transaction fails to complete or requires separate settlement later. Lack of atomic transactions also exposes users to significant security risks - timing attacks, front running etc.

## The Global State

**Users must be able to interact with a decentralised, shared global state**

Global state is essential to the vision of building decentralised economic systems. Information such as asset balances, the status of smart contracts and publicly verifiable data must be available to network participants on a decentralised basis, without being subject to centralised control or arbitrary modification. Global state is also essential for public roots of trust such as  known name services and digital identity.

The should be *one and only one* official global state. This is essential if it is to serve as an authoritative source of truth for systems that depend upon it. A key role of network governance is to enforce this, and a key role of Convex peers is to maintain secure consensus over the global state and validate correct updates.

The Convex global state is maintained by Peers, managed on a decentralised basis according to protocol rules and available to on-chain smart contracts. This is a true global state, that is not subdivided into shards, programs or other restricted sub-containers. This allows for full interoperability and atomic transactions between all users and automated actors.

The global state is protected by strict access control rules: account holders on Convex may store information freely within the scope of their own accounts, but are prohibited from modifying the accounts of others without proper authorisation. Automated actors may provide custom access control rules allowing for sophisticated on-chain shared databases. 

A system of memory accounting ensures an economic cost is applied for those wishing to use on-chain memory within the global state. Refunds are provided when memory is released. This is reasonable and fair since on-chain memory is a scarce resource and we wish to incentivise efficient usage, including appropriate clean up when memory is no longer needed.

## The Data Lattice

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

**Users must have access to secure, atomic, programmable smart contract capabilities.**

This capability is critical to allow value exchange to be specified and executed automatically, so that parties to the exchange can be certain that the transaction will complete successfully and be settled as a single atomic transaction. Alternatively, if something goes wrong, the whole transaction will be rolled back and nothing of value will be lost. 

Furthermore, programmability allows for innovation in terms of new types of digital assets as well as decentralised autonomous economic actors (e.g. DAOs).

Because it is impossible to anticipate the full scope of potential future innovation in advance, Convex provides for general purpose, Turing-complete programming languages on the Convex Virtual Machine (CVM).

## Transparency

**The operation of open economic systems should be transparent to all participants**

Transparent operation is essential for open economic systems to thrive. Data in the global state should be available to all to enable better decisions making and allow independent audits to ensure trust and accountability.

There is a trade-off between economic transparency and individual privacy. The ability to operate pseudonymously is critical to allow individual privacy to be protected, while still providing transparency at the system level. While the Convex network is public, we expect individuals and organisations to take appropriate measures to ensure the protection of private data.

For data that should remain private, the data lattice provides the capability to protect and control access on whatever terms the user chooses. Such data is compatible with but separate from the public global state. In this way, Convex users are empowered to choose the appropriate level of privacy for each type of data.

## Cost Effectiveness

**Transaction costs should be negligible: they should not be a significant factor in user decisions whether or not to transact. However, they should fairly compensate providers of infrastructure and services.**

High transaction costs are a curse. They represent friction that prevents useful value exchange from taking place, a deadweight loss to the whole economy. They exclude those with less financial resources, as the costs may become prohibitive for smaller transactions. For technology products, they present a major barrier to adoption and regular usage.

At the same time, it would be impractical and unfair to make transaction costs exactly zero: someone must provide real resources to operate and secure the network. Operators should be fairly compensated for the services they provide, and it is right that the users incurring these costs should pay for them.

We solve this dilemma by making Convex scalable and efficient: being able to support a large number of transactions with low underlying infrastructure requirements results in low costs per transaction. We furthermore design the protocol so that this low cost is passed on to users.

Convex transaction costs include both immediate processing costs (network and CPU) and long term storage costs. Both are accounted for automatically in the CVM, via juice accounting and memory accounting respectively.

Read-only access to the network ("queries") is free at the protocol level, and should also generally be 100% free for users (subject only to peer operators being willing to service requests).

The data lattice is also 100% free to users, although service providers may offer optional value added services for which they charge fees (such as redundant backup with high availability). We encourage innovation and experimentation in business models based on the data lattice.

## Digital Asset Innovation

**Participants must be empowered to create and utilise digital assets.**

In many cases, value exchange will relate to one or more forms of digital asset. These assets may be entirely virtual, or represent ownership of some asset in the real world. We believe everyone should have the freedom to create and use digital assets. 

Data assets may be "on-chain" (part of the global state) or kept "off-chain" on the data lattice. 

Given the infinite variety of possible assets, it is essential to allow users to innovate and create new kinds of assets without limitation. This may involve defining rules and governance mechanisms (both on-chain and off-chain). Convex technology will allow the development of new digital asset classes on a decentralised basis.

The creation and usage of digital assets may be regulated in some jurisdictions. This is an emerging area of law with considerable uncertainty. The Convex network is neutral to such regulations: it is the responsibility of participants to comply with relevant laws and regulation in their own jurisdiction.

## Open Architecture

**Convex must operate as an open network in the spirit of the original Internet.**

Convex effectively adds new capabilities to the Internet: a secure, persistent global state machine that can efficiently execute transactions and enforce smart contracts backed by a powerful decentralised data lattice for arbitrary data and compute operations.

As a protocol and network for value exchange, Convex is agnostic to the types of applications which are built on top of this base layer. Like the Internet, we support innovation and a wide variety of use cases. We do not limit or prescribe the possibilities in any way.

According to the "end-to-end" principle, we expect most significant application functionality to be implemented within the end nodes (i.e. client applications and servers which access the Convex network). However, since the CVM does allow for some aspects of functionality (such as smart contracts and digital assets) to run on the network itself, the final decision regarding how much of the application to run "on-chain" in this way is left to application developers.

We envision that some user facing applications will be pure dApps (i.e. clients which interact purely with decentralised networks) but that many will likely be hybrid dApps (some usage of decentralised networks but coupled with traditional centralised servers). Convex supports both configurations equally well.

Furthermore, the open architecture supports "Layer 2" extensions to the network, allowing for even greater flexibility in building decentralised systems (for example, scaling transaction volumes outside the main network). We note that Layer 2 solutions have some drawbacks (most notably, lacking atomic transactions within the global state), but they will always be available as options via the open architecture for those that choose them. 

## Open Source

**All core Convex technology will be open source, available for free, and developed by the community in the interests of all users.**

We are inspired by the principles of open source software, making high quality software freely available to all users and encouraging collaboration. Most importantly, this applies to the libraries and tools required by users to interact with Convex, so that facilities to access the network are guaranteed to be freely available to all.

The Convex primary implementation itself is open source software, released under the Convex Public License (CPL). The CPL is a relatively permissive open source license that supports the goal of effective network governance in addition to the usual open source freedoms.

Contributors to Convex may retain copyright or other intellectual property. However, free license to use any such intellectual property (including patents) must be automatically granted to all Convex users and developers under the terms of the CPL, thereby ensuring the Convex network is always free to use, in line with our open principles.

We develop software in public, according to open source principles. Currently, all core Convex technology is available on GitHub at [https://github.com/Convex-Dev].

## Network Neutrality

**We must provide neutral network infrastructure, which does not censor or discriminate between users or applications.**

Networks should not discriminate amongst users, both from an ethical and practical perspective. This is consistent with our vision of Convex as a public utility available to all, in the spirit of the Internet. Indeed, Convex itself depends on the presence of the Internet as an underlying, censorship-resistant neutral communication network.

In particular, the Convex network protocol must treat all user transactions equally, without giving preferential treatment or blocking any transactions.

## Freedom to participate in network operations

**Anyone may operate a peer on the network, subject only to following protocol rules**

As a decentralised network, anyone should be permitted to operate a Convex peer, participate in maintaining the secure consensus of the network and provide other infrastructure such as nodes on the data lattice.

Peer operators should be entitled to a fair share of rewards and transaction fees to compensate them for providing essential secure infrastructure.

Provided that protocol rules are followed, peer operators are free to customise the software and services they operate as they wish. This might include value added services for users, high end analytics capabilities, performance optimisations etc. 

## The Convex Coin

**Users must have access to the native currency for the network, usable as a form of money.**

A native currency is required as a utility token so that that those who provide common resources to the network can be fairly compensated, in an automatic way, as part of the network protocol. It also serves the traditional roles of a currency in that it is a store of value, a medium of exchange and a unit of account.

The Convex Coin is the native currency of the Convex network, and has a fixed maximum supply of `1,000,000,000,000,000,000` basic units. For convenience, we designate the quantity `1,000,000,000` as `1 Convex Gold`, i.e. the maximum supply is one billion Convex Gold, each of which can be subdivided one billion times.

A protocol defined native currency is also important for regulating usage of the network. If transactions were free in a public permissionless network, nothing would prevent a malicious actor from unfairly flooding the network with malicious transactions and preventing genuine users from using it.

The use of the Convex Coin as part of the protocol does not in any way prevent other currencies from being established by users of the Convex network. Indeed, a key capability of Convex is the ability it gives for all users to create their own currencies, tokens and other digital assets.

## Community Recognition

**Convex Coins will be issued over time to people or organisations that contribute to developing Convex and the broader ecosystem.**

As a decentralised ecosystem, Convex depends on its community and ecosystem for building technology and creating value for society through its many applications.

We furthermore require an effective way of distributing Convex Coins so that the native currency can be used throughout the ecosystem. Rewarding contributors in the community is a fair and pragmatic way of doing so: their combined contributions enable us deliver on this manifesto.

Contributions may be technology (e.g. writing code, developer advocacy), business (e.g. delivering a commercial use case on Convex) or financial (i.e. being an initial purchaser of coins, where the funds raised will be used for the benefit of the ecosystem). We endeavour to ensure that grants of coins are fair and proportional to the value of contributions.

Once Convex Coins are initially issued, they are the property of the holder and secured by the holder's cryptographic keys. The holder may then utilise them as they choose, which may include paying for network services or transferring them to others as part of a value exchange.

## Good Governance

**Convex should be governed in the long-term interests of users as a public utility network.** 

Good governance of the network is essential for several reasons: the network and protocol must be maintained and upgraded, and the interests of all ecosystem participants must be fairly protected.

Governance must be sustainable, in the sense that adequate provision should be made to allow for continued investment in the core technology and infrastructure, supporting the common needs of ecosystem participants. To ensure this, the Convex Foundation will manage a long-term endowment fund, comprising both an initial allocation of Convex Coins and proceeds from the sale of Convex Coins to initial purchasers. 

Initially, the governance role will be performed by the Convex Foundation, a non-profit organisation registered in the United Kingdom.

In the longer term, we will implement decentralised governance. This will happen once we have sufficient confidence that it is practical to implement, secure against plausible threats and fully serves the interest of Convex users and society as a whole.

Key governance roles include:
- Authorising official updates to the peer network / protocol
- Preventing forks in the global state: the entire point of a global state is to act as a single source of truth. As a public utility that records important economic information on a decentralised basis, the network must avoid forks  since these present a significant risk of confusion and loss to participants in the ecosystem. Forks are not desirable in a system designed to act as a single source of truth for asset ownership, contract state and account balances etc. 
- Ensuring that issuance of Convex Coins is fair, secure and consistent with out principles of rewarding ecosystem contribution



