# CAD027: Event Logging

## Overview 

Convex provides a verifiable event log for on-chain events.

The log is designed for events that may be consumed / observed by external observers interested in meaningful events in the CVM state. Typical use cases include:
- Detecting transactions that represent transfers of assets to / from a specific account
- Notifying observers of availability of smart contracts, e.g. opening of an auction
- Alerting external observers to situations that may require action

This CAD describes the CVM based system for event logging that allows messages to be explicitly emitted during execution of CVM code, and reported by peers in interested parties.

Example use cases:
- A trader monitoring price changes in a market
- A wallet app detecting when fungible tokens are received by a user from a third party
- An auditor examining the minting history of a particular digital asset
- A user checking their personal transaction history

## Alternatives

It is possible for a peer to be instrumented to detect and register events of interest as it runs computations in the CVM state transition function. While this can theoretically allow any events of interest to be observed, this has some key drawbacks:
- It requires custom instrumentation of a Peer - a significant development task
- To get a new analysis of historical events, state transitions must be replayed (possibly from the very start of the ordering!)
- Correctly detecting and categorising events in arbitrary CVM code is hard to get right

## Specification

### The `log` function

Events are emitted via builtin CVM `log` function which adds a log entry for the current transaction.

```clojure
(log val1 val2 val3 ....)
```

As an example, a decentralised auction house might choose to log when items are sold with this folloing code

```clojure
(log :SOLD asset-id buyer price)
```

Other than the juice cost for the `log` instruction, logging has no effect on CVM State


### Log Record

### Log entries

A log entry consists of:
- The `*address*` that caused the `log` entry to be created (never nil)
- The `*scope*` present at the time of logging (may be `nil`)
- The location of the transaction, as a `[block-number transaction-number]` pair
- A vector of the values logged

```clojure
[address scope location [val1 val2 val3 ...]]
```

#### Position 0 : Address

The Address of the account that called the `log` function. Typically this will be an actor.

#### Position 1: Scope

The `*scope*` at the time the `log` function was called. 

This may, be `nil`, otherwise it enables 

#### Position 2: Block Index

The position of the Block in which the transaction was executed.

#### Position 3: Transaction Index

The position of the Transaction in the block for which the transaction was executed.

Scheduled transactions are assigned negative numbers. 

#### Position 4: Log Data

The log data is a Vector of values representing the arguments to the `log` function.

Log data SHOULD be structured according to application requirements and consistency with relevant logging standards.

Conventionally, the first element of the log data SHOULD be a Keyword that describes the type of event e.g. `:TRANSFER`

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

The standard values for a transfer "TR" log event are:

```clojure
["TR" sender receiver quantity data]
```

Where:
- `sender` is the account address of the asset sender
- `receiver` is the account address of the receiver
- `quantity` is the quantity of the asset transferred, as per CAD19
- `data` is any additional data attached to the transfer (e.g. a map containing a payment reference)

Transfer events of this type SHOULD be emitted by the actor implementing the asset, with a `*scope*` set as appropriate.

### Log Indexing

Peers SHOULD index log records for efficient access any query by interested parties.

The exact structure of log indexes are implementation details left to the peer operator.

By default peers SHOULD maintain the following indexes into the log, for all log entries that they retain:
- block -> log start and end position (allows fast location of log entries for a given block)
- [ address | first value | second value | third value ] -> vector of log positions
- An index on the each of the first 4 fields of the log data, if these are Blob Like values that can be indexed

Values are included in the index if present and bloblike, otherwise empty blob. 

Peers MAY maintain additional indexes as relevant for their users.

The following lookup paths may also enable efficient access to relevant information:
- Log entry -> block -> transaction -> transaction details (e.g. `*origin*`)
- Log entry -> block -> historical state -> state after block completion (includes `*timestamp*` etc.)

### Execution fees

The cost of a `log` operation is:

- A fixed base cost for the `log` (currently 1000)
- A cost per byte of the log record (currently 20)

The outputs of `log` are not stored in the CVM State, so this has no direct effect on memory size

### Log Data

The log is a flat Vector of all log entries of all blocks up to the current consensus point.

### Juice

The `log` function consumes juice proportional to the memory size of the logged data.

This juice cost represents the cost imposed on peers for maintaining log entries, and prevents DoS attacks by methods such as including extremely large data structures as log values.

### Retention

Peers MAY determine their own retention policy for historical log records.

Peers MUST maintain logs for at least one month, for the purpioses of transaction confirmation by clients and recipients.

It is RECOMMENDED that Peers retain at least 1 year of log records.

Peers SHOULD maintain logs for as long as possible given resource availability (primarily storage and indexing costs).





