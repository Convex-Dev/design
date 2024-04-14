# Tokenomics

## IMPORTANT NOTE

This repository discusses hypothetical tokenomic specification and design decisions relating to the Convex network. It does not in any way represent a commitment to implement the Convex Network in precisely the manner described, 

The information contained in this repository is provided on an "as is" basis for informational and discussion purposes only, with no guarantees of completeness, accuracy, usefulness or timeliness.

This does not in any way constitute financial advice. Participants in the ecosystem must take their own professional advice regarding any legal or financial issues.  

## Overview

Convex serves as a public utility network, where participants are free to transact on a decentralised basis. As such, there is a requirement for and economic protocol whereby users of the network can fairly compensate the providers of infrastructure for their services.


## Design Objectives

The tokenomic model has been designed with the following objectives:

### Utility Token

The Convex Coin is a utility token - it represents the right to use the coin to access services provided by the Convex Network.

### Means of exchange

The Convex Coin should serve as a means of exchange within the ecosystem, which can be used to facilitate efficient transactions between parties on a decentralised basis. As such, it must be convenient to use both by network users and autonomous actors / smart contracts as a digital currency.

### Capped maximum supply

We apply a capped maximum supply so that the value of the Convex Coin is not subject to long term inflationary risks. In the long term, we would expect the Convex Coin to achieve a stable value representing the utility of lattice technology powering a diverse ecosystem.

### Anti-dilution

We wish to provide a degree of assurance to coin holders that their holdings will not be diluted by large issuance of coins at a low price. 

### Equitable rewards for contribution

We must ensure that coins are distributed fairly, on the basis of making contributions to the Convex ecosystem. While there are many ways to contribute, we consider three categories of participants essential to reward fairly:

- **Contributors** : Those who help build the ecosystem, whether through contributions to Convex itself of building value in the broader ecosystem.
- **Coin Purchasers** : Those who help fund the development of Convex, by purchasing newly issued Convex Coins
- **Peer Operators**: Those who provide the infrastructure to operate the network on a decentralised basis

### DoS prevention

It is necessary to protect the network against the risk of DoS attacks enabled by flooding the network with unnecessary transactions, hence impeding the ability of regular users to transact normally and imposing unfair costs on peer operators.

### Sustainability

In the long term, the tokenomics should converge towards a stable steady state equilibrium, where the pricing of transactions is fair and balances the cost of providing services and infrastructure for the network.



## Solution Specification

### Overview

The following overall tokenomic flows are possible:

- **Genesis** : The complete coin supply is generated and placed into governance accounts which are initially considered "unissued"
- **Issuance** : Coins are issued to either **Contributors** or **Coin Purchasers**
- **Transfers** : Holders of coins may freely transfer coins between accounts. These accounts may include autonomous actor accounts as well as external users.
- **Memory Accounting** : Coins may be exchanged for memory on the Global State. The memory accounting pool is considered a special governance account. See the Memory Accounting CAD for more details.
- **Transaction Fees** : Coins are taken from users who commit transactions to the network, and held in a peer reward pool for subsequent distribution to Peers. See the Transactions and Juice Accounting CAD for more details.
- **Peer Rewards** : **Peer Operators** may claim a share of the peer reward pool as they participate in running the network. See the Peer Staking CAD for more details. 

### Coin Supply

The Network MUST implement a fixed maximum coin supply of 1,000,000,000 Convex Coins.

Each Convex Coin MUST be sub-divided into 1,000,000,000 base units, referred to as "coppers" 

The Network must treat Convex Coins and coppers identically, i.e. the implementation should consider the range of possible coin values to be a value from `0` to `10^18`.

Note: The maximum supply is chosen so that all valid coin balances can be expressed within a 64-bit long value, which allows for efficient implementation on most modern CPU architectures.

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

## Coin Awards

The 25% allocation for awards MUST be distributed at the sole discretion of the Convex Foundation, in its role as the governance body of the Convex Network.

The Convex Foundation MUST make awards in the interest of developing the ecosystem, with a focus on awards to:
- Contributors who have made positive contributions to the development of Convex core technology
- Contributors who make positive contributions the the development of the community and ecosystem
- Infrastructure providers (such as peer operators) who help to ensure the security and reliability of the network

The Convex Foundation MAY require contributors to sign a Contributor's Agreement before award or distribution of coins.

The Convex Foundation MAY requires to prove their legal identity (KYC requirement)

The Convex Foundation SHOULD aim to ensure that the rate of awards remains broadly consistent with the ratio 25% : 75% relative to purchases from the release curve, with the understanding that this ratio may deviate from target in the short term.

The Convex Foundation SHOULD explore options for decentralised governance of awards.

## Other considerations

### Testnets

Testnets (i.e. any Convex based network other than the Main Network) MAY alter or ignore any aspect of the tokenomics for testing, development or experimental purposes. Indeed, this is encouraged for the purposes of research and learning.

Test networks MAY implement a system of distributing coins for testing purposes, e.g. a "faucet" which automatically issues testnet coins to users.

Participants in the ecosystem SHOULD NOT conduct any economically significant activity on test networks, with the understanding that they have no assurance of the tokenomic model or governance over such networks, and may face significant security or legal risks if they do so.

### Disaster Recovery

In the event of a high severity event that substantially affects overall tokenomics, the Foundation MAY take remedial action, up to and including requiring a mandatory network update to fix the issue. Such action will only be taken as a last resort, and shall be done in a manner that minimises the impact on legitimate coin holders.
