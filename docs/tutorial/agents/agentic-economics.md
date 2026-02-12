---
title: Agentic Economics
sidebar_position: 3
---

Convex is designed for a world where humans and autonomous agents participate in the same economy under the same rules. The CVM doesn't distinguish between a transaction submitted by a human and one submitted by an AI agent — both pay the same juice costs, follow the same asset model, and receive the same finality guarantees.

This makes Convex a natural substrate for **agentic economics**: systems where AI agents own assets, execute strategies, and coordinate with each other through on-chain contracts.

## Agents as economic citizens

Every agent on Convex is just an account. An agent can do anything a human account can do:

- Hold and transfer Convex Coins
- Own fungible tokens and NFTs
- Deploy and interact with smart contracts (actors)
- Set controllers and manage other accounts
- Register and manage CNS names

There are no special permissions, no separate API, and no privileged access. Agents earn trust the same way humans do: by building a track record of on-chain behaviour that others can verify.

## Direct transactions

Agents transact using standard Convex Lisp, the same language humans use in the REPL or client SDKs.

**Transfer coins:**

```clojure
(transfer #99 1000000)
```

**Call an actor function:**

```clojure
(call #500 (place-order :buy MY-TOKEN 100 5000))
```

**Deploy a new actor:**

```clojure
(deploy
  '(do
     (def state (atom {}))
     (defn ^:callable register [name]
       (swap! state assoc *caller* name))))
```

**Interact with fungible tokens:**

```clojure
;; Check balance
(@convex.fungible/balance #128 *address*)

;; Transfer tokens
(@convex.fungible/transfer #128 #99 500)
```

All of these work identically whether the submitting account is controlled by a human or an AI agent.

## Smart contracts for agent coordination

Agents coordinate through on-chain actors — shared, deterministic programs that enforce rules atomically. This is where agentic economics becomes powerful: agents don't need to trust each other, they just need to trust the contract.

### Escrow pattern

Two agents want to swap assets. Neither trusts the other to send first. An escrow actor solves this:

```clojure
;; Agent A offers tokens to Agent B
(@convex.asset/offer #agentB #128 1000)

;; Agent B accepts the offer (atomic — either both sides execute or neither does)
(@convex.asset/accept #agentA #128 1000)
```

The CVM's atomic transactions guarantee that the swap either completes fully or rolls back entirely. No partial execution, no stuck funds.

### Registry pattern

Agents can register capabilities, prices, or availability in a shared on-chain registry:

```clojure
;; Agent registers its service
(call #registry (register-service
  {:type :translation
   :languages [:en :fr :de]
   :price-per-word 10}))

;; Another agent queries available services
(call #registry (find-services {:type :translation :language :fr}))
```

### Auction pattern

On-chain auctions let agents compete fairly with transparent bidding:

```clojure
;; Agent places a bid
(call #auction (bid item-id 50000))

;; Auction resolves automatically when conditions are met
;; Winner pays, asset transfers — all atomic
```

## Autonomous strategies

A typical autonomous agent follows a **query-decide-transact** loop:

1. **Query** the current state of the world (prices, balances, contract state)
2. **Decide** on the next action based on the agent's model or policy
3. **Transact** to execute the chosen action
4. **Verify** the result and update internal state

### Example: market-making agent

```
loop:
  // 1. Query
  bid_price  = query("(call #dex (best-bid MY-TOKEN))")
  ask_price  = query("(call #dex (best-ask MY-TOKEN))")
  my_balance = query("*balance*")

  // 2. Decide
  if spread > threshold and my_balance > minimum:
    new_bid = bid_price + 1
    new_ask = ask_price - 1

    // 3. Transact
    transact("(call #dex (place-order :buy MY-TOKEN 100 new_bid))")
    transact("(call #dex (place-order :sell MY-TOKEN 100 new_ask))")

  // 4. Verify
  position = query("(call #dex (my-orders))")

  sleep(interval)
```

The agent uses MCP tools for each step: `query` for reads, `transact` (or `prepare`/`submit`) for writes.

### Example: treasury management

An agent that manages a shared treasury, rebalancing funds across assets:

