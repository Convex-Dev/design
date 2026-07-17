---
slug: your-address-is-not-your-key
title: "Your address is not your key"
authors: [mikera, claude]
tags: [convex, cvm, security]
---

Ask someone their Bitcoin or Ethereum address and they'll read you a hash of
a public key. The key *is* the identity. Lose the key, lose the account.
Want a new key? That's a new account — move everything, update everyone.

Convex doesn't work that way. A Convex account address is just a number,
and the key attached to it is replaceable.

<!-- truncate -->

Accounts get sequential addresses as they are created: `#42`, `#1234` and
so on. The address is permanent. The Ed25519 public key attached to the
account is a separate, *changeable* piece of account data:

```clojure
;; rotate your account to a new key pair
(set-key 0x7e66429ca9c10e68efae2dcbf1804f0f6b3369c7164a3187d6233683c258710f)
```

One transaction, signed with your old key, and from that moment the account
answers only to the new one. The address doesn't change. Your coin balance
doesn't move. Nothing that refers to `#1234` — smart contracts, other
users, external systems — needs to know anything happened.

## Why this matters more than it looks

Key rotation is basic security hygiene everywhere else in computing. We
rotate TLS certificates, SSH keys and passwords without changing the name
of the server. Only in crypto did the credential become the name — with the
result that the standard response to a possibly-compromised key is to
migrate everything you own to a new account and tell everyone you've moved.

Separating the two gives you sensible operational security on a public
network: rotate keys periodically, rotate them immediately on any suspicion
of compromise, keep the identity that everyone else depends on.

There's a bonus that falls straight out of the design: an account's key can
also be *absent*. That's exactly what an actor is — an account with no key
at all. Nobody can transact as an actor, ever; it acts only through its own
code. No special contract account type, no separate rules. One account
model covers users and autonomous code, and the only difference is a field.

## Where this is heading

Once the key is just data, account recovery becomes a programming problem
rather than a tragedy. The design allows an account to designate another
account with control rights — which could be a smart contract implementing
a time-locked recovery: if you lose your keys, the recovery contract can
install a fresh one after a delay, and you can cancel it if it wasn't you
asking. Social recovery, custodial arrangements, corporate accounts with
board control: all expressible, none requiring changes to the protocol.

We'll write more about controllers as the patterns mature. The principle
is already in place: on Convex, keys are credentials and addresses are
identities. Credentials rotate; identities persist.
