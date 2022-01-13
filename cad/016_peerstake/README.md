# Peer Staking

## Overview

Staking is the process by which Peers in the Network and other particpants lock up economic value (Stake) to support the security of the Network and earn economic rewards for participating in the CPoS consensus.

Peers must place a Peer Stake to participate in consensus. This is at risk if the Peer provably misbehaves, and may be lost through a process of Slashing, but is safe as long as the Peer continues to operate correctly and securely.

Other participants may also place a Delegated Stake on a Peer they wish to support. It is in the interest of large coin holders to support the security of the Network by delegating stake to reliable Peers, while accruing staking rewards on top of their holdings.

The Total Stake of a Peer determines its voting weight in the CPoS consensus. 

## Rewards

Stakers are rewarded with a share of Convex Coins earned from
- Transaction fees executed in the Network
- Reward Pools set by the Convex Foundation

Rewards are distributed as follows:
- The Total reward is distributed over all Peers according to Peer Stake
- For each Peer:
  - 50% is allocated to the Peer itself (added to Peer Stake)
  - 50% is distributed across Delegated Stakers on the Peer (according to their relative Stake)
  - If there are no Delegated Stakers, the reward goes to the Peer

## Slashing

TODO
