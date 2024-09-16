# CAD020: Tokenomics

## IMPORTANT LEGAL NOTICE

This repository discusses tokenomic specification and design concepts relating to the Convex network. It does not in any way represent a commitment to implement the Convex Network in precisely the manner described, and may be subject to change based on learnings from Protonet or elsewhere.

The information contained in this repository is provided on an "as is" basis for informational and discussion purposes only, with no guarantees of completeness, accuracy, usefulness or timeliness.

This does not in any way constitute financial advice. Participants in the ecosystem must take their own professional advice regarding any legal or financial issues.  

## Overview

Convex serves as a public utility network, where participants are free to transact on a decentralised basis. As such, there is a requirement for and economic protocol whereby users of the network can fairly compensate the providers of infrastructure for their services.

Convex Coins are initially issued in two ways:
- 75% are available for purchase on a **release curve**. This is is a mathematically defined mechanism that releases coins as and when demanded by the ecosystem. Funds raised are reinvested in the ecosystem to create a virtuous cycle.
- 25% are available as **awards** to contributors who add value to the ecosystem in various ways (can be software engineering, open source contributions, marketing, building great uses cases etc.)

Once issued, coins are fully transferable and can circulate freely according to the wishes of their holders (e.g. traded on a private basis, used in smart contracts etc.)

This model strikes the right balance between enabling long term sustainable growth and recognising those who bring value to the Convex ecosystem (financially or otherwise)

## Rationale / Discussion

All currencies must have a mechanism for initial issuance, and Convex is no exception. However, many existing mechanisms have significant flaws:

- **Protocol based issuance** - it is possible to issue tokens purely through the operation of the protocol, such as Bitcoin mining. Due to the mechanical nature, this is relatively predictable, automatic and trustworthy (at least to the extent that forks / upgrades to not fundamentally change the protocol). However, such approaches disproportionately incentivise infrastructure provision to the exclusion of all else: huge amounts of resources get consumed in Bitcoin mining, for example. This is undesirable because, at least for Convex, infrastructure provision is relatively cheap and efficient and can be well compensated through transaction fees alone - we want the majority of rewards to flow to people who add value to the ecosystem.
- **Premining** - tokens can be generated "as if" they were mined and distributed to select parties (typically founding teams and early investors). The problem with this approach is that it creates a significant incentives for these parties to "cash out" at the earliest opportunity, often at the expense of later ecosystem entrants, and it reduces the incentives for insiders to continue to build the project. There is a significant danger of a negative "pump and dump" dynamic.
- **ICOs** - tokens can be generated and sold in a large public sale event. Such an event may generate a significant treasury for a foundation, and create broad public ownership. However, the price of such ICOs is hard to get right, and likely to attract significant speculative activity. Similar to premining (which may occur alongside an ICO), there is a significant risk of "pump and dump" dynamics, often at the expense of less sophisticated retail investors.
- **Airdrops** - tokens can be distributed for free in large quantities according to a variety of eligibility criteria (in-person events, community membership, holding some other token etc.). While airdrops can create publicity and temporary excitement, giving out tokens for free risks devaluing the token while rewarding individuals disproportionately without them having to contribute anything. This is a disservice to those who truly do add value. It may also incentivise non-useful behaviour to attempt to benefit from airdrops (signing up with multiple fake accounts etc.)

What we really need is a fair way to distribute coins that:
- is **proportionate** to contribution / value add to the ecosystem
- continues to **maintain good incentives** for contribution long after initial launch
- aligns **incentives** of participants (e.g. avoiding "pump and dump" by large holders or insiders)
- grows with the ecosystem on a **sustainable** basis

Hence we have defined a new approach of **market driven release**: new coins are issued as and when the economic growth of the ecosystem requires it. Purchasable coins are issued on demand if and only if they are purchased from the release curve that pre-defines a schedule of rising prices. If demand for coins is strong (i.e. market cap growth causes prices to rise above the current release curve price) then there is an economic arbitrage opportunity for purchasers to buy new coins from the release curve. This continues until equilibrium is reached, i.e the newly increased supply and new higher price equal the new market cap. 

This can be considered, in some ways, analogous to a company issuing new shares to raise capital. Existing shareholders will be diluted, but the extra injection of capital and resources increases the market value of the company so that they are still better off (hopefully, assuming the capital is well invested). There are two notable differences:
- The Convex ecosystem is not a company, but a decentralised network of participants
- The release curve guarantees that previous purchasers will never be diluted by new coin issuance at a lower price: additional issuance must occur at a higher price (or at worst equal, if purchased from the same tranche). 

