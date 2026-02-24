# CAD018: Scheduler

The scheduler provides a on-chain facility for code execution to be deferred until a later time. 

Users (and Actors) can make use of this to reliably ensure code execution at a future time, secured by the network protocol. Once scheduled, such operations are effectively "unstoppable".

The primary motivation of this capability is for users to trigger actions at a future time without requiring further external interaction.

## General Design Principles

### Concept of State timestamps

Scheduled operation MUST specify a timestamp

### Guaranteed execution

Peers MUST execute scheduled operations as part of the first state update after the scheduled timstamp. 

The first state update after the scheduled timestamp is defined as the one caused by the first Block that has a timestamp greater than or equal

### Ordering

Peers MUST execute scheduled transactions before any regular user transactions in the same block. This is logical in the sense that they are considered to be known to the network before any user transactions. 

Peers MUST execute scheduled transactions in timestamp order.

If two scheduled transactions have the same timestamp, Peers MUST execute scheduled transactions in the order that they were scheduled.

## Costs and Fees

As with all Convex operations, The account performing a schedule operation MUST be charges fair costs for execution and memory usage. This is necessary to prevent DoS attacks and ensure Peers are fairly compensated for their resources used to maintain the network.

The general principles are that:

- The Account performing the scheduling must pay for the execution cost of the scheduled operation, as if it were a transaction executed at a future time.
- The Account performing the scheduling must pay for temporary on-chain memory usage for data stored in the Schedule, but will be refunded for this after the scheduled operation is executed.

### Scheduler costs

Scheduler costs are paid at the time that the requested operation is scheduled, i.e. as part of the transaction that calls the `schedule*` core function (the "Scheduling Transaction")

The Scheduler MUST impose a low overhead per schedule operation, maximum O(log N) with the size of the schedule. This is necessary to prevent DoS attacks through excessive scheduling operations.

The Scheduler MUST ensure pre-payment by the Account performing the schedule operation to pay for the initiation of the schedules transaction, when this occurs (transaction flat fee) 

The Scheduler MUST ensure that memory required for the schedule data structure is paid for by the Scheduling Transaction.

### Execution costs

Execution costs for the scheduled operation are incurred by the Account for which the operation is scheduled, as if these were executed in a regular transaction.

The Scheduler MUST impose juice limits in accordance with the available balance of the Account.

### Memory costs

The Scheduler MUST ensure that the Account is refunded for memory used by the schedule data structure when it is released. This effect MUST apply at the end of the scheduled operation, as if it was a regular transaction releasing memory.

After the scheduled operation is complete, the net impact on state memory size through the use of the scheduler MUST be zero. This is necessary to prevent state growth over time from scheduled operations. This MUST happen regardless of whether or not the scheduled operation succeeds.


### Memo

The scheduler MUST reclaim memory by deallocating any state associated with any given scheduled operation. This is necessary to avoid long term state growth problems.

## Security

Scheduled operations have some security implications

### Front running

Scheduled operations are publicly visible, so user code SHOULD ensure that it cannot be exploited via attacks that are executed prior to the scheduled operation itself.

Achieving this can be done by ensuring that only authorised accounts are permitted to take actions which may affect the outcome of the scheduled operation.

Use of a scheduled operation that performs value exchange on digital assets (for example purchasing a digital asset from a marketplace) should be aware that 3rd parties may take actions that influence the price of the asset. The scheduled operation SHOULD be designed so that this cannot be easily exploited via market manipulation.

### Account transfers

If a user takes over an account that has previously been in the control of another party, care should be taken to ensure that the account does not have previous scheduled operations that may present a security risk (e.g. taking control of the account again).

Proposed solution: A timestamp can be stored so that all scheduled operations prior to the time of transfer can be automatically blocked. Setting this timestamp appropriately should prevent previous scheduled operations from presenting a risk.

## Operations

### Schedule

### Query until

### Drop

