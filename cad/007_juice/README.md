# Juice Accounting

## Overview

Juice accounting refers to the system of accounting and pricing for immediate processing costs on the Convex network (CPU and networking).

The CVM implements a system of Juice with the following reasons:

- Control execution costs on the CVM so that e.g. infinite loops are terminated
- Prevent bad actors from flooding the network with pointless transactions (or at least, making it very expensive to do so).
- Reward peers with a share of transaction fees to compensate them fairly for the valuable resources they provide to the network

## Juice Fees

The Juice Fees are the execution cost component of transaction fees and are computed as:

```
Juice Consumed * Juice Price

where:

Juice Consumed = Transaction Size Cost + sum(Juice cost of each operation executed)

Transaction Size Cost = TRANSACTION_PER_BYTE * Storage Size of Transaction
```

`Juice Price` is a variable defined in the CVM State that varies according to the level of network demand, and is available to CVM code via accessing the special Symbol `*juice-price*`.

`TRANSACTION_PER_BYTE` is a global constant pricing the relative cost of transaction storage in the ordering. The value is `20` as of September 2024 but may be updated in future Convex versions if required. The rationale for this component of juice fees is to improve incentives regarding efficient transaction size: we want users and application developers to submit small transactions as much as possible to minimise storage requirements for peers.

## Juice Allowance

Each Transaction MUST have a Juice Allowance

The Juice Allowance MAY by specified by the User in the Transaction, otherwise a default Juice Allowance MUST be used.

The Juice Allowance MUST NOT exceed the ability of the Transaction Origin Account to pay the Juice Fees for the Transaction

The Juice Allowance MUST be limited to a maximum value in order to place an upper bound on computation costs for any single Transaction (currently `1,000,000`)

## Juice Consumed

During CVM execution of a Transaction, the CVM MUST track Juice Consumed, by incrementally adding a Juice Cost for each CVM Op or Runtime Function executed.

Execution of any CVM OP or Runtime Function MUST have a fixed positive Juice Cost.

Execution of certain CVM Ops or Runtime Functions MAY additionally have a variable Juice Cost, where the cost is scaled by the size or the computation requested (typically the size of the largest data structure(s) used in the computation).

Juice Cost SHOULD be scaled according to the estimated upper bound of computation time required to execute the corresponding CVM code on a typicaly Peer. However this will not be precise, as real world execution times may vary based on different Peer technology and operational enviornments. 

## Juice Constraints

The CVM MUST NOT execute expensive computation with `O(n)` or greater cost without first checking sufficient Juice is available, and throwing a `:JUICE` Error if available juice is insufficient. This prevents attackers from causing `O(n)` computations with less than `O(n)` proven juice committed to pay for it. 

If a `:JUICE` Error occurs in a Transaction:

- The CVM MUST charge the Origin Account of the transaction the cost of the full Juice Allowance
- The CVM MUST NOT allow any other changes to the CVM State (other than charging fees related to the Transaction), i.e. all effects are rolled back

## Juice Price calculation

The Network MUST define a Governance Constant INITIAL_JUICE_PRICE as a Long value (currently `2`), which is used as the Juice Price in the Genesis State

The Network MUST define a Governance Constant JUICE_SCALE_FACTOR as a Double value (currently `1.125`)

The Network MUST define a Governance Constant JUICE_PER_SECOND as a Long value (currently `100,000,000`, calculated according to a reasonable lower bound estimate of steady-state CVM execution speed for an average Peer)

The Network MAY update JUICE_SCALE_FACTOR and JUICE_PER_SECOND as part of a Governance Update, in which case Peers MUST utilise the new values for any State updates on or after the Governence Update Timestamp.

Juice Price MUST be updated after every Block of transactions. Combined with the bounded size of Blocks and bounded execution costs on transactions, this ensure a bounded amount of computation can occur between Juice Price updates.

For every `JUICE_PER_SECOND` amount of total Juice Consumed, the Juice update MUST increase the Juice Price according to `Juice Price = Juice Price / JUICE_SCALE_FACTOR (rounded up)`

For every `1000ms` elapsed the juice update MUST reduce Juice Price according to `Juice Price = Juice Price / JUICE_SCALE_FACTOR (rounded down)`

Juice Price MUST have a minimum value of `1`, i.e. Juice consumption is never free.

## Cryptoeconomics

The variation of Juice Prices implies:
- Juice Price will increase if the network is loaded by more than JUICE_PER_SECOND worth of transactions, which will increasingly discourage Users from submitting lower value transactions
- Juice Price will decrease if the network is loaded by less than JUICE_PER_SECOND worth of transactions
- An equilibrium level of JUICE_PER_SECOND amount of Juice Consumed per second may be reached, where the Juice Price remains stable.
- If the Network has zero load, the Juice Price will decline exponentially towards `1` (with a "half life" of around 6 seconds)

Since we assume Good Peers are able to handle over JUICE_PER_SECOND worth of computation, an attacker would be unable to put excessive load on the network for long periods of time without incurring exponentially rising costs, which makes such sustained attacks infeasible.

Alternatively, an attacker could attempt temporary DoS attacks when the Juice Price is low. However, since these cannot be sustained, they would only cause temporary delays to confirmation of final State updates, and would not stop legitimate Transactions from being included in consensus and ultimately executed.