## Design Objectives

The tokenomic model has been designed with the following objectives:

### Utility Token

The Convex Coin is a utility token - it represents the right to use the coin to access services provided by the Convex Network. As such, it should be broadly available as a decentralised asset.

### Means of exchange

The Convex Coin serves as a means of exchange within the ecosystem, which can be used to facilitate efficient transactions between parties on a decentralised basis. As such, it must be convenient to use both by network users and autonomous actors / smart contracts as a digital currency.

### Ecosystem driven supply

The Convex coin supply is driven by ecosystem growth: new issuance occurs primarily due to ecosystem demand.

In the longer term, we would expect the Convex Coin to achieve a relatively stable value representing the utility of lattice technology powering a diverse ecosystem.

### Anti-dilution

We wish to provide a degree of assurance to coin holders that their holdings will not be diluted by large issuance of coins at a lower prices. Hence, the release curve will not offer coins for sale at a lower price than previous purchases.

### Equitable rewards for contribution

We must ensure that coins are distributed fairly, on the basis of making contributions to the Convex ecosystem. While there are many ways to contribute, we consider three categories of participants essential to reward fairly:

- **Contributors** : Those who help build the ecosystem, whether through contributions to Convex itself of building value in the broader ecosystem.
- **Coin Purchasers** : Those who help fund the development of Convex, by purchasing newly issued Convex Coins
- **Peer Operators**: Those who provide the infrastructure to operate the network on a decentralised basis

### DoS prevention

It is necessary to protect the network against the risk of DoS attacks enabled by flooding the network with unnecessary transactions, hence impeding the ability of regular users to transact normally and imposing unfair costs on peer operators.

### Sustainability

In the long term, the tokenomics should converge towards a stable steady state equilibrium, where the pricing of transactions is fair and balances the cost of providing services and infrastructure for the network.


## Specification

### Overview

The following overall tokenomic flows are possible:

- **Genesis** : The complete coin supply is generated and placed into governance accounts which are initially considered "unissued"
- **Issuance** : Coins are issued to either **Contributors** or **Coin Purchasers**
- **Transfers** : Holders of coins may freely transfer coins between accounts. These accounts may include autonomous actor accounts as well as external users.
- **Memory Accounting** : Coins may be exchanged for memory on the Global State. The memory accounting pool is considered a special governance account. See the Memory Accounting CAD for more details.
- **Transaction Fees** : Coins are taken from users who commit transactions to the network, and held in a peer reward pool for subsequent distribution to Peers. See the Transactions and Juice Accounting CAD for more details.
- **Peer Rewards** : **Peer Operators** may claim a share of the peer reward pool as they participate in running the network. See the Peer Staking CAD for more details. 

### Coin Supply

The issued coin supply is VARIABLE based on coin issuance via the Release Curve or contributor awards.

The Network MUST implement a technical fixed maximum coin supply cap of 1,000,000,000 Convex Coins. The number of issued coins at any time may be less than this amount, but can never exceed this amount.

Each Convex Coin MUST be sub-divided into 1,000,000,000 base units, referred to informally as "coppers" 

The Network must treat Convex Coins and coppers identically, i.e. the implementation should consider the range of possible coin values to be a value from `0` to `10^18`.

Note: The maximum supply cap is chosen so that all valid coin balances can be expressed within a 64-bit long value, which allows for efficient implementation on most modern CPU architectures.

### Genesis

#### Top Level Coin Allocation

The Network MUST divide the total initial supply of Convex Coins into two quantities:

- 75% for Coin Purchasers via the Release Curve
- 25% for contributor and ecosystem awards

### Release Curve

Coin purchases MUST be priced in fiat currency or equivalent, consistent with the Release Curve defined in this section.

The price of a Coin on the release curve is defined as `$100 * x / (1-x)` where `x` is the proportion of coins released out of the total allocation for coin purchasers, and `$` represents United States dollars or equivalent currency.

Note: The constant value `$100` is chosen so that once `50%` of all coins are issued, the market cap of Convex Coins would be equal to `$50bn` 

The Release Curve formula MAY be adjusted in the event of significant economic events affecting the relative value of fiat currencies used (e.g. sustained high rates of inflation). The Foundation MUST consult with the ecosystem and provide a robust rationale for any such changes.

To account for transaction costs, effective financial management or purchaser convenience, the Foundation MAY group the release of some coins into rounds, provided that such round MUST be broadly consistent with the overall Release Curve.  


