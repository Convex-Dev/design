# Asset Model

The Convex Asset Model is a universal system for expressing and controlling digital assets in an on-chain environment. The key motivation for the Asset Model is to enable economic value transfer using digital assets: digital assets can be securely owned, traded and used as part of contractual agreements just like real world assets. Of course, the security of the digital assets is enforced by the security guarantees of the Convex network.

A key design goal is therefore that the API is universal and extensible, in the sense that it can be used to handle a diverse ecosystem of digital assets, including asset types that have not yet been invented.



## Objectives

- The Asset Model should be able to express all types of on-chain digital assets (fungible tokens, security tokwns, stablecoins, NFTs, voting rights etc.)
- There should be a standard API for users that works with all types of assets in a generic way
- There should be a standard SPI that allows for flexibility in underlying asset implementations - in particular it should be possible to create new kinds of digital assets and new rules / behaviours without changing the user level API
- The Asset Model should allow efficient and simple implementations to minimise transaction costs and memory usage

## Definitions

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

### Quantities

All Assets MUST define a notion of "quantity" that can be used to represent an amount of an asset. 

Because we want to enable innovation in the types and representations of assets, we do not restrict the definition of quantity to a specific type (e.g. integer amounts) - instead we define the mathematical properties that quantities must obey.

Quantities for any asset MUST be a commutative monoid (in the mathematical sense). This requirement is necessary in order for addition, subtraction and comparison of asset quantities to behave in well-defined ways.

Assets MUST define an addition function enable quantities to be additively combined, i.e. given any two quantities of an asset it should be possible to use the addition function to compute the total quantity. This is equivalent to the addition function of the commutative monoid.

Assets MUST define a comparison function enabling quantities to compared, i.e. given any two quantities of an asset it should be possible to use the comparison function to determine if one quantity is a subset of the other. This is equivalent to the algebraic pre-ordering of the monoid.

Assets MUST define a subtraction function enabling quantities to be subtracted, i.e. given two quantities of an asset where the first is "larger" than the second (as defined by the comparison function), it should be possible to subtract the second value from the first and get a result that is also a valid quantity.

Assets MUST define a "zero" quantity that logically represents an empty holding of an asset. This zero value is the identity element of the commutative monoid.

For any given Asset, it MUST be possible to identify a Holding of the Asset for a given Account, where the Holding is the Quantity of the Asset that the Account owns.

#### Quantity examples

- Fungible tokens typically use a quantity expressed as non-negative integers e.g. `0`, `1000`, `987654321`
- Non-fungible tokens typically use a quantity expressed as sets of NFT IDs e.g. `#{101 1002 1003}`
- An asset representing a voting right may use a boolean quantity `true` and `false`

### Asset Path

An asset path is a descriptor that identifies an asset. Asset paths are important because they enable a stable reference to a specific asset under consideration.

An asset path MUST be either:

- An Address of an actor that implements the asset
- A Vector where the first element is the Address of the actor, and the remainder of the Vector is interpreted by that Actor on an implementation defined basis.

Typically, a Vector based asset path is used to allow a single actor to implement many different digital assets, e.g. 

- Currencies might be designated by an asset path of `[#123456 :USD]`
- Derivative contracts such as put options might have an asset path that includes the underlying asset, strike price and expiry time e.g. `[#98765 [#12345 :USD] 12500 1741948885345]`


#### Asset Path Examples

- `#1234` is an asset path that refers to the asset implemented by the Actor at Address `#1234`
- `[#1234 :USD]` is an asset path that refers to an asset implemented by the Actor at Address `#1234` with a sub-path of `:USD`


## User API

The user API for the Asset Model is provided by the library `convex.asset`.

Users do not need to use the `convex.asset` library to work with Convex digital assets - they are free to access the underlying actor functions directly. However the user API presents a convenient, well-tested interface that should be suitable for most purposes.

### `balance`

The `balance` function gets the total quantity of an asset currently held by an account. 

```
(balance some-fungible-asset *address*)
=> 1500
```

The returned value should always be a valid quantity for the specified asset. In particular, the owner should be able to `transfer` this amount to send their entire holdings of the specified asset to another account.

If the address argument is omitted, the balance for the current account is queried (i.e. an implicit `*address*` argument is used to specify the current account).


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

### Volatile balances

Some assets may have balances / quantities that may vary independently of usage of the asset model. Some examples:

- An interest-bearing asset that pays out some form of periodic rewards that increase balance
- A utility token that has quantity deducted automatically through usage of services

If such assets might be used, applications SHOULD always check the balance at the start of any transaction rather than relying on any previously stored balances which may no longer be correct.

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










