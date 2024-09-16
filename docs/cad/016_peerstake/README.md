# CAD016: Peer Staking

## Overview

Staking is the process by which Peers in the Network and other participants lock up economic value (Stake) to support the security of the Network and earn economic rewards from participating in the CPoS consensus.

Peers must place a Peer Stake to participate in consensus. This is at risk if the Peer provably misbehaves, and may be lost through a process of Slashing, but is safe as long as the Peer continues to operate correctly and securely.

Other participants may also place a Delegated Stake on a Peer they wish to support. It is in the interests of large coin holders to support the security of the Network by placing stake on Good Peers that they trust, as well as to earn additional rewards on their holdings.

The Total Stake of a Peer determines its voting weight in the CPoS consensus. 

## Rewards

Stakers are rewarded with a share of Convex Coins earned from
- Transaction fees executed on the network affecting the CVM global stake
- Reward Pools set by the Convex Foundation

Rewards are divided as follows:
- The Total reward is divided over all Peers according to Peer Stake
- For each Peer:
  - 50% is allocated to the Peer itself (added to peer stake)
  - 50% is divided across delegated stakers on the peer (according to their relative stake)
  - If there are no delegated stakers, the reward goes to the Peer
  
## Stake decay

Peer stakes are discounted if the peer is temporarily inactive. This enables the network to progress even in the event of major peers going offline for an amount of time.

Stake decay occurs at the following rate by default:
- 3 minutes grace period with no decay
- A fall by a factor of `1/e` every 5 minutes thereafter

Stake decay does not effect the actual peer's stake, only the effectiveness of the stake in consensus.

## Slashing

There will be no stake slashing in Protonet, although stake decay is active so inactive or misbehaving peers will become quickly irrelevant to consensus.

TODO: verify slashing conditions for main network

Question: is delegated stake subject to slashing or not?

## Adding and removing Stake
