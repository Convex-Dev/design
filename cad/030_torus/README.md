# Torus DEX

Torus is a decentralised exchange (DEX) built on Convex. It is an open source actor that operates by facilitating smart contract interactions between:
- Liquidity providers, who earn commission on trades
- Traders who wish to swap fungible tokens

## Specification

### Torus actor

The Torus actor manages all Torus DEX markets and provides user functionality.

Users typically import the Torus actor as a library to make Torus functions available in their environment: 

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

### Trades

Any user may trade on a Torus market.

```clojure
;; Assume a CAD token identified by TOKEN

;; Buy a 100 token quantity of a token
(torus/buy-tokens TOKEN 100)

;; Sell 100 tokens
(torus/sell-tokens TOKEN 100)

;; Buy 1000 CVX using the token
(torus/buy-cvx TOKEN 1000)

;; Sell 1000 CVX, receiving the token
(torus/sell-cvx TOKEN 1000)
```

It is also possible to do swaps between any two tokens. These are atomic swaps that execute a Torus trade on both underlying markets.

```clojure
;; Assume we have a second token named USD

;; Buy 200 TOKEN using USD
(torus/buy TOKEN 200 USD)

;; Sell 300 TOKEN and receive USD
(torus/sell TOKEN 300 USD)

```

Trades will fail if any of the following are true:
- An attempt is made to buy or sell a negative quantity
- The liquidity pool has insufficient liquidity to complete the trade
- The user has insufficient funds (CVX or token) to complete the trade

### Liquidity Pool

Each Torus market holds a liquidity pool of two assets:
- Convex Coins
- The CAD29 fungible token that the market represents

Each active Torus market MUST have a positive Convex Coins in the liquidity pool.

Each active Torus market MUST own a positive balance of the CAD29 fungible token being traded.

The Torus market assumes the two asset quantities have equal value.

We use Convex Coins as the common pairing for each fungible token because:
- This enables swaps between any two CAD29 tokens with just two swaps, avoiding the need to create a market for every possible fungible token pair.
- Convex Coins generally make sense to hold as a common asset for ecosystem participants
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

If successful, `add-liquidity` will return an integer equal to the number of liquidity shares gained by the liquidity provider.

The attempt to add liquidity will fail if the user has insufficient Convex coins or tokens to provide the liquidity.

If the market does not already exist, one will be created as if `create-market` was used.



### Torus Market SPI

The Torus market SPI is usually not directly accessed by users: Torus functionality should be accessed by the `exchange.torus` library.

A Torus market MUST implement a CAD29 fungible token SPI so that its liquidity share function as a fungible token.

The Torus market SPI MAY change due to updates of Torus



