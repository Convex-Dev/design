# CAD019: Asset Model

The Convex Asset Model is a universal system for expressing and controlling digital assets in an on-chain environment. The key motivation for the Asset Model is to enable economic value transfer using digital assets: digital assets can be securely owned, traded and used as part of contractual agreements just like real world assets. Of course, the security of the digital assets is enforced by the security guarantees of the Convex network.



## Objectives

### Universal and Extensible

A key design goal is therefore that the API is universal and extensible, in the sense that it can be used to handle a diverse ecosystem of digital assets, including asset types that have not yet been invented. By way of example, it should be possible to use the same API to transfer a quantity of a fungible token:

`(asset/transfer [currency.USD 10000] destination-address)`

As it is to transfer a set of numbered NFTs:

`(asset/transfer [asset.nfts #{101 102 105}] destination-address)`

So... why is this important?

- It reduces the number of APIs that developers must learn: instead of having separate APIs for fungible token, NFTs, game items etc. we offer a single unified API.
- It makes it possible to write *generic* smart contracts that can work with any type of asset.
- It makes it possible to innovate with new types of asset without having to redesign user code

We therefore propose the following objectives:

- The Asset Model should be able to express all types of on-chain digital assets (fungible tokens, security tokens, stablecoins, NFTs, voting rights etc.)
- There should be a standard API for users that works with all types of assets in a generic way
- There should be a standard SPI that allows for flexibility in underlying asset implementations - in particular it should be possible to create new kinds of digital assets and new rules / behaviours without changing the user level API

### Efficiency

The Asset Model should allow efficient and simple implementations to minimise transaction costs and memory usage. If digital assets are to be widely accepted as a part of economic value exchange, it is essential that they are efficient and offer low transaction costs compared to alternatives.



## Definitions and Key Concepts

### Assets

An **asset** is a logical entity that supports ownership and transfer according to the requirements in this CAD.

Examples:
- A non-fungible token (NFT)
- A fungible token representing shares in a company
- A fungible token representing units of derivative "put" contract

### Asset Implementation

Asset logic MUST be implemented by an Actor on Convex. This actor may be referred to as the "asset implementation".

An asset MAY map one-to-one to an actor, however a single actor MAY implement multiple assets. This allowance is primarily for efficiency reasons: if many assets share the same on-chain logic, it makes sense for a single actor to implement them all rather than deploying new actors for each one.

The use of an actor to provide the asset implementation is important for two reasons:

- It allows for the development of new types of compatible assets: these simply need to provide a new implementation actor and they can be used according to the standard asset model, often without needing to change existing code.
- Actors allow for trusted code execution and governance, providing assurance that digital assets will behave correctly and not present unacceptable security risks

### Asset Path

An asset path is a descriptor that identifies an asset. Asset paths are important because they enable a stable reference to a specific asset under consideration.

An asset path MUST be either:

- The Address of the actor that provides the asset implementation - e.g. - `#1234` is a valid asset path referring to the asset implemented by the actor at the Address `#1234`
- A Vector where the first element is the Address of the actor, and the remainder of the Vector is interpreted by that Actor on an implementation defined basis. e.g. `#[2345 :foo :bar]`

A Vector-based asset path SHOULD be used to allow a single actor to implement many different digital assets, e.g. 

- Currencies might be designated by an asset path of `[#123456 :USD]`
- Derivative contracts such as put options might have an asset path that includes the underlying asset, strike price and expiry time e.g. `[#98765 [#12345 :USD] 12500 1741948885345]`
- Bets on a football match might specify the match date and selected winner `[#8978 "2023-6-06" "Manchester United"]` (note that a bet on a different outcome of the same match would be a different fungible asset since they are not mutually fungible)

### Quantities

All Assets MUST define a notion of "quantity" that can be used to represent an amount or subdivision of an asset. 

Because we want to enable innovation in the types and representations of assets, we do not restrict the definition of quantity to a specific type (e.g. integer amounts) - instead we define the mathematical properties that quantities must obey.

Quantities for any asset MUST be a **commutative monoid** (in the mathematical sense). This requirement is necessary in order for addition, subtraction and comparison of asset quantities to behave in well-defined ways.

Assets MUST define an **addition** function enable quantities to be additively combined, i.e. given any two quantities of an asset it should be possible to use the addition function to compute the total quantity. This is equivalent to the addition function of the commutative monoid.

