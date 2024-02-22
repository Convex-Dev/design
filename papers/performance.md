# Performance - Goals and how we do it

Convex offers outstanding performance for decentralised applications. Our objective is to offer the best combination of decentralised security and interactive performance for applications in categories such as DeFi, gaming and the metaverse with large numbers of concurrent users.

We care primarily about two different measurements of performance:

- **Latency** (how quickly results can be achieved) - important for interactive applications
- **Throughput** (how many requests per second can we handle) - important for achieving internet scale

Convex performance is based around a key idea: We implement consensus using a **CRDT** (conflict-free replicated data type) where the Peers achieve consensus by simply sharing a Belief data structure which is repeatedly merged with other Beliefs to form consensus. CRDTs are guaranteed to eventually converge to a consistent value under reasonable assumptions, which gives the desired properties of safety and liveness to the network. Peers, therefore, have a simple primary task: merge and propagate new beliefs to the network as quickly as possible.


## Latency

Latency can be seen as the total time to achieve some specified result. From the perspective of a Client, this would typically be the sum of the following six sequential stages (with approximate contributions to latency given as examples):

1. Digitally signing a transaction (1ms)
2. Sending the signed transaction to a Peer (50ms)
3. Having the transaction included in a Block (5ms)
4. Confirming the Block in consensus (200ms)
5. Computing the result of the transaction / CVM state updates (10ms)
6. Returning the result to the Client (50ms)

In some cases, a client may not need to wait for all six stages, for example, a client that trusts the reliability and correctness of the Peer they connect to may be happy to assume that their transaction will be successfully processed after Stage 2.

Below we describe several key techniques we use to keep the overall latency as small as possible. 

### Minimising Hops

The total round trip transaction time is driven mainly by network lag (stages 2,4,6). In a decentralised network, this is inevitable - we cannot avoid the network latency between the Peer and the Client, and the need for a few rounds of communication between peers to confirm consensus (the theoretical minimum number of rounds for systems of this type is generally three, as can be proven in various consensus algorithms in the relevant literature e.g. PBFT).

The CPoS consensus algorithm, fortunately, can achieve the theoretical minimum number of hops to confirm consensus under good conditions. Given a well-connected network, with the majority of highly staked Peers directly connected to each other, only three hops between Peers are required:
1. Peer broadcasts Belief containing new block to other Peers
2. Peers (representing at least 2/3 of total stake) broadcast Belief with a new block in the next position in consensus
3. Peers broadcast Belief confirming consensus based on observing the same proposal from 2/3 of other peers

More hops may be required in the case that the network is less well connected. However, this typically only adds a small constant number of extra hops, since Belief propagation spreads exponentially across the network (and hence will cover the whole network in `log(n)` hops)

### Belief merge performance

After network latency, the largest source of delay is the performance of the Belief merge function. This is central to the CPoS algorithm functioning as a CRDT and is typically performed many times as a transaction is propagated between Peers. This represents a delay before the merged Belief can be re-broadcast to the network, so we make this fast with the following measures:
- The Belief merge can merge multiple received Beliefs from different Peers at once (more efficient than performing repeatedly for each Belief received)
- The Belief merge handles multiple Blocks simultaneously (Which may come from different Peers)
- Overall algorithm performance roughly is `O(n+m)` where `n` is the number of active Peers, and `m` is the number of additional Blocks being handled in the merge
- We use a very efficient algorithm for comparing Orderings of Blocks from different Peers so that consistency can be confirmed (or conflicts detected). This effectively is `O(1)` even on long Orderings (we say "effectively" because it is technically `O(log n)` but the high branching factor and practical bounds on ordering length growth make this behave like `O(1)` in practice). 

### Zero Belief propagation delay

Because CPoS operates as a CRDT, Peers can immediately propagate a Belief as soon as they have performed a Belief merge. Propagating a new Belief as soon as one has been updated is the default behaviour for Peers, and is optimized for low latency performance. Because belief merges are idempotent, there is no harm in broadcasting a Belief multiple times.

### Delta Transmission

Beliefs are large data structures, and it would be a significant performance cost if the entire Belief needed to be transmitted every time one was propagated - adding significant latency delays in Stage 4. Fortunately, we can send only the Deltas (changes) to a Belief in most circumstances. This is possible because:
- Beliefs are structured as Merkle DAGs, allowing the integrity of the whole structure to be validated
- We track which parts of a Belief have already been broadcast, and normally omit to send these again
- Receivers of Beliefs can verify the Belief by examining the cryptographic hashes from the root of the Merkle DAG, and in most cases confirm that they already hold the rest of the data structure required. If not, they can always recover by explicitly requesting a missing piece of data (which again, they can identify using the cryptographic hash)

