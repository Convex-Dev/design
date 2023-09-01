# Observability

## Overview

There are many cases where it is valuable to be able to observe events on the Convex network.

Examples are:

- Peer operators wish to monitor performance of their peer(s) and the service levels they are offering to their clients
- dApp developers looking to observe events in the smart contracts they have deployed
- Traders looking to monitor price movements to inform their trading decisions
- Centralised exchanges monitoring for fraud and other suspicious activity

## Design Objectives

### Pluggable Architecture

Different observers can be plugged in to support different use cases. Examples might be:

- Sending events to a Kafka topic where they can subsequently be filtered, processed and analysed by various monitoring tools
- Visualising events in a realtime monitoring tool

### Opt In

The observability model is opt-in from the perspective of peer operators. Peer operators may choose which events they wish to observe, and how they want to consume these on a per-peer basis.

## Solution Specification

### Overview

The following topics will be available as observability hooks:
- Client Transactions

### Client Transactions

Client transactions are transactions that are handled on behalf of a client from a specific peer.

The following events related to client transactions will be available
 - Request (when the peer accepts a transaction from a client)
 - Response (when the peer retuens the result to the client)

The primary key for transactions should be regarded as (Peer Key, Transaction ID, Event type)

### Ordering events

Ordering events are any time a peer recieves an updated ordering, directly or indirectly, from another Peer. 

Important fields:
- `peer` = Peer public key
- `hash` = Hash of ordering (this can deduplicate identical orderings)
- `cps` = Consensus points (including ordering length)
- `ts` = Timestamp (at which Ordering validated by peer)

### Consenus Events

Events related to consenus update

### Peer status change

Peer status changes are any time a Peer has an update in the global state:

- Peer added
- Peer removed
- Peer stake change
- Peer metadata change

### CVM Log Events

CVM log events are events emitted via the CVM `log` instruction.

As this is an application specific `log` capability, it is likely that observers will want to filter this event stream for events of particular interest. Examples might be:
- DAO votes
- Token trades
- Auction bids

### Performance Stats

Peer performance stats detail live performance metrics from a peer. Fields include:

- Thread-based CPU utilisation (time not blocked)
- Internal queue sizes (and total capacity)
- Rates of events per second

Default is to produce one performance record every second during peer operations

## Observability Consumers

### Kafka / Strimzi

The Kafka consumer provides a general purpose observability framework

This Consumer works on the following basis:

- Events are serialised as JSON
- Events are posted to a Kafka queue via Strimzi (over https:)
- There is some buffering at the client side
- Different events are normally routed to different Kafka topics (configurable)

### NOP Consumer

The NOP consumer ignores events, and produces no output.

It has the advantage of near-zero overhead for Peer operators.

The NOP Consumer is the default, unless come other Consumer is specifcied.

## Other considerations

### End user access

It is assumed that the observability service will not usually be directly accessible to end users, e.g. clients using a Convex dApp.

Peer operators may of course choose to make data from their observability service publicly visible, e.g. performance graphs.
