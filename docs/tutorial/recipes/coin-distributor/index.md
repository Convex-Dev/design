---
sidebar_position: 10
---

# A Coin Distributor

This recipe is an example of developing an actor that handles a fairly simple use case of wanting to distribute an asset in a controller manner. Specifically:

- The asset manages a potentially large balance of Convex Coins
- One trusted party (the "allocator" specifies how much of the asset is available for distribution)
- A second trusted party has the right to distribute the asset only up to the amount available

If you are new to smart contract coding, this is a good introduction to some of the key ideas.

## Design

This code represents some design decisions that a typical smart contract developer might make.

We have chosen to implement this functionality **as an actor**. Distributing coins could be done with manual transfers between user account of course, but using an actor has several advantages:
- We can define the exact rules by which coin distribution takes place. This could be extended in the future, e.g. only allowing distribution to recipient accounts that are properly registered (e.g. members of a DAO)
- An actor can have its own balance of Convex coins, which makes it easier to control buckets of coins allocated for this specific usage.
- The actor can perform automatic accounting (in this case, counting how much has been distributed and preventing this from exceeding a specified amount). This can eliminate mistakes that might be made with manual processes, and makes the distribution process observable and verifiable.

We want to **divide responsibilities** between the allocator and the distributor. We can do this by creating a **trust monitor* for each, that is used to check that the caller of our actor functions is suitably authorised.

## Setting up the actor

The following code is for the initial setup:

```clojure
;; Import the convex.trust library, so we can use CAD22 trust monitors
(import convex.trust :as trust)

;; Allocator, has ability to allocate coins for distribution
(def allocator #13)

;; Distributor, can distribute from allocated coins only (small bucket)
(def distributor #13)

;; The amount of coins available for distribution (initially zero))
(def available-coins 0)
```

:::tip
Replace `#13` with any address to define the initial allocator and distributor. `*caller*` makes sense if you are deploying the code with `(deploy ...)` in which case the account doing the deployment will be the initial allocator and distributor.
:::

## Making coins available

We need a `:callable` function to let the allocator set the value of `available-coins`

```clojure
;; Set the amount of available coins. Only a trusted allocator can do this
(defn ^:callable set-available [amount]
  (if (not (trust/trusted? allocator *caller* :set-available amount))
	(fail :TRUST "Not authorised as allocator"))
  
  (if (< amount 0) 
	(fail :ARGUMENT "Negative amount!"))
  
  (set! available-coins (int amount)))
```

Notes:
- The function will fail with a `:CAST` error if the `amount` is not numerical, since it is being passed to numerical comparison operators. It's good practice to check what happens if an unexpected argument type is passed in, we want this to fail as early as possible.
- The `(int amount)` cast in the last line. This is good practice to ensure that any value we `set!` will always be of the expected type (Integer in this case) even if the trusted caller makes a mistake. While setting available coins to a Double value could theoretically work, we want to minimise possible complications!
- Following good CEI design (Checks-Effects-Interactions) we do the checks first before the effect (setting the `available-coins` variable). There are no external interactions, so in this case the code is safe from reentrancy attacks but it is *always* good to check.
- We produce **meaningful error messages** as far as possible: see CAD11 (Errors) for recommended error codes. As Convex is an interactive system, we want to be as informative as possible.

To use this function the trusted allocator will be able to execute commands such as:

```clojure
;; Set the available amount to 888 CVM
(call distributor-actor (set-available 888000000000))
```

## Stocking the actor with coins

The actor needs to have a balance of coins before any distribution can happen of course. Typically you would do this with a simple transfer:

```clojure
;; Transfer 9999 CVM to the actor
(transfer distributor-actor 9999000000000)
```

There's a catch if the coin recipient is an actor however! Actors need to define a `receive-coin` function if they want to act as a recipient of coins. Fortunately it is pretty simple to make any acctor accept whatever coins are sent to it:

```clojure
;; Make an actor accept any offered coins
;; _ just ignores an argument, in this case we are ignoring 3 arguments: [sender amount optional-data]
(defn ^:callable receive-coin [_ _ _]
  (accept *offer*))
```

With the `receive-coin` function defined, the actor will automatically accept any coins

:::note
`receive-coin` is only required by an *actor* account that needs to receive convex coins: you can freely transfer to a user account without this. So as an alternative, you could develop this actor in a user account, transfer the coins to it, then use `(set-key nil)` to turn it into an actor. 
:::

## Distributing coins

We similarly need a `:callable` function to distribute coins. that can be sued by the trusted distributor:

```clojure
;; Distribute coins. Only a trusted distributor can do this
(defn ^:callable distribute [receiver amount]
  (if (not (int? amount))
	(fail :ARGUMENT "amount must be an integer"))
  
  (if (not (trust/trusted? distributor *caller* :distribute amount))
	(fail :TRUST "Not authorised to distribute")) 
  
  (if (> amount available-coins)
    (fail :FUNDS "Insufficient available coins"))
  
  ;; Every check passed, so:
  ;; 1. reduce available coins (Effect)
  ;; 2. Make an external transfer (interaction)
  (do 
    (set! available-coins (- available-coins amount))
    (transfer receiver amount)))
```

The user responsible for distribution will use this as follows:

```clojure
;; Send 3 CVM to the chosen recipient
(call distributor-actor (distribute recipient 3000000000))
```
This will work up until the amount of available coins is exhausted, at which point the allocated must make more coins available for distribution.

:::warning
It is **really important** in this case to use the **CEI ordering** (Checks-Effects-Interactions). If you do the `transfer` before reducing the amount of available coins, there is a *potential* for a reentrancy attack where multiple outward transfers are made before the available-coins variable is reduced.
:::

## Withdrawing coins

Optionally, you may wish to make it possible for the allocator to withdraw coins from the actor. This is often a good idea: if plans change and you no longer want to distribute coins via this actor, it is good to be able to withdraw the assets contained within.

Here's a simple example that lets the allocator (but nobody else!) withdraw coins:

```
(defn ^:callable withdraw [amount]
  (if (not (trust/trusted? allocator *caller* :withdraw amount))
    (fail :TRUST "Not authorised to withdraw"))
  
  (transfer *caller* amount))
```

## Additional Extension Ideas

If you are feeling adventurous, it is instructive to try out some ideas regarding how this actor might be extended. Some though starters:

- Build an equivalent actor for a CAD29 fungible token rather than convex coins
- Have multiple authorised distributors each with their own allocation of available coins to distribute


