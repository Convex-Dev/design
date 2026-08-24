# CAD051: Convergent Proof of Stake

## Overview

Convex reaches consensus with **Convergent Proof of Stake (CPoS)**: peers converge on a single ordering of Blocks without leader election, mining, or round-based voting. Each peer maintains an **Order** — its view of the Block ordering together with its confirmation points — inside a signed **Belief** that it shares with other peers. Belief merge combines the Orders of other peers with the peer's own, weighted by effective stake, and adopts the stake-weighted winning ordering. Because every peer repeatedly adopts the majority view, orderings converge exponentially fast; consensus is the fixed point of the merge.

This CAD specifies the consensus design: the confirmation levels and thresholds, the determinism boundary that keeps the network fork-free, how time is handled (including the forward-dated Block problem), effective stake, and the security analysis of the main attack surfaces. The mathematical treatment of belief merge and its convergence is in the [White Paper](/docs/overview/convex-whitepaper); Belief exchange at the messaging layer is [CAD015](../015_peercomms/index.md); staking economics are [CAD016](../016_peerstake/index.md); operator concerns are [CAD017](../017_peerops/index.md).

## Concepts

- **Block** — a group of transactions submitted by a single peer, carrying a timestamp set by that peer. Blocks are *not* chained: a Block contains no hash of any previous Block, which is what allows concurrent submission and later ordering (see [CAD002](../002_values/index.md)).
- **Order** — a peer's current view of the Block ordering, plus its confirmation points at each consensus level.
- **Belief** — the signed structure through which a peer publishes its Order and observes others'. All consensus communication is Belief exchange.
- **Consensus point** — for a given level, the length of the Block prefix confirmed at that level.

## Specification

### Confirmation levels

Confirmation proceeds through four **consensus levels**. Level 0 is the raw Block ordering; each higher level records the longest prefix agreed by at least the consensus threshold — **2/3 of effective stake** — *at the level below*:

| Level | Name | Meaning |
|-------|------|---------|
| 0 | Ordering | The peer's current raw Block vector |
| 1 | Proposal | Prefix backed by ≥ 2/3 effective stake at level 0 |
| 2 | Consensus | Prefix backed by ≥ 2/3 effective stake at level 1 |
| 3 | Finality | Prefix backed by ≥ 2/3 effective stake at level 2 |

Each level's point MUST be a prefix of the level beneath it, and confirmed points — consensus and finality — MUST never retreat: a confirmation records that the stake threshold was observed at some time, which later vote fluctuation (for example lagging Order copies re-entering the voting set) does not un-observe. The proposal point is deliberately exempt: proposal switching re-derives it over the new ordering, and vote changes are expected at that stage. The CVM State is executed against the **finalised** prefix only; proposal and consensus are the intermediate confirmations that precede it. The 2/3 thresholds give classic BFT-style tolerance of up to 1/3 adversarial effective stake.

### Belief merge

On receiving Beliefs, a peer MUST merge the contained Orders with its own, weighted by effective stake, and adopt the stake-weighted winning ordering, recomputing its consensus points per the level rules above. Orders timestamped beyond the peer's own clock MUST be ignored (an attacker must not be able to make its Belief artificially "newest" to win timestamp-based tie-breaks).

Belief merge is **peer-local policy**: it runs on one peer's inputs and clock, and its choices are visible to others only through the signed Orders the peer publishes. Two peers may legitimately differ in policy without forking, because consensus only advances where a stake supermajority's policies overlap.

### Effective stake

Consensus weight is **effective stake**, not raw stake: each peer's stake decays with time since it last produced a Block, down to a floor of 0.1% of its raw value. Inactive or partitioned peers therefore lose consensus weight automatically and cannot silently hold back convergence. Peers whose effective stake falls below a minimum (1000 Convex Coins) are excluded from Block production entirely. Delegated stake adds to a peer's weight but remains withdrawable only by its delegator ([CAD016](../016_peerstake/index.md)).

### The determinism boundary

The single most important structural principle of the design:

> **The state transition is a pure, deterministic function of (State, Block); everything that depends on a peer's local environment is peer-local policy in belief merge.**

Getting a rule on the wrong side of this boundary is how consensus implementations fork.

| Deterministic (consensus-critical) | Peer-local (policy) |
|---|---|
| Block validity and execution | Which Blocks a peer proposes |
| Consensus-time update; scheduled transactions | Which Orders a peer adopts or ignores |
| Network upgrade activation ([CAD050](../050_network_upgrade/index.md)) | When a peer confirms (votes to advance consensus) |
| Juice and fee computation | Proposal-switching patience |
| Effective-stake computation from State | The peer's wall clock |

Consequences:

- **Replay safety.** Any peer MUST be able to replay history from genesis and reach bit-identical state. Block validity checks may therefore consult only the State and the Block — never the wall clock, the local store, or peer configuration.
- **Validity is forever.** A Block judged valid at position *n* MUST be valid at position *n* on every peer at any time. Anything time-of-observation-dependent cannot be a validity rule.
- **Policy is free.** Confirmation timing, Order adoption and proposal behaviour may vary per peer without consensus risk.

The practical test for any proposed rule: *if two honest peers could evaluate it differently at the same Block position, it must be policy, not validity.*

### Time

There are two clocks, and they must never be conflated:

1. **Consensus time** — the State's timestamp, advanced only by confirmed Blocks, monotonically. All deterministic on-chain behaviour keys off this: scheduled transactions, stake decay, memory-pool growth, and upgrade activation.
2. **Peer wall-clock time** — the peer's local clock, which advances forward only and is **policy input only**.

Block timestamps are set by the proposing peer from its wall clock. They are *claims*, bounded by the following rules.

#### Backdating: a deterministic validity bound

A Block MUST be rejected as invalid if its timestamp is older than consensus time minus the backdate bound (**15 minutes**), or if it is not later than the proposing peer's previous Block (per-peer timestamps are monotonic). These are sound validity rules because they compare Block time against *State* time — the same on every peer, at execution and on replay.

#### Forward-dating: a two-stage confirmation policy

There is deliberately **no forward validity bound**: "too far in the future" is relative to the observer's clock, which differs between peers and between original execution and replay, so it cannot be a validity rule. A far-future Block cannot be *invalid* — instead, honest peers **decline to advance consensus past it until their own clocks reach its timestamp**. Without this, a staked peer proposing a far-future-dated Block that reached finality would jump the consensus clock (the "clock teleport"), wedging schedules and firing any scheduled network upgrades at once.

The policy has two composable stages:

**Stage (i) — confirmation clamp (safety).** After computing its consensus points in belief merge, a peer clamps each level's point so it never exceeds the longest Block prefix whose timestamps all lie within its **horizon** — wall clock plus a small skew allowance (**30 seconds**) — floored at the current point so nothing is ever retracted. The clamp is monotone, minimal and purely local; the horizon is simply the first out-of-window Block scanned from the front, with no assumption that Blocks are timestamp-sorted.

Since each confirmation level requires ≥ 2/3 effective stake at the level below and execution happens only at finality, an honest supermajority that clamps guarantees that **a future-dated Block cannot be finalised — hence cannot execute, hence cannot advance the consensus clock — before real time reaches its timestamp**, regardless of proposer. Safety rests only on the standard honest-supermajority assumption.

The accepted cost of stage (i) alone is a **bounded liveness wedge under active attack**: the out-of-window Block still occupies its position, so legitimate Blocks behind it also wait until the horizon advances. The wedge is bounded (it clears as real time passes), attributable (the Block is signed by a staked peer) and punishable under governance — and stage (ii) removes it.

**Stage (ii) — ordering hygiene (liveness).** Before consensus is computed, out-of-window Blocks are **stably demoted to the back of the unconfirmed tail** of the winning order. This is a stable *partition*, deliberately **not a timestamp sort**: sorting by claimed timestamp would let a peer back-date a Block (within the 15-minute window) to jump ahead of others — a timestamp-driven front-run. In-horizon Blocks keep their observation-based order; only genuinely far-future Blocks move, and are merely delayed — the intended penalty falling on their own proposer. Demotion never disturbs an agreed prefix, because stage (i)'s clamp guarantees an out-of-window Block never gains proposal standing and so always sits in the reorderable tail.

The two stages compose: with the wedge gone, the clamp confirms up to the first *remaining* future Block, which now sits behind the demoted in-horizon Blocks. Given ordering `[F, N]` with `F` far-future, stage (ii) reorders to `[N, F]`; stage (i) then finalises `N` and holds `F`.

Note the intentional asymmetry with the backdate bound: backward is state-relative, deterministic, and lenient (15 minutes — a validity rule); forward is wall-clock-relative, tight (seconds — generous for clock-disciplined peers), and policy. They answer different questions and live on opposite sides of the determinism boundary. A hard deterministic forward backstop (reject Blocks dated beyond state time plus a large constant) was considered and rejected: it reintroduces the determinism hazard for zero gain, since the clamp already prevents early execution.

## Security considerations

### Threat model

Peers are public-by-default infrastructure and MUST be robust to arbitrary malicious messages. An attacker may control peers with stake (up to the BFT bound), submit arbitrary transactions, and craft arbitrary Belief, Order and Block data. Consensus safety MUST NOT depend on any peer-local trust decision; a client's trust in a specific peer for transaction submission is a separate, explicit choice.

### Attack surfaces and mitigations

