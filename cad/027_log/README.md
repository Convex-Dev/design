# Event Logging

## Overview 

Frequently, events that occur on-chain such as invocations of smart contracts need to send messages to external users beyond the immediate results of the transactions.

This CAD describes a CVM based system for event logging that allows messages to be explicitly emitted during execution of CVM code, and reported by peers in interested parties.

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

Events are emitted via the CVM `log` runtime function

As an example, a decentralised auction house might choose to log when items are sold with this folloing code

```clojure
(log :SOLD asset-id buyer price)
```

Other than the juice cost for the `log` instruction, logging has no effect on CVM State


### Log Record

For each `log` statement successfully executed, the CVM produces a `log` Record, which is a Vector with the following fields:

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


### Log Indexing

Peers SHOULD index log records for efficient access any query by interested parties

Peers SHOULD produce and retain the following indexes at minimum:

- An index on block + transaction index, enabling sequential access to the log events for each transaction in order.
- An index on the each of the first 4 fields of the log data, if these are Blob Like values that can be indexed

Indexes SHOULD map the index key to a vector of log positions, so that the relevant Log Record(s) can be efficiently retrieved in order.

The exact structure of log indexes are implementation details left to the peer operator.

### Execution fees

The cost of a `log` operation is:

- A fixed base cost for the `log` (currently 1000)
- A cost per byte of the log record (currently 20)

The outputs of `log` are not stored in the CVM State, so this has no direct effect on memory size

### Log Output

Peers MUST compute the following 

### Retention policies

Peers MAY determine their own retention policy for historical log records.

It is RECOMMENDED that Peers retain at least 1 year of log records.