In many ways, Belief propagation can be seen as analogous to the efficient storage and merging of source code trees utilised in the Git version control system. 

### Zero Block delay

A potential major source of latency from the perspective of a Client would be a block delay, i.e. the need to wait between receiving a transaction and producing a Block containing the transaction (within stage 3). Traditional blockchains almost all have at least some delays here, either needing to wait for an allocated time at which a block can be produced as the "leader" of the network, or solving a PoW problem to earn the right to produce a block.

Convex solves this problem by implementing a zero-block delay strategy:
1. A Peer produces a Block immediately whenever it has at least one transaction
2. Blocks can be submitted immediately at any time by adding the Block to the current Peer Belief and broadcasting it

This approach means that it is possible, and even likely, that multiple Peers will submit Blocks for consensus simultaneously. Fortunately, this is not a problem for the CPoS algorithm since successive Belief merges will efficiently resolve any conflicts and sort the Blocks into a stable consistent ordering. Hence, we can allow a zero-block delay strategy without compromising the overall consensus approach.

Although the overhead of producing a Block is comparatively small, it is still more efficient to wait for a few transactions before producing a single larger Block. Hence this behaviour is configurable by Peer operators who can then offer clients a trade-off between cost and latency.

### CVM Execution Time

Once a Block is confirmed in consensus, Peers are required to compute CVM state updates. This adds a small amount of latency (in stage 5). The good news is that the efficiency of the CVM means that this only takes a couple of milliseconds on average. The `BigBlockBenchmark` confirms that Convex can sequentially process over 400 Blocks of 1000 transactions per second on a single thread:

```
Result "convex.benchmarks.BigBlockBenchmark.benchmark":
  468.024 ±(99.9%) 42.190 ops/s [Average]
```

Block processing, in general, is very quick because:
- Raw CVM execution speed for transactions is very high (up to 1 million transactions per second)
- Expensive operations (Merkle tree hashing, writing to storage) are performed lazily, typically only done once per Block
- Blocks only have a small amount of additional processing required (timestamp updates, distribution of transaction fees etc.)



## Throughput

Convex targets a peak transaction throughput of 100,000+ transactions per second. This is many orders of magnitude faster than traditional blockchains, and even faster than centralised payment systems such as VISA (which might typically handle in the range of 1700 TPS). The key to achieving this performance is the successive elimination of bottlenecks to performance, and choosing an architecture that makes it possible to efficiently utilise Peer resources.

### Staged Event-Driven Architecture

We employ a staged event-driven architecture (SEDA) within Peers to optimise throughput and ensure that expensive work is performed concurrently on different threads. Hence overall throughput is maximised by maximising the throughput at each stage.

Stages are connected with efficient in-memory queues which can easily transfer millions of events per second. This queue-based approach helps up to manage complexity by clearly decoupling the different stages and also allows for backpressure to be used to manage periods of high loads (an essential technique for high volume distributed systems).

The most important stages are:
1. Network ingestion, where a NIO Server reads messages from the network at maximum speed and puts these messages on an in-memory queue
2. Message handling, where messages are decoded and either handled directly or placed on an appropriate queue
3. Peer update, where relevant messages (Beliefs, Transactions) are processed for the Peer's Belief update. All critical CPoS computation is performed here
4. Transaction signature verification
5. CVM execution, where the results of transactions are computed and CVM state updated
6. Outbound messaging, where responses are returned to other Peers / clients

Convex is agnostic to the underlying hardware architecture used, however, this configuration of stages would be well suited for efficient execution on commodity PC hardware with 8-16 cores.

### CVM performance

The CVM is a highly optimised execution engine. Some notable points:

- Data structures and algorithms are all implemented in highly efficient, low-level JVM code (often with bitwise operations!)
- CVM code is compiled down to efficient "Ops", where a typical transaction might require 10-50 Ops to be executed. This is effectively the "machine code" of the JVM, and corresponds to operations typical in an implementation of the Lambda Calculus - because of the power of the lambda calculus, we usually require fewer Ops than the equivalent for a stack-based machine
- We can rely on the JVM JIT to further compile key code paths down to efficient native code

The `OpBenckmark` is a microbenchmark of several different groups of Ops, and demonstrates that up to hundreds of millions of Ops can be executed per second on a single thread:

```
Benchmark                          Mode  Cnt          Score           Error  Units
OpBenchmark.constant              thrpt    5  522926192.803 ± 200159991.331  ops/s     (a single Contsant op)
OpBenchmark.emptyLoop             thrpt    5       2180.943 ±       118.609  ops/s     (a loop executing 1000 times)
OpBenchmark.simpleSum             thrpt    5    8336440.019 ±    444054.388  ops/s     (a sum involving dynamic lookup, 4 Ops)
OpBenchmark.simpleSumPrecompiled  thrpt    5   21846062.388 ±   1823368.198  ops/s     (a sum with constants, 4 Ops)
```

