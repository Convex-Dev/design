---
slug: cad3-revolution
title: The CAD3 Revolution
authors: [mikera]
tags: [convex, cad3, lattice]
---

A quick note on [CAD3](https://docs.convex.world/docs/cad/encoding)  because I think it is important for everyone to understand how important this is - it's also probably the last significant piece we NEED to get right before Protonet goes live.
<!-- truncate -->

What is CAD3? It's the format with which we encode lattice data, e.g. the number `13` becomes the 2-byte sequence `0x110d`. If you've used Convex Desktop, you may recognise these from the message encoding utility in the "Hacker Tools".

### Why this is critical

The CAD3 encodings are important to everything we are doing:
- These encodings describe all the data in Convex and other lattice applications: the global state, DLFS drives, lattice structures for merging, transactions, CVM smart contract code etc.
- These sequences of bytes (encodings) are what we put through a SHA3-256 cryptographic hash to build Merkle DAGs and verify integrity of data
- These are also the raw bytes that get transmitted between peers and binary clients
- These are also the bytes that get stored to disk in Etch
- These are also performance critical - a lot of the performance in Convex depends on how fast we can encode, transmit and store data
- These are also security critical - attackers might attempt to construct malicious encodings to circumvent security or mount a DoS attack

Hopefully this makes it clear: these encodings are pretty essential to Convex and lattice technology as a whole! They are also very hard to change after we go live: changing encodings would mean everyone needs to re-encode all their data in the new format! Hence why we're super focused on getting this right before Protonet launch. 

### The Good News

The good news: we are now very close to having a near-perfect encoding format for decentralised data. Has the potential to be a game changer much more broadly, as it solves a lot of the problems with existing encoding formats when used for decentralised data. Some juicy features:
- A **unique canonical encoding** for every value, such that it can be hashed to a stable ID
- An **efficient binary format** for both storage and transmission
- A **self describing** format - no additional schema is required to read an encoding
- Provision of **immutable persistent data structures** for the lattice data values used in Convex
- Automatic generation of a verifiable **Merkle DAG** via references to other value IDs
- Support for **rich data types** used in the CVM and lattice data (Maps, Sets, Vectors, Blobs etc.)
- Data structure of **arbitrary size** may be represented. The lattice is huge.
- Support for **partial data**: we often need to transmit deltas of large data structures, so need a way to build these deltas and reconstruct the complete structure when they are received (assuming existing data can fill the gaps)
- Ability to read encode / decode n bytes of data in O(n) time and space to ensure **DoS resistance**
- Fixed upper bound on the encoding size of any value (excluding referenced children) so that reading and writing can occur in fixed sized buffers - this allows **streaming capabilities** including zero-copy operations.

### What next?

Full CAD3 specifications are outlined in [CAD003](/docs/cad/encoding). For anyone wanting to work on the CAD3 format or it's implementation in Convex please get involved! 
