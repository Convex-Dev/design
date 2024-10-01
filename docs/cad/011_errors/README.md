# CAD011: Error Handling

Error handling is a critical feature of all good code, and therefore requires special consideration on the CVM.

## General Design

### Expression behaviour

Every expression MUST do one of three things:
- Succeed with a valid CVM value as the `*result*`.
- Fail with an error as described in ths CAD.
- Perform an exceptional exit, e.g. because of a nested CVM `return` function. In these cases, control is always returned to some higher level expression.

### Error Codes

All errors are defined to have a non-nil error code that describes the general nature of the error. The error code SHOULD provide information regarding the type or cause of the error, in a way that may be interpreted appropriately by clients.

Error codes SHOULD be upper case keywords (e.g. `:ASSERT`) by convention. The CVM itself MUST follow this convention, though this is not enforced in user code and alternative CVM types MAY be used.

### Error Messages

All errors are accompanied with a message, which may be any CVM value (including `nil`). Error messages are returned alongside the error code when an error is thrown, with the intention that this can be relayed to clients if the error is not otherwise caught and handled.

Messages SHOULD be meaningful and human readable to facilitate debugging or appropriate notification to users.

The contents of the message MUST NOT affect CVM state, however it SHOULD be returned to clients by peers for informational purposes.

### Try / Catch

Most errors can be caught and handled within CVM code (`:JUICE` errors are a notable exception, because they are unrecoverable by any code). Errors can be caught and handled with the `try` construct:

```clojure
(try
  (do-something-that-might-fail)
  (do-something-else-in-failure-case))
```

This construct has several notable features:
- Sub-expressions are executed in turn until the *first one that succeeds* (completes without an error).
- Each sub-expression is *atomic* - either it succeeds, or in the case of an error, the whole sub-expression is rolled back. This is important protection to ensure that code causing an error does not result in inconsistent state from partially completed operations.
- The whole `try` expression can only fail if the last sub-expression fails (or an uncatchable error like `:JUICE` is thrown)

NOTE: Originally catching errors was not allowed in the CVM, because of the fears that the security and integrity of smart contracts would be at risk if error recovery was mishandled. This risk is largely mitigated by the "rollback" behaviour implemented in the `try` construct.

### Errors vs. other exceptional exit

An error represents a failure in code execution that could either be handled or reported back to the user. 

Other exceptional exits are where an expression never completes normally but there is no error e.g. `return` from a function or `rollback` of state changes in an actor call. These special cases are generally caught and handled at appropriate points in the CVM implementation, and are not normally visible to external users.


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

An `:ARGUMENT` error SHOULD be thrown whenever a function is passed an argument that is of an allowable type but for some reason is invalid (perhaps in relation to other arguments). 

Examples:
- Attempting to put `assoc` a non-Blob value into a Index (which only accepts Blob-like values as keys).
- Attempting to cast a value that is out of the allowable range (e.g. `(long 1e100)`)

If the argument is definitely of the wrong type (i.e. would never be valid in any situation) then a `:CAST` error should be thrown instead.

### `:ARITY`

An `:ARITY` error SHOULD be thrown whenever an attempt is made to call a Function with an illegal number of arguments.

Note that a function may allow a variable number of arguments with a parameter declaration such as `[a & more]`. In such cases, code SHOULD still throw an `:ARITY` Error if the number of variable arguments is impermissible for any reason (e.g. requiring an odd number of arguments)

### `:ASSERT`

An `:ASSERT` error MAY be thrown whenever a precondition for some code is not satisfied. In many cases, a more specific error message may be appropriate or informative (e.g. `:CAST` or `:STATE`).

The Core function `assert` throws an `:ASSERT` error if any of its conditions evaluates to `false`

### `:BOUNDS`

An `:BOUNDS` error SHOULD be thrown whenever an attempt is made to access an indexed element of a countable collection when the index used does not exist.

This Error is useful because it is more specific than `:ARGUMENT` when working with indexed collection.

### `:CAST`

A `:CAST` error SHOULD be thrown whenever a function is passed an argument that is of the wrong type.

In particular, a `:CAST` Error MUST be thrown whenever an attempt is made to convert a value to a different type using a CVM runtime function, but the conversion is not permitted for any member of the type.

### `:NOBODY`

A `:NOBODY` Error should be thrown whenever an attempt is made to access an Account that does not exist. 

### `:SYNTAX`

A `:SYNTAX` error indicates a syntax error in code, typically during expansion or compilation. 

### `:STATE`

A `:STATE` error SHOULD be thrown when an operation is attempted that would possibly be legal, but fails in the current situation because of some information in the current CVM State not permitting it.

### `:TODO`

A `:TODO` error SHOULD be thrown by code that is not yet complete, but may be later upgraded to full functionality. 

This error is probably most appropriate during development and testing, but could plausibly be used in production code that is designed to be upgraded at a later date.

### `:TRUST`

A `:TRUST` error SHOULD be thrown when an operation is attempted that is not permitted due to security or access control conditions. Typically, this would indicate an attempt to perform an action that the user is not allowed to perform.

### `:FUNDS`

