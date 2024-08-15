# Error Handling

Error handling is a critical feature of all good code, and therefore requires special consideration on the CVM.

## General Design

### Error Codes

All errors are defined to have a non-nil error code that describes the general nature of the eror. The error code SHOULD provide information regarding the type or cause of the error, in a way that may be interpreted appropriately by clients.

Error codes SHOULD be upper case keywords (e.g. `:ASSERT`) by convention, though this is not enforced by the CVM and alternative CVM types MAY be used.

The value of the error code MUST NOT affect CVM state, however it SHOULD be returned to Clients by Peers for informational purposes.

### Error Messages

All errors are accompanied with a message, which may be any CVM value (including `nil`). Error messages are returned alongside the error code when an error is thrown, with the intention that this can be relayed to clients.

Messages SHOULD be meaningful, and human readable to facilitate debugging or appropriate notification to Users.

The contents of the message MUST NOT affect CVM State, however it SHOULD be returned to clients by peers for informational purposes.

### Try / Catch

Most Errors can be caught and handled within CVM code (`:JUICE` errors are a notable exception, because they are unrecoverable by any code). Erros can be caught and handled with the `try` construct:

```clojure
(try
  (do-something-that-might-fail)
  (do-something-else-in-failure-case))
```

This construct has several notable features:
- Sub-expressions are executed in turn until the first one succeeds (completes without an error).
- Each sub-expression is *atomic* - either it succeeds, or in the case of an error, the whole subexpression is rolled back. This is important protection to ensure that code causing an error does not result in inconsisent state from partically completed operations.
- The whole `try` expression can only fail if the last sub-expression fails (or an uncatchable error like `:JUICE` is thrown)

NOTE: Originally catching errors was not allowed in the CVM, because of the fears that the security and integrity of smart contracts would be at risk if error recovery was mishandled. This risk is largely mitigated by the "rollback" behaviour implemented in the `try` construct.

As an alternative to catching Errors, CVM code SHOULD perform appropriate checks on preconditions before calling other code.

### Errors vs. other exceptional execution

An error represents a failure in CVM code execution that should typically be reported back to the user. 

Other exceptional modifications to control flow are used to signal special case handling e.g. `rollback` of State changes in an Actor call. These special cases are generally caught and handled at appropriate points in the CVM implementation, and are not normally visible to external Users.


## Mechanics

### Throwing errors

An error is said to be "thrown" when the execution of a CVM operation produces and error rather than a normal result. There are two possibilities for this to occur:

- The error is thrown according to CVM runtime execution rules, for example during the execution of `convex.core` runtime functions.
- The error is thrown by user code explicitly calling the `fail` Runtime function.

If an error is thrown, normal execution is terminated and no normal result is produced by the CVM operation.

### Error handling

## Standard Error Codes

The following are standard Error Codes that are recommended for use in the CVM. User code SHOULD follow these conventions where possible.

### `:ARGUMENT`

An `:ARGUMENT` Error SHOULD be thrown whenever a Function is passed an argument that is of an allowable Type for some reason is invalid (usually in relation to other arguments). An example would be attempting to put `assoc` a non-Blob value into a Index (which only accepts Blob-like values as keys).

If the argument is definitely of the wrong Type (i.e. would never be valid in any situation) then a `:CAST` Error should be thrown instead.

### `:ARITY`

An `:ARITY` Error SHOULD be thrown whenever an attempt is made to call a Function with an illegal number of arguments.

Note that a function may allow a variable number of arguments with a parameter declaration such as `[a & more]`. In such cases, code SHOULD still throw an `:ARITY` Error if the number of variable arguments is impermissible for any reason (e.g. requiring an odd number of arguments)

### `:ASSERT`

