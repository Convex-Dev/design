# Error Handling

Error handling is a critical feature of all good code, and therefore requires special consideration on the CVM.

## General Design Principles

### Relation to Exceptions

An Error is a subclass of Exception that represents a failure in CVM code execution that should typically be reported back to the User. 

Other classes of Exception are used to signal special case handling e.g. `rollback` of State changes in an Actor call. These special cases are generally caught and handled at appropriate points in the CVM implementation, and are not normally visible to external Users.

### Error Codes

All Errors are defined to have a non-nil Error Code that describes the general nature of the Error.

Error Codes SHOULD be Keywords by convention, though this is not enforced by the CVM and altrenative CVM types MAY be used.

A difference in Error Code MUST NOT affect CVM State, however it MAY be returned to Clients by Peers for informational purposes.

### Error Messages

All Errors have a Message, which may be any CVM value.

Messages SHOULD be meaningful, and human readable to facilitate debugging or appropriate notification to uses.

### No catches

Errors are **not catchable** within CVM code.

The reason for this decision is that the security and integrity of smart contracts is at risk if Errors are mishandled, and it is far safer to always abort a transaction that caused an error. In particular, smart contracts that call untrusted code may be vulnerable to exploits that deliberately trigger an Error to exploit mistakes in error handling.

As an alternative to catching Errors, CVM code SHOULD perform appropriate checks on preconditions before calling other code. If precoditions are not met, alternative handling may performed. 

## Machanics

An Error is said to be "thrown" when the execution of a CVM operation produces an exception of an Error type. There are two possibilities for this to occur:

- The Error is thrown according to CVM runtime execution rules, for example during the execution of Core Runtime functionality.
- The Error is thrown by user code explicitly calling the `fail` Runtime function.

If an Error is thrown, normal execution is terminated and no normal result is produced by the CVM operation.

## Standard Error Codes

The following are standard Error Codes that are recommended for use in the CVM

### `:ARITY`

An `:ARITY` Error SHOULD be returned whenever an attempt is made to call a function with an invalid number of arguments.

Note that a function may allow a variable number of arguments with a parameter declaration such as `[a & more]`. In such cases, code SHOULD still throw an `:ARITY` Error if the number of variable arguments is impermissible for any reason (e.g. requiring an odd number of arguments)

### `:ASSERT`

An `:ASSERT` Error MAY be returned whenever a precodition for some code is not satifisied. In many cases, a more specific Error message may be appropriate or informative (e.g. `:CAST` or `:STATE`.

The Core function `assert` throws an `:ASSERT` error if any of its conditions evaluates to `false`

### `:CAST`

A `:CAST` Error SHOULD be returned whenever a function is passed an argument that is of the wrong Type.

In particualar, a `:CAST` Error should be thrown whenever an attempt is made to explicitly or implicitly convert a value to a different Type, but the conversion is not permitted. 

### `:ARGUMENT`

An `:ARGUMENT` Error SHOULD be returned whenever code is passed an argument that is of an allowable Type, but for some reason is invaid in the situtation encountered. An example would be attempting to put `assoc` a non-Blob value into a BlobMap (which only accepts Blobs as keys).

### `:BOUNDS`

An `:BOUNDS` Error SHOULD be returned whenever an attempt is made to access an indexed element of a countable collection when the index used does not exist.

### `:NOBODY`

A `:NOBODY` Error should be returned whenever an attempt is made to access an Account that does not exist. 

### `:STATE`

A `:STATE` Error SHOULD be returned when an operation is attempted that would possibly be legal, but fails in the current situation because of some information in the current CVM State not permitting it.

### `:TODO`

A `:TODO` Error SHOULD be thrown by code that is not yet complete, but may be later upgraded to full functionality. 

This Error is probably most appropriate during development and testing, but could plausibly be used in production code that is designed to be upgraded at a later date.

### `:TRUST`

A `:TRUST` Error SHOULD be thrown when an operation is attempted that is not permitted due to security or access control conditions. Typically, this would indicate an attempt to perform an action that the User is not allowed to perform.

### `:FUNDS`

A `:FUNDS` Error SHOULD be returned when an operation is attempted that fails because an Account has insufficient balance of Convex Coins (or another digital asset) to afford the operation.

### `:MEMORY`

A `:MEMORY` Error SHOULD be returned when an operation is attempted that fails because an Account has insufficient Memory Allowance to complete the operation.

### `:JUICE`

A `:JUICE` Error SHOULD be returned if the `*origin*` Account of the currently executing code has insufficent Convex Coin balance to pay the required Juice costs. User code MAY return this Error to indicate that an infeasibly expensive operation was attempted.

### `:UNDECLARED`

An `:UNDECLARED` Error SHOULD be returned whenever an attempt is made to lookup a Symbol in an Account's Environment that is not defined.

## CVM Behaviour

The CVM itself is subject to additional rules on how and when it creates Errors. 

Clients MAY assume that the CVM behaves consistently according to these rules, But SHOULD NOT assume that a particular Error has been generated by the CVM itself, since user code may produce similar Errors.

### Core Runtime functions

Core Runtime functions MUST return an `:ARITY` Error if an invalid number of arguments is passed to a funtion.

Otherwise, Core Runtime functions MUST return a `:CAST` Error when an argument of the wrong Type is provided.

Otherwise, Core Runtime functions MUST return a `:NOBODY` Error when an attempt is made to access an Account that does not exist.

Otherwise, Core Runtime functions MUST return an `:ARGUMENT` Error when an argument of an allowable Type is provided, but the specific value is not permitted.

Otherwise, Core Runtime functions MUST return an Error if their execution causes any CVM code to be executed that in turn causes an Error. CVM functions MAY, in certain cases, alter the Error Code or Message to provide additional information.

Otherwise, Core Runtime Functions MUST NOT return an Error.

### Fatal Errors

The CVM MUST return a `:FATAL` error if any unexpected problem occurs the should not be legally possible during CVM execution (typically caused by a host runtime exception)

A Peer that encounters a `:FATAL` error has a serious problem. Hardware failure, bugs in the CVM implementation or resource limitations of the host environment are all possibilities, all of which may cause the Peer to fail to correctly compute the updated CVM State in consensus.

The Peer MAY attempt the following resolutions:

- Retry the CVM execution, to see if it can recover from a transient error
- Re-sync with other Peers that may not have encountered the failure

Otherwise, Peers SHOULD shut down gracefully to prevent risk of loss (e.g. stake slashing) from failing to maintain consensus.

### Transaction handling

When attempting to execute an externally submitted transaction, the CVM MUST throw one of the following Errors if a failure to execute the trasnaction occurs.

#### `:NOBODY`

If the Transaction is submitted with an Address that does not refer to an Account in the current CVM State, the CVM MUST throw a `:NOBODY` Error.

In this case, the CVM MUST NOT execute the Transaction. This is necessary to prevent the risk of DoS attacks using non-existent accounts.

#### `:SEQUENCE`

If the Transaction is submitted for a valid Account but has the wrong Sequence Number for the Account (i.e. it is not the next Sequence Number), the CVM MUST return a `:SEQUENCE` Error.

In this case, the CVM MUST NOT execute the Transaction. This is necessary to prevent the risk of transaction replay attacks.
