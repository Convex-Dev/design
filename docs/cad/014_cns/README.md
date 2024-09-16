# CAD014: Convex Name System

The Convex name system (CNS) is a globally accessible naming service available on the CVM.

## Motivation

Similar to DNS on the Internet, there is a need for a naming which system which provides:

- Meaningful human readable names
- A mapping to resources on the network
- Secure facilities for managing this information

## Alternatives

Nothing in Convex requires the use of CNS. It must be possible to create working systems on the CVM without relying on CNS.

Alternative CNS implementations must be possible, with a different CNS root.

## Specification

### CNS paths

Record in CNS MUST be specified specified by a path. 

Paths can be represented in at least two forms:

- A dot delimited symbol e.g. `convex.asset`
- A vector or strings e.g. `["convex" "asset"]`

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

- `convex` - reserved for approved convex libraries and tools. Typically these SHOULD be FULLY specified with a CAD (e.g. `convex.asset` API as specified in CAD19). Foundation approval required.
- `user` - indended for user accounts. Open access, names / subdomains are assets obtainable for a fixed Convex coin cost.
- `torus` - reserved for open source marketplaces and trading contracts such as the Torus DEX. Community approval required.
- `app` - reserved for decentralised application actors and contracts. Community approval required.
- `peer` - reserved for peer operators. Community or Foundation approval required.
- `id` - reserved for decentralised IDs

New root namespaces require Foundation governance approval.
