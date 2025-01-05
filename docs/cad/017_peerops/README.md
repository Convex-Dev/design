# CAD017: Peer Operations

## Overview

Operating a peer is an important responsibility in the Convex Network. 

Anyone can run a peer, and they are responsible for maintaining the Consensus of the Network. They must place a minimum stake of 1000 Convex Coins.

Most users of the Convex Network do not need to run a peer - they connect to peers via client software that submits transactions and queries information on their behalf. The peer API is open to client requests by default: Peer operators who wish to restrict this may need to set up additional configuration or infrastructure.

This document primarily contains recommendations for peer operators

## Requirements

Running a Peer requires:

- An Internet-connected Server
- At least 100 MBits/sec continuous network bi-directional bandwidth
- A modern processor with at least 8 dedicated Cores
- At least 8 GB RAM (32 GB Recommended)
- At least 1 TB fast Storage (NVMe Recommended)
- A secure modern operating system (Linux recommended) with good support for memory mapped files
- Java 21 or above

The network should be configured with:
- a publicly accessible IP address (IPv4 or IPv6). Dual stack networking support is required in the OS.
- firewall access to the server via TCP on a chosen port (the Convex protocol default `18888` is recommended)
- a trusted DNS entry (e.g. `peer.mycompany.com`) is recommended
- HTTPS certificates recommended for the HTTPS REST API

The DNS entry is optional, but it will help significantly with discoverability / user access to your peer.

## Configuration

### Accounts

In order to operate a peer you will need a Peer Controller account. This can be any account on the Convex network, e.g. `#1678` with at least 1000 Convex Coins.

### Peer Config

Peers can be configured at launch in various ways.

#### Outgoing connections

Peers MAY configure the number of concurrent outgoing Peer connections according to their available bandwidth. 20 (the default) recommended for Peers with sufficient outgoing bandwidth. There are trade-offs here:
- With more outgoing connections, your transactions will reach consensus faster
- You must weight this up against bandwidth costs
- If the number is too low your published blocks may get lost if the destinations do not relay them.

TODO: describe mechanism to set connection count controls



## Startup

## Syncing

Your peer will need to synchronize with teh network by connecting to at least one existing peer.

The following peers are available at time of writing for synchronisation:
```
peer.convex.live:18888
```

TODO: CLI commend top start peer with target host

## Shutdown


## Upgrade


## Recovery

### Network Partitions

It may occur that a peer becomes temporarily disconnected from the peer network.

Peers are designed to automatically recover from temporary network failure and re-establish connections when possible. Peers with normal configuration SHOULD periodically re-attempt to connect with other peers randomly until connection with the Network is re-established.

Peer Operators SHOULD provide for an alternative way to connect to the main network, if only for the purposes of withdrawing the Peer's Stake. For example, a peer operator may monitor the connectivity of their peer and use Convex Desktop to de-stake the peer if it loses connections.

TODO: describe best way to monitor this. Perhaps API peer health endpoint?

### Security Breach

If a security breach is detected, the Peer SHOULD be immediately shut down to minimise potential risks.

Peer Operators SHOULD attempt to withdraw their Stake immediately, possibly through a separate Client with access to an independent Good Peer, although in the case of severe security breach compromising private keys this may already be too late.

## Staking

Peers are required to post a Peer Stake to participate in consensus.

### Setting a stake

### Withdrawing stake

### Stake penalties

In Protonet, there is no slashing of stake (i.e. peers are not formally penalised for incorrect behaviour).

In the future peers may be automatically penalised for provably incorrect behaviour.

## Key Management

## Connection Management

A Convex Peer is designed to automatically manage P2P connections to the Network during normal operations. In most cases, assuming good network connectivity, a Peer should require no manual intervention to control connections to other Peers.



### Incoming Connections

Peers treat incoming connections as regular Clients, i.e. they afford no particular special privileges to incoming connections from other Peers. The purpose of this is to ensure that Bad Peers have no particular ability to influence a Peer that they connect to. 

### Outgoing connections

A Peer maintains a managed list of outgoing connections (i.e. connections to which they broadcast their Beliefs).

Outgoing connections follow the following rules:
- **Validated hosts**: Peers MUST only connect to Peers accessible on the network via the host address specified for the destination Peer in the current consensus, **or** if they are explicitly instructed to connect to a specific host address by the Peer Operator (e.g. when joining the Network). This minimises the chance of connecting to Bad Peers.
- **Random elimination**: Peers SHOULD eliminate connections at random for low-staked Peers. This allows the Peer network to stay dynamic, and give an opportunity for new Peers to be connected to
- **Stake-weighted selection** Peers MUST connect to other Peers preferentially according to stake, so that Bad Peers do not have a significant chance of isolating a Peer
- **Target connection count**: Peers should attempt to maintain a number of outgoing connections to Peers as configured by the Peer Operator. This allows Peer Operators to control their bandwidth usage.

Peers SHOULD NOT reveal their current outgoing connection list to external parties, since this opens up some risk of the Peer being vulnerable to attacks in situations where it could be isolated from the rest of the Network (e.g. censorship).

## Storage Management

Storage management is at the discretion of the Peer Operator.

Peer Operators SHOULD arrange for periodic garbage collection of the Etch Store, if they do not have another reason to keep historical data (e.g. for analytics).

## Logging and Analytics

In General, logging and analytics is at the discretion of the Peer Operator. 

## Security Risks

### Key compromise

The greatest risk to Peer Operators is the compromise of their Peer's private key. A compromise of this nature could allow an attacker to sign messages an impersonate the Peer, potentially deliberately causing the Peer to be slashed or (it the Peer is highly staked) disrupting consensus.

Peer Operators SHOULD maintain high level security procedures for their Peer's environment.

Peer Operators SHOULD maintain offline backups for their Peer's private key.

### Control Account compromise

A compromise of the Peer control Account(s) could allow an attacker to withdraw a Peer's staked coins and steal these.

Peer Operators SHOULD ensure maximum security for their control Accounts.

Peer Operators MAY keep private keys for control Accounts in separate environments from the Peer private key. While this may add operational complexity and risk, it mitigates against the risk of a Control Account compromise happening at the same time as a Peer private key compromise.


### Complete Network Partition

A complete network partition could cause a Peer to be isolated and excluded from consensus, e.g. network failures at a data centre.

Peer Operators SHOULD establish an alternative means of submitting a transaction to the remainder of the Network to withdraw their Peer's stake if this partition cannot be resolved in a reasonable timeframe (e.g. minutes). Failure to do so may result in partial slashing.

Peer Operators SHOULD signal to clients if their Peer is unable to participate in Consensus. The recommended approach is returning a Result with the Error Code `:NETWORK` to indicate that network connectivity is unavailable. This can signal to clients that they should try again later, or alternatively attempt to connect to a different Peer in the main network assuming this is still live.




