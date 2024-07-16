# Torus DEX

Torus is a decentralised exchange (DEX) built on Convex. It is an open source actor that operates by facilitating smart contract interactions between:
- Liquidity providers, who earn commission on trades
- Traders who wish to swap fungible tokens

## Specification

### Torus actor

The Torus actor is the actor that manages all Torus DEX markets and provides user functionality.

Use of the library is typically achieved by importing the Torus actor as a library: 

```clojure
(import exchange.torus :as torus)
```

### Markets

Torus maintains a market for each fungible token that users wish to exchange.

Markets are created on demand when the first user requests creation:

```clojure
(torus/create-market token-id)
=> #678
```

A new market is a deployed actor that implements the Torus market SPI. Initially the market will have zero liquidity (this may be added by liquidity providers later).

If a second user requests creation of a market after it is already created, the original market is returned and no new market is deployed.

Subsequently, the address of a market can be accessed with the `get-market` function:

```clojure
(torus/get-market token-id)
=> #678
```

If no market exists for a fungible asset, `get-market` returns `nil`.

### Convex Coin Liquidity

Each active Torus market MUST contain Convex Coins in the liquidity pool, of equal value to the CAD29 fungible token being traded.

We use Convex Coins as the common pairing for each fungible token because:
- This enables swaps between any two CAD29 tokens with just two swaps, avoiding the need to create a market for every possible fungible token pair.
- Convex Coins generally make sense to hold as an asset for ecosystem participants
- It provides an additional opportunity to earn a return on Convex Coins

### Adding and withdrawing liquidity

A prospective liquidity provide MAY add liquidity to a market at any time with the `torus/add-liquidity` function.

```clojure
;; Add initial liquidity with Convex quantity
;; This is necessary for the initial liquidity provided
(torus/add-liquidity token-id token-quantity convex-quantity)

;; Add liquidity with token quantity only 
;; (will infer Convex quantity from current price)
(torus/add-liquidity token-id token-quantity)
```

If successful, `add-liquidity` will return with a integer equal to the number of liquidity shares gained by the liquidity provider.

The attempt to add liquidity will fail if the user has insufficient Convex coins or tokens to provide the liquidity.

If the market does not already exist, one will be created as if `create-market` was used.



### TODO more specification



