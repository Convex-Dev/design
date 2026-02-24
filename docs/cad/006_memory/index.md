# CAD006: Memory Accounting

## Solving The State Growth Problem

Decentralised ledgers often encounter an serious issue with *state growth*, defined as the increasing requirement for peers to store information that accumulates over time. Because on-chain data must be retained, potentially indefinitely, in order to satisfy future on-chain queries or smart contract operation, there is no option to discard data arbitrarily: a correct peer cannot do so and maintain correct participation in the consensus protocol.

This growing demand for storage space presents a significant problem.

- It creates a requirement for peers to incur increasing storage costs over time, for data that must potentially be retained indefinitely if the peer is to be able to fulfil its commitments to provide access to this data to any future transactions.
- There are perverse incentives at work: a user might pay a one-off code to store data on-chain, but does not bear the cost of indefinite future storage (which falls on peer operators)
- Over time, careless use of on-chain storage may make it impractical for a typical individual to operate a peer with normal computer hardware and storage capabilities
- This problem might be manageable for low-transaction-volume platforms, but is clearly unaccaptable for systems such as Convex that are designed to handle high volumes of transactions for sustained periods of time

Convex implements a novel solution of Memory Accounting to help manage the problem.

- Each user is given a Memory Allowance
- Memory Allowance is consumed when on-chain storage is allocated, and released when stored objects are deleted
- A common "Pool" of memory is available which limits the maximum size of the on-chain state. 
- A user may buy additional memory at any time from the Pool, or sell memory back to the pool for Convex Coins


## Memory Accounting Design

### Storage Size

Each CVM object is defined to have a "Storage Size" which approximates the actual storage requirement (in bytes) for the object

The Storage Size includes:

- The size of the encoding of the Cell in bytes
- The total size of all child Cells, (e.g. if the object is a data structure)
- An allowance for indexing and storage overheads (currently set to a fixed estimate of 64 bytes per complete non-embedded cell)

### Consumption

Whenever a transaction is executed on the CVM, Memory Consumption is calculated based on the total impact of the transaction on the Storage Size of the CVM State.

Memory Consumption is computed at the end of each transaction, and is defined as:

```
Memory Consumption = [Size of CVM state at end of transaction] - [Size of CVM state at start of transaction] 
```

If a transaction has zero Memory Consumption, it will complete normally with no effect from the Memory Accounting subsystem

If a transaction would complete normally, but has a positive Memory Consumption, the following resolutions are attempted, in this order:

1. If the user has sufficient allowance, the additional memory requirement will be deducted from the allowance, and the transaction will complete normally
2. If the transaction execution context has remaining juice, and attempt will be made to automatically purchase sufficient memory from the Pool. The maximum amount paid will be the current juice price multiplied by the remaining juice for the transaction. If this succeeds, the transaction will complete successfully with the additional memory purchase included in the total juice cost.
3. The transaction will fail with a MEMORY condition, and any state changes will be rolled back. The User will still be charged the juice cost of the transaction

If a Transaction has negative Memory Consumption, the Memory Allowance of the user will be increased by the absolute size of this value. In effect, this is a refund granted for releasing storage.


### Allowance transfers

It is permissible to make an allowance transfer directly between Accounts. This is a practical decision for the following reasons:

- It enables Actors to automate management of allowances more effectively
- It enables Accounts controlled by the same user to shift allowances appropriately
- It avoids any need for resource-consuming "tricks" such as allocating Memory from one Account, and deallocating it from another to make an allowance transfer


### Actor Memory allowances

All Accounts, including Actors, have a Memory Allowance. However, in most cases Actors have no need for a memory allowance because the allowance utilised will be that of a User account that was the Origin of a transaction.

The exception to this is with scheduled execution, where an Actor itself may be the Origin for a transaction.

Actor developers may include a capability to reclaim Memory allowances from an Actor (e.g. transferring it to a nominated User Account). This is optional, but without this there may be no way to ever utilise an allowance held within an Actor (either because a scheduled transaction obtained a Memory refund, or because an allowance transfer was made to the Actor).

