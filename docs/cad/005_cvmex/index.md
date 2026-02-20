# CAD005: CVM Execution

## Overview

The Convex Virtual Machine (CVM) execution operates as decentralised virtual machine. 

The CVM implements a pure, deterministic state transition function which can be executed and validated by all peers. Conceptually this can be viewed as:

```
State' = f (State, Block)
```

Under this model, the latest consensus state can always be reconstructed given both:

- A initial State
- All Blocks in the CPoS ordering between the initial State and the current consensus point

Normally, Peers maintain the current Consensus State, and update this accordingly whenever one or more new Blocks are confirmed by the CPoS Consensus Algorithm. However, a new Peer can reliably reconstruct the Consensus State from any preceding State as long it it also holds the necessary Blocks from that state onwards. This enables a new Peer to efficiently synchronise with the Convex Network without having to process all preceding Blocks.

## The State

The State is a global, decentralised data structure which contains all of the currently active on-chain information. Logically, the purpose of transactions is to cause changes in the State.

Some useful notes about the State:

- It may be large - typically larger than RAM on many machines
- There is only one "consensus" state at any one time, but it is also possible to refer to previous (or potential future) States using the State Hash.

### State Representation

The State is regarded by the CVM as an immutable value, a special type of Record. See CAD-002 for more details on the specifics of Record types.

Since it is a CVM value, the state is internally implemented as a Merkle Tree / DAG allowing for full cryptographic verification of the entire global state given a single 32-byte root hash. This model allows for immutable snapshots of the entire state to be analysed and stored for future reference. It also allows for the entire tree to be considered as content-addressable storage.

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

### Constant

```
Logical Structure:
0xe0 <Value>
```

The `Constant` Op loads a single CVM value into the Context's Result Register.

### Invoke

```
Logical Structure:
0xe1 [<FnOp1> <ArgOp1> <ArgOp2> ....]
```

The `Invoke` Op recursively executes a sequence of child Ops, and if all these execute successfully invokes the Function provided by the Result of the first child Op, with the results of the following child Ops passed as arguments.

The `Invoke` Op must throw a `:CAST` error if the first Op does not return a valid Function. Otherwise, the resulting Context will be the Context produced by execution of the Function.

### Cond

```
Logical Structure:
0xe2 [<TestOp1> <ResultOp1> <TestOp2> <ResultOp2> .... (optional ElseOp)]
```

The `Cond` Op implements conditional evaluation of child Ops, expreseed as `TestOpX ResultOpX` pairs followed by an option `ElseOp`.

For each pair in sequence the `TestOp` is evaluated. If this evaluates to true value, then the result of `Cond` is produced by the corresponding `ResultOp` and no further Ops are executed. If false, execution proceeds immediately to the next pair of Ops.

In the case that no test returns true then the result of `Cond` is the result of executing `ElseOp` if it is provided, otherwise a constant result of `nil` is returned.

### Do

```
Logical Structure:
0xe3 [<Op1> <Op2> <Op3> ....]
```

The `Do` Op implements sequential execution of multiple child Ops.

Each child Op is executed in turn. It if succeeds, then execution continues to the next Op.

The final result of `Do` is the result of executong the last child Op. In case no child Ops are provided, then `Do` returns a constant result of `nil`.

### Let

```
Logical Structure:
0xe4 <Syms> [<Op1> <Op2> <Op3> ....]
```

The `Let` Op allows execution of a sequence of Ops with local bindings

### Loop

```
Logical Structure:
0xe5 <Syms> [<Op1> <Op2> <Op3> ....]
```

The `Loop` Op allows execution of a sequence of Ops with local bindings similat to `Let`, except that it additionally serves as a target for `recur` allowing the construction of efficient looping constructs.


### Def

```
Logical Structure:
0xe6 [<SymOrSyntax> <ValueOp>]
```

The `Def` Op defines the value of a Symbol in the current Context's Environment.

The parameter (`SymOrSyntax`) MUST be either a Symbol or a Syntax Object containing a Symbol value. This restriction is enforced by Op validation.