Assets MUST define a **comparison** function enabling quantities to compared, i.e. given any two quantities of an asset it should be possible to use the comparison function to determine if one quantity is a subset of the other. This is equivalent to the algebraic pre-ordering of the monoid.

Assets MUST define a **subtraction** function enabling quantities to be subtracted, i.e. given two quantities of an asset where the first is "larger" than the second (as defined by the comparison function), it should be possible to subtract the second value from the first and get a result that is also a valid quantity.

Assets MUST define a **zero** quantity that logically represents an empty holding of an asset. This zero value is the identity element of the commutative monoid. The zero quantity itself will usually an "empty" value such as `#{}` or `0`. 

The zero quantity SHOULD be the default balance of all accounts. Logically, an account should have a zero holding of an asset until some quantity of the asset is otherwise obtained. An example of an exception to this might be an asset implementation that gives a free non-zero quantity of the asset to all accounts, though this is probably unwise given the obvious potential for abuse.

For any given Asset, it MUST be possible to identify a Holding of the Asset for a given Account, where the Holding is the Quantity of the Asset that the Account owns.

When passed as an argument to an asset implementation, the value `nil` MUST be treated as the zero quantity. This requirement ensures that a zero-equivalent value is known for all implementations, and can be used by generic code without having incurring the cost of explicitly querying the zero value.

#### Quantity examples

- Fungible tokens typically use a quantity expressed as non-negative integers e.g. `0`, `1000`, `987654321`
- Non-fungible tokens typically use a quantity expressed as sets of NFT IDs e.g. `#{101 1002 1003}`
- An asset representing a voting right may use a boolean quantity `true` and `false`

### Ownership

Quantities of digital assets are owned by accounts in Convex.

Assets may be owned by either user accounts or actors. In the latter case, it should be expected that the actor implements code able to manage the assets that it owns.

Assets SHOULD be transferable, i.e. it should be possible for a quantity of an asset to be transferred from one owned to another.

### Offers and Acceptance

It is often necessary for a smart contract to ensure that it receives another asset before it takes some action: for example a contract for sale would expect payment to be made before allowing the purchased assets to be released.

A typical process would be something like:

- Account `A` **offers** a quantity of asset `F` to account `B` (where `B` is a smart contract)
- `A` calls a callable smart contract function on `B` to request a transaction
- `B` checks preconditions for the transaction as necessary
- `B` **accepts** the quantity of `F` from the caller (`A`) to pay for the transaction
- Assuming all is successful, `B` completes the transaction
- `B` returns to caller with transaction complete
- Optional: `A` closes down the offer (only relevant if some non-accepted quantity remains)

Assets SHOULD implement a system of offers, whereby an owner may offer a quantity of an asset to another account, which can subsequently be accepted by that account.

Assets SHOULD implement a system of acceptance, whereby an account that has been offered a quantity of the asset may accept that quantity (or a partial quantity thereof).

Offers SHOULD remain open at the discretion of the offering account. However, closing of offers by a trusted 3rd party (e.g. to mitigate against security risks) MAY be acceptable in some cases.




## User API

The user API for the Asset Model is provided by the library `convex.asset`.

Users do not need to use the `convex.asset` library to work with Convex digital assets - they are free to access the underlying actor functions directly. However the user API presents a convenient, well-tested interface that should be suitable for most purposes.

### `balance`

The `balance` function gets the total quantity of an asset currently held by an account. 

```
(asset/balance some-fungible-asset *address*)
=> 1500

;; Omitting the address argument is equivalent to using *address*
(asset/balance some-fungible-asset)
=> 1500
```

The returned value should always be a valid quantity for the specified asset. In particular, the owner should be able to `transfer` this amount to send their entire holdings of the specified asset to another account.

If the address argument is omitted, the balance for the current account is queried (i.e. an implicit `*address*` argument is used to specify the current account).

### `total-supply`

The `total-supply` function obtains the current total supply of an asset. 

```clojure
(asset/total-supply my-token)
=> 1000000000000000000
```

The `total-supply` function MAY return `nil` if the asset does not support efficient computation of the total supply.

The total supply of an asset may change during the lifetime of an asset, e.g. because new quantities are minted or burned.


## Security considerations

### Untrusted assets

Assets are implemented by Actors in the Convex asset model, and as such there are a number of issues that may arise if untrusted assets are used.

