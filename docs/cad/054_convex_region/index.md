# CAD054: Convex Network Region

## Overview

The `:convex` region of the global lattice ([CAD053](../053_lattice_regions/index.md)) holds the shared state of Convex networks, one entry per network, keyed by network ID. Each network's entry is a map of the latest signed Order of each of its peers: the content of a Belief ([CAD051](../051_cpos/index.md)) as a lattice value that any lattice node can replicate.

The region separates two things CPoS needs. Replicating peers' Orders is deterministic, and is the region's lattice merge. Deciding consensus from them is peer-local policy, weighted by stake, and stays with each peer (CAD051). A node can therefore carry a network's Orders without being a peer of that network, or validating stake, while each peer reads the Orders from the region, runs its own Belief merge, and publishes its new Order in its own slot.

This CAD is a draft. The reference implementation exchanges Beliefs as messages ([CAD015](../015_peercomms/index.md)) and does not yet host this region.

## Motivation

A Belief is already lattice-shaped: a map from peer key to that peer's signed Order, where a newer Order from the same peer supersedes an older one. Hosting it as a lattice region gives Convex networks the replication the rest of the lattice already has: Beliefs can travel over any lattice node and transport, and be stored, synchronised and filtered like other regions. Keying by network lets one node carry several networks — a production network, a test network, a private network — without confusing their peers' Orders.

## Specification

### Path

The region is `[:convex <networkID> ...]`.

- `<networkID>` MUST be the network's ID: the 32-byte hash of its genesis State, the same value peers check when they connect. Shortened or named forms, such as the CAIP-2 identifiers of [CAD042](../042_x402/index.md), MUST NOT be used as keys.
- `:convex` is a Map Lattice from network ID to network lattice. Network IDs are not known in advance, so it is not a Keyed Lattice.

### Network Lattice

Each network's value is a Keyed Lattice with one section defined by this CAD:

```
:convex → MapLattice
  └── <networkID> → KeyedLattice
        └── :orders → OwnerLattice, keyed by peer AccountKey
              └── <peerKey> → SignedData<Order>   (merged by Order precedence)
```

Further sections MAY be added by revisions of this CAD. A node merging a network value MUST retain sections it does not recognise.

### Ownership

The entry under a peer key MUST be an Order signed by that key ([CAD038](../038_lattice_auth/index.md)). A merge MUST reject an entry whose signature does not verify against its key. Only a peer can therefore write its own Order, and any node can verify what it relays.

### Order Precedence

Of two Orders from the same peer, the one with the greater timestamp takes precedence, as in Belief merge ([CAD051](../051_cpos/index.md)). Equal timestamps are resolved as the reference implementation's Order comparison resolves them.

A peer that behaves correctly never publishes two different Orders with the same timestamp. If a faulty peer does, nodes may briefly hold different Orders for it, and its next Order supersedes both.

### Relationship to CPoS

The region's merge keeps the latest Order of each peer and does nothing else. In particular it does not:

- check that a peer has stake, or has the minimum effective stake;
- discard Orders timestamped in the future;
- vote, or compute consensus points.

These are part of Belief merge, which CAD051 specifies as peer-local policy: a peer reads the Orders of the network it belongs to, admits those its rules accept, merges them, and writes its new Order into its own slot. A peer MUST apply its admission rules to what it reads from the region exactly as it would to a Belief it received in a message.

### Hosting

A node MAY host the `:convex` region for any subset of networks. A peer of a network SHOULD host that network's entry; a node that is not a peer MAY host it to relay or store Orders. A node SHOULD NOT propagate entries for networks it was not configured to carry.

## Security Considerations

- Signatures bind each Order to its peer key, so a relaying node cannot forge or alter an Order, only withhold one. A peer SHOULD obtain Orders from more than one source.
- The merge accepts a validly signed Order from any key. A node relaying a network's entry stores Orders from keys that may hold no stake; storage limits and pruning of such entries are outside this CAD and are a matter of node policy.
- Orders carry Blocks, so a network's entry can be large; nodes SHOULD bound what they host.

## Open Issues

- **Peer metadata.** Whether a network's entry should also carry peer metadata, such as announced addresses, is left to a revision; P2P node records are in the `:p2p` region ([CAD053](../053_lattice_regions/index.md)).

## Reference Implementation

| Concept | Class | Package |
|---|---|---|
| Belief (a map of signed Orders) | `Belief` | `convex.core.cpos` |
| Order | `Order` | `convex.core.cpos` |
| Belief merge, including Order comparison | `BeliefMerge` | `convex.core.cpos` |
| Network ID | `Peer.getNetworkID()` | `convex.core.cvm` |

## See Also

- [CAD015: Peer Communications](../015_peercomms/index.md) — Belief messages
- [CAD042: x402 Protocol](../042_x402/index.md) — textual network identifiers
- [CAD051: Convergent Proof of Stake](../051_cpos/index.md) — Belief merge and consensus
- [CAD053: Lattice Regions](../053_lattice_regions/index.md) — the official list of root regions
