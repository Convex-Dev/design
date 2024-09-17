---
slug: convex-lisp-cvm
title: Lisp on the CVM
sidebar_position: 1
authors: [mikera, helins]
tags: [convex, developer, lisp]
---

In the Gentle Lisp Introduction we covered the basic of the Convex Lisp langauge. This guide build on these basic to introduce the key ideas of programming on the Convex CVM.

## The Convex Virtual Machine

The CVM is a denctralised, deterministic VM. Because it is deterministic, any replicas of the CVM that execute the same transactions from the same initial state will produce identical results. This is a key part how the Convex network is able to provide a consistent, programmable global state. It also enforces cryptographic security, so that only authorised users can make use of protected services.

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
=> #{#70 #67}          ;; We have friends now!   :-)
```

The significance of this capability cannot be understated:
- Every account is a personal workspace where you can define your own scripts, tools and utilities for managing decentralised assets
- You can write, run and modify entire decentralised programs on-chain
- You can store and manage arbitrary data
- Everything can be done interactively with simple REPL commands - no other tools required!

## Actors

So far, we've looked at accounts managed by users. But accounts can also be CVM programs that are independent of any users. We call these actors in Convex because they act and respond autonomously in accordance with their code.

Actors are critical because they can serve as trusted services shared by all users. This is often done so that actors can enforce **smart contracts**: self-executing contracts that are guaranteed to behave in predictable ways.

Actors each get their own account on Convex. So an account implementing a smart contract might be `#1033`.

### Creating an Actor

To create an actor, you need to deploy some code to initialise the actor. The code is executed immedfiately after a new account for the actor is created and can be used to set up the environment of the actor, e.g. defining new values or functions.

```clojure
;; Deploy an actor, returning the address of the new actor account
(deploy '(def some-data "Hello"))
=> #1033

;; This is undeclared, since some-data exists in the Actor's environment, not ours!
some-data
=> UNDECLARED

;; However, we can look up the data in the new Actor's environment:
#1033/some-data
=> "Hello"
```

Your initialisation code *MUST* set up any capabilities you want the actor to have in the future: once deployed, you may not be able to make any further changes if you make a mistake (although it is possible to make an actor upgradable... more on this later).

### Calling Actor functions

Actors are more than just containers for data - they can be active participants in transactions. To create an Actor that exposes executable functionality to others, you need to `export` one or more functions. The following example is an Actor that allows callers to get and set a value

```clojure
;; define code for our Actor
(def actor-code
  '(do
     (def value :initial-value)
     
     (defn set [v]
       (def value v))
       
     (defn get []
       value)
       
     (export get set)))

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

- An Actor is an autonomous program, with its own execution environment
- You can export functions to allow users to interact with an Actor

### Building parameterised actors with `defactor`

Sometimes you want to pass parameters to construct an Actor. `defactor` lets you build an actor with parameters, and also provides some magic syntax to make declaring actors a bit more elegant:

```clojure
(defactor multiplier [x]
  (defn calc [y]
     (* x y))
     
  (export calc))

;; deploy multipliers with different parameters
(def times2 (deploy (multiplier 2)))
=> #2601

(def times3 (deploy (multiplier 3)))
=> #2602

;; test them out!
(call times2 (calc 10))
=> 20

(call times3 (calc 10))
=> 30
```


### Sending funds to Actors

Like Users, Actor Accounts can have their own balance of funds. 

You can use the `transfer` function to transfer funds to an Actor.However, this causes a problem: what if the Actor doesn't expect to receive funds, and there is no a facility to transfer the funds elsewhere? This can cause coins to be irrevocably lost.

The better way to transfer funds is to "offer" them to the Actor you are calling, which then has to actively `accept` the funds to acknowledge receipt. Then, if coded correctly, there is no risk of funds being transferred that the receiving actor is unable to handle.

Below is a simple example of an Actor that accepts funds, keeps track of how much each caller has donated, and provides a payout mechanism to relay the funds to the given cause.

```
(defactor donations [cause]
  (assert (address cause)) ;; cause must cast to an address!

  (def all-donations {}) ;; a map of donation amounts

  (defn donate []
    (let [donation *offer*]
      (if (> donation 0)
        (let [past-donation (or (get all-donations *caller*) 0)]
          (def all-donations (assoc all-donations *caller* (+ past-donation donation)))
          (accept donation)
          (return "Thanks for your donation")))))
    
  (defn payout []
    (transfer cause *balance*))
    
  (export donate payout))
```

To use this Actor, it needs to be deployed and then called with the offer amount as an extra parameter to `call`:

```
;; A charity address that you want to be the beneficiary of donations
(def charity #2055)

;; Deploy the donations fund
(def charity-fund (deploy (donations charity)))
=> #2603

;; Donate to charity
(call charity-fund 100000 (donate))
=> "Thanks for your donation"

;; See who has donated so far!
(lookup charity-fund 'all-donations)
=> {#2599 100000}
```

### Important security note for Actors

Actor code runs in the Account of the actor itself. In many circumstances, calling Actor code can be considered "safe" in the sense that it cannot in general access assets owned by the calling account. However, there are some risks that you should be aware of:

- If you make an Actor call, you are still liable for paying any transaction fees (and memory usage) associated with running actor code. If this is a concern, you should evaluate the Actor code to determine if there is any risk of high transaction fees (or set an appropriate transaction fee limit).
- An Actor may call other Actors. This can open up a "re-entrancy attack" if the Actor calls back into other code that you were not expecting (may change the state of other actors for example) and invalidate some assumptions about the state of other Actors that you previously made. If you consider this a risk, calling an Actor, especially an unknown / untrusted one, should usually be the *last* thing you do in a transaction.
- An Actor may "accept" Convex Coins or other digital assets that have been offered to it. Only offer assets to an Actor that you intend to call if you are comfortable that the Actor may claim these assets. 
	
## Libraries

In most programming environments, it is helpful to bundle up code into libraries that can be shared and re-used. Convex Lisp is no exception, but takes a novel approach: Libraries are simply Actors!

This approach is powerful because:

- We make use of Convex as a global repository for libraries
- You can deploy libraries in the same way as you deploy Actors - no special tools needed!
- Libraries get all the same security and management guarantees as Actors
- You can use the library functionality to access Actors

### Using libraries

Using libraries is easy! All you need to do is:

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

Deploying libraries is just like deploying an Actor, with a few key differences to note:

- You don't need to `export` any functions (unless you really want to enable `call`)

```clojure
(def my-lib-address 
  (deploy
    '(defn distance [x y]
       (sqrt (+ (* x x) (* y y))))))
       
(import my-lib-address :as my-lib)

(my-lib/distance 3.0 4.0)
=> 5.0
```

### Important security note for libraries

A key difference between a `call` to an Actor function and running library code is the difference in *security context*:

- An Actor `call` runs code in the Actor's environment, with the Actor itself the current `*address*` (and the calling Account as `*caller*`)
- Library code runs in the environment of the current Account, i.e. `*address*` is unchanged

As a result of this: **DO NOT RUN LIBRARY CODE YOU DO NOT TRUST**. Library code can do anything that your Account can, including transferring away all your coins and tokens, or calling arbitrary smart contracts. If you have any doubt about the trustworthiness of library code, do not use it from an Account that controls any valuable assets.