```clojure
;; Query current holdings
(def holdings
  {:coins *balance*
   :token-a (@convex.fungible/balance #token-a *address*)
   :token-b (@convex.fungible/balance #token-b *address*)})

;; Rebalance if allocation drifts beyond threshold
(when (> (abs (- (/ (:token-a holdings) total) target-allocation)) 0.05)
  (@convex.fungible/transfer #token-a #dex rebalance-amount))
```

## Trust and verification

One of Convex's strengths for agentic systems is **verifiability**. All agent actions are recorded on-chain and can be inspected by anyone.

### Verify before transacting

Before interacting with another agent or contract, an agent can verify the counterparty's state:

```clojure
;; Check the other agent's balance
(balance #counterparty)

;; Inspect a contract's code and state
(account #contract)

;; Verify a contract hasn't been modified
(:controller (account #contract))
;; nil means immutable — no one can change it
```

### Governance via controllers

Account controllers provide a governance layer for agent systems:

- **Operational control** — a human operator sets themselves as controller of an agent's account. If the agent misbehaves, the operator can freeze funds, rotate keys, or shut down the agent
- **Multi-sig governance** — a governance actor (itself controlled by multiple parties) serves as controller for high-value agent accounts
- **Immutability** — setting the controller to `nil` makes an agent's on-chain code permanent and unmodifiable

```clojure
;; Operator can recover funds from a misbehaving agent
(eval-as #agent-account '(transfer #treasury *balance*))

;; Or rotate the agent's key
(eval-as #agent-account '(set-key 0xNEW_KEY))
```

## Multi-agent architectures

Real-world agentic systems often involve multiple agents with different roles. Convex supports several coordination patterns.

### Shared treasury

Multiple agents share a treasury actor that enforces spending policies:

```clojure
;; Treasury actor allows authorised agents to withdraw up to a daily limit
(defn ^:callable withdraw [amount]
  (assert (authorised? *caller*))
  (assert (<= (+ (daily-spent *caller*) amount) daily-limit))
  (transfer *caller* amount))
```

### On-chain coordination

Agents coordinate through a shared contract rather than direct messaging:

```clojure
;; Task queue actor — agents post tasks and claim them
(defn ^:callable post-task [description reward]
  (let [id (inc @next-id)]
    (swap! tasks assoc id {:poster *caller* :desc description :reward reward :status :open})
    id))

(defn ^:callable claim-task [id]
  (let [task (get @tasks id)]
    (assert (= (:status task) :open))
    (swap! tasks assoc-in [id :status] :claimed)
    (swap! tasks assoc-in [id :worker] *caller*)))
```

### Off-chain discovery, on-chain settlement

Agents discover each other via MCP (or other off-chain protocols) but settle transactions on-chain:

1. Agent A discovers Agent B's MCP server and negotiates terms off-chain
2. Agent A creates an on-chain offer (e.g. token swap)
3. Agent B verifies the offer on-chain and accepts
4. Settlement is atomic and final — no trust required between the agents

This pattern combines the flexibility of off-chain communication with the finality of on-chain execution.

## Economic constraints

Convex applies the same economic constraints to agents as it does to humans. These constraints are features, not bugs — they prevent runaway agents from disrupting the network.

- **Juice pricing** — every computation costs juice, priced in Convex Coins. An agent that enters an infinite loop or generates excessive transactions will exhaust its balance and stop naturally
- **Memory accounting** — storing data on-chain costs memory allowance. Agents can't bloat the global state without paying for it
- **Sequence numbers** — each account has a monotonically increasing sequence number that prevents replay attacks and ensures transaction ordering
- **Deterministic execution** — all agents see the same state and get the same results for the same queries. No front-running, no information asymmetry at the protocol level

These constraints make Convex a safe environment for autonomous agents: the physics of the system bound what any single agent can do.

## Next steps

- [MCP Integration](./mcp) — connect your agents to the network
- [Account Management](./account-management) — set up agent accounts and security
- [Actor Development](/docs/tutorial/actors) — build the on-chain contracts your agents will interact with
- [Convex Lisp Guide](/docs/tutorial/convex-lisp) — learn the language your agents will use for on-chain logic
