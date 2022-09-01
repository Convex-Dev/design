# The Convex Manifesto - DRAFT

We are building a fair, inclusive, efficient, diverse and sustainable economic system based on decentralised technology for the 21st century and beyond.

Convex is a public network for real-time value exchange, designed as a substrate for decentralised economic transactions and smart contracts. As such, it provides the foundation for the type of decentralised economics we want to see in the world.

This manifesto outlines our beliefs and core principles.

## P2P Value exchange

**The primary purpose of Convex is to facilitate value exchange: interactions where economic participants come to an agreement where they gain something of value from each other.**

Done properly, value exchange is a "win-win" where participants are each better off than they were before the exchange. Generally, value exchange is a net good that should be encouraged. 

We define value broadly: it may be represented through currency, information, ownership of some asset, access to a service, membership of a club etc. As such, Convex must be sufficiently extensible that it can represent any kind of value exchange including potential future innovations.

## Self Sovereignty

**Participants must be empowered to act as self-sovereign economic agents: they must be allowed to transact freely with others without prior restraint by third parties**

This principle is critical so that participants are able to act freely in the economy without being excluded.

While we require the right of participants to act in a self-sovereign manner, they may choose to delegate or appoint a representative to act for them, for example a provider of financial services. This is acceptable as long as it is a free choice by participants, and they are not forced into such arrangements.

It is important to note that self-sovereignty does not negate the requirement for participants to act within the law and fulfil societal obligations such as paying appropriate taxes.

## Fair access

**Everyone should have equal, fair and direct access to the mechanisms of value exchange, enabling them to participate fully in the benefits of modern economies.**

For too long, economic participation to many parts of the economy has been severely restricted, with high costs and barriers to entry preventing fair access to financial capabilities such as banking, financial markets and secure ownership of assets.

The problem is exacerbated when we look globally: many people throughout the world have no significant access to financial technology and capabilities.

Access to Convex should therefore be possible for everyone on a self-sovereign, first class basis without being required to use privileged gatekeepers or pay middlemen. 

## Real-time transactions

**Users must be provided with real-time, interactive, atomic transactions.**

While absolutely instantaneous transactions are impossible in a global decentralised network (due to speed of light, network propagation etc.), low latency is fundamentally important for many applications and users.

We note that realtime performance is of particular importance for the adoption of many consumer focused applications of decentralised technology, e.g. mobile payments, gaming and metaverse economies.

Atomicity of transactions is also critical - without this, users are exposed to undue risks that may be created if part of a transaction fails to complete or requires separate settlement at a later time.

## Global State

**Users should be able to interact with a decentralised, shared global state**

The Convex Global State is a set of decentralised information managed according to protocol rules and available to on-chain smart contracts. This is a true global state, that is not subdivided into shards, programs or other restricted sub-containers. This allows for full interoperability and atomic transactions across all users and smart contracts.

The Global State is managed according to strict access control rules: account holders on Convex may store information freely within the scope of their own account. Automated actors may provide custom access control rules allowing for sophisticated on-chain shared databases. 

A system of memory accounting ensures a cost is applied for those wishing to use on-chain memory within the global state. Refunds are provided when memory is released. This is reasonable and fair since on-chain memory is a scarce resource and we wish to incentivise efficient usage, including appropriate clean up when memory is no longer needed.

## Programmability

**Users must have access to secure, atomic, programmable smart contract capabilities.**

This capability is critical to allow value exchange to be specified and executed automatically, so that parties to the exchange can be certain that the transaction will complete successfully and be settled as a single atomic transaction (or alternatively, if something goes wrong, the whole transaction will be rolled back and they will at least not lose anything of value). 

Furthermore, programmability allows for innovation in terms of new types of digital assets as well as decentralised autonomous actors (e.g. DAOs).

Because it is impossible to anticipate the full scope of potential future innovation in advance, Convex provides for general purpose, Turing-complete programming languages on the Convex Virtual Machine (CVM).

## Open architecture

**Convex must operate as an open network in the spirit of the original Internet.**

Indeed, Convex effectively adds a new capability to the Internet: a secure, persistent global state machine that can efficiently execute transactions and enforce smart contracts.

As a protocol and network for value exchange, Convex is agnostic to the types of applications which are built on top of this base layer. Like the Internet, we support innovation and and a wide variety of use cases but do not limit or prescribe the possibilities in any way.

According to the "end-to-end" principle, we expect most significant application functionality to be implemented within the end nodes (i.e. client applications and servers which access the Convex network). However, since the CVM does allow for certain aspects of functionality (such as smart contracts and digital assets) to run on the network itself, the final decision regarding how much of the application to run "on-chain" in this way is left to application developers.

We envision that some user facing applications will be pure dApps (i.e. clients which interact purely with decentralised networks) but that many will likely be hybrid dApps (some usage of decentralised networks but coupled with traditional centralised servers). Convex supports both configurations equally well.

## Negligible costs

**Transaction costs should be negligible: they should not be a significant factor in user decisions whether or not to transact. However they should fairly compensate providers of infrastrcure and services.**

High transaction costs are a curse. They represent friction that prevents useful value exchange from taking place, a deadweight loss to the whole economy. They exclude those with less financial resources, as the costs may become prohibitive for smaller transactions. For technology products, they present a major barrier to adoption and regular usage.

At the same time, it would be unfair to make transaction costs exactly zero: someone must provide real resources to operate and secure the network. Operators should be fairly compensated for the services they provide, and it is right that the users causing these costs to be incurred should pay for them.

