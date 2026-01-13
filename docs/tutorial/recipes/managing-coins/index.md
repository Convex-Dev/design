---
sidebar_position: 1
---

# Managing Convex Coins

Convex coins are the native utility token on Convex. Convex coins can be used in several ways:
- To pay execution fees for transactions executed on the network
- To pay for other assets, such as memory allowances
- As a transferable virtual currency for use with decentralised economic systems
- To stake on peers managing the consensus of the network

## Checking balances

Every account on Convex maintains a balance of Convex Coins. An account can use and transfer its balance freely, but no other account can do so unless given prior authorisation.

Checking balance is best done in "Query" mode (to avoid transaction fees) and can be done simply as follows:

```clojure
*balance*
=> 2966998521900
```

:::note
The balance is displayed in Convex coppers which are one billionth of a Convex Coin, so a balance of `2966998521900` should be interpreted 2966.998521900 CVM
:::

If you want to check the balance of any other account, you can do so with the `balance` core function:

```clojure
(balance #202)
=> 0
```

If you request the balance for an account that doesn't yet exist, you will get `nil` as a response:

```clojure
(balance #999999999)
=> nil
```

## Transfers

The `transfer` function can be used to send Convex Coins to any existing account. This requires the "Transact" mode since the transfer needs to change the global state:

```clojure
(transfer #202 (* 10 1000000000))
=> 10000000000
```

The function returns the amount successfully transferred, which can be useful if you use a formula to calculate the transfer amount as above.

Once a transfer is complete, you can confirm the coins have moved by checking the balances (as a query) for the source and destination account:

```clojure
;; mapv applies a function to a vector or arguments in turn
(mapv balance [*address* #202]) 
=> [2956998497790 10000000000]
```

## Total Supply

You can check the total issued supply of Convex Coins with the following query:

```clojure
(coin-supply)
=> 1000000000060950
```

Here the coin supply is the one million Convex Coins issued at genesis, plus some a small amount of transaction fees incurred by governance accounts. Normal transaction fees by non-governance do not effect the coin supply (since they are re-circulated).

Additional coin supply will be issued in the future, e.g. as ecosystem demand causes new coins to be purchased from the release curve. See the [Tokenomics CAD](/docs/cad/020_tokenomics/README.md) for more details.

## Burning coins

If you have excess coins and want to get rid of some, you can burn them to the account `#0`

```clojure
(transfer #0 5000000000)
```

Coins burnt in this way will be added to the peer reward pool, and eventually be re-circulated as rewards to peers for continuing to operate the network. So indirectly, you are contributing to the future development of the network 😀

