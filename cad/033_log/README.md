# Convex Log

## Overview

Convex provides an event log for on-chain events

The log is designed for events that may be consumed / observed by external observers interested in meaningful events in the CVM state. Typical use cases include:
- Detecting transactions that represent transfers of assets to / from a specific account
- Notifying observers of availability of smart contracts, e.g. opening of an auction

## Specification

### `log` function

The builtin CVM `log` function adds a log entry for the current transaction.

```clojure
(log val1 val2 val3 ....)
```

### Log entries

A log entry consists of:
- The `*address*` that caused the `log` entry to be created (never nil)
- The `*caller*` address at the time of logging (may be `nil`) 
- The `*scope*` present at the time of logging (may be `nil`)
- The location of the transaction, as a `[block-number transaction-number]` pair
- A vector of values

```clojure
[origin address scope location [val1 val2 val3 ...]]
```

### Log Data

The log is a flat Vector of all log entries of all blocks up to the current consensus point.

### Juice

The `log` function consumes juice proportional to the memory size of the logged data.

This juice cost represents the cost imposed on peers for maintaining log entries, and prevents DoS attacks by methods such as including extremely large data structures as log values.

### Retention

Peers MUST maintain logs for at least one month

Peers SHOULD maintain logs for as long as possible

### Indexing

By default peers MUST maintain the following indexes into the log, for all log entries that they retain:
- block -> log start and end position (allows fast location of log entries for a given block)
- [ address | first value | second value | third value ] -> vector of log positions
- [ address | caller (if non-null, otherwise omitted) ] -> vector of log positions

Values are included in the index if present and bloblike, otherwise empty blob. 

Peers MAY maintain additional indexes as relevant for their users.

The following lookup paths may also enable efficient access to relevant information:
- Log entry -> block -> transaction -> transaction details (e.g. `*origin*`)
- Log entry -> block -> historical state -> state after block completion (includes `*timestamp*` etc.)