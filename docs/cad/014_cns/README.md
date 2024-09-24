# CAD014: Convex Name System

The Convex name system (CNS) is a globally accessible naming service available on the CVM. It performs the important function of providing trusted names for user accounts and other services on the CVM, and acts as a root of trust for the broader ecosystem of lattice technology services.

## Motivation

Similar to DNS on the Internet, there is a need for a naming system which provides:

- Meaningful human readable names
- A mapping to resources on the network
- Secure facilities for managing this information

## Alternatives

Nothing in Convex requires the use of CNS. It MUST be possible to create working systems on the CVM without relying on CNS.

Alternative CNS implementations MAY be deployed with a different CNS root. Users and application developers SHOULD adopt canonical CNS names however, as other systems may not be able to resolve against an unrecognised CNS root.

## Specification

### CNS Root

CNS is defined to have a specific root, the account `#9` in the genesis state.

The CNS root SHOULD NOT be modifiable by any accounts other than those controlled by the governance body. Initially full control is restricted to the governance address `#6`, and namespace management to the genesis account `#11`.

### CNS paths

Records in CNS MUST be specified specified by a path. 

Paths can be represented in at least two forms:

- A dot delimited symbol e.g. `convex.asset`
- A vector of strings e.g. `["convex" "asset"]`

Rationale: Dot delimited symbols are preferred for conciseness and human readability, whereas a vector of strings is more convenient and efficient for internal database representation. 

### CNS Records

A CNS record is a logical entry in CNS.

A CNS record MUST contain the following values:
- **Address** : The entity referred to be the CNS record, which SHOULD be an address or a scoped reference e.g/ `[#45 :some-key]`
- **Controller** : The controller that enables access to update the CNS record, which SHOULD be a valid trust monitor
- **Metadata** : Optional metadata attached to the CNS Record

Any of the three logical values MAY be `nil`

### Root namespaces

The following root namespaces are initially available:

- `convex` - reserved for approved convex libraries and tools. Typically these SHOULD be FULLY specified with a CAD (e.g. `convex.asset` API as specified in CAD19). Governance approval required.
- `asset` - reserved for digital asset implementations. Names will be allocated subject to community / governance approval and/or audit
- `user` - intended for developer user accounts. Open access, names / subdomains are assets obtainable for a fixed Convex coin cost.
- `torus` - reserved for validated open source marketplaces and trading contracts such as the Torus DEX. Community approval required.
- `lab` - open access, for on-chain testing of actors and smart contracts
- `app` - reserved for decentralised application actors and contracts. Community approval required.
- `peer` - reserved for established peer operators. Community or governance approval required, which will normally granted to peer operators with a proven record of correctly maintaining at least 10,000 Convex Gold stake.
- `id` - reserved for decentralised IDs. Open access, names are assets obtainable for a small Convex Coin cost

New root namespaces require Foundation governance approval.
