# Peer Staking

## Overview

Staking is the process by which Peers in the Network and other particpants lock up economic value (Stake) to support the security of the Network and earn economic rewards from participating in the CPoS consensus.

Peers must place a Peer Stake to participate in consensus. This is at risk if the Peer provably misbehaves, and may be lost through a process of Slashing, but is safe as long as the Peer sontinues to operate correctly and securely.

Other particpants may also place a Delegated Stake on a Peer they wish to support. It is in the interests of large coin holders to support the security of the Network by placing stake on Good Peers that they trust, as well as to earn additional rewards on their holdings.

The Total Stake of a Peer determines its voting weight in the CPoS consensus. 

## Rewards

Stakers are rewarded with a share of Convex Coins earned from
- Transaction fees executed in the Network
- Reward Pools set by the Convex Foundation

Rewards are divided as follows:
- The Total reward is divided over all Peers according to Peer Stake
- For each Peer:
  - 50% is alloacted to the Peer itself (added to Peer Stake)
  - 50% is divided across Delegated Stakers on the Peer (according to their relative Stake)
  - If there are no Delegated Stakers, the reward goes to the Peer

## Slashing

TODO