- **Clock teleport (future-dated Blocks)** — closed by the stage (i) confirmation clamp; liveness under attack restored by stage (ii) demotion.
- **Backdated or replayed Blocks** — bounded deterministically by the 15-minute backdate rule and per-peer timestamp monotonicity. A Block cannot be resurrected outside the window or reordered within its proposer's own sequence.
- **Future-dated Orders** — ignored in belief merge, so gossip timestamps cannot be used to win tie-breaks.
- **Stake-weight manipulation** — advancement requires 2/3 of *effective* stake; inactive stake decays and sub-minimum peers cannot produce Blocks, so parked or partitioned stake loses influence automatically.
- **Peer-record manipulation** — all peer mutation (data, stake, eviction of a well-staked peer) is gated to the peer's controller account; knowing a peer's public key confers nothing. Eviction of the last peer MUST be refused as a liveness guard; eviction of sub-threshold peers by anyone is deliberate garbage collection.
- **Front-running by the submitting peer** — a peer sees transactions before including them in a Block and could insert its own first. This is inherent to the submission model and accepted **by design**: the mitigation is the client's choice of a trusted, well-staked peer whose stake is forfeitable under governance, not a protocol patch.
- **Transaction replay** — prevented deterministically by per-account sequence numbers checked in the state transition ([CAD010](../010_transactions/index.md)), not by peer policy.
- **Message-level denial of service** — bounded message sizes, bounded missing-data requests, bounded transactions per Block, and juice metering on all execution. Malformed data from untrusted peers MUST fail closed; parsing and merge paths must never throw into the peer loop.
- **Upgrade-boundary behaviour** — a peer that cannot apply a scheduled network upgrade withdraws deterministically rather than diverging; the trigger is consensus-visible and unforgeable, so withdrawal is not selectively targetable. Full analysis in [CAD050](../050_network_upgrade/index.md).

### Known open items

Stated plainly, as accepted or tracked positions rather than hidden caveats:

- **Fork recovery is currently disabled**: peers filter Orders inconsistent with their own consensus rather than reorganising. Enabling recovery is tracked upstream.
- **Proposal-switching patience is a fixed 100 ms**; randomisation to reduce synchronised flapping has been noted as a possible refinement.
- **Peer records can be created for any 32-byte key**, including keys the creator does not own. The key holder cannot be impersonated — Block signatures still require the private key — but the record itself can be squatted. Accepted for now.
- **Eviction refunds are effectively unpriced** (the juice limit extends per delegated-stake refund so eviction always completes). Accepted: refunds only move value to its owners.

## Protocol parameters

Current values of the consensus parameters referenced above (release constants of the peer implementation):

| Parameter | Value |
|-----------|-------|
| Consensus levels | 4 |
| Proposal / consensus threshold | 2/3 of effective stake |
| Stake decay delay / half-time | 3 minutes / 5 minutes |
| Stake decay floor | 0.1% |
| Minimum effective stake for Block production | 1000 Convex Coins |
| Block backdate bound (validity) | 15 minutes |
| Block forward horizon (confirmation policy) | 30 seconds |
| Proposal-switching patience | 100 ms |

## Testing principles

Consensus changes carry fork risk and are held to a higher standard. Implementations SHOULD maintain:

- **Determinism tests** — identical inputs produce bit-identical States across construction paths and replay against golden state hashes; any behaviour change that moves a replay hash must be version-gated per [CAD050](../050_network_upgrade/index.md).
- **Injected-clock policy tests** — timestamp scenarios (deferral, boundary crossing, skewed peers) run deterministically against an injectable clock, never wall-clock sleeps.
- **Adversarial tests** for every consensus-adjacent operation: authorisation, conservation of total supply, malformed input, and liveness guards.
- **Belief-level convergence tests** exercising merge with multiple peers, differing stakes and orderings.

## Reference implementation notes

In the Convex JVM implementation:

- Belief merge is `convex.core.cpos.BeliefMerge` (level updates in `updateLevel`, the stage (i) clamp after `updateConsensus`, stage (ii) demotion in `filterBlocks`/`demoteFutureBlocks`); constants live in `CPoSConstants` (`CONSENSUS_LEVELS`, `CONSENSUS_THRESHOLD`, `MAX_BLOCK_BACKDATE`, `MAX_BLOCK_FORWARD`, `PEER_DECAY_*`, `MINIMUM_EFFECTIVE_STAKE`, `KEEP_PROPOSAL_TIME`, `ENABLE_FORK_RECOVERY`).
- Deterministic checks are `State.checkBlock`/`applyBlock`; effective stake is `State.computeStakes` with `Economics.stakeDecay`; execution against the finalised prefix is `Peer.updateState`.
- Test suites: `BeliefMergeTest`, `BeliefVotingTest`, `SnapshotStateTest` (golden-hash replay), `StakingTest`, plus the adversarial coverage in `CoreTest`.
- The implementation-level design narrative, decision log and issue links live in `convex-core/docs/CONSENSUS.md` in the [Convex repository](https://github.com/Convex-Dev/convex) (forward-dating: convex#595; fork recovery: convex#492).

## See also

- [White Paper](/docs/overview/convex-whitepaper) — full derivation of belief merge and convergence
- [CAD015: Peer Communications](../015_peercomms/index.md) — Belief exchange at the messaging layer
- [CAD016: Peer Staking](../016_peerstake/index.md) — stake, delegation and rewards
- [CAD050: Network Upgrades](../050_network_upgrade/index.md) — the upgrade activation that consensus time gates
