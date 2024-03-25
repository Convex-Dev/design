# Transactions

## Overview

Transactions are instructions to the Convex Network submitted by users.

## Transaction Types

### Transfer

A Transfer Transaction causes a transfer of Convex Coins from an origin account to a destination account

A Transfer Transaction MUST specify a Long value amount to transfer

The Source Account MUST be the Origin Account for the Transaction, i.e. transfers can only occur from the Account which has the correct Digital Signature

Both Account MUST be valid, otherwise the Transaction MUST fail

The Transaction MUST fail if any of the following are true:
- The source Account has insufficient balance to pay for Transfer Transaction fees.
- The transferred Amount is negative
- The transferred Amount is greater than the Convex Coin Balance of the source Account (after subtracting any Transfer Transaction Fees)

If the Transfer Transaction does not fail for any reason, then:
- The Amount MUST be subtracted from the Source Account's Balance
- The Amount MUST be added to the Destination Account's balance

A transfer amount of zero will succeed, but is relatively pointless. Users SHOULD avoid submitting such transfers, unless they are willing to pay transaction fees simply to have this recorded in consensus.

### Invoke

An Invoke Transaction causes the execution of CVM Code

An Invoke Transaction MUST include a payload of CVM Code

An Invoke Transaction MUST fail if:
- The CVM Code is not valid for execution (e.g. a syntax error in compilation)
- The Origin Account has insufficient balance to pay for Juice required by the code execution
- The execution of CVM Code causes any Error (e.g. a `:TRUST` Error casued by attempting an unathorised operation on an Actor)

Otherwise, the CVM State MUST be updated by the result of executing the CVM Code for the Origin Account

### Call

A Call Transaction causes the invocation of an Actor function.

Apart from lower transaction fees, the Call instruction MUST be functionally equivalent to invoking CVM Code of the form:

`(call actor offer (actor-function arg1 arg2 .....))`

Call Transaction are primarily intended for efficient execution of Smart Contract functionality by Clients that need to utilise the functionality of a specific Actor.

## General Handling

### Results

Transaction results MUST be returned in a `Result` record which contains the following fields:
- `:id` - the message ID of the transaction to correlate with the client
- `:result` - the final result of the transaction (will be the error message if an error occurred)
- `:error` - the error code (MUST `nil` if no error occurred, otherwise can be any Keyword)
- `:info` - a Map of information reported by the peer to the client, which SHOULD include:
 - `:trace` - an error trace, which is a vector of stack messages if an error occurred
 - `:eaddr` - the Address of execution where the error was raised
 - `:mem` - Integer amount of memory consumed by the transaction (may be omitted if zero, may be negative for a refund)
 - `:fee` - Total fee paid, including memory cost

An an optimisation, peers MAY avoid creating result records if they have no requirement to report results back to clients.

## Peer Responsibilities

Peers are generally expected to be responsible for validating and submitting legitimate transactions for consensus on behalf of their clients.

Peers MAY define their own terms for allowing a client to use their services. 

Peers SHOULD submit legitimate transaction for consensus, unless they have a reason to believe the transaction is invalid or illegitimate.

Peers SHOULD submit transactions in the order that they are received from any single client. Failure to do so is likely to result in sequence errors and potential economic cost for the peers.

Peers SHOULD validate the digital signature of transactions they include in a block. Failure to do so is likely to result in penalities (at a minimum, paying the fees for the invalid transaction) 

Peers MAY reject transactions that do not appear to be legitimate, in which case the Peer SHOULD return a Result to the Client submitting the transaction indicating the reason for rejection. Some examples where this may be appropriate:
- Any transaction that has an obviously invalid sequence number (less than that required for the current Consensus State)
- A transaction that has a future Sequence number (greater than would be valid for the current consensus), and the Peer is unaware of any previous in-flight transactions from the Client that would make this valid.
- A transaction that appears too expensive for the origin account for which it is submitted to execute (a very large transaction size or a large transfer that would be likely to fail)
- An account or client has been blacklisted by the Peer for previous bad behaviour

## Signatures

All valid transactions MUST be signed by the account key of the account for which the user submits the transaction. The relevant account key is the one that is set in the CVM state at the time the transaction is executed.
