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

### A


## Other considerations

### End user access

It is assumed that the observability service will not usually be directly accessible to end users, e.g. clients using a Convex dApp.

Peer operators may of course choose to make data from their observability service publicly visible, e.g. performance graphs.
