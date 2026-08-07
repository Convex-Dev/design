# CAD050: Network Upgrades

## Overview

The Convex network must be able to evolve: CVM semantics, core functions, juice costs, encoding rules and on-chain libraries all need room to improve after launch. A naive approach — simply changing the peer software — forks the network: peers running different code compute different states and diverge from consensus.

This CAD specifies the network upgrade mechanism: how protocol changes are scheduled on-chain, activated deterministically in consensus, and versioned, and how peers that cannot follow an upgrade behave. It covers protocol upgrades to a *running* network without changing the network's identity.

This is distinct from [CAD018](../018_scheduler/index.md), which covers user-scheduled transactions on the CVM: an upgrade is a consensus-level transition, not an account transaction.

## Terminology

**Protocol version** is an on-chain value counted from `0` at genesis: version N means exactly N upgrades have been applied. The upgrade producing version N is identified by that number — upgrades are not named. Protocol versions are independent of **software release versions**: a peer release *supports* protocol versions up to some maximum, and several releases may support the same protocol version. Operator-facing messages say "protocol version" explicitly.

## Design principles

### Genesis is immutable

Every Convex network is identified by the hash of its genesis state. Upgrades operate on the evolving state *after* genesis — never on genesis itself. If a change would require altering genesis, the correct route is a new network, not an upgrade. Replaying history from genesis MUST reproduce the current state, including the effect of every upgrade that has fired.

### An upgrade is a consensus transition event

Like a regular transaction, an upgrade has a deterministic effect given the pre-state, is recorded in the chain, and is observable to anyone replaying history. Unlike a regular transaction, it is not submitted by an account, is not bound by juice, access control or signature checks at application time (governance is verified when the upgrade is *scheduled*), and may mutate any part of the state — including protected core libraries and global constants.

### Timestamp-gated activation

Each upgrade carries an **activation timestamp** in consensus time. The first block whose timestamp reaches the activation fires the upgrade as its first step, before anything else in that block. Timestamps are used rather than block heights because consensus already advances a shared monotonic clock, operators coordinate naturally on wall-clock dates, and block cadence varies while timestamps are shared consensus data — so every peer evaluates the same "has activation passed?" decision on the same data and reaches the same answer at the same point.

### One atomic transition: migration plus version increment

An upgrade is a single atomic state transition with two effects:

- **Migration** — a pure function from pre-state to post-state. It may do anything: replace core library code, adjust protocol constants, repair state, convert data formats. It may also be trivial, for a pure semantics change keyed off the version.
- **Version increment** — the protocol version increases by **exactly one**. Never optional, never more.

The protocol version is therefore a count of applied upgrades, and several upgrades whose activations have all passed apply sequentially within one block, each incrementing the version.

### The schedule is consensus state

Which upgrades are pending, and when they activate, MUST be recorded in consensus state — not distributed out-of-band. This is a soundness requirement: a peer can only withdraw for an upgrade it knows about. With the schedule on-chain, "apply, withdraw, or continue" is a deterministic function of state for every peer, including peers whose software lacks the migration itself.

### The mechanism lives in native peer code

Migrations, validation and version accounting are static, reviewed code shipped in peer releases — not CVM-resident actor code, which would itself be upgradeable code capable of harbouring exactly the class of bugs the mechanism exists to fix. The CVM surface is limited to the scheduling functions below.

## Specification

### On-chain format

The upgrade state consists of two values in the global state:

| Value | Type | Meaning |
|-------|------|---------|
| `protocol` | Integer | The protocol version: a **watermark** counting applied upgrades |
| `upgrades` | Vector of timestamps | The **upgrade vector**: entry `k` is the consensus timestamp at which the upgrade producing version `k+1` fires (or fired) |

The watermark divides the vector: entries below the version are **applied**, entries from the version onward are **pending**. The following invariants MUST hold in every committed state:

1. `0 ≤ version ≤ count(upgrades)`.
2. Activations are non-decreasing along the vector. Equal timestamps are permitted — those upgrades fire in the same block, in order.
3. Every pending activation is strictly greater than the state timestamp.
4. Absent values read as version `0` and an empty vector — which is how states created before the mechanism existed present themselves.

