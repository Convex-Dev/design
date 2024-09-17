# CAD029: Fungible Token Standard

Fungible tokens are an important class of digital assets, that share the property of being fully fungible, i.e. any unit of a balance of the asset is equivalent to any other unit.

Fungible tokens are always represented with **Integer balances**. This allows applications to make consistent assumptions about asset balance behaviour, which may not be possible with assets that use custom definitions for balances.

Typical use cases for fungible tokens might include:
- Digital currencies
- Utility tokens use for micropayments
- Shares in a DAO or virtual enterprises
- Quantities of some resource in a game or metaverse
- Reputation points

This CAD represents the Convex replacement for ERC20 / ERC777 on Ethereum

## Specification

### CAD19 Compliance

A fungible token MUST meet all the specifications for a compatible CAD19 asset, as well as the mandatory requirements specified in this CAD.

### Balances

A fungible token balance MUST be a non-negative integer. 

Big integers MAY be used, however this is not recommended. Care MUST be taken to ensure that minting or burning does not allow fungible quantities to exceed usable big integer sizes: a minting operation that would cause supply to exceed the maximum big integer value MUST fail immediately.

### Decimals

A fungible token MUST specify a `decimals` callable function, which indicates the number of decimal places used when displaying natural units of the token. 

Typically this might be a callable function of the form:

```clojure
(defn decimals ^:callable []
  2)
```

The decimals value SHOULD NOT be utilised or depended upon to affect behaviour by on-chain code: it is intended to allow user interfaces to produce meaningful human readable units.

The decimals value MUST NOT change for the lifetime of a fungible token. A re-denomination to a different unit should logically be considered as the creation of a new fungible token.

Example usage:

```clojure
(@convex.fungible/decimals USD-TOKEN)
=> 2
```

i.e. if `decimals` is `2` then an asset quantity of `1499` will be considered as `14.99` in the natural unit of the currency. This is common in national currencies, e.g. the US Dollar can be considered to have 2 decimal places, where 100 cents to one dollar. 

### Total Supply

A fungible token SHOULD be able to report its total supply.

The total supply MAY change (e.g. when minting or burning occurs). If this is the case, then the total supply MUST always be consistent with the sum of all balances of the token.

A fungible token MUST NOT have any mechanism to create or destroy net balances without simultaneously updating the total supply.

Typically this might be implemented with a fixed constant definition of total supply, e.g.:

```clojure
(define max-supply 12345678)

(defn total-supply ^:callable []
  max-supply)
```

## convex.fungible library

Fungible tokens MAY be constructed using any actor that presents a callable interface according to this specification

For convenience and efficiency, a standard `convex.fungible` library has been created that provides library wrapped for working with fungible tokens. Alongside `convex.asset`, this library provides full access to any CAD29 fungible token. 









