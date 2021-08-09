# Performance - How we do it

Convex offers unparalleled performance for denentralised applications. We care primarily about two different measurements of performance:

- **Latency** (how quickly results can be achieved - important for interactive applications
- **Throughput** (how many requests per second can we handle) - important for achieving internet scale

Convex performance is based around a key idea: We implement consensus as a **CRDT** (conflict-free replicated data type) where the Peers achieve consensus by simply sharing a Belief data structure which is repeatedly merged with other Beliefs to form consensus. CRDTs are guaranteed to eventually converge to a consistent value under reasonable assumptions, which gives the properties of safety and liveness to the network. Peers therefore have a simple task: merge and propagate new beliefs to the newtork as quickly as possible.


## Latency

Latency can be seen as a total time to achieve some specified result. From the perspective of a Client, this would typically be the sum of the following six stages:

1. Digitally signing a transaction (1ms)
2. Sending the signed transaction to a Peer (50ms)
3. Having the transaction included in a Block (5ms)
4. Confirming the Block in consensus (200ms)
5. Computing the result of the transaction / CVM state updates (10ms)
6. Returning the result to the Client (50ms)

Below we describe a number of key techniques we use to keep the latency as small as possible.

### Minimising Hops

The total round trip transaction time is driven mainly by network lag (stages 2,4,6). In a decentralised network this is inevitable - we cannot avoid the network latency between the Peer and the Client, and the need for a few rounds of communication between peers to confirm consensus (the minimum is 3, as can be proven in various consensus algorithms in the relevant literature e.g. PBFT).

The CPoS consensus algotithm, fortunately, is able to achieve the theoretical minimum number of hops to confirm consensus under good conditions. Given a well connected network, with the majority of highly staked Peers directly connected to each other, only three hops between Peers are required:
1. Peer broadcasts Belief containing new block to other Peers
2. Peers (2/3+) broadcast Belief with new block in next position in consensus
3. Peers broadcast Belief confirming consensus based on observing same proposal from 2/3 of other peers

More hops may be required in the case that the network is less well connected. Typically however this only adds a small constant number of extra hops, since Belief propagation spreads exponentially across the network (and hence will cover the whole network in log(n) hops)

### Belief merge performance

After network latency, the largest source of delay is the performance of the Belief merge function. This is central to the CPoS algorithm functioning as a CRDT and is typically performed many times as a transaction is propagated between Peers. This represents a delay before the merged Belief can be re-broadcast to the network, so we make this fast with the following measures:
- The Belief merge can merge multiple received Beliefs from different Peers at once (more efficient than performing repeatedly for each Belief received)
- The Belief merge handles multiple Blocks simultaneously (Which may come from different Peers)
- Overall algorithmm performance is roughly `O(n+m)` where `n` is the number of ative Peers, and `m` is the number of additional Blocks being handled in the merge
- We use a very efficient algorithm for comparing Orderings of Blocks from different Peers so that consistency can be confirmed (or conflicts detected). This is effectively `O(1)` even on long Orderings (we say effectively, because it is technically `O(log n)` but the high branching factor and practical bounds on ordering length growth make this behave like `O(1)` in practice). 



### Zero Block delay

A potential major source of latency would be a block delay, i.e. the need to wait between receiving a transaction and producing a Block containing the transaction (within stage 3). Traditional blockchains almost all have at least some delay here, either needing to wait for an allocated time at which a block can be produced as the "leader" of the network, or solving a PoW problem to earn the right to produce a block)

Convex solves this problem by implementing a zero block delay strategy:
1. A Peer produces a Block immediately whenever it has at least one transaction
2. Blocks can be submitted immediately at any time by adding the Block to the current Peer Belief and broadcasting it

This approach means that it is possible, and even likely, that multiple Peers to submit Blocks for consensus simultaneously. Fortunately, this is not a problem for the CPoS algorithm since sucessive Belief merges will efficiently resolve any conflicts and sort the Blocks into a stable consistent ordering. Hence we can allow a zero block delay strategy without compromising the overall conesnsus approach.

Although the overhead of producing aBlock is comparatively small, it is still more efficient to wait for a few transactions before producing a single larger Block. Hence this behaviour is configurable by Peer operators who can then offer clients a trade-off between cost and latency.

### CVM Execution Time

Once a Block is confirmed in consensus, Peers are required to compute CVM state updates. This adds a small amount of latency (in stage 5). The good news is that the efficiency of the CVM means that this only takes a couple of milliseconds on average. The `BigBlockBenchmark` confirms that Convex can sequentially process over 400 Blocks of 1000 transactions per second on a single thread:

```
Result "convex.benchmarks.BigBlockBenchmark.benchmark":
  468.024 ±(99.9%) 42.190 ops/s [Average]
```

Block processing is very quick because:
- Raw CVM execution speed for transactions is very high (approx ~1 million transactions per second_
- Expensive operations (merkle tree hashing, writing to storage) are performed lazily, typically only done once per Block
- Blocks only have a small amount of additional processing required (timestamp updates, distribution of transaction fees etc.)



## Throughput

### CVM performance

The CVM is a highly optimised execution engine. Some notable points:

- Data structures and algorithms are all implement in efficient, low level JVM code (often with bitwise operations!)
- CVM code is compiled down to efficient "Ops", where a typical transaction might require 10-50 Ops to be executed. This is effectively the "machine code" of the JVM, and corresponds to operations typical in an implementation of the Lambda Calculus - becuase of the power af the lambda calculus, we usually require less Ops than the equivalent for a stack based machine
- We can rely on the JVM JIT to further compile key code paths down to efficient native code

The `OpBenckmark` is a microbenchmark of several different groups of Ops, and demonstrates that up to hundreds of millions of Ops can be executed per second on a single thread:

```
Benchmark                          Mode  Cnt          Score           Error  Units
OpBenchmark.constant              thrpt    5  522926192.803 ± 200159991.331  ops/s     (a single Contsant op)
OpBenchmark.emptyLoop             thrpt    5       2180.943 ±       118.609  ops/s     (a loop executing 1000 times)
OpBenchmark.simpleSum             thrpt    5    8336440.019 ±    444054.388  ops/s     (a sum involving dynamic lookup, 4 Ops)
OpBenchmark.simpleSumPrecompiled  thrpt    5   21846062.388 ±   1823368.198  ops/s     (a sum with constants, 4 Ops)
```

### Storage engine

Database stoarge is often a significant bottleneck in computational systems that require durable storage and reliability. Because of this, we have implemented `Etch`, a highly performant database specifically designed to meet the storage needs of Convex:

- Content addressible storage (keyed by Hash of value encodings, i.e. Storage resembles an immutable Merkle DAG)
- Embedded small objects mean that many values can typically be read or written in a single storage call
- High performance, memory mapped file access





### Query offload

We further enhance capacity by offloading queries (i.e. read-only requests that do not affect CVM state) to a separate process. 

### Crypto

Convex uses high performance, well-tested libraries for crypto algorithms, most notably LibSodium for Ed25519. With multiple cores focused primarily on signature verification, Peers can realistically validate 100,000+ transactions per second. 

This is actually the largest proportion of the computation work done by peers under load. We are exploring strategies to relieve this bottleneck and push performance even further, in particular:
- We have an experimental design to allow small, low staked peers to randomly skip some percentage of signature verifications (which can be proved safe for practical purposes because all signatures will still be checked by a good peer with probablity arbitrarily close to 1).
- Hardware based approached to signature verification may be feasible

