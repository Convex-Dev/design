---
sidebar_position: 1
---

# Quick Start

Deploy and call your first smart contract on a live Convex network — in under a minute, with no installation.

## Try it now: the Web Sandbox

The fastest way in is the **[Web Sandbox](https://convex.world/sandbox)** — a live REPL connected to the public testnet. No install, no signup.

**1. Evaluate an expression.** Queries are free and need no account:

```clojure
(+ 1 2 3)
;; => 6
```

**2. Get a funded account.** Create an account in the Sandbox and fund it from the testnet faucet — you now hold Convex Coins to pay for transactions. (See the [Faucet Guide](coins/faucet).)

**3. Deploy and call a smart contract** — a one-line *actor*:

```clojure
;; Deploy an actor exposing one callable function
(deploy '(defn ^:callable greet [name] (str "Hello, " name "!")))
;; => #1234   ;; your new actor's address

;; Call it
(call #1234 (greet "world"))
;; => "Hello, world!"
```

You have deployed and called a smart contract on a live decentralised network.

:::note Network
The Sandbox runs against the public **testnet** — free, for development. Production runs on **Protonet** (`peer.convex.live`). See the [Networks Guide](networks).
:::

---

## Go further

Pick the path that fits what you're building.

### Try an SDK

Build an app against the testnet in your language:

**[ Java ](client-sdks/java/quickstart)** · **[ Python ](client-sdks/python/quickstart)** · **[ JavaScript / TypeScript ](client-sdks/typescript/quickstart)**

Each quickstart is copy-paste runnable. A minimal example — create a funded account, transact, then query:

**TypeScript / JavaScript** — `npm install @convex-world/convex-ts`:
```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex('https://mikera1337-convex-testnet.hf.space');

// Create a faucet-funded account and use it for signing (amount in coppers)
const keyPair = KeyPair.generate();
const account = await convex.createAccount(keyPair, 100_000_000);
convex.setAccount(account.address, keyPair);

const result = await convex.transact('(def greeting "Hello Convex!")');
console.log(result.value);                            // "Hello Convex!"
console.log((await convex.query('greeting')).value);  // "Hello Convex!"
```

**Python** — `pip install convex-sdk`:
```python
from convex_sdk import Convex, KeyPair

convex = Convex('https://mikera1337-convex-testnet.hf.space')

# Create a faucet-funded account (amount in coppers)
key_pair = KeyPair()
account = convex.create_account(key_pair)
convex.request_funds(100_000_000, account)

result = convex.transact('(def greeting "Hello Convex!")', account)
print(result.value)                              # Hello Convex!
print(convex.query('greeting', account).value)   # Hello Convex!
```

**Java** — `world.convex:convex-java`:
```java
import java.util.Map;
import convex.java.ConvexJSON;
import convex.core.cvm.Address;

ConvexJSON convex = ConvexJSON.connect("https://mikera1337-convex-testnet.hf.space");

// Create a faucet-funded account (up to 10,000,000 copper) and use it
Address address = convex.useNewAccount(10_000_000);

Map<String, Object> result = convex.transact("(def greeting \"Hello Convex!\")");
System.out.println(result.get("value"));                    // Hello Convex!
System.out.println(convex.query("greeting").get("value"));  // Hello Convex!
```

### Run your own peer

Full control, offline development, or running on the network: download `convex.jar` (or **Convex Desktop**) and run your own peer. See **[Local Testnets](peer-operations/local-testnets)**. For an embedded peer in Java, see the **[Java Quickstart](client-sdks/java/quickstart)**.

### Write Convex Lisp

Convex Lisp is the on-chain language for queries, transactions, and actors (smart contracts). Start with the **[Convex Lisp guide](/docs/tutorial/convex-lisp)** and **[Actor Development](actors)**.

### Operate a peer

Run a node that participates in consensus on the network. See **[Peer Operations](peer-operations)**.

---

## Understanding what you did

### Key concepts

**Account** — your identity on Convex. Holds Convex Coins (CVM) and is identified by an address (e.g. `#1234`).

**Key pair** — Ed25519 public/private keys. The private key signs transactions; the public key backs the account.

**Query** — reads network state. Free, needs no account, and changes nothing.

**Transaction** — changes network state (e.g. `deploy`, `def`, `call`). Requires a funded account and costs *juice* (an execution fee).

**Actor** — an autonomous account that holds code. Functions tagged `^:callable` can be invoked by anyone with `call`. This is a smart contract.

### What just happened?

```clojure
(deploy '(defn ^:callable greet [name] (str "Hello, " name "!")))
```

This Convex Lisp transaction:
1. **Created** a new actor account
2. **Installed** a `greet` function, exposed via `^:callable`
3. **Persisted** it across the network — permanently, cryptographically signed, and validated by consensus

`(call #1234 (greet "world"))` then ran that function on-chain and returned its result.

## Next steps

**Understand the network**
- **[Networks Guide](networks)** — production, testnet, local
- **[Faucet Guide](coins/faucet)** — getting test funds

**Master your SDK**
- **[Queries](client-sdks/java/queries)** — reading state
- **[Transactions](client-sdks/java/transactions)** — changing state
- **[Account Management](client-sdks/java/accounts)** — keys and accounts

**Write smart contracts**
- **[Convex Lisp](/docs/tutorial/convex-lisp)** — the on-chain language
- **[Actor Development](actors)** — smart contracts
- **[Recipes](recipes)** — practical examples

### Try these in the Sandbox

```clojure
;; Check an account balance
(balance #13)

;; Do some math
(+ 1 2 3 4 5)

;; Define and call a function
(defn square [x] (* x x))
(square 7)

;; Deploy a smart contract
(deploy '(defn ^:callable add [a b] (+ a b)))
```

## Troubleshooting

**`FUNDS` error** — your account needs Convex Coins. In the Sandbox, top up from the faucet; via an SDK, request from the [faucet](coins/faucet).

**`SEQUENCE` error** — don't submit concurrent transactions from one account; wait for the previous one to confirm.

**Can't connect** — check your network URL and internet connection. The testnet endpoint is `mikera1337-convex-testnet.hf.space`.

**Query returns nothing** — check your syntax and that the variable or actor exists.

## Get help

- **[Discord Community](https://discord.com/invite/xfYGq4CT7v)** — live help
- **[GitHub Issues](https://github.com/Convex-Dev/convex/issues)** — bug reports
- **[Documentation](/)** — complete guides

**Common terms:** *CVM* = Convex Virtual Machine · *juice* = transaction execution cost · *copper* = smallest unit (1 CVM = 1,000,000,000 copper) · *peer* = a network node · *actor* = a smart contract.
