# Accounts

## Overview

Accounts are a fundamental construct in Convex - they are logical records in the CVM State that are either securely controlled by an external User, or operate as autonomous actors. 

Accounts are the primary means of managing security and access control for on-chain transactions. Any transaction executed by Convex must be associated with a user account and signed with a valid digital signature. This protects the User's account from unauthorised access.

Accounts also constitute the largest part of the on-chain CVM State. Accounts are used to store code and data, and to track holdings of various digital assets. In the future, accounts will probably constitute over 99% of the CVM State size - there isn't much else apart from data structure to support peers managing consensus and a little network-global data.

## Key Concepts

### Addresses

Every Account has an address, which is a unique ID that identified the account. These are conventionally shown in the format `#1234`, and are primitive values in the CVM in their own right.

Addresses are assigned sequentially whenever new accounts are created. It is impossible to change the address of an account once created.

Addresses are recommended as the unique ID to be used for access control mechanisms, e.g. an actor might maintain a `Set` of addresses which are allowed to execute a security-critical operation.

Addresses are also typically used as the index for data structures that track ownership of digital assets. A common pattern is to represent ownership as a `Map` of addresses to numbers representing balances of the appropriate digital asset(s).

### User Accounts

A user account is an account with a public account key set, which is used to validate the digital signature of transactions. The associated private yey is assumed to be under the secure control of an external user. 

A user account is considered the origin account during the execution of any transaction submitted for this account.

### Actor Accounts

An actor account is an account with no account key.

Actors do nothing on their own (with some limited execptions e.g. scheduled operations). They need to be invoked by other accounts, e.g. a user will typically `call` an exported actor function from their own account. 

### Lisp Machine

Each account can be considered as a small, lightweight lisp machine! It has its own programmable environment, and can be interacted with via transactions (write) or queries (read-only).

There's not much limit on what can be done with this capability. You can control an account with a REPL, use it to script various on-chain operations, use it as a temporary environment for on-chain smart contract development etc.

### Controllers

Optionally, an account may define a controller, giving the ability to one or more other accounts to control the account. 

This is a powerful capability. A Controller Account can be used, for example, to give "root" Access to an Actor so that it can be upgraded or fixed after deployment.

It is also a risk: Users SHOULD NOT set a Controller for any Account they wish to keep secure unless:
- They know exactly what they are doing
- They fully trust the Account(s) they are giving control access to.

### Recycling Accounts

It is possible to recycle old accounts, perhaps even selling them! This is likely to be cheaper and more efficient than creating a new Account, since it will save memory. It also helps keep the CVM state smaller overall.

An example procedure for doing this securely is:
- Transfer away any digital assets or other access control rights you want to keep
- Set the Controller to `nil`
- Delete unwanted definitions fro the Account with `*undef*`
- Especially, it is important to delete:
  - any exported functions that might be called externally
  - The `*schedule-start*` value, which may enable Scheduled Operations
- Set the Account Key to the Public Key of the new Owner

With this method, accounts may be re-used by different individuals, with the secure knowledge that the previous owner(s) no longer have any control over the account. 

## Account Specification

### Account Data Structure

The account is represented a data structure within the state of the CVM.

Each valid address MUST have precisely one account record in the global state.

If a state transition causes an update to information in the account record (e.g. changing a definition in the environment), the new state MUST reflect the account update.

The account record (`AccountStatus` in the standard reference implementation) MUST be a valid CVM Record data structure with Keyword keys as follows:
- `:sequence` - sequence number of the account, initally `0`
- `:key` - account key, may be `nil` to indicate an actor, otherwise a 32 byte Blob representing an Ed25519 public key
- `:balance` - integer balance of the account in Convex copper coins
- `:allowance` - unused memory allowance of the account, normally `0` but may be higher (e.g. if a memory accounting refund occured)
- `:holdings` - map of holdings of the account, attributed to any other accounts which have utilised `set-holding` (e.g. token actors)
- `:controller` - a controller account, which has the power to issue commands for this account (e.g. `eval-as`)
- `:environment` - a map of symbols to defined values in the account, initially `{}`
- `:metadata` - a map of symbols to metadata for values defined in the account, if any. Initially `{}`

### Sequence Number

The sequence number MUST indicate the number of transactions which have been executed for this account.

The sequence number MUST be `0` for a new account, or any account for which transactions have never been previously executed (e.g. an immutable actor)

The sequence number MUST increase by `1` for each correctly signed transaction executed.

### Account Key

Each account MAY have a single account key.

If the account key exists, it MUST be a 32 byte `Blob`.

If the account key is not specified for the account, it MUST be treated as the value `nil` when accessed.

The account key SHOULD represent a valid Ed25519 public key for which the owner of the user account is expected to have access to the corresponding private key. Security of the private key is the responsibility of the external user.

The CVM MUST NOT process transactions for an account unless the Ed25519 digital signature on the transaction can be verified with the account key. See CAD10 for more details.

The account key MAY be changed by a controller of the account to a new account key, or set to `nil`.

### Balance

The balance field MUST be a non-negative integer indicating the number of Convex copper coins controlled directly by the account.

### Allowance

The allowance field MUST be a non-negative integer indicating the number of bytes of unused memory allowance held by the account.

### Holdings

The holdings field MUST be a BlobMap representing a mapping of Address to holding values. 

Holding values SHOULD be meaningfully defined by the respective address that set them.

### Controller

The controller field MAY be any CVM value, including `nil` 

If set to a specific Address, the CVM MUST regard that address as a controller

Otherwise, the CVM MUST regard any non-`nil` value in this field as defining a trust monitor, and check as if called with `(call controller (check-trusted? <caller> :control <account-address>))`

If another account is defined as a controller, it MUST be able to control the account in its entirely, including use of `eval-as`.

