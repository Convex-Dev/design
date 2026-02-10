# CAD001: Convex Architecture

## Overview

The Convex platform comprises two complementary decentralised systems built on the same underlying data infrastructure:

- **Convex** — a decentralised global state machine providing publicly verifiable on-chain data, deterministic execution, and economic coordination via the Convex Virtual Machine (CVM)
- **Lattice** — a broader decentralised CRDT network providing unlimited scalability for off-chain data, content distribution, AI models, and real-time collaboration

Both systems use **CAD3 encoded data** ([CAD003](../003_encoding/README.md)) as their universal data representation, and both employ **CRDT merge semantics** to guarantee convergence without coordination. This shared foundation means data flows naturally between on-chain and off-chain contexts using the same types, encoding, and cryptographic primitives.

### Convex (On-Chain)

Convex operates a decentralised **network of peers**, which verify and execute transactions submitted by users on the **Convex Virtual Machine (CVM)**. The CVM manages a **Global State** which is publicly verified and visible at all times.

Transactions are ordered via the **Convergent Proof of Stake** (CPoS) consensus algorithm. This algorithm efficiently ensures that transactions are processed in the correct order, and that clients can rely on the results of their transaction being accurately reflected in the Global State of the CVM.

On-chain data provides the **root of trust**: asset ownership, identity, smart contracts, and economic value exchange that require global consensus and public verifiability.

### Lattice (Off-Chain)

The Lattice is a global, massively scalable data distribution layer for data that does not need to pass through CVM consensus. It uses lattice merge (CRDT semantics) to combine data from multiple sources without coordination, enabling:

- **Unlimited scalability** — no consensus bottleneck; data propagates peer-to-peer
- **Offline-first operation** — nodes merge when connectivity is restored
- **Signed ownership** — data is cryptographically signed per-owner ([CAD038](../038_lattice_auth/README.md))
- **Rich data types** — replicated filesystems ([CAD028](../028_dlfs/README.md)), key-value databases ([CAD037](../037_kv_database/README.md)), and custom lattice structures

### Shared Infrastructure

The on-chain and off-chain layers share:

| Layer | Shared Component | Specification |
|-------|-----------------|---------------|
| Data representation | Immutable CAD3 values (ACell hierarchy) | [CAD002](../002_values/README.md), [CAD003](../003_encoding/README.md) |
| Cryptography | Ed25519 signatures, AccountKey identities | [CAD002](../002_values/README.md) |
| Merge semantics | Lattice merge (commutative, associative, idempotent) | [CAD024](../024_data_lattice/README.md) |
| Storage | Content-addressed Etch database | [CAD003](../003_encoding/README.md) |
| Networking | Peer-to-peer binary protocol | [CAD015](../015_peercomms/README.md) |

This means the next generation of decentralised applications can achieve the right combination of massive scalability backed up by publicly verifiable on-chain roots of trust and economic value exchange.

## Architecture Requirements

### 1. Peer Network

The network of Peers collectively forms a decentralised substrate for the execution of queries and transactions on behalf of users.

The network MUST be configured as a set of Peers with the ability to communicate with other peers over a network, preferably the public Internet.

The network MAY suffer from temporary disconnection or interruption. Peers MUST attempt to make progress (subject to the rules of the CPoS consensus algorithm), i.e. the network should be resilient to temporary partitions that isolate a set of Peers.

Peers MUST accept Belief update messages from at least one other Peer. Failure to do so will result in that Peer being unable to observe consensus.

Peers MUST transmit their own Belief updates to at least one other Peer. Failure to do so will result in the Peer being unable to contribute its own transactions to network consensus.

Peers SHOULD send and receive Beliefs from multiple randomly selected other peers, sufficient to ensure that the peer does not become isolated. Failure to do so may result in the peer being temporarily excluded or ejected from the main network if connectivity is insufficient.

The Network SHOULD be configured in such a way that the sharing of Belief updates will ultimately propagate information from any Peer to any other Peer, i.e. the network graph transmission should be strongly connected. Failure to respect this property may result in Peers being unable to participate from consensus, in a manner similar to suffering from a network partition.

### 2. Clients

Clients are defined as any participating system that transacts or queries the Convex network. Clients are typically software applications run by users with self-sovereign control of their cryptographic keys, but may also be centralised applications run on behalf of users by a third party (e.g. custodial exchanges).

Clients MUST connect to an active Peer in the Peer Network, either locally or to a remote Peer.

Clients SHOULD ensure that the trust the Peer that they use to faithfully carry out queries or transactions on their behalf.

Clients MAY validate important or high value transactions with multiple peers (in particular, that the transaction was successfully submitted and executed in consensus)

Clients MAY connect to multiple Peers. This may be valuable if the Client wishes to verify information from multiple sources, e.g. to confirm the consensus state of the network.

### 3. State

The State is a data structure that represents all information managed by the CVM. It may also be referred to as the Global State, as it is globally shared and verified by all Peers. 

Peers MUST maintain a copy of the current consensus State.

Peers MAY keep the State in durable storage, and retain only partial elements of the State in working memory. This behaviour will typically be required if the Peer is memory-constrained and the State is large.

Peers SHOULD retain past instances of the State. This may be valuable for analytical, query or search purposes.