### Pool trading

The Memory Pool employs a simple Automated Market Maker, allowing users to buy and sell Memory Allowances at any time.

The Memory Pool liquidity is initially set at network genesis to be:

- 1,000,000 bytes of Memory Allowance (~1 MB)
- 1,000 Convex Gold

Giving an initial memory price of approx. 1 Convex Gold / KB

### Pool Growth

The memory trading Pool is automated to grow at a fixed rate (currently 1mb per day).

This is for the following reasons:

- Creates additional memory supply over time, reflecting improved storage and peer capabilities
- Ensures there is no hard memory supply limit that might otherwise prevent future growth
- Reduces the incentive for memory hoarding, since it will tend to penalise holders of excess memory allowances

## Incentives

### Incentive to use memory carefully

Well designed Actors should avoid allocating too much Memory when called by Users - this will be expected of Actors that wish to offer an efficient service with low transaction costs.

### Incentive to clean up old data

Any user who executes a transaction that releases memory will get a refund, so the system creates an incentive to remove data that is no longer useful or important.

Most trivially, users have an incentive to clean up their own data in their environment. If there is no longer any requirement for such data to be on-chain, it can be deleted at the user's discretion. This is a relatively safe thing to do if the user has appropriate backups: Data in the user's own environment can always be restored at a later date.

More subtly, this system creates a incentive for users to call Actors in ways that cause these actors to release memory in the Actor's environment, and thus gain the benefit of the refund. Some examples:

- A messaging system can allow users to delete old messages from their inbox that they have already read / responded to
- Tokens could offer a facility to delete unused (zero balance) account records
- Users may wish to de-register themselves from registries or subscriptions that they no longer wish to use

### Cross-party incentives

There is a slight incentive to being the receiving party in interactions that affect memory: under normal circumstances, the party initiating an on-chain request will have to consume some Memory in order to do so (e.g. creating request data within an appropriate Actor), and the responding party may have the opportunity to perform clean-up when making an appropriate response and thus claim a small Memory allowance refund.

We consider this a design advantage: 

- It can help discourage spamming of unnecessary requests 
- It rewards parties that respond diligently

The ability of receiving parties to do this will of course depend on the facilities that Actors offer to perform clean-up, but we anticipate that this will become an expected feature of well-designed Actors and smart contracts.

### De-duplication

The immutable object storage model of Convex means that data objects with the exact same encoding (and therefore the same hashed Cryptographic ID) means that objects in storage need only be stored once, even if the same data value is allocated by multiple users.

This provides an incentive for Peers to make efficient use of de-duplication, which is in any case a built-in feature of Convex.

Users do not have a particular incentive to ensure that their data is de-duplicated, since they will be required to cover the Memory allowance in all cases. This seems appropriate: users are paying to ensure the retention of the data that they allocate, and the actions of other users should not affect this.

Alternatives to this design that were considered include techniques such as reference counting which would allow Users to share the cost of storage that is de-duplicated. However this presents some significant problems:

- On-chain reference counts would be computationally expensive to track and maintain
- It would mean that the cost of Memory allocations would be unpredictable, based on Memory usage of other users
- Accounting for refunds of memory become highly complicated, and can create perverse incentives: If only the last User to release the object gets the refund, there is no incentive to be the first one to do do.

## Technical implementation

### Definition of Storage Size

A storage size is defined for each cell (branch or root) is calculated as:

`64 + [Size in bytes of encoded cell representation] + [Memory Size of any child Cells]`

The constant 64 is chosen to approximate the expected number of bytes of overhead involved in the storage of each root or branch cell. This more accurately reflects the costs to peers to store each cell. This creates a strong incentive to minimise the total number of cells and use embedded values wherever possible (apart from memory size, this is valuable because they are handled more efficiently in general on the CVM).

### Definition of Memory Size

In the above definition of storage size, **memory size** for child cells is defined as:
- The storage size of any branch cells (i.e. non-embedded references)
- Embedded values do not require storage so are considered to have a memory size of zero, however the size of embedded objects will be included in the encoded cell representation of the parent.