If a Syntax Object is provided for `SymOrStnax`, metadata from the Syntax Object is stored for the contained Symbol in current Context's Environment Metadata. Otherwise, any existing Metadata is unchanged.

If `ValueOp` is `nil`, the definition MUST be created or updated in the environment but the existing value in the environment (if any) will be unchanged. 

Note that in the compiler, `def` takes metadata from its value argument in the compiler and adds it to the Symbol if provided, hence the subtle difference:

```
;; defines a Syntax value
(def a (syntax 1 {:foo true})) 

;; defines the value 1 (with metadata on a)
(def b ^{:foo true} 1) 
```

The compiler also interprets a `def` with only on argument as having a `ValueOp` equal to `nil`. This is is useful for forward definitions (e.g. as used in the core macro `declare`)

### Lookup

```
Logical Structure:
0xe7 [<AddressOp> <SymOp>]
```

The `Lookup` Op performs lookup of a value for a Symbol in the current Context's Environment.

###  Special

```
Logical Structure:
0xef <SpecialCode>
```

Where: `<SpecialCode>` is a byte indicating the special symbol as defined below.

Special Ops allow fast access to key values in the current Context, loading these into the Result Register. Special Ops are high performance ways to make certain information in the Context available to CVM Code.

#### `0x00 - *juice*`

Gets the current Juice count in the Context. 

#### `0x01 - *caller*`

Gets the Caller for the current context, defined as the address of the account that made the enclosing `(call ...)` invocation. 

`*caller*` is `nil` for top level execution of a user transaction (i.e. there was no enclosing caller).

Normally, `*caller*` SHOULD be used to perform access control checks within an actor or smart contract, since it determines which account made the request.

#### `0x02 - *address*`

`*address*` returns the address of the currently executing account.

The Address of the currently executing Account. `*address*` MAY vary within a single transaction in the case where execution control is transferred between accounts, e.g. with `call` or `eval-as`.

Normally, `*address*` should be passed as an argument to function that check for access control rights

#### `0x03 - *memory*`

Gets the current memory allowance (in bytes) for the currently executing Account.

#### `0x04 - *balance*`

Gets the current CVM coin balance (in copper) for the currently executing Account.

#### `0x05 - *origin*`

Gets the Address of the origin Account for the current transaction, i.e. the Account that signed and submitted the transaction.

Unlike `*caller*`, `*origin*` remains constant throughout the entire transaction regardless of any `call` or `eval-as` invocations. `*origin*` SHOULD generally be avoided for access control (prefer `*caller*`), but is useful for determining the original transaction submitter.

#### `0x06 - *result*`

Gets the current value of the Result Register. This is the result of the most recently executed operation in the current Context. Useful in macro expansions and advanced metaprogramming.

#### `0x07 - *timestamp*`

Gets the current State Timestamp as a Long value (milliseconds since Unix epoch). The timestamp is set during Block Preparation and is guaranteed to be monotonically increasing.

#### `0x08 - *depth*`

Gets the current execution depth of the CVM stack. The depth is `0` at the top level of a transaction and increases with each nested `call` or function invocation. This can be used to guard against excessive recursion.

#### `0x09 - *offer*`

Gets the current coin offer amount (in copper) available in the Context. The offer is the amount of coins made available by the caller via the `call` form for potential acceptance by the called Actor.

#### `0x0a - *state*`

Gets the entire current CVM State as a value. This is a large data structure and SHOULD be used with care. Primarily useful for advanced introspection and debugging.

#### `0x0b - *holdings*`

Gets the holdings map for the currently executing Account. Holdings represent assets or token balances held by the Account in various Actors.

#### `0x0c - *sequence*`

Gets the current sequence number for the currently executing Account. The sequence number is incremented with each transaction and is used to prevent replay attacks.

#### `0x0d - *key*`

Gets the public key (Account Key) associated with the currently executing Account, or `nil` if no key is set (e.g. for Actor accounts).

#### `0x0e - *juice-price*`

Gets the current juice price from the State. The juice price determines the cost of CVM execution in terms of coins per unit of juice consumed.

#### `0x0f - *scope*`

Gets the current scope value in the Context. The scope is set by `set-scope` within an Actor and provides a mechanism for Actors to pass contextual information across internal function calls.

