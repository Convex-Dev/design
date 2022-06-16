# Asset Model

The Convex Asset Model is a universal system for expressing and controlling digital assets in an on-chain environment.

We enable a diverse system of digital assets on the Convex network via the asset model. Secure exchange of valuable assets protected by the security guarantees of the network is possible through a standard API.

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
- 
Asset logic MUST be implemented by an Actor on Convex.

An asset MAY map one-to-one to an actor, however a single actor MAY implement multiple assets. This allowance is primarily for efficiency reasons: if many assets share the same on-chain logic, it makes sense for a single actor to implement them all rather than deploying new actors for each one.


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

- An Address of an actor that implements the Asset
- A Vector where the first element is the Address of the Actor, and the remainder of the Vector is interpreted by that Actor on an implementation dependent basis 


#### Asset Path Examples

- `#1234` is an asset path that refers to the asset implemented by the Actor at Address `#1234`
- `[#1234 :foo]` is an asset path that refers to an asset implemented by the Actor at Address `#1234` with a sub-path of `:foo`




