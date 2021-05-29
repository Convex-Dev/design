# CVM Execution

## Overview

The Convex Virtual Machine (CVM) execution operates as a pure, deterministic State Transition Function. Conceptually this can be viewed as:

```
State' <= f (State, Block)
```

Under this model, the latest Consensus State can always be reconstructed given both:

- A initial State
- All Blocks between the initial State and the current consenus point

Normally, Peers maintain the current Consensus State, and update this accordingly whenever one or more new Blocks are confirmed by the CPoS Consensus Algorithm. However, a new Peer can reliably reconstruct the Conensus State from any preceding State as long it it also holds the necessary Blocks from that state onwards. This enables a new Peer to efficiently synchronise with the Convex Network without having to process all preceding Blocks.

## State Transition

The State Transition Function performs the following steps, in order:

- Block Preparation
- For each Transaction in the Block
 - Prepare an execution Context for the Transaction
 - Execute the Transaction
 - Complete the Transaction
 - Record transaction result (outside the State)
- Block Completion

### Block preparation

#### Timestamp update

At the start of Block Preparation, the Timestamp of the Block is examined. If and only if the timestamp is later than the State timestamp, the State Timestamp is updated to be equal to the Block Timestamp. This procedure ensures that the State Timestamp never goes backwards (i.e. is monotonically increasing).

#### Scheduled Execution

As the next step of Block Preparation, the CVM examines the Schedule data structure in the State, and identifies if any transactions are scheduled to be executed before or at the State Timestamp. 

If any scheduled transactions exist, then the CVM selects a number of transaction up to the defined constant `MAX_SCHEDULED_TRANSACTIONS_PER_BLOCK` (in scheduled order, i.e. the earliest scheduled transactions are prioritised). The reason for this maximum limit is to prevent an excessive number of transactions scheduled at the same time from holding up progress on transactions in the current Blocks being processed (TODO: needs revisiting)

For each selected scheduled transaction, the CVM executes the scheduled transaction as if it had been submitted at the beginning of the Block, with the following minor modifications:

- There is no need to perfrom a full digital signature check, since the scheduled transactions were provably issued internally on the CVM
- Transaction results not need to be reported back to Clients, since the scheduled transaction was not submitted by a Client


## Context

CVM Execution of Operations occurs in a Context.

For Performance reasons, Contexts are implemented as mutable Objects on the JVM. A complete copy of a Context can however be created cheaply with `Context.fork()`, since the immutable values that the Context refers to can be safely shared by multiple threads / Contexts.