#### `0x10 - *juice-limit*`

Gets the juice limit for the current transaction. This is the maximum amount of juice that can be consumed before the transaction fails with a `:JUICE` error.

#### `0x11 - *controller*`

Gets the controller Address for the currently executing Account. The controller is an Account that has the authority to manage the Account (e.g. update its key or transfer ownership). May be `nil` for self-sovereign Accounts.

#### `0x12 - *env*`

Gets the current environment map for the executing Account. The environment is a map of Symbols to their defined values, representing the Account's namespace.

#### `0x13 - *parent*`

Gets the parent Address for the currently executing Account. The parent is the Account from which this Account was created, if applicable.

#### `0x14 - *nop*`

A no-operation Special that returns the Context unchanged, propagating the current value of the Result Register. This is functionally equivalent to `*result*` but exists as a distinct opcode.

#### `0x15 - *memory-price*`

Gets the current memory price from the State as a Double value. The memory price determines the cost per byte of on-chain memory allocation.

#### `0x16 - *signer*`

Gets the Address of the signer for the current transaction. In most cases this is the same as `*origin*`, but may differ in contexts where signing authority is delegated.

#### `0x17 - *peer*`

Gets the Address of the Peer that submitted the current Block containing this transaction. Returns `nil` if not available in the current execution context.

#### `0x18 - *location*`

Gets the current location value in the Context. The location provides information about the source position of the currently executing code, useful for debugging and error reporting.

## Op Execution

When executed in a given Context, every Op MUST do exactly one of the following:

- Complete normally with some resulting value loaded into the Context's Result Register
- Throw an Error, which is never caught and results in the failure of the whole transaction
- Throw a special Exceptional value, which is handled by the CVM in special ways to implement control flow (`recur`, `return` etc.)



## Memory Management

Memory management is a critical aspect of any scalable computational system. The CVM memory management works on the following principles:

- On-chain developers never have to worry about memory management. It is fully automatic and transparent.
- Memory management costs are properly accounted for in the transaction fees paid by users of the network (either for juice execution costs or via memory accounting).

The CVM therefore implements full automatic garbage collection - values which are no longer referenced are automatically discarded from memory without the need for any programmer intervention.

### A note on the efficiency of GC

We note that GC is an important prerequisite for high performance in an execution that depends heavily on immutable, persistent data structures. Some reasons for this:

- It allows safe structural sharing of values without the need to resort to cumbersome and computationally expensive approaches such as reference counting.
- Approaches that are dependent on "ownership" of memory (RAII, Rust-style borrowing) are not effective when there is a need to make multiple, cheap `O(1)` copies of references.
- Modern generational GCs are extremely efficient - in may cases better than traditional heap-based allocators

### Further implementation notes

- While the CVM specification does not require persistent storage, it is expected that Peers will rely upon persistent storage for CVM Objects. To the extend that CVM values are written to persistent storage in a database, Peers may need to perform a separate garbage collection phase on the database
- The current CVM implementation makes use of JVM `SoftReference`s and lazy loading, which allows the host JVM to garbage collect values in many cases even if they are still potentially reachable. This is safe provided that the values can be recovered from storage on demand if required. The advantage of this approach is that it allows the processing of large CVM data structures (such as the State itself) even if these structures exceed the size of available Peer memory.

## See Also

- [CAD002: CVM Values](../002_values/index.md) — Value types operated on by the CVM
- [CAD003: Encoding](../003_encoding/index.md) — Binary encoding of Ops and values
- [CAD004: Accounts](../004_accounts/index.md) — Account model referenced by execution contexts
- [CAD006: Memory Accounting](../006_memory/index.md) — Memory management cost model
- [CAD007: Juice Accounting](../007_juice/index.md) — Execution cost accounting
- [CAD008: Compiler](../008_compiler/index.md) — Compilation of source code to Ops
- [CAD010: Transactions](../010_transactions/index.md) — Transaction structure and submission
- [CAD011: Errors](../011_errors/index.md) — Error types and handling
- [CAD027: Event Logging](../027_log/index.md) — CVM execution log