A `:FUNDS` error SHOULD be thrown when an operation is attempted that fails because an Account has insufficient balance of Convex Coins (or another digital asset) to afford the operation.

### `:MEMORY`

A `:MEMORY` error SHOULD be thrown when an operation is attempted that fails because an Account has insufficient Memory Allowance to complete the operation.

### `:JUICE`

A `:JUICE` error MUST be thrown with the source `:CVM` if the `*origin*` account of the currently executing code has insufficient Convex Coin balance to pay the required Juice costs. 

A `:JUICE` error from the CVM MUST NOT caught: it would be pointless because any error handling code would not be able to execute due to lack of juice.

User code MAY throw a `:JUICE` error to indicate that an infeasibly expensive CVM operation was attempted.

### `:UNDECLARED`

An `:UNDECLARED` error SHOULD be thrown whenever an attempt is made to lookup a symbol in an account's environment that is not defined.

## CVM Behaviour

The CVM itself is subject to additional rules on how and when it creates errors. 

Clients MAY assume that the CVM behaves consistently according to these rules, But SHOULD NOT assume that a particular error has been generated by the CVM itself, since user code may produce similar errors.

### Core Runtime functions

Core runtime functions MUST throw an `:ARITY` error if an invalid number of arguments is passed to a function.

Otherwise, core runtime functions MUST throw a `:CAST` error when an argument of the wrong Type is provided, or if an explicit cast function such as `blob` fails.

Otherwise, core runtime functions MUST throw a `:NOBODY` error when an attempt is made to access an Account that does not exist.

Otherwise, core runtime functions MUST throw an `:ARGUMENT` error when an argument of an allowable Type is provided, but the specific value is not permitted.

Otherwise, core runtime functions MUST throw an error if their execution causes any CVM code to be executed that in turn causes an error. CVM functions MAY, in certain defined cases, alter the error code or message to provide additional information.

Otherwise, core runtime functions MUST NOT throw an error.

### Fatal Failures

If the CVM encounters any condition that should not be legally possible during CVM execution (typically caused by a host runtime exception), it should regard this condition as a Fatal Failure

The CVM MUST report a `:FATAL` error with a source of `:CVM` if any fatal failure occurs.

The CVM MUST NOT interpret an error thrown by user code as a fatal failure, but such errors MAY still have the `:FATAL` error code - however the source MUST be `:CODE` in such cases.

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

The CVM throws a `:SEQUENCE` error in the case that the sequence number of a transaction is invalid for the origin account that it is submitted for. The only correct sequence value is the integer which is the current `*sequence*` plus one. This protection is necessary to stop replay attacks (multiple executions of the same transaction cause by an adversary re-submitting it). 

If the transaction is submitted for a valid account but has the wrong sequence number for the account (i.e. it is not the next Sequence Number), the CVM MUST return a `:SEQUENCE` Error with the source code `:CVM`

In this case, the CVM MUST NOT commence execution of the transaction. 

#### `:STATE`

The CVM MUST throw a `:STATE` error in the case that the origin account does not have a `*key*` defined, i.e. it is a library or actor account. No external transaction can be executed for this account unless a `*key*` is subsequently assigned.

#### `:SIGNATURE`

The CVM MUST throw a `:SIGNATURE` error if the digital signature for the transaction is not valid given the public `*key*` of the origin account. 

Clients MAY consider this error as a hint that the user has used the wrong key pair, and take action accordingly, e.g. prompting for the correct key pair.

### General Advice

#### Consider not catching errors

Even with rollback of failed expressions, error handling adds complexity that may not be necessary: the default behaviour of the CVM is to fail and roll back the entire transaction if an error is not caught. 

This is often the safest thing to do: attempting to catch and recover from an error may create security risks. This is especially true if the expression contains a `call` to potentially untrusted code: attackers may be able to get that code to throw an error in order to exploit a vulnerability.

#### Use precondition checks

It is always worth considering checks on preconditions before executing expressions that might fail.

If a pre-condition is not met, it may then be appropriate to `fail` immediately with an informative reason: this often allows better error messages to the user relevant to the context. 

## Error Sources

Error sources indicate the region in the network where an error occurred. These are important mainly because they can indicate responsibility for failure and/or or how to diagnose the problem.

All error results SHOULD include a source code to indicate the source of the error.

| Source Code  | Location of error                            | Example(s)
| ------------ | --------------------------------             | -----------
| `:CLIENT`    | Client library code                          | Failed input validation
| `:COMM`      | Client-Server communications                 | IO failure, connection failure, timeout
| `:SERVER`    | Server handling of request                   | Bad request format, server error, server load
| `:PEER`      | Peer handling of user request                | Rejected for bad signature detected by peer
| `:NET`       | Consensus network                            | Transaction failed to get into consensus
| `:CVM`       | CVM state transition handling                | Invalid sequence number, `:JUICE` error
| `:CODE`      | CVM code execution                           | `:CAST` error in user code

Error sources are not formally part of the Convex Network / CVM specification, but are important additional information normally returned alongside transaction results. Be aware that a malicious peer could fabricate the error source, so it may be useful to independently validate results. 



