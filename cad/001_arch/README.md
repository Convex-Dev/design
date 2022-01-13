# Convex Architecture

## Overview

Convex operates as a decentralised network of Peers, which verify and execute transactions submitted by Clients in decentralised consensus.

## Architecture Requirements

### 1. Peer Network

The network of Peers collectively forms a decentralised substrate for the execution of queries and transactions on behalf of Clients.

The network MUST be configured as a set of Peers with the ability to communicate with other peers over a network, preferably the public Internet.

The network MAY suffer from temporary disconnection or interruption. Peers MUST attempt to make progress (subject to the constraints of the Consensus Algorithm), i.e. the network should be resilient to temporary partitions that isolate a set of Peers.

Peers MUST accept Belief update messages from at least one other Peer. Failure to do so will result in that Peer being unable to observe consensus. XXX

Peers SHOULD transmit their own Belief updates to at least one other Peer. Otherwise Peers' transactions won't end up in the consensed network State.

The Network SHOULD be configured in such a way that sharing Belief updates will ultimately propagate information from any Peer to any other Peer, i.e. the network transmission graph should be strongly connected. Otherwise Peers may fail to reach consensus, leading to network partitioning.

### 2. Clients

Clients are defined as any participating system that transacts on or queries the Convex network.
a Client is any participating system that transacts or queries the Convex network.

Clients MUST connect to an active Peer in the Peer Network, either locally or remotely.

Clients SHOULD ensure that the Peer they connect to would faithfully carry out queries or transactions on their behalf.

Clients MAY connect to multiple Peers. This may be valuable if the Client wishes to verify information from multiple sources, e.g. to confirm the consensus State of the network.

### 3. State
XXX
The State is a data structure that represents all information managed by the CVM.

Peers MUST maintain a copy of the current consensus State.

Peers MAY keep the State in durable storage, and retain only partial elements of the State in working memory. This behaviour may be required if the Peer is memory-constrained and the State is large.

Peers SHOULD retain past instances of the State. This may be necessary for analytical, query or search purposes.