Because migrations bind to versions by position, the pending region is managed strictly at the tail: scheduling appends, unscheduling removes the last entry. The applied prefix is immutable forever; applying an upgrade changes nothing in the vector — the watermark simply advances past the entry. An upgrade's entire on-chain footprint is a single timestamp: the human-readable description of what each version does belongs in release notes, keyed by version number.

### Scheduling

Upgrades are scheduled through two core functions:

```clojure
(schedule-upgrade activation)   ;; append: schedules the next version; returns the version it will produce
(unschedule-upgrade v)          ;; remove the pending entry for version v, which must be the last
```

Requirements:

- **Governance gating.** The functions MUST be callable only by governance accounts — the genesis system accounts with addresses below the core library account. Calls from any other address MUST fail. Richer policies (multi-signature, on-chain voting) are composed by setting a policy actor as the *controller* of a governance account; the upgrade mechanism itself neither knows nor cares.
- **Validation.** The activation MUST be strictly in the future and not less than the last entry in the vector; unscheduling MUST remove only the tail pending entry. These checks preserve the format invariants.
- **Decoupled from migration availability.** Validation MUST be a pure function of state, and MUST NOT consult the local software's migration list — otherwise transaction validity would depend on which release executes it, and peers on different releases would fork. A peer processes the scheduling of a version it cannot apply like any other transaction, operates normally while the entry is pending, and stops exactly at the activation.

A useful defence-in-depth property follows: scheduling can only *time* migrations that already exist in reviewed, released peer software. Compromise of a governance key alone cannot inject code into the network — it can only activate, or mis-time, something the release process shipped.

### Migrations

Each peer release carries an ordered, append-only list of migrations; position is identity — the migration at position `k` produces version `k+1`. Requirements:

- A migration MUST be a pure function of the pre-state: no clock, no randomness, no external input. A migration violating this forks the network.
- The list is append-only **forever**: replay from genesis requires every historical migration, so old migrations remain in every future release. This is an accepted, permanent maintenance cost.
- A release supports protocol versions up to the length of its list; a due version beyond that is a *missing migration* (see failure modes).

### Activation

Upgrade application MUST be the **first** step in preparing a block — ahead of the block-number update, time update, scheduled transactions and ordinary transactions — so the entire block executes under the new rules. The algorithm:

1. Read the version and upgrade vector (absent values: nothing pending, no-op).
2. While the entry at the watermark has activation ≤ the block timestamp: apply the migration for that version (missing migration → withdraw, below), then advance the watermark by one.
3. Continue block preparation with the migrated state.

Since activations are non-decreasing, the entry at the watermark is the entire selection logic, and the watermark never revisits an entry. When nothing is due, the step is a single comparison.

### Strategies for protocol changes

Where a change lives determines how it is made, in order of preference:

1. **State-resident code** (core library functions compiled into state at genesis): fixed by pure migration — replace the binding with the corrected, recompiled definition. No version branch is needed anywhere, and replay is automatic because historical states carry historical code. Note that compiled code may statically link core definitions: replacing a binding fixes future compilations, and whether the migration also sweeps existing account environments is a per-upgrade decision.
2. **Native semantics** (opcode behaviour, juice costs, cast rules): changed by version-keyed dispatch in the transition function, activated by a trivial migration whose version increment flips the branch. Branches are permanent — replay needs every historical semantics — and SHOULD be kept at narrow, well-defined seams (juice lookup, opcode dispatch) rather than scattered through the runtime. Whether a change needs a gate at all is decided by replay evidence: if applying it unconditionally changes the replayed state hash, recorded history exercised the old semantics and the gate is mandatory.
3. **Encoding changes**: decoders are read outside any state context, so they cannot branch on the version. Decoders MUST remain permissive toward all historical forms permanently; the version gates what the CVM *writes and canonicalises*, and a migration rewrites existing cells where the new form is required.

