---
sidebar_position: 5
---

# Issue a Fungible Token

Creating your own fungible token on Convex is a one-liner — there is no new smart contract to write. Convex ships a standard [`convex.fungible`](/docs/cad/fungible) library that builds fully-featured [CAD029](/docs/cad/fungible) tokens.

## Create a token

Deploy a token with an initial supply. The whole supply starts in your account:

```clojure
(def TOKEN (deploy [(@convex.fungible/build-token {:supply 1000000})]))
=> #1234
```

`TOKEN` is the address of your new token actor. That's it — you have issued a token.

## Check a balance

```clojure
(@convex.fungible/balance TOKEN *address*)
=> 1000000
```

## Transfer tokens

Use the generic `convex.asset` library to move any asset. The amount is paired with the token as `[TOKEN amount]`:

```clojure
;; send 1000 units to account #202
(@convex.asset/transfer #202 [TOKEN 1000])
```

Now check both balances:

```clojure
[(@convex.fungible/balance TOKEN *address*) (@convex.fungible/balance TOKEN #202)]
=> [999000 1000]
```

## Total supply and decimals

```clojure
(@convex.fungible/total-supply TOKEN)
=> 1000000
```

`build-token` also accepts `:decimals` (and `:initial-holder`). For a token with 2 decimal places:

```clojure
(def TOKEN (deploy [(@convex.fungible/build-token {:supply 1000000 :decimals 2})]))
```

## See Also

- [CAD029: Fungible Token Standard](/docs/cad/fungible)
- [Managing Coins](../managing-coins/index.md) — the same ideas for the native Convex Coin
- [Building an Actor](../../actors/building-an-actor.md) — write your own custom actor