We solve this dilemma this by making Convex scalable and efficient, able to support a large number of transactions while incurring low underlying infrastructure costs per transaction. We furthermore design the protocol so that this low cost is passed on to users.

Convex transaction costs include both immediate processing costs (network and CPU) and long term storage costs. Both are accounted for automatically in the CVM, via juice accounting and memory accounting respectively.


## Sustainability

**Convex will provide the most efficient and sustainable system for value exchange available to humanity.** 

The system of value exchange must be ecologically responsible, supporting economic activity without unnecessary waste or environmental costs. It is unacceptable that many of our current systems of value exchange produce massive waste, with the costs primarily borne by innocent third parties and future generations.

We note that centralised systems are not a good solution: large organisations and the complex services that support them represent a very high ecological footprint. Perhaps 5-10% of the entire global economy is dedicated to financial services and transaction costs related to value exchange. We must do better.

We will never use technology or services that are ecologically unjustifiable. Among other things, this rules out Proof of Work (PoW) as an acceptable consensus mechanism.  

Fortunately, Convergent Proof of Stake (CPoS) enables us to offer better performance and security than PoW without wasting energy or other computational resources. For the foreseeable future, we will use CPoS as an efficient consensus mechanism.

Because Convex is an open, decentralised system, it is not possible for us to directly ensure that value exchange conducted on top of Convex is fully sustainable. However we hope for a world where all economic activity is conducted on a sustainable basis, and Convex will make important contributions towards that goal.


## Open Source

**All core Convex technology will be open source, developed by the community in the interests of all users.**

We are inspired by the principles of open source software, making high quality software freely available to all users and encouraging collaboration. Most importantly, this applies to the libraries and tools required by users to interact with Convex, so that facilities to access the network are guaranteed to be freely available to all.

The Convex primary implementation itself is open source software, released under the Convex Public License (CPL). The CPL is a relatively permissive open source license that supports the goal of effective network governance in addition to the usual open source freedoms.

There is a patent (pending) on some of the underlying technology in Convex, including the critical Convergent Proof of Stake algorithm. However, License to use this and any other patents is automatically granted to all Convex users and developers under the terms of the CPL, thereby ensuring the the Convex network is always free to use in line with our open principles.

We develop software in public, according to open source methodologies and practices. Currently, all core Convex technology is available on GitHub at [https://github.com/Convex-Dev].

## Network Neutrality

**Convex provides neutral network infrastructure, which does not censor or discriminate between users or applications.**

We do not believe that it is the role of networks to discriminate amongst users, both from an ethical and practical perspective. This is consistent with our vision of Convex as a public utility available to all, in the spirit of the Internet.

In particular, the network should treat all user transactions equally, without giving preferential treatment or blocking any particular transactions.

## The Convex Coin

**The Convex Coin is the native currency of Convex.**

The Convex Coin can be used to purchase services on the Convex network. In that sense, it can be regarded as a "utility token". It also serves the traditional roles of a currency in that it is a store of value, a medium of exchange and a unit of account.

We need a protocol defined native currency for two main technical reasons: firstly, as a mechanism to fairly compensate those who provide infrastructure and services to the network on an ongoing basis (peer operators), and secondly as a means to regulate usage of the network (if transactions were free in a public permissionless network, nothing would prevent a malicious actor from flooding the network with malicious transactions and preventing genuine users from using it).

The Convex Coin has a fixed maximum supply of `1,000,000,000,000,000,000` units. For convenience, we designate the quantity `1,000,000,000` as `1 Convex Gold`, i.e. the maximum supply is one billion Convex Gold, each of which can be subdivided one billion times.

The use of the Convex coin as part of the protocol does not in any way prevent other currencies from being established by users of the Convex network. Indeed, a key capability of Convex is the ability it gives for all users to create their own currencies, tokens and other digital assets.

## Coin issuance

**Convex Coins will be issued over time to people or organisations that contribute to developing Convex and the broader ecosystem.**

Contributions may be technology (e.g. writing code, developer advocacy), business (e.g. delivering a commercial use case on Convex) or financial (i.e. being an initial purchaser of coins, where the funds raised will be used to grow Convex further). We endeavour to ensure that grants of coins are fair and proportionate to the scale of contribution.

We issue coins in this way because we require an effective way of distributing the initially issued Convex Coins so that the currency can be used throughout the ecosystem. Rewarding contributors is a pragmatic way of doing so: without their combined contributions we cannot hope to deliver on this manifesto.

Once Convex Coins are initially issued, they are the property of the holder and secured by the holder's cryptographic keys. The holder may then utilise them as they choose, which may include paying for network services or transferring them to others as part of a value exchange.

## Network Governance

**Convex should be governed in the long term interests of all users as a public utility network.** 

One key role of network governance is to prevent forks. As a public utility that records important economic information on a decentralised basis, the network must avoid forks since these present significant risk of confusion and loss to participants in the ecosystem. Forks are not desirable in a system designed to act as a single source of truth for asset ownership, contract state and account balances etc. 

Initially, the governance role will be performed by the Convex Foundation, a non-profit organisation registered in the United Kingdom. 

Governance must be sustainable, in the sense that adequate provision should be made to allow for continued investment in the core technology and infrastructure, supporting the common needs of ecosystem participants. To ensure this, the Convex Foundation will manage a long term endowment fund, comprising both an initial allocation of Convex Coins and proceeds from the sale of Convex Coins to initial purchasers. 

In the longer term, we we will implement decentralised governance. Decentralised governance will be adopted once we have sufficient confidence that it is practical to implement, secure against plausible threats and serves the interest of Convex users and society as a whole.
