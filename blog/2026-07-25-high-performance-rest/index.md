---
slug: high-performance-rest
title: "A REST API you can point at the internet"
authors: [mikera, claude]
tags: [convex, networking, security, backpressure]
---

Most blockchain RPC endpoints sit behind a gateway, a rate limiter, and a
prayer. The Convex peer's REST API is built to be exposed directly: fast enough
to serve a dApp's reads from the peer itself, and locked down enough that
hostile traffic on the open internet can't disturb consensus.

The interesting part is *where* the engineering effort went. It was not the
query engine.

<!-- truncate -->

## The query engine was never the bottleneck

A read query on Convex — `(balance #11)`, a CNS lookup, a call into an actor's
view function — runs on the CVM against the current consensus state. That state
is an immutable lattice value, so a query never locks anything and never blocks
a writer. It just evaluates and returns.

It evaluates *fast*. On a 32-core machine, one thread sustains about **1.6
million** full query evaluations per second through the exact path the server
uses (`Peer.executeQuery`), and about 2.5 million for the raw CVM eval. Ten
threads reach roughly 10 million and 17.5 million respectively. These are
reproducible with
[`CVMQueryBenchmark`](https://github.com/Convex-Dev/convex/blob/develop/convex-benchmarks/src/main/java/convex/benchmarks/CVMQueryBenchmark.java),
and they line up with the ~1M TPS the
[CVMBenchmark](/docs/overview/performance) has measured for years.

Scaling to ten threads is sub-linear — about 6–7×, not 10× — and that's worth
being honest about: each query builds a short-lived state, so the limit at that
rate is allocation and garbage collection, not lock contention. A contention
problem would have collapsed the number toward 1×. It didn't.

The figure to keep in your head: **a single core evaluates a query in roughly a
microsecond.**

## So what limits a public read?

HTTP does. Drive the full REST path — parse the JSON, evaluate, encode the
result — and a 32-core box serves about **58,000 queries per second** end to
end, with a p99 under 10ms and no errors. That's from
[`QueryBenchmark`](https://github.com/Convex-Dev/convex/blob/develop/convex-restapi/src/test/java/convex/restapi/test/QueryBenchmark.java),
and it is a *floor*: the load generator and the server were sharing the same 32
cores in one JVM, so half the machine was busy being the client. A dedicated
server driven from separate hardware does better.

Even so, look at the gap. The CVM evaluates the query about 27× faster than the
HTTP round trip delivers it. The query is microseconds; the socket, the framing
and the JSON are milliseconds. That reframes the whole design problem. The REST
layer's job is not to make queries fast — they already are. Its job is twofold:
don't add overhead the reads don't need, and **protect the peer from the people
you just invited in.**

## The query lane

Public queries run on their own bounded execution lane, deliberately separate
from the queue a peer uses for its own network queries and lattice data
requests. Public traffic and consensus never compete for the same slots.

The lane has three controls, and the reasoning behind each follows from the
microsecond number above:

- **Concurrency is a small slice of cores** — by default about a tenth of them,
  minimum one. If one core clears ~1.6 million queries a second, you do not need
  many cores to serve an enormous rate, so you reserve the rest for consensus,
  networking and everything else the peer is doing. The lane exists to cap how
  much CPU public reads can take, not to throttle throughput.
- **A per-query Juice ceiling.** Every public query runs under a
  [Juice](/docs/cad/juice) limit, so a single expensive read can't monopolise
  its slot. The same accounting that prices transactions bounds anonymous reads.
- **Wait briefly, then shed.** When every slot is busy, a new query waits up to
  a second for one — and, because slots turn over in microseconds, it almost
  always gets one. Only if the lane stays saturated does the query receive a
  clean `503`. No request is rejected just because two arrived in the same
  instant.

That last point is the difference between a load test that looks broken and one
that doesn't. Rejecting on contention turns a busy server into a flaky one; a
short wait absorbs bursts and sheds only genuine overload.

## Admission control

Around the lane sits a coarser guard: a cap on how many short-lived requests are
in flight at once, 10,000 by default. Past it the peer sheds immediately rather
than let unbounded work pile up. Virtual threads make ten thousand concurrent
requests cheap, so the cap is high enough never to trouble a healthy server and
low enough to stop a flood from exhausting memory. Long-lived streams —
server-sent event subscriptions — keep their own connection limits and are not
counted against it.

All of these — lane concurrency, wait, Juice, the global cap, the request-body
ceiling — are single values in the peer's `rest` configuration. The defaults are
chosen for a public node; an operator who knows their hardware can raise them.

## Safe by default

Speed is only half of "put it on the internet". The other half is that the
things which *aren't* public reads stay off unless you turn them on. On a fresh
peer:

- The faucet, the live query-watch stream, and the generic peer-message
  endpoint are all disabled.
- Process-administration routes — including peer shutdown — are disabled, and
  when enabled they require an authorised operator key *and* HTTPS for any
  access that isn't loopback.
- Reads are open, because reads are meant to be. Public data is public.

None of this is a switch you have to remember to flip before exposing the port.
The secure posture is the one you get by doing nothing.

## Reproduce it

Both benchmarks live in the repository and run in a couple of commands against a
local in-process peer:

```bash
# CVM query throughput and thread scaling
mvn -pl convex-benchmarks -am compile
mvn -pl convex-benchmarks org.codehaus.mojo:exec-maven-plugin:3.1.0:java \
    -Dexec.mainClass=convex.benchmarks.CVMQueryBenchmark -Dthreads=10

# End-to-end HTTP query throughput
mvn -pl convex-restapi -am test-compile
mvn -pl convex-restapi org.codehaus.mojo:exec-maven-plugin:3.1.0:java \
    -Dexec.classpathScope=test -Dexec.mainClass=convex.restapi.test.QueryBenchmark \
    -Dqueries=200000 -Dconcurrency=256
```

Point `QueryBenchmark` at a real deployment with `-Durl=` to measure a server
that isn't sharing its cores with the load generator. If you find the ceiling
before we do, we'd like to hear about it.

This REST server ships with the next Convex peer release; the configuration and
benchmarks above are on `develop` today. The [Peer
Container](/docs/products/convex-peer) is the quickest way to run one.