### Coin Purchases

The 75% allocation for Coin Purchasers MUST be distributed on the basis of purchases of coins in a manner consistent with the Release Curve.

The distribution MUST be administered by the Convex Foundation, or an entity acting on its behalf in accordance with relevant local regulations.

Coins purchases MUST be delivered to purchasers only after the release of the Main Network.

Coin purchasers MUST meet all relevant regulatory, legal and other requirements that may be defined to ensure that they are permitted to purchase Convex coins in their respective jurisdictions.

The Convex Foundation SHOULD offer coins on an equal, non-discriminatory basis to any Coin Purchaser that meets the necessary criteria.

The Convex Foundation MAY place restrictions on the rate that coins are distributed to early purchasers, giving consideration to the potential impact of large numbers of coins being issued at the same time.

In the long term, distribution of coins from coin purchasers MAY be operated on a fully decentralised basis, if technology and decentralised governance capabilities prove sufficiently robust to enable such a system.

The funds raised from coin purchases MUST be used in accordance with the objectives of the Foundation. For example, these may be used to fund ongoing development of the network, invest in key ecosystem initiatives, and as an incentive to reward those who contribute to the Convex ecosystem.

The funds raised SHOULD be managed as a long term fund by the Foundation to ensure the development of the network can be funded on a sustainable ongoing basis.

### Coin Awards

The 25% allocation for awards MUST be distributed by the Convex Foundation, in its role as the governance body of the Convex Network.

The Convex Foundation MUST make awards in the interest of developing the ecosystem, with a focus on awards to:
- Contributors who have made positive contributions to the development of Convex core technology
- Contributors who make positive contributions the the development of the community and ecosystem
- Infrastructure providers (such as peer operators) who help to ensure the security and reliability of the network
- Organisations or startups that help build the ecosystem by developing effective use cases

The Convex Foundation MAY require contributors to sign a Contributor's Agreement before award or distribution of coins.

The Convex Foundation MAY require contributors to verify their legal identity (KYC requirement)

The Convex Foundation SHOULD aim to ensure that the rate of awards remains broadly consistent with the ratio 25% : 75% relative to purchases from the release curve, with the understanding that this ratio may deviate from target in the short term.

The Convex Foundation SHOULD explore options for decentralised governance of awards. In the long term, it is intended that decentralised governance will apply to all awards.

### Vesting 

Early coin purchases via the FCPA (up to and during Protonet phase) are subject to a vesting schedule, reflecting the desire that early purchasers should remain committed to the ecosystem for a period of time, and to mitigate the risk of large simultaneous sales of coins.

Coin awards will not be subject to any vesting schedule as they are considered already "earned" by contributors. However, contributors are likely to wish to remain involved for other reasons e.g. building applications on top of Convex or wishing to earn future awards.

### Transaction Fees

Transactions executed on the Convex network are subject to fees that reflect the cost of providing underlying network infrastructure to maintain the consensus network and global state.

Transaction fees are intended to be small, to encourage adoption and use of the Convex network. Transaction fees MUST NOT be zero to mitigate against denial of service (DoS) attacks on the network.

Transaction fees MUST be collected at the point of transaction execution, and placed in a pool for subsequent distribution to peer operators. This process MUST occur automatically as part of the network protocol. 

## Other considerations

### Fully Diluted Value

Some tokenomic analyses depend on the concept of "Fully Diluted Value", by multiplying the current price of tokens by some maximum supply cap.

Such analysis is generally invalid in the Convex of Convex, since full dilution cannot occur under the Release Curve model at the current price.

Analysts SHOULD NOT consider FDV in relation to Convex, and instead use the market capitalisation of issued coins, which more accurately represents the coin ecosystem.

### Testnets

Testnets (i.e. any Convex based network other than the official Main Network) MAY alter or ignore any aspect of the tokenomics for testing, development or experimental purposes. Indeed, this is encouraged for the purposes of research and learning.

Test networks MAY implement a system of distributing coins for testing purposes, e.g. a "faucet" which automatically issues testnet coins to users.

Participants in the ecosystem SHOULD NOT conduct economically significant activity on test networks, with the understanding that they have no assurance of the tokenomic model or governance over such networks, and may face significant security or legal risks if they do so.

### Disaster Recovery

In the event of a high severity event that substantially affects overall tokenomics, the Foundation MAY take remedial action, up to and including requiring a mandatory network update to fix the issue. Such action will only be taken as a last resort, and shall be done in a manner that minimises the impact on legitimate coin holders.
