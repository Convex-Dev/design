# Accounts

## Overview

Accounts are a fundamental construct in Convex - they are logical records in the CVM State that are either securely controlled by an external User, or operate as Autonomous Actors.

Accounts are the primary means of managing security and access control for on-chain Transactions. Any Transaction executed by Convex must be associated with a User Account and signed with a valid digital signature. This protects the User's account from unauthorised access.

Accounts also constitute the largest part of the on-chain CVM State. Accounts are used to store code and data, and to track holdings of various digital assets. In the future, Accounts will probably constitute over 99% of the CVM State size - the remaining 1% being consensus management data and network-global data. there isn't much else apart from data structure to support Peers managing consensus and a little network-global data.

## Addresses

Every Account has an Address, which is a unique ID that identifies the Account. These are conventionally shown in the format `#1234`, and are primitive CVM Values in their own right.

Addresses are assigned sequentially whenever new Accounts are created. It is impossible to change the Address of an Account once created.

Addresses are recommended as the unique ID to be used for access control mehanisms, e.g. an Actor might maintain a Set of Addresses which are allowed to execute a security-critical operation.

Addresses are also typically used as the index for data structures that track ownership of digital assets. A common pattern is to represent ownership as a Map of Addresses to numbers that represent balances of respective digital asset(s).

## User Accounts

A User Account is an Account with a Public Account Key set, which is used to validate the digital signature of Transactions. The associated Private Key is assumed to be under the secure control of an external User. 

A User Account is considered the Origin Account during the execution of any Transaction submitted for this Account.

## Actor Accounts

An Actor Account is an Account with no Account Key.

Actors do nothing on their own (with some limited execptions e.g. Scheduled Operations). They need to be invoked by other Accounts, e.g. a User will typically `call` an exported Actor function from their own Account. 

## Lisp Machine

Each Account can be considered as a small, lightweight Lisp Machine! It has its own programmable Environment, and can be interacted with via Transactions (write) or Queries (read-only).

There's not much limit on what can be done with this capability. You can control an Account with a REPL, use it to script various on-chain operations, use it as a tempory environment for on-chain smart contract development etc.

## Controllers

Optionally, an Account may define a Controller, giving the ability to one or more other Accounts to control the account. 

This is a powerful capability. A Controller Account can be used, for example, to give "root" Access to an Actor so that it can be upgraded or fixed after deployment.

It is also a risk: Users SHOULD NOT set a Controller for any Account they wish to keep secure unless:
- They know exactly what they are doing
- They fully trust the Account(s) they are giving control access to.

## Recycling Accounts

It is possible to recycle old Accounts, perhaps even selling them! This is likely to be cheaper and more efficient than creating a new Account, since it will save Memory. It also helps keep the CVM State smaller overall.

An example procedure for doing this securely is:
- Transfer away any digital assets or other access control rights you want to keep
- Set the Controller to `nil`
- Delete unwanted definitions from the Account with `*undef*`
- Especially, it is important to delete:
  - any exported functions that might be called externally
  - The `*schedule-start*` value, which may enable Scheduled Operations
- Set the Account Key to the Public Key of the new Owner

With this method, Accounts may be re-used by different individuals, with the secure knowledge that the previous owner(s) no longer have any control over the Account. 