The general recommendation is that users SHOULD NOT interact with untrusted assets.

However, in some circumstances, it may be necessary to write code that may interact with untrusted assets. An example of this could be an "Auction House" actor that enables users to post lots containing other digital assets for auction. There is no way, in advance, for the auction house actor to know whether assets that may be sold in the future will be trusted or not. Hence the auction house must be written in a way that is robust to the inclusion of untrusted assets.

#### Arbitrary code execution

When an actor implementing an asset is interacted with, it may execute arbitrary code. Unless the actor is trusted, caution must be taken to mitigate these risks (as with a call to an untrusted actor).

While the Convex security model prevents the actor from directly taking actions on behalf of the caller (e.g. it cannot steal arbitrary assets) it may take other actions during the scope of the transaction. Developers interacting with untrusted assets should be particularly aware of:
- Re-entrancy attacks where a malicious asset calls back into the same smart contract
- Possibility that a malicious asset implementation may call other smart contracts, e.g. DEX exchange calls

#### Unspecified behaviour

If an asset implementation is untrusted, it is possible that the asset may not behave correctly according to the requirements in this CAD. Some examples:

- A transfer may appear to have succeeded, when it has in fact failed
- A malicious asset may lie about balances or the success or otherwise of transfers
- A 3rd party may have the ability to update holdings unilaterally, without the authorisation of owners.
- A previously well-behaved asset may be "upgraded" to become malicious

### Inaccessible Accounts

It is possible to transfer assets to an account that may be locked or otherwise inaccessible (e.g. a user account with a lost key pair). In such cases, the quantity of asset transferred may be irretrievably lost.

Some mitigations for this risk:

- Prefer solutions where the destination account explicitly calls `accept` to obtain the asset. By requiring the active participation of the receiver, this minimises the risk of the asset being locked in an inaccessible account.
- Only implement `receive-asset` for an actor if the actor provides mechanisms for extracting assets at a later time. Otherwise,a `transfer` to an actor risks losing access to the asset.
- Perform off-chain validation that the destination user has access to their account (e.g. requiring a signature of a random number to prove possession of the appropriate key pair).
- Use appropriate governance mechanisms (e.g. `set-controller`) to enable account recovery as a last resort.

### Quantity Overflow

Asset implementations should ensure that they do not allow bugs resulting from numerical overflow or other issues relating to calculations of quantities. In general:

- Limits MUST be placed on total quantities available where overflow might otherwise be possible, e.g. a maximum supply for a fungible token. This limit should normally be enforced when minting / issuing new quantities.
- Functions involving quantities as arguments MUST check whether the quantity is valid, e.g. a non-negative integer less than or equal to the balance of the account requesting the transfer for a fungible token. Typically a check such as `(<= 0 amount balance)` is appropriate.

An asset implementation which is vulnerable to quantity overflow issues should be considered as broken (and therefore untrusted).

### Non-compliant asset implementations

It is possible that some asset implementations (either by mistake or ill intention) are not compliant with the Convex Asset Model.

Users SHOULD NOT interact with non-compliant assets.

Some specific reasons for non-comliance are listed below:

#### Volatile balances

Some assets may have balances / quantities that may vary independently of usage via the asset model. Some examples:

- An interest-bearing asset that pays out some form of periodic rewards that increase balance
- A utility token that has quantity deducted automatically through usage of services

Such assets are NOT COMPLIANT with the Convex Asset model and SHOULD NOT be implemented or used without extreme caution.

If applications nevertheless choose to make use of assets with volatile balances, applications SHOULD always check the balance at the start of any transaction rather than relying on any previously stored balances which may no longer be correct.

Such assets SHOULD NOT be used in general purpose smart contracts, since accounting for held balances may be invalidated.

If functionality is desired that requires balances to be varied, better approaches include:
- Requiring a user to explicitly claim interest or rewards
- Requiring balances to be deposited in a pre-payment account, so that usage quantities can be deducted and accounted for properly.

#### Aliasing

It is possible that multiple assets may refer to the same underlying quantity or resources. As such, code referencing multiple assets MUST NOT assume that operations on the assets are independent.

For example, transferring a quantity of an asset `A` may affect the balance available of asset `B`. This behaviour is NOT COMPLIANT for reasons similar to the volatile balances mentioned above

In general, it is safest to operate on each asset in turn - avoid interleaving actions API calls on multiple assets.