Introducing a *new decodable executable value* (a new core definition code) is a special case: releases that do not know the code decode the same bytes as an opaque value with identical re-encoding, so state hashes agree until the value is executed — a divergence window between releases before the version gate activates. New core definition codes MUST therefore ship together with version-gated materialisation, so that a not-yet-active definition behaves identically to an unknown value on every release.

### Failure modes and withdrawal

Every failure of upgrade application resolves to one safe behaviour: **the peer produces no state at the boundary and withdraws from consensus**. A failure MUST NOT become an invalid-block result: invalid-block outcomes are consensus history, and a later corrected release would recompute them differently on replay, splitting replay from the live network. By withdrawing, nothing is committed at the boundary, and the corrected release defines the single outcome for rejoining peers and replay alike.

Three failure classes, distinguished for diagnostics only — the boundary behaviour is identical:

- **Missing migration** (deterministic, release too old): the peer knows from the on-chain schedule that an activation has arrived which its release cannot apply. It withdraws, reports "update required", and rejoins automatically once running a release with the migration. It MUST NOT guess or skip.
- **Failing migration** (deterministic bug): fails identically on every peer of that release; the network stalls at the boundary until a corrected release ships. Deliberate: a stall is recoverable, divergence is not.
- **Environmental failure** (peer-local, e.g. incomplete local store): only the affected peer withdraws; recovery may be resync-and-retry with no release change. This class MUST remain retryable — treating it as a permanent freeze would let a transient (or induced) local fault become a permanent outage.

**Withdrawal is a full consensus freeze.** A peer votes on block *ordering* independently of applying *state*; a peer that stopped only state application while continuing to merge and publish orderings would keep voting to finalise blocks it cannot validate. Withdrawal therefore MUST stop both state application and belief propagation: the peer ceases to apply blocks, merge beliefs, propose blocks and publish its ordering, freezing at the last pre-boundary state. A withdrawn peer SHOULD stay alive to serve queries against its frozen state and report its condition to the operator.

### Early detection and stake withdrawal

The schedule is on-chain and the supported maximum is a release constant, so the moment a scheduled version beyond the release's support lands in state, the peer already knows it will withdraw at the activation. It SHOULD warn its operator immediately — "protocol version N scheduled at time T; this release supports M; update before T" — rather than waiting for the boundary.

A withdrawn peer's stake still counts toward the totals against which consensus thresholds are computed, so a large withdrawn-but-staked cohort could prevent the remaining updated peers from reaching supermajority. To avoid this, a peer that detects it will withdraw SHOULD reduce its own peer stake beforehand, on a best-efforts basis:

- **Before the boundary, at a randomised instant** in a window before the activation — before, because after the boundary the peer is frozen and can no longer transact; randomised, so a cohort does not unstake at a single instant and jolt the consensus weighting.
- **Never as the last viable peer.** Unstaking MUST NOT remove the last effective peer from the network: if the last peer cannot upgrade, the network is already non-viable, and shedding its stake makes nothing better.
- **Best-efforts.** A failed withdrawal attempt is harmless — the peer freezes at the boundary regardless. Re-staking after rejoining is a separate operator action.

Peers SHOULD additionally advertise the highest protocol version they support in their status information, so operators and governance can see what fraction of stake is ready for a scheduled version and defer an activation if readiness is low. This attestation is advisory; the binding signal is the on-chain schedule.

### Security considerations

- **Withdrawal is not selectively targetable.** Deterministic failures fire identically on every peer of a release, triggered by a finalised, consensus-driven event — an attacker cannot craft input that makes one honest peer withdraw while others continue.
- **The schedule cannot be forged.** Withdrawal requires a scheduled upgrade, and scheduling requires a governance-signed transaction.
- **Environmental failures stay retryable** — a security requirement, not ergonomics, per the amplification argument above.
- **Consensus clock manipulation**: block timestamps are proposer-set, so a staked peer proposing a far-future-dated block that reached finality could jump the consensus clock past an activation before peers have updated, forcing mass withdrawal. This is a pre-existing clock-manipulation weakness that upgrades amplify; hardening (bounding acceptance of forward-dated blocks) is specified with the consensus algorithm. Until it lands, governance SHOULD confirm attestation readiness and allow generous lead time before activations. Best-efforts unstaking is tied to the early signal rather than the boundary precisely so that a clock jump does not also trigger mass auto-unstaking.

