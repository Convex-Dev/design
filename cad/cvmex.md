# CVM Execution

## Overview

The Convex Virtual Machine (CVM) execution operates as a pure, deterministic State Transition Function. Conceptually this can be viewed as:

```
State' = f (State, Block)
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

### Transaction Execution

For each transaction executed, the CVM first checks the Account in the State for which the transaction is submitted. If the Account does not exist, the transaction is aborted.

Assuming the account exists, the verifies the digital signature of the transaction against the current public key associated with the Account . If verification fails, the transaction is aborted.

Otherwise, the CVM creates a Context for the Account and proceeds to execute the transaction in the given Context.

## Context

Regular CVM Execution of operations occurs in a Context. A Context is required to keep track of relevant variables during execution, including:

- The current State
- The `*origin*` Account for the transaction
- The `*address*` of the Account for which the context is currently executing
- The `*caller*` of the current account (if current execution is happening within an Actor call)
- The `*depth*` of the CVM execution stack
- The CVM execution log
- Any variables locally bound in the execution context
- The latest operation Result Register 
- An Exception value, if an Exception has been thrown

For Performance reasons, Contexts are implemented as mutable Objects on the JVM. A complete copy of a Context can however be created cheaply with `Context.fork()`, since the immutable values that the Context refers to can be safely shared by multiple threads / Contexts.

## Ops

CVM operations are referred to as "Ops", which represent the fundamental executable code on the CVM. These can be considered as the "bytecode" of the CVM, and are typically produced by compilation of CVM code (which may be performed by either an on-chain compiler or an off-chain tool).

CVM Ops are language agnostic - while they might typically be compiled from Convex Lisp source code, alternative language frontends such as Convex Scrypt exist which can produce equivalent Ops. Adventurous hackers are encoraged to experiment with compiling different languages to the CVM.

All Ops are defined with a one-byte OpCode that identifies the type of Op, and defines what additional data is associated with the Op.

### `0x01` Constant

```
Logical Structure:
0x01 <Value>
```

The `Constant` Op loads a single CVM value into the Context's Result Register.

### `0x02` Invoke

```
Logical Structure:
0x02 [<FnOp1> <ArgOp1> <ArgOp2> ....]
```

The `Invoke` Op recursively executes a sequence of child Ops, and if all these execute successfully invokes the Function provided by the Result of the first child Op, with the results of the following child Ops passed as arguments.

The `Invoke` Op must throw a `:CAST` error if the first Op does not return a valid Function. Otherwise, the resulting Context will be the Context produced by execution of the Function.

### `0x03` Do

```
Logical Structure:
0x02 [<Op1> <Op2> <Op3> ....]
```

The `Do` Op implements sequential execution of multiple child Ops.

Each child Op is executed in turn. It if succeeds, then execution continues to the next Op.

The final result of `Do` is the result of executong the last child Op. In case no child Ops are provided, then `Do` returns a constant result of `nil`.

### `0x04` Cond

```
Logical Structure:
0x02 [<TestOp1> <ResultOp1> <TestOp2> <ResultOp2> .... (optional ElseOp)]
```

The `Cond` Op implements conditional evaluation of child Ops, expreseed as `TestOpX ResultOpX` pairs followed by an option `ElseOp`.

For each pair in sequence the `TestOp` is evaluated. If this evaluates to true value, then the result of `Cond` is produced by the corresponding `ResultOp` and no further Ops are executed. If false, execution proceeds immediately to the next pair of Ops.

In the case that no test returns true then the result of `Cond` is the result of executing `ElseOp` if it is provided, otherwise a constant result of `nil` is returned. 

### `0x05` Lookup

```
Logical Structure:
0x02 [<AddressOp> <SymOp>]
```

The `Lookup` Op performs lookup of a value for a Symbol in the current Context's Environment.

### `0x06` Def

```
Logical Structure:
0x02 [<SymOrSyntax> <ValueOp>]
```

The `Def` Op defines the value of a Symbol in the current Context's Environment.

The parameter (`SymOrSyntax`) must be either a Symbol or a Syntax Object containing a Symbol value. This restriction is enforced by Op validation.

If a Syntax Object is provided for `SymOrStnax`, metadata from the Syntax Object is stored for the contained Symbol in current Context's Environment Metadata. Otherwise, any existing Metadata is unchanged.

Note that in the compiler, `def` takes metadata from its value argument in the compiler and adds it to the Symbol if provided, hence the subtle difference:

(def a (syntax 1 {:foo true})) defines a Syntax value
(def b ^{:foo true} 1) defines the value 1 (with metadata on a)

### `0x40` - `0x7f` Special


## Garbage Collection

The CVM implements full garbage collection - values which are no longer referenced are automatically discarded from memory without the need for any programmer intervention.

We note that this is an important prereqisite for high performance in an execution that depends heavily on immutable, persistent data structures, as it allows safe structural sharing of values without the need to resort to cumbersome and computationally expensive approaches such as reference counting.

Implementation notes: 

- While the CVM specification does not require persistent storage, it is expected that Peers will rely upon persistent storage for CVM Objects. To the extend that CVM values are written to persistent storage in a database, Peers may need to perform a separate garbage collection phase on the database
- The current CVM implementation makes use of JVM `SoftReference`s and lazy loading, which allows the host JVM to garbage collect values in many cases even if they are still potentially reachable. This is safe provided that the values can be recoved from storage on demand if required. The advantage of this approach is that it allows the processing of large CVM data structures (such as the State itself) even if these structures exceed the size of available Peer memory.
