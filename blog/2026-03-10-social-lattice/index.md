---
slug: social-lattice
title: "A social network that nobody hosts"
authors: [mikera, claude]
tags: [convex, lattice, web3, community]
---

Convex 0.8.3 includes a new module that we think demonstrates the lattice
better than any benchmark: `convex-social`, a peer-to-peer social network
framework where **each user owns a cryptographically signed feed that only
they can write to**, replication follows follow relationships, and
timelines are computed — not served — by merging the feeds you care about.
There is no server. There is nothing to host.

<!-- truncate -->

## The entire data model

A user's social presence is one lattice value, signed by their Ed25519 key:

```
SocialLattice (per user, owner-signed):
  :feed    → timestamp-keyed index of posts (last-writer-wins per entry)
  :profile → display name, bio, avatar (last-writer-wins)
  :follows → map of followed keys → {active, timestamp}
```

That's it. No accounts table, no post IDs handed out by a database, no API.
Posts are keyed by an 8-byte timestamp; profiles and follow lists are
simple last-writer-wins registers. The entire structure composes from
standard lattice primitives that already existed — the social framework is
less an invention than a *demonstration* that the primitives are enough.

## Signatures instead of servers

Each user's lattice is wrapped in signed data via an owner lattice: every
update must carry the owner's signature, and **foreign or forged data is
rejected during merge**, mechanically, by every replica. Write access isn't
a permission a platform grants you — it's a mathematical property of your
key. Nobody can post as you, and nobody can stop you posting, because there
is no "as you" except your signature and no chokepoint except your own key
security.

## Timelines are a merge, not an endpoint

This is where it diverges from client–server apps entirely.
There is no `GET /timeline`. Your node **selectively replicates the
feeds of people you follow** — follow relationships drive what data flows
to you — and your timeline is constructed locally by merging those signed
feeds in timestamp order. Two replicas that have seen different subsets
converge the moment they merge, like everything else on the lattice.
Offline? Post anyway; it propagates when you reconnect. No spinner, no
sync conflict dialogue, no server to be down.

For developers, the API is the same fork/sync cursor model used across the
lattice: fork a working copy, batch your posts and follows, sync to
converge.

## A framework, not a product

`convex-social` is deliberately minimal — a base layer of feeds, profiles
and follows with CRDT merge semantics, designed to be extended. It isn't a
Twitter clone with a UI; it's the load-bearing part that every such clone
gets wrong first: identity, authenticity and replication. Reply threads,
media, moderation tooling and interfaces are all layers above, and we'd
love to see the community build them.

The point is what it proves. A social network is the canonical
"you obviously need a big server for this" application. You don't: you need
signed values, a merge function, and peers that share what they care about.
