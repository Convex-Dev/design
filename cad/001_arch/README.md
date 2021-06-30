# Convex Architecture

## Overview

Convex operates as a decentralised network of Peers, which verify and execute transactions submitted by Clients in decentralised consensus.

## Architecture Requirements

### 1. Peer Network

The network of Peers collectively forms a decentralised substrate for the execution of queries and transactions on behalf of Clients.

The network MUST be configured as a set of Peers with the ability to communicate with other peers over a network, preferably the public Internet.

The network MAY suffer from temporary disconnection or interruption. Peers MUST attempt to make progress (subject to the constraints of the Consensus Algorithm), i.e. the network should be resilient to temporary partitions that isolate a set of Peers.

Peers MUST accept Belief update messages from at least one other Peer. Failure to do so will result in that Peer being unable to observe consensus.

Peers SHOULD transmit their own Belief updates to at least one other Peer. Failure to do so will result in the Peer being unable to contribute its own transactions to network consensus.

The Network SHOULD be configured in such a way that the sharing of Belief updates will ultimately propagate information from any Peer to any other Peer, i.e. the network graph transmission should be strongly connected. Failure to respect this property may result in Peers being unable to participate from consensus, in a manner similar to suffering from a network partition.

### 2. Clients

Clients are defined as any participating system that transacts or queries the Convex network.

Clients MUST connect to an active Peer in the Peer Network, either locally or to a remote Peer.

Clients SHOULD ensure that the trust the Peer that they use to faithfully carry out queries or transactions on their behalf.

Clients MAY connect to multiple Peers. This may be valuable if the Client wishes to verify information from multiple sources, e.g. to confirm the consensus state of the network.

### 3. State

The State is a data structure that represents all information managed by the CVM.

Peers MUST maintain a copy of the current consensus State.

Peers MAY keep the State in durable storage, and retain only partial elements of the State in working memory. This behaviour may be required if the Peer is memory-constrained and the State is large.

Peers SHOULD retain past instances of the State. This may be necessary for analytical, query or search purposes.
