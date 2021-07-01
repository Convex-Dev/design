# Transactions

## Overview

Transactions are instructions to the Convex Network submitted by Users

## Transaction Types

### Transfer

A Transfer Transaction causes a transfer of Convex Coins from a Source Account to a Destination Account

A Transfer Transaction MUST specify a Long value Amount to transfer

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

## Peer Responsibilities

Peers are generally expected to be responsible for validating and submitting legitimate transactions for consensus on behalf of their Clients.

Peers MUST submit legitimate transaction for consensus, unless they have a reason to believe the transaction is invalid or illegitimate.

Peers SHOULD submit transactions in the order that they are received from any single Client. Failure to do so is likely to result in Sequence errors and potential economic cost for the Peers.

Peers MUST validate the digital signature of Transactions they include in a Block. Failure to do so is likely to resulting in automatic slashing.

Peers MAY reject transactions that do not appear to be legitimate, in which case the Peer SHOULD return a Result to the Client submitting the transaction indicating the reason for rejection. Some examples where this may be appropriate:
- Any Transaction that has an obviously invalid Sequence Number (less than that required for the current Consensus State)
- A Transaction that has a future Sequence number (greater than would be valid for the current consensus), and the Peer is unaware of any previous in-flight transactions from the Client that would make this valid.
- A Transaction that appears too expensive for the Origin Account for which it is submitted to execute (a very large transaction size or a large transfer that would be likely to fail)
- An Account or Client has been blacklisted by the Peer for previous bad behaviour



## Signatues

All Transactions MUST be signed by the Account Key of the Account for which the User submits the Transaction
