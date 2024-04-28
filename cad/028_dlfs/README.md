# DLFS - Data Lattice File System

## Overview 

The Data Lattice File System (DLFS) is a virtual file system that operates using the [Data Lattice](../024_data/lattice).

## Design Goals

- Provide a decentralised alternative to cloud storage services such as DropBox
- Support peer-to-peer data replication (BitTorrent style)
- Maintain compatibility with familiar personal computer file systems
- Provide POSIX compatibility as far as possible 
- Take advantage of the capabilities of the Data Lattice and self-healing CRDTs
- Allow off-chain personal and/or private file systems 

## Overall architecture

DLFS is implemented over a **P2P network** that manages **drives** controlled by independent sets of users. 

Each drive is implemented naturally on the **Data Lattice**: the drive state coupled with a merge function that is commutative, associative and idempotent forms a mathematical lattice, where properly executed drive replication is guaranteed to converge to a stable state in the manner of a **CRDT**. From a user perspective, they appear as virtual filesystems that automatically sync across devices with decentralised backup.

**Cryptographic security** is used to ensure:
- Only authorised users are allowed to update drives (usually the owner of the drive, or a group of owners) using Ed25519 digital signatures
- Each drive state has complete integrity as a Merkle Tree
- All data is content addressable an collision resistant via SHA3-256 hashes
- Optional encryption can applied for privacy

**Decentralised identity** with W3C style DIDs is used to identify and validate users. This can be stored on-chain on the Convex network as a secure public root of trust.

## Specification

### DLFS Drives

A DLFS drive is a component which manages and enables access to DLFS data. It is analogous to a file system on a personal computer.

It can be considered as a pointer to a Drive State, where file system operations result in a change to the Drive State.

DLFS drives MAY have multiple alternative implementations, which may be selected according to user case requirements:
- Fully in-memory drives
- Local drives backed by Etch storage
- Remote drives drawing data from the Data Lattice
- Read only drives (e.g. drives representing an immutable snapshot of another drive)

Systems operating DLFS drives MAY determine custom rules for allowing drive updates and access. Typical options may include:
- Restricting access to specific authenticated users
- Read-only access over the public web (e.g. for web servers)

#### Drive State

The Drive State is the DLFS Node at the root of a DLFS drive

The Drive State MUST be a valid DLFS directory node, and is considered the "root" directory.

Implementations SHOULD allow immutable snapshots of the Drive State

#### Drive State Hash

The Drive State Hash MUST be the SHA-256 hash of the root value of the Drive State (i.e. its Value ID).

The Drive State Hash can therefore be used to validate the entire contents of the drive as a Merkle tree.

### DLFS URIs

DLFS is designed to operate as a fundamental Internet protocol, and interoperate with widely used standards such as URI based addressing of content.

Proposed URI method is `dlfs`

#### Global addresses

`dlfs:bob/shared/images/nft0001.png`

Refers to the drive `shared` controlled by the user `bob`, and within that the file `nft0001.png` in the directory `images`.

Usernames MUST be publicly registered users on CNS with a public DID in the `user` namespace, e.g. `user.bob` in order to enable public resolution and authentication.

#### Hosted Drives

Alternative to global addresses, a URI authority can be specified to refer to a specific Internet host

`dlfs://dlfs-opendrives.com/bob/shared/images/nft0001.png` 

Implementations MAY support user names that are not publicly registered, in which cases clients will need to be aware of (and verify) the appropriate mapping

#### Local Drives

Local drives are accessed on the local system, and need not be publicly visible or resolvable. They MAY be replicas of public drives kept for temporary working purposes or backups.

`dlfs:local:bob/private/finance/invoices/amazon.pdf`

Implementations MUST support user names that are not publicly registered

#### HTTPS mapping

DLFS URIs can be mapped to HTTP / HTTPS for easy access by web-based clients and browsers:

`https://dlfs-opendrives.com/dlfs/bob/shared/images/nft0001.png` 


### DLFS Nodes

Each object in a DLFS drive is represented as Node

The node is a Vector with the following fields

`[directory-contents file-contents metadata update-time]`

DLFS nodes MUST contain at least these fields. 

Future extensions MAY include additional fields. Implementations which do not recognise such fields MUST ignore additional fields and leave these unchanged by any file operation.

#### Directory Contents

The directory contents field MUST be either:
- A HashMap of String names to DLFS child nodes
- `nil`, indicating the node is not a directory 

#### File Contents

The file contents field MUST be either:
- A Blob of file contents
- `nil`, indicating the node is not a regular file

#### Tombstones

A file which is neither a directory not a regular file is a tombstone entry.

Implementations SHOULD create tombstone entries upon file deletion, so that deletes of files can be resolved in future replication. Failure to do so will likely result in deleted files reappearing when not intended.

Implementation SHOULD support removal of tombstones. The policy for this is implementation dependent, but should only occur after all replication is complete (e.g. after a fixed number of days) 

#### Metadata

The metadata field is a Cell indicating file metadata which may be either:
- `nil`, indicating no metadata
- A valid CVM value containing metadata

Implementations MAY assign custom meanings to the metadata field

#### Update Time

The timestamp of the last operation which changed this node in any way

Implementations SHOULD update the timestamp on all operations that change a node's content or metadata to the latest timestamp of the DLFS Drive. 

Implementations SHOULD use the timestamp to help resolve situations where replicated file changes need to be detected and resolved.

Implementations MAY set arbitrary timestamps for files, but it is important to be aware what effects this may have upon replication.

### DLFS file names

DLFS file names MAY be any UTF-8 String of length 1 or more.

File names are case sensitive. For compatibility with Windows is is STRONGLY RECOMMENDED to avoid multiple file names differing only by case.

It is STRONGLY RECOMMENDED (for compatibility with other files systems and URLs) that applications limit character usage to:
- Alphabetic uppercase and lowercase characters (`A` to `Z` and `a` to `z`)
- The digits `0` to `9` (except in the first position)
- The hyphen `-`
- The dot `.`
- The underscore `_`

It is RECOMMENDED to avoid `-` and `.` as initial characters, since these often have special meanings (e.g. in command line arguments and Unix hidden files respectively)

### Replication

DLFS drive implementations MAY support automatic replication.

Implementations MUST allow transfer of data across implementations via the use of compatible data structures.