The `CVMBenchmark` measures the time of applying entire transactions to the CVM state (comprising the atomic application of multiple Ops plus some transaction accounting), and suggests that over a million TPS may be feasible on the CVM.

```
Benchmark                               Mode  Cnt        Score       Error  Units
CVMBenchmark.contractCall              thrpt    5   573728.219 ± 45555.012  ops/s
CVMBenchmark.defInEnvironment          thrpt    5   808384.086 ± 64336.668  ops/s
CVMBenchmark.simpleCalculationDynamic  thrpt    5  1169199.192 ± 15417.298  ops/s
CVMBenchmark.simpleCalculationStatic   thrpt    5  1293331.725 ± 36267.904  ops/s
CVMBenchmark.smallTransfer             thrpt    5   845463.961 ± 16815.637  ops/s
```

### Query offload

We further enhance capacity by offloading queries (i.e. read-only requests that do not affect CVM state) to a separate thread. Because the CVM State is an immutable data structure, it can be copied as a snapshot in `O(1)` time and queries can be processed by separate threads, removing the need for queries to bottleneck the main CVM execution or Belief merge processes.

Furthermore, it would be possible to replicate the CVM state to multiple servers and offer effectively unlimited scalability for query capacity. In practice we do not believe this to be necessary: a single CVM worker thread might be able to handle a million queries per second which are already enough for internet-scale transaction volumes, (for example Google might need to handle in the region of 60,000 search queries per second).

### Storage engine

Database storage is often a significant bottleneck in computational systems that require durable storage and reliability. Because of this, we have implemented `Etch`, a highly performant database specifically designed to meet the storage needs of Convex:

- Content addressable storage (keyed by Hash of value encodings, i.e. Storage resembles an immutable Merkle DAG)
- Embedded encodings of small values mean that many values can typically be read or written in a single storage call
- High performance, memory-mapped file access

Our `EtchBenchmark` suggests that Etch can handle approximately 5 million reads per second, and 800,000 writes per second on a regular laptop. This compares highly favourably with alternative database engines, and means we can comfortably achieve 100,000+ TPS (most transactions are likely to require only a small number of writes, especially given the embedding of small values). Reads can furthermore be executed concurrently on multiple threads, which is particularly helpful for query performance.

### Network bandwidth

The majority of network bandwidth is required for transaction data, which are typically in the range of 100-150 bytes. Allowing for some additional overheads and Belief propagation, 100,000 TPS is likely to require handling sustained streams of data in the region of 16 Mb/s. We must also allow for streams of data of similar size to be maintained for each Peer to which a Peer is connected, say 5-20 different Peers.

Overall, this level of bandwidth is plausible for a 1 Gigabit network connection, although a faster connection would be recommended for heavily staked Peers wishing to handle peak loads or serve the needs of a particularly large number of clients. 10 Gbps would probably be recommended for such Peers.

Fortunately, Peers have significant control over bandwidth consumption: they can limit the number of Peer connections they maintain to reduce bandwidth requirements. They can also temporarily drop out of consensus (by reducing their stake to zero) if necessary. 

### Signature verification

Convex uses high performance, well-tested libraries for crypto algorithms, most notably LibSodium for Ed25519. With multiple cores focused primarily on signature verification, Peers can realistically validate 100,000+ transactions per second. 

This is actually the largest proportion of the computational work done by peers under load. We are exploring strategies to relieve this bottleneck and push performance even further, in particular:
- We have an experimental design to allow small, low staked peers to randomly skip some percentage of signature verifications (which can be proved safe for practical purposes because all signatures will still be checked by a good peer with probability arbitrarily close to 1).
- Hardware-based approached to signature verification may be feasible

## Conclusion and future work

Engineering high-performance systems is a challenge, and we're proud of the great work to get Convex so far as we move towards the main network launcha.

In the future, we expect to continue to improve performance and innovate in this domain. Key ideas include:
- Support for subnets, enabling work to be performed separately from the main CVM Global State. This is a "Later 2" approach that has some drawbacks (mainly, being disconnected from atomic updates to the Global state) but may support some use cases that wish to operate more independently and only occasionally sync up with the Global State using techniques such as state channels.
- Further optimisation of the core Convex code base. We expect to be able to squeeze out a variety of fine-grained optimisations, especially in the core data structures and algorithms.
- Support for dedicated read-only "query" Peers which can serve the needs of read-intensive workloads without burdening the primary set of consensus-maintaining Peers.