### Determinism, replay and sync

An upgrade's effect MUST be bit-identical on every peer that applies it: the migration is pure, shipped as reviewed release code, selected by the on-chain version number, and applied at a consensus-determined point. Replay from genesis requires every historical migration and MUST fail loudly on reaching an activation whose migration is absent — never silently produce wrong state. A peer syncing from a trusted snapshot needs only the pending schedule (already in the snapshot) and a release carrying migrations for any activation it will cross; no distribution channel beyond the chain and the release process exists or is needed.

### Rollback

Upgrades are one-way. A broken upgrade is corrected by a subsequent upgrade with a later activation — reverting state across peers that have advanced is a fork, not a rollback. An upgrade authored to undo a prior upgrade is permitted and is an ordinary upgrade. A pending upgrade that has not yet fired can simply be unscheduled.

### Bootstrap

The mechanism itself is adopted fully on-chain, uniformly for every network, without touching genesis:

1. A governance transaction schedules the first upgrade by embedding the scheduling function directly in compiled code (no core binding exists yet; none is needed — validation is state-only). This transaction creates the protocol values in globals.
2. At activation, the first migration installs the `schedule-upgrade` / `unschedule-upgrade` core bindings, and the watermark advances to version 1.

Replay reproduces both steps from the recorded transaction and upgrade. The operational precondition is that effectively all stake runs a release carrying the mechanism before the bootstrap is scheduled: earlier releases can follow neither the scheduling transaction nor the boundary.

Fresh networks have no history to preserve and SHOULD start at the latest protocol version their software supports, applying all migrations at genesis creation (this determines the new network's initial state and does not involve the scheduling mechanism). A lower initial version MAY be pinned explicitly, e.g. to mirror a network that has not yet upgraded.

### Governance

Upgrade authority is control of the genesis governance accounts, enforced natively by the scheduling functions. Governance *policy* — how those accounts' keys and controllers are managed — is a per-network decision layered on top: foundation-held keys with multi-signature approval, a vote contract as a governance account's controller, or staked-peer signalling feeding either. This CAD specifies the mechanism only.

## Reference implementation notes

In the Convex JVM implementation (tracking issue [convex#413](https://github.com/Convex-Dev/convex/issues/413)):

- The protocol globals are `GLOBAL_PROTOCOL` (index 6) and the upgrade vector (index 7) in `State`, with accessors `State.getProtocolVersion()` etc.; activation is `State.applyUpgrades`, the first step of `State.prepareBlock`.
- Migrations are the positional list in `cvm/Migrations.java`; scheduling natives live in `lang/Core.java`; failures propagate as a dedicated `UpgradeError` (never an invalid-block result) carrying version and cause, with freeze/retry selection and best-efforts stake withdrawal ([convex#597](https://github.com/Convex-Dev/convex/issues/597), gated on `:auto-manage`) in the peer server.
- Forward-timestamp hardening is tracked in [convex#595](https://github.com/Convex-Dev/convex/issues/595); upgrade rehearsal tooling (`RehearseNetworkUpgrade`, `VerifyNetworkUpgrade`) provides deterministic multi-peer activation drills and read-only live verification.
- The full design rationale, decision log and testing strategy live in `convex-core/docs/UPGRADE.md` in the [Convex repository](https://github.com/Convex-Dev/convex).

## See also

- [CAD001: Architecture](../001_arch/index.md) — the state model upgrades operate on
- [CAD017: Peer Operations](../017_peerops/index.md) — operator responsibilities around upgrades
- [CAD018: Scheduler](../018_scheduler/index.md) — user-level scheduled transactions (a different mechanism)
- [CAD016: Peer Staking](../016_peerstake/index.md) — the stake that withdrawal sheds
