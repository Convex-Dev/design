---
slug: convex-lisp-cvm
title: Lisp on the CVM
sidebar_position: 1
authors: [mikera, helins]
tags: [convex, developer, lisp]
---

In the Gentle Lisp Introduction we covered the basic of the Convex Lisp language. This guide build on these basic to introduce the key ideas of programming on the Convex CVM.

## The Convex Virtual Machine

The CVM is a decentralised, deterministic VM. Because it is deterministic, any replicas of the CVM that execute the same transactions from the same initial state will produce identical results. This is a key part how the Convex network is able to provide a consistent, programmable global state. It also enforces cryptographic security, so that only authorised users can make use of protected services.

In practice, this means that developers can execute code on the CVM safe (including smart contracts and transactions involving valuable digital assets) in the knowledge that the the results are guaranteed by a robust, fault-tolerant global network with no centralised point of failure and strong security.

## Accounts

All code on the CVM is executed in the context of an account. Accounts are part of the the global state of Convex. Accounts are numbered sequentially and referred to by an address which is denoted like `#123`. CVM code can find out what address is being used at any time:

```
;; This is a special symbol that returns the current account address
*address*     
=> #123
```

Accounts contain several important pieces of information in the global state. You can examine this information for any account on the CVM:

```clojure
(account #11)
 => {:sequence 0,
     :key 0xcf345407332ab2b312c933377f13cc00b02e7ecfa59080b7f1f77a846800c4cf,
     :balance 388799997300000,
     :allowance 10000000,
     :holdings {#38 500000,#39 1581138830,#40 393701,#41 1403034590},
     :controller nil,
     :environment {torus #19,fun #15},
     :metadata {torus {:static true},fun {:static true}},
     :parent nil}
```

A critical field to note is the `:key` that specifies the Ed25519 public key associated with the account. This key is used to validate digitally signed transactions to ensure that only the owner of the account (or other parties authorised by them) can execute code in the context of this account. This is essential for security, since accounts are able to control valuable digital assets owned by the account.

## Environments

Every account has an environment that defines a mapping of symbols to values that have been defined in the account. When you execute a `def` command, you are actually creating a mapping in the environment.

```clojure
(def foo 167)
=> 167

foo 
=> 167
```

Each environment is specific to a single account, but you can access symbols in other accounts by a lookup reference in the form `target-account/symbol`

```clojure
;; Assuming you have the symbol 'foo' defined, the following produce the same result
(= foo *address*/foo)
=> true

;; If you attempt to resolve a symbol that doesn't exist in an account...
#0/foo
=> Exception: :UNDECLARED foo
```

## Lisp Machine

By giving every account its own environment on the CVM, we have achieved something magical: every account is a personal, cryptographically secure, decentralised Lisp machine!

As a simple example, here's a program that manages a database of "friend" accounts

```clojure
(def friends #{})   ;; empty friend set to start :-(

(defn add-friend [friend]
  (set! friends (conj friends (address friend))))

(defn un-friend [enemy]
  (set! friends (disj friends (address enemy))))

(add-friend #67)
(add-friend #70)
friends
=> #{#70 #67}       ;; We have friends now!   :-)
```

The significance of this capability cannot be understated:
- Every account is a personal workspace where you can define your own scripts, tools and utilities for managing decentralised assets
- You can write, run and modify entire decentralised programs on-chain
- You can store and manage arbitrary data
- Everything can be done interactively with simple REPL commands - no other tools required!

## Special Symbols

You might notice symbols like `*address*`, conventionally surrounded with asterisks. These are *special symbols* which get special treatment by the CVM. They are not static values, but dynamically calculated on demand by the CVM. Commonly used ones are:

- `*address*` the address of the current account, e.g. `#15656`
- `*balance*` the Convex Coin balance of the account
- `*juice-price*` the price (in Convex coppers) of each unit of juice
- `*caller*` the address which made a `call` to the current address (may be `nil`)
- `*origin*` the address of the origin account for the transaction
- `*timestamp*` the unix timestamp of the current CVM state (= the time of the most recent block which started processing)
- `*controller*` an account (can be `nil`) with the authority to control this account

## Actors

