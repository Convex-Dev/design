# CAD016: Peer Staking

## Overview

Staking is the process by which peers in the network and other participants lock up economic value (stake) to support the security of the network and earn economic rewards from participating in the CPoS consensus.

Peers must place a peer stake to participate in consensus. This is at risk if the Peer provably misbehaves, and may be lost through a process of Slashing, but is safe as long as the Peer continues to operate correctly and securely.

Other participants may also place a delegated stake on a peer they wish to vouch for. It is in the interests of large coin holders to support the security of the Network by placing stake on good peer operators that they trust, as well as to earn additional rewards on their holdings.

The total Stake of a seer determines its voting weight in the CPoS consensus algorithm.

## Meaning of Stake

Stake involves taking a risk and performing useful work for the network to earn rewards.

A peer operator that stakes on it own peer ("peer stake") is warranting that it has **fully secured its peer key used for operational participation in consensus**. The work they do is ensuring this peer is properly managed, secured and maintains network consensus correctly. It may lose its stake if this key is compromised (typically this would mean that the peer server is itself compromised). It may also lose its stake if the controller account is compromised.

Delegated stakers are warranting that they **trust the peer operator to maintain consensus and earn rewards while properly protecting the peer controller account**. The work they do is in evaluating peer operators and betting their coins that the peer operators performs their role honestly and effectively. Their delegated stake is not at risk if the peer itself is compromised or crashes, but *is* at risk if the controller account is compromised.

It should be observed that the most important thing from a security perspective is the private key used to control the peer controller account: all stake is at risk if this is lost. For this reason it is STRONGLY RECOMMENDED that important peer controller keys are kept secure in offline storage / air-gapped systems. This is a good incentive since the network as a whole could go offline if sufficient numbers of peers are simultaneously compromised.

## Rewards

Stakers are rewarded with a share of Convex Coins earned from
- Transaction fees executed on the network affecting the CVM global stake
- Reward Pools set by the Convex Foundation

Rewards are divided as follows:
- The total reward is divided over all Peers according to Peer Stake
- For each Peer:
  - 50% is allocated to the Peer itself (added to peer stake)
  - 50% is divided across delegated stakers on the peer (according to their relative stake)
  - If there are no delegated stakers, the full reward goes to the Peer

## Stake pools

It is possible to establish a stake pool where an actor places stake on behalf of others.

Examples:
- A public stake pool which issues a token that entitles stake pool members to a share of returns gained from peer rewards
- A private stake pool run by a large peer operator to manage stake across its own peers
- A charitable stake pool which distributes returns to good causes

Stake pools are made possible by peer staking and CVM actor code, but are outside the scope of CAD016. Innovation is encouraged in designing effective stake pool implementations.
  
## Effective stake decay

Peer stakes are temporarily discounted if the peer is inactive. This enables the network to progress even in the event of major peers going offline for an amount of time.

Stake decay occurs at the following rate by default:
- 3 minutes grace period with no decay
- A fall by a factor of `1/e` every 5 minutes thereafter

Stake decay does not effect the actual peer's stake, but does affect:
- The effectiveness and voting weight of the stake in consensus
- The ability of other network participants to evict the peer

## Slashing

Slashing is the penalisation of peers for bad behaviour. Any slashing will result in a deduction of stake, which will be transferred to the overall peer reward pool for properly behaving peers to collect in the future.

There will be **no stake slashing in Protonet**, although stake decay is active so inactive or misbehaving peers will become quickly irrelevant to consensus (and probably be evicted).

Slashing conditions for main network will be evaluated during Protonet phase. Questions to be considered:
- Under what conditions might slashing occur?
- Is delegated stake subject to slashing or not?

## Changing Peer Stake

Peer operators may add or remove peer stake from their owns peers with the following command:

```clojure
;; note: stake is denominated in coppers
(set-peer-stake 0x42272E789B7a3D57f8267c15c2d9B8BeD9b0E2035b3a8AE9A0eb9A024B7FADe5 10000000000000)
```

Removing all peer stake can be done by setting stake to `0`, though typically it is better to use the `evict-peer` command to remove the peer record entirely and get a memory refund.

## Changing Delegated Stake

Changing delegated stake on any peer can be done with teh `set-stake` command:

```clojure
;; note: stake is denominated in coppers
(set-stake 0x42272E789B7a3D57f8267c15c2d9B8BeD9b0E2035b3a8AE9A0eb9A024B7FADe5 10000000000000)
```

## Peer Eviction

Peers can be evicted from the global state in two situations:
- The peer's effective stake is less than the minimum effective stake (currently 1000 Convex Gold)
- The peer controller can always evict it's own peer(s)

```clojure
(evict-peer 0x42272E789B7a3D57f8267c15c2d9B8BeD9b0E2035b3a8AE9A0eb9A024B7FADe5)
```

When evicted:
- The peer's stake is returned to the controller account
- Any delegated stakes are returned to the staking accounts
- The peer record is removed from the Global State

There is an incentive to evict peers because deletion of the peer record will result in a memory refund to the account that performs the `evict-peer` operation. Anyone can do this for insufficiently staked peers and it reduces the CVM state size, so it is good for the ecosystem!