An `:ASSERT` Error MAY be thrown whenever a precondition for some code is not satisfied. In many cases, a more specific Error message may be appropriate or informative (e.g. `:CAST` or `:STATE`.

The Core function `assert` throws an `:ASSERT` error if any of its conditions evaluates to `false`

### `:BOUNDS`

An `:BOUNDS` Error SHOULD be thrown whenever an attempt is made to access an indexed element of a countable collection when the index used does not exist.

This Error is useful because it is more specific than `:ARGUMENT` when working with indexed collection.

### `:CAST`

A `:CAST` Error SHOULD be thrown whenever a function is passed an argument that is of the wrong type.

In particular, a `:CAST` Error SHOULD be thrown whenever an attempt is made to explicitly or implicitly convert a value to a different Type, but the conversion is not permitted. 

### `:NOBODY`

A `:NOBODY` Error should be thrown whenever an attempt is made to access an Account that does not exist. 

### `:SYNTAX`

A `:SYNTAX` Error indicates a syntax error in code, typically during expansion or compilation. 

### `:STATE`

A `:STATE` Error SHOULD be thrown when an operation is attempted that would possibly be legal, but fails in the current situation because of some information in the current CVM State not permitting it.

### `:TODO`

A `:TODO` Error SHOULD be thrown by code that is not yet complete, but may be later upgraded to full functionality. 

This Error is probably most appropriate during development and testing, but could plausibly be used in production code that is designed to be upgraded at a later date.

### `:TRUST`

A `:TRUST` Error SHOULD be thrown when an operation is attempted that is not permitted due to security or access control conditions. Typically, this would indicate an attempt to perform an action that the User is not allowed to perform.

### `:FUNDS`

A `:FUNDS` Error SHOULD be thrown when an operation is attempted that fails because an Account has insufficient balance of Convex Coins (or another digital asset) to afford the operation.

### `:MEMORY`

A `:MEMORY` Error SHOULD be thrown when an operation is attempted that fails because an Account has insufficient Memory Allowance to complete the operation.

### `:JUICE`

A `:JUICE` Error SHOULD be thrown if the `*origin*` Account of the currently executing code has insufficent Convex Coin balance to pay the required Juice costs. User code MAY return this Error to indicate that an infeasibly expensive operation was attempted.

A `:JUICE` error cannot be caught.

### `:UNDECLARED`

An `:UNDECLARED` Error SHOULD be thrown whenever an attempt is made to lookup a Symbol in an Account's Environment that is not defined.

## CVM Behaviour

The CVM itself is subject to additional rules on how and when it creates Errors. 

Clients MAY assume that the CVM behaves consistently according to these rules, But SHOULD NOT assume that a particular Error has been generated by the CVM itself, since user code may produce similar Errors.

### Core Runtime functions

Core runtime functions MUST throw an `:ARITY` Error if an invalid number of arguments is passed to a funtion.

Otherwise, core runtime functions MUST throw a `:CAST` Error when an argument of the wrong Type is provided, or if an explicit cast function such as `blob` fails.

Otherwise, core runtime functions MUST throw a `:NOBODY` Error when an attempt is made to access an Account that does not exist.

Otherwise, core runtime functions MUST throw an `:ARGUMENT` Error when an argument of an allowable Type is provided, but the specific value is not permitted.

Otherwise, core runtime functions MUST throw an error if their execution causes any CVM code to be executed that in turn causes an Error. CVM functions MAY, in certain defined cases, alter the Error Code or Message to provide additional information.

Otherwise, core runtime Functions MUST NOT return an error.

### Fatal Failures

If the CVM encounters any condition that should not be legally possible during CVM execution (typically caused by a host runtime exception), it should regard this condition as a Fatal Failure

The CVM MUST report a `:FATAL` error if any fatal failure occurs.

The CVM MUST NOT interpret an error thrown by user code as a fatal failure, but such errors MAY still have the `:FATAL` error code.

A peer that encounters a fatal error has a serious problem. Hardware failure, bugs in the CVM implementation or resource limitations of the host environment are all possibilities, all of which may cause the peer to fail to correctly compute the updated CVM state in consensus.

The peer MAY attempt the following resolutions:

- Retry the CVM execution, to see if it can recover from a transient error
- Re-sync with other peers that may not have encountered the failure

Otherwise, peers SHOULD shut attempt to shut down gracefully to prevent risk of loss (e.g. stake slashing) from failing to maintain consensus. Peers MAY choose to act as a client of another peer to submit transactions as part of this process, for example to withdraw peer stake.

### Transaction handling

When attempting to execute an externally submitted transaction, the CVM MUST throw one of the following errors if a failure to execute the transaction occurs.

#### `:NOBODY`

If the transaction is submitted with an address that does not refer to an account in the current CVM State, the CVM MUST throw a `:NOBODY` error.

In this case, the CVM MUST NOT execute the transaction. This is necessary to prevent the risk of DoS attacks using non-existent accounts.

#### `:SEQUENCE`

The CVM must throw a sequence error in the case that the sequence number of a transaction is invalid for the origin account that it is submitted for. This protection is neccessary to stop replay attacks (multiple executions of the same transaction cause by an adversary re-submitting it). 

If the Transaction is submitted for a valid Account but has the wrong Sequence Number for the Account (i.e. it is not the next Sequence Number), the CVM MUST return a `:SEQUENCE` Error.

In this case, the CVM MUST NOT execute the Transaction. This is necessary to prevent the risk of transaction replay attacks.

#### `:SIGNATURE`

The CVM MUST throw a `:SIGNATURE` error if the digital signature for the transaction is not valid given the public `*key*` of the origin account. 