So far, we've looked at accounts controlled by users. But accounts can also be CVM programs that are independent of any users. We call these actors in Convex because they act and respond autonomously in accordance with their code.

Actors are critical because they can serve as trusted services shared by all users. This is often done so that actors can enforce **smart contracts**: self-executing contracts that are guaranteed to behave in predictable ways.

Actors each get their own account on Convex. So an actor implementing a smart contract might be located at account address `#1033`.

### Creating an actor

To create an actor, you need to deploy some code to initialise the actor. The code is executed immediately after a new account for the actor is created and can be used to set up the environment of the actor, e.g. defining new values or functions.

```clojure
;; Deploy an actor, returning the address of the new actor account
(deploy '(def some-data "Hello"))
=> #1033

;; This is undeclared, since some-data is in the actor's environment
some-data
=> UNDECLARED

;; However, we can look up the data in another account:
#1033/some-data
=> "Hello"
```

Your initialisation code *MUST* set up any capabilities you want the actor to have in the future: once deployed, you may not be able to make any further changes if you make a mistake (although it is possible to make an actor upgradable... more on this later).

### Calling actor functions

Actors are more than just containers for data - they can be active participants in transactions. To create an actor that exposes executable functionality to others, you need to make functions `:callable`. The following example is an actor that allows callers to get and set a value

```clojure
;; define code for our Actor
(def actor-code
  '(do
     (def value :initial-value) ;; stateful data definition for this actor
     
     (defn ^:callable set [v]
       (set! value v))          ;; note: `set!` fails if `value` is not defined
       
     (defn ^:callable get []
       value)))

;; Deploy the Actor and store the address as 'act' for convenient use later
(def act (deploy actor-code))

;; Call 'get'
(call act (get))
=> :initial-value

;; Call 'set' with a new value
(call act (set :new-value))

;; Call 'get' again
(call act (get))
=> :new-value
```

This actor is pretty simple, but it demonstrates the key ideas:

- An actor is an autonomous program, with its own execution environment
- You can make callable functions to allow users to interact with an actor

Note you can also read the actor account's data directly by lookup: 

```clojure
act/value
=> :new-value
```

This works, but is not recommended: you are making an assumption about how the actor is internally structured which might break if the actor ever gets updated. It is better to use a public `:callable` API to minimise this risk.

### Sending funds to actors

Like users, actor accounts can have their own balance of Convex Coins. 

You can use the `transfer` function to transfer funds to an Actor. However, this causes a problem: what if the actor doesn't expect to receive funds, and there is no a facility to transfer the funds elsewhere? This can cause coins to be irrevocably lost.

The better way to transfer funds is to "offer" them to the actor you are calling, which then has to actively `accept` the funds to acknowledge receipt. Thus, if coded correctly, there is no risk of funds being transferred that the receiving actor is unable to handle.

Below is a simple example of an actor that accepts funds, keeps track of how much been donated to each charitable cause, and provides a payout mechanism to relay the funds to the given cause.

```clojure
(def charity-box (deploy '(
  ;; a map of causes to donation amounts
  (def all-donations {}) 

  (defn ^:callable donate [cause]
    (let [donation *offer*]
      (if (> donation 0)
        (let [prev-donations (get all-donations cause 0)]
          (accept donation) ;; take the offered amount
          (set! all-donations (assoc all-donations cause (+ prev-donations donation)))
          (return "Thanks for your donation"))
        (fail :FUNDS "No donation offered!"))))
    
  (defn ^:callable collect [cause]
    (if (@convex.trust/trusted? cause *caller*)
      (let [amt (get all-donations cause 0)]
        ;; We need to clear the donations for the cause
        (set! all-donations (dissoc all-donations cause))
        ;; CEI Pattern implies interactions go last
        (transfer *caller* amt))
      (fail :TRUST "Not authorised to collect funds")))

  ;; end of actor code    
  )))
```

To use this actor, it should be called with the offer amount as an extra parameter to `call`:

```clojure
;; A charity address that you want to be the beneficiary of donations
(def charity #2055)

;; Donate 0.0001 Convex Gold to charity via an offer (2nd argument to `call`)
(call charity-box 100000 (donate charity))
=> "Thanks for your donation"

;; Sneakily look at how much is donated so far to each cause!
charity-box/all-donations
=> {#2055 100000}
```