Since this is a mutually recursive definition, computation of storage / memory size requires the ability to access the memory sizes of any child branches, which in means that the complete cell tree must ultimately be available in the Peer's storage in order to fully validate the complete size. This means that the cell must in general have a status of PERSISTED at minimum, to preclude the possibility of any missing values in nested child cells.

### Lazy computation

Memory requirements for a cell are only calculated when required (usually at the point that the state resulting from a transaction is persisted to storage). Implementations SHOULD cache the memory size to avoid re-computing memory sizes on large trees.

This minimises the computational costs associated with memory accounting for transient in-memory objects.

### Memory Size Caching and Persistence

Implementations SHOULD cache memory size for cells, and persist cached values in storage. 

In particular Peers MUST cache memory sizes in order to meet CVM performance requirements.

Caching and persisting memory size is important to ensure that memory sizes can be computed incrementally without re-visiting the complete tree of cells.

This ensures that memory size computation is at worst `O(n)` for a Transaction, where `n` is the number of new cells constructed during the transaction.

Implementation note: we cache memory size rather than storage size because storage size is only relevant for root and branch cells, whereas memory size is needed for all cells.

### Memory Accounting impact

The memory accounting subsystem is designed so that it always has a minimal effect on CVM state size, even though it causes changes in the CVM state (consumption of allowances etc.). This limits any risk of state growth size from the memory accounting itself.

This is achieved mainly by ensuring that state changes due to memory accounting cause no net Cell allocations, at most small embedded fields within existing Cells are updated (specifically balances and allowances stored within Accounts). 

### Performance characteristics

Assuming correct caching and persistence, memory accounting cost is `O(1)` for each cell allocated, with a very small constant. Benchmarks suggest the overall impact is negligible on CVM performance, and well justified by the upside in creating good economic incentives for efficient storage use (which is itself a net positive performance gain). This would appear to be asymptotically optimal for any system that performs exact memory accounting at a fine-grained level.

This achievement is possible because:

- The memory size is computed incrementally and cached for each cell.
- The number of child cells for each cell is itself bounded by a small constant
- Memory size computation is usually lazy, i.e. it is not performed until required
- The immutable nature of Convex cell values means that there is never a need to update memory sizes once cached

The computational cost of performing this memory accounting is factored in to the juice cost of operations that perform new cell allocations. The storage cost is, of course, factored in to the general economics of the memory accounting model.

## Open Design Questions

- It likely that memory accounting will be used to add a per-transaction cost to submitted transactions based on the size of the transaction data. This would incentivise submitting smaller transactions.
- There are options regarding on-chain procedures for opening up new storage allowances (which might depend on advances in underlying storage technology). Initial assumption is that this is a Foundation network governance responsibility - there is potentially a need to monitor medium-term state growth and release new allowances accordingly over time.
- There is a potential for memory allowance hoarding and speculation, in anticipated of high prices driven by shortages. It may be necessary to set an clear expectation that holding allowances is risky, as new allowances may be added to the Memory Pool at any time which would devalue large allowance holdings.
- There is a risk that if memory price become too low, participants may become careless with memory usage. This is mitigated by the fact that on average we expect the Convex state to grow, so large falls in price precipitated by selling allowances is unlikely. This probably requires ongoing monitoring.
- Computing allowances at the end of each transaction might cause extraneous storage activity - it would be more efficient to persist CVM state changes in their entirety at the end of each block. Need to investigate whether memory accounting can be efficiently performed in-memory before hitting storage? This is related to the problem of estimating maximum memory requirement per block.
- It would be possible for state size changes caused by Memory Accounting itself (i.e. outside the scope of specific transaction effects) to be charged to the Memory Pool. This is unlikely to have a significant impact, so is probably unnecessary.
- There is a potential to charge "rent" for total storage allocation over time. This would add significant complexity and potentially cause issues for Actors unable to pay sufficient rent, but might be a useful additional incentive to keep long-term storage requirements low.





