# Peer Operations

## Overview

Operating a Peer is an important resposibility in the Convex Network. 

Anyone can run a Peer, and they are resposible for maintaining the Conensus of the Network. However, most users of the Convex Network do not need to run a Peers - they connect to Peers via Clients of the network that submit Transactions and query information on their Behalf

This document primarily conntains recommendations for Peer Operators

## Requirements

Running a Peer requires:

- An Internet-connected Server
- At least 100 MBits/sec continous bandwidth
- A modern processor with at least 8 dedicated Cores
- At least 8 GB RAM (32 Gb Recommended)
- At least 2 TB fast Storage (NVMe Recommended)
- A secure modern operatong system (Linux recommended) with good support for memory mapped files
- Java 15 or above

## Installation

## Configuration

Peers SHOULD configure the number of concurrent outgoing Peer connections according to their available bandwidth. 20 recommeded for Peers with fast connections.



## Startup

## Shutdown

## Upgrade

## Recovery

### Network Partitions

It may occur that the Peer becomes temporaily disconnected from the Peer Network.

Peers are designed to automatically recover from temporary network failure and re-establish connections when possible. Peers with default configuration will periodically re-attempt to connect with other Peers randomly until connection with the Network is re-established.

Peer Operators SHOULD provide for an alternative way to connect to the main network, if only for the purposes of withrawing the Peer's Stake (Peers are at risk of penalisation if they remain disconnected for too long).

### Security Breach

If a security breach is detected, the Peer SHOULD be immediately shut down to minimise potential risks.

Peer Operators SHOULD attempt to withdraw their Stake immediately, possibly through a separate Client with access to an independent Good Peer, although in the case of severe security breach compromising private keys this may already be too late.

## Staking

## Key Management

## Storage Management

## Logging and Analytics

## Security Risks