This actor also make use of the powerful `convex.trust` library to control who is allowed to collect funds. The `cause` is actually a trust monitor that verifies whether a caller is authorised to make a collection of the donated funds. Unauthorised attempts will get rejected:

```clojure
;; try to collect funds
(call charity-box (collect charity))
=> Exception: :TRUST Not authorised to collect funds
```

However if the account `#2055` itself attempted to collect the funds, it would receive the full donated amount, since `convex.trust` specified that an account always trusts itself by default:

```clojure
;; try to collect funds as account #2055
(call charity-box (collect #2055))
=> 100000
```

### Important security note

Actor code runs in the account of the actor itself. In many circumstances, calling actor code can be considered "safe" in the sense that it cannot in general access assets owned by the calling account. However, there are some risks that you should be aware of:

- If you make an actor call, you are still liable for paying any transaction fees (and memory usage) associated with running actor code. If this is a concern, you should evaluate the actor code to determine if there is any risk of high transaction fees (or set an appropriate transaction fee limit).
- An actor may call other actors. This can open up a "reentrancy attack" if the Actor calls back into other code that you were not expecting (may change the state of other actors for example) and invalidate some assumptions about the state of other Actors that you previously made. If you consider this a risk, calling an actor, especially an unknown / untrusted one, should usually be the *last* thing you do in a transaction.
- An actor may "accept" Convex Coins or other digital assets that have been offered to it. Only offer assets to an actor if you are comfortable that the actor will only attempt to claim these assets legitimately. 
	
## Libraries

In most programming environments, it is helpful to bundle up code into libraries that can be shared and re-used. Convex Lisp is no exception, but takes a novel approach on the CVM: Libraries are just actor accounts that don't do anything other than provide usable code.

This approach is powerful because:

- We make use of Convex as a global repository for libraries
- You can deploy libraries in the same way as you deploy actors - no special tools or treatment needed!
- Libraries get all the same security and management guarantees as actors
- You can use library functionality to access actors and vice versa

### Using libraries

Using libraries is easy! All you need to do is call code in the library account:

```clojure
(#567858/some-function arg1 arg2)
```

If the library is registered in CNS, you can also use its CNS name symbol to resolve the address:

```clojure
(@convex.fungible/balance MY-TOKEN)
```

If you use a library regularly, you may find it convenient to import it and give in an alias (which is just a definition in your environment that points to the library address).

- `import` the library using its Address or CNS name and give it a convenient alias e.g. `foo`
- Use symbols defined in the library by prefixing the symbol name with the alias e.g. `foo/bar`

```clojure
;; Import a library (in this case, the standard registry Actor)
(import convex.registry :as reg)

;; Use a symbol from the library (in this case, count the number of registered accounts)
(count reg/registry)
=> 67081
```

### Deploying libraries

Deploying libraries is like deploying an Actor, with a few key differences to note:

- You don't need to make any functions `:callable`

```clojure
(def my-lib-address 
  (deploy
    '(defn distance [x y]
       (sqrt (+ (* x x) (* y y))))))
       
(import my-lib-address :as my-lib)

(my-lib/distance 3.0 4.0)
=> 5.0
```

### Important security note

A key difference between a `call` to an actor function and running library code is the difference in *security context*:

- An actor `call` runs code in the actor's account and environment, with the actor itself as the current `*address*` (and the calling account as `*caller*`)
- Library code runs in the environment of the current account, i.e. `*address*` is unchanged

**DO NOT RUN LIBRARY CODE YOU DO NOT TRUST**. Library code executed in your account can do anything that your account can, including transferring away all your coins and tokens, or entering into arbitrary smart contracts on your behalf. If you have any doubt about the trustworthiness of library code, do not use it from an account that controls any valuable assets or resources.

If you don't trust a library but also don't expect it to make any state changes, you can wrap a call in `query` which will roll back any state changes made and just return the result. This is mostly safe since any malicious state changes will be undone (though beware that the library might still return malicious results, or deliberately burn juice to hit you with transactions fees...)

```clojure
(query (untrusted-library/dangerous-function))
=> "This is the result"
```

