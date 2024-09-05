# Convex Log

## Overview

Convex provides a verifiable event log for on-chain events.

The log is designed for events that may be consumed / observed by external observers interested in meaningful events in the CVM state. Typical use cases include:
- Detecting transactions that represent transfers of assets to / from a specific account
- Notifying observers of availability of smart contracts, e.g. opening of an auction
- Alerting external observers to situations that may require action

## Specification

### `log` function

The builtin CVM `log` function adds a log entry for the current transaction.

```clojure
(log val1 val2 val3 ....)
```

### Log entries

A log entry consists of:
- The `*address*` that caused the `log` entry to be created (never nil)
- The `*scope*` present at the time of logging (may be `nil`)
- The location of the transaction, as a `[block-number transaction-number]` pair
- A vector of the values logged

```clojure
[address scope location [val1 val2 val3 ...]]
```

### Interaction with rollbacks

The log MUST NOT be apdated with any log entries created within code that was rolled back (either due to an explicit `rollback` or failure of some atomic expression or transaction).

The reason for this is that the Log should only include *things that happened* rather than any operations that are rolled back.

The log SHOULD NOT be used for error reporting or diagnostics. 

### Conventional values

Users of logging capabilities MAY log any values they wish. However by convention, and in order to facilitate standards in tool, the following conventions are recommended.

The first log entry SHOULD by a short uppercase string value that describes the type of event. Common codes are:

- "TR" = a transfer of an asset
- "ALERT" = a warning that external action may be needed

#### Transfers

The standard for a transfer "TR" log event is:

```clojure
["TR" sender receiver quantity data]
```

Where:
- `sender` is the account address of the asset sender
- `receiver` is the account address of the receiver
- `quantity` is the quantity of the asset transferred, as per CAD19
- `data` is any additional data attached to the transfer (e.g. a map containing a payment reference)

Transfer events of this type SHOULD be emitted by the actor implementing the asset, with a `*scope*` set as appropriate.

### Log Data

The log is a flat Vector of all log entries of all blocks up to the current consensus point.

### Juice

The `log` function consumes juice proportional to the memory size of the logged data.

This juice cost represents the cost imposed on peers for maintaining log entries, and prevents DoS attacks by methods such as including extremely large data structures as log values.

### Retention

Peers MUST maintain logs for at least one month

Peers SHOULD maintain logs for as long as possible

### Indexing

By default peers SHOULD maintain the following indexes into the log, for all log entries that they retain:
- block -> log start and end position (allows fast location of log entries for a given block)
- [ address | first value | second value | third value ] -> vector of log positions

Values are included in the index if present and bloblike, otherwise empty blob. 

Peers MAY maintain additional indexes as relevant for their users.

The following lookup paths may also enable efficient access to relevant information:
- Log entry -> block -> transaction -> transaction details (e.g. `*origin*`)
- Log entry -> block -> historical state -> state after block completion (includes `*timestamp*` etc.)
