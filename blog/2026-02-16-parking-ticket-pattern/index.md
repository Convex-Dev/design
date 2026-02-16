---
slug: parking-ticket-pattern
title: "Using TCP Physics as a Queue: The Parking Ticket Pattern"
authors: [kopcho, mikera]
tags: [convex, networking, backpressure, java, netty]
---

When your internal queue is full, you have two bad options: drop the message
(making it the client's problem) or block the thread (making it your problem).

At [Convex](https://convex.world), we found a third way. We call it the
**Parking Ticket Pattern**.

<!-- truncate -->

## The Problem Everyone Knows

If you run a high-throughput server, you have bounded queues. You *must* have
bounded queues — unbounded queues are just OOM errors waiting to happen.

The standard playbook when a queue fills up:

- **Fail fast**: Return an error, force the client to retry. Simple, but
  creates retry storms that amplify the very congestion you're trying to manage.
- **Block the caller**: Works if you own the thread. Catastrophic if you don't.

In our case, the caller is a Netty I/O thread — the thread responsible for
reading bytes from the network for potentially hundreds of clients. Block that
and you kill I/O for every client on that event loop. Not an option.

So we were doing fail-fast. Client gets a `:LOAD` error, has to retry, wastes
bandwidth resending the exact same message. If many clients hit the full queue at
the same time and all retry together... you can see where this goes.

We needed a way to say "wait" instead of "no."

## The Insight: TCP Already Knows How to Wait

Here's the thing about TCP that most application developers forget: **TCP already
has flow control built in.** If you stop reading from a socket, the kernel receive
buffer fills up, the OS advertises a zero window to the sender, and the sender
physically cannot transmit more data. It's backpressure at the transport layer,
enforced by the operating system, for free.

What if, instead of sending an error when a queue is full, we just... stopped
reading?

The client can't send more data. The message we already received gets to wait
for a slot. And when the queue drains enough, we resume reading and everything
flows again. No error codes. No retry logic. No wasted bandwidth.

The trick is *how* you stop reading without blocking the I/O thread.

## The Parking Ticket

The pattern has four steps:

**1. Try the fast path.** The I/O thread attempts a non-blocking
`queue.offer(message)`. If it succeeds — and under normal load it almost always
does — we're done. The I/O thread moves on to the next message immediately.

**2. Get a ticket.** If the queue is full, the server doesn't return an error.
It returns a *callback function* — a pre-allocated method reference that knows
how to block-wait for a queue slot. This is the parking ticket.

**3. Park the channel.** The I/O handler does two things: it stops reading bytes
from this client's socket, and it hands the message plus the ticket to a virtual
thread. That's it — the I/O thread is free in nanoseconds.

**4. Wait and resume.** The virtual thread calls the ticket, which blocks until
a queue slot opens. The moment it succeeds, it signals the channel to resume
reading. Any bytes that accumulated in the kernel buffer during the pause are
flushed through immediately. If the wait times out, *then* we return an error —
but only as a last resort after the client has already been waiting.

```
I/O thread                                    Virtual thread
    │                                               │
    ├─ offer(m) → accepted? done.                   │
    │                                               │
    ├─ offer(m) → full?                             │
    │     │                                         │
    │     ├─ stop reading from this client           │
    │     ├─ hand off ─────────────────────────────► │
    │     └─ return (I/O thread is free)             │
    │                                          wait for queue slot
    │                                                │
    │                                          slot opens → enqueue
    │                                          resume reading
    │                                          flush buffered bytes
```

The key design choice is what the server returns when the queue is full. Not a
boolean. Not an error code. A *function* — a callback that encapsulates the
waiting strategy. The I/O layer doesn't know anything about queues or
transactions or retries. It just knows: "I got a function back instead of null,
so I should park this channel and let the function do its thing."

## Why It's Robust

### One Ticket Per Client

Since we stop reading the moment a client is parked, that client literally cannot
send another message until the parking ticket is resolved. No second virtual
thread, no memory explosion. The invariant is structural, not just a policy
check — TCP itself enforces it.

### The Network Becomes Your Buffer

While the virtual thread waits, TCP flow control cascades all the way back to
the client application:

```
Server stops reading from socket
      ↓
Server's kernel receive buffer fills
      ↓
TCP zero-window advertisement sent to client
      ↓
Client's kernel send buffer fills
      ↓
Client's networking layer can't flush → write buffer grows
      ↓
Write buffer exceeds high watermark → channel not writable
      ↓
Client's outbound queue blocks
      ↓
Client's application thread parks naturally
```

No application-level "slow down" message. No retry logic. No wasted bandwidth.
The client's application thread simply blocks until the server is ready — exactly
the behaviour you want. And every kernel buffer and TCP window between client and
server acts as additional queue capacity that you never had to allocate.

### Per-Channel Isolation

Only the specific client that hit the full queue is throttled. Every other client
continues at full speed. A single slow or malicious sender cannot affect
well-behaved clients — they never even know that another client is parked.

### The I/O Thread Does Almost Nothing

On the fast path: one non-blocking queue offer. On the slow path: set a flag,
schedule a virtual thread, return. The I/O thread never inspects the message
content, never validates anything, never touches the database. It just moves
bytes. This separation is what keeps the networking layer fast regardless of how
complex the actual message processing is.

## The Details That Took Longest to Get Right

### Pre-Allocated Callbacks

The parking tickets are method references bound once at server startup. When
the queue is full — exactly when the server is under maximum load — we allocate
nothing. Zero garbage on the reject path. This matters because allocation
pressure during overload is how you turn a brief spike into a GC pause cascade.

### Cumulation Buffer Flush

When we resume reading after a pause, any bytes that arrived during the pause are
sitting in Netty's internal cumulation buffer, not in the kernel socket buffer.
Calling `setAutoRead(true)` resumes reading from the socket, but if all the data
was already pulled into the cumulation buffer before we paused, no new
`channelRead` event fires. The stranded bytes are never decoded.

The fix: after clearing the backpressure flag, fire a synthetic `channelRead`
with an empty buffer. This triggers the decoder to re-examine its cumulation and
process whatever is there. A small detail, but miss it and your server silently
stops processing messages from resumed clients. (We speak from experience.)

### Timeout Alignment

The blocking wait uses the same timeout as the client's own request timeout
(8 seconds in our case). If the server can't drain the queue in the time the
client would have given up anyway, *then* we return an error. The client never
waits longer than it would have waited regardless.

## The Pattern Generalised

The parking ticket pattern isn't specific to Netty or TCP. The core idea is:

> When a fast producer hits a slow consumer, don't fail and don't block the
> producer's thread. Instead, return a *continuation* that encapsulates the
> waiting strategy, and let a cheap concurrent primitive (virtual thread, goroutine,
> async task) execute it while the producer's thread moves on.

The requirements are:

1. **A non-blocking fast path** — the common case must cost almost nothing.
2. **A way to pause the producer** — TCP flow control, channel writability,
   permit-based rate limiting, or even a simple boolean flag.
3. **Cheap concurrency for the wait** — virtual threads, goroutines, or async
   tasks that don't consume real OS resources while parked.
4. **A structural bound on concurrent waiters** — ideally enforced by the pause
   mechanism itself, not by a counter you have to remember to check.

Before Project Loom, requirement (3) was the blocker. Parking an OS thread per
client was too expensive. Virtual threads changed the calculus — 1 KB per parked
client means the memory cost of the pattern is negligible even at thousands of
connections.

## What We Learned

The pattern emerged from a simple constraint: I/O threads must never block. But
the solution — returning a callback instead of an error — turned out to have
surprisingly deep consequences:

**The best backpressure is invisible.** The ideal outcome is that neither the
client developer nor the server developer has to think about overload. The client
doesn't implement retry logic. The server doesn't track retry state. TCP does the
coordination, and both sides just see slightly higher latency during spikes.

**Errors under load are a design smell.** If your server returns errors precisely
when it's busiest, you're creating a feedback loop: load causes errors, errors
cause retries, retries cause more load. The parking ticket breaks this cycle by
converting "I'm too busy" from an error into a wait.

**The network is a resource, not just a pipe.** TCP buffers, window scaling, and
flow control are infrastructure that your OS already provides and maintains. Using
them as part of your backpressure strategy means you get battle-tested,
hardware-accelerated flow control without writing a line of code. You just have to
stop fighting it.

The full implementation is open source in the
[Convex repository](https://github.com/Convex-Dev/convex). The relevant code is
in `NettyInboundHandler` (channel lifecycle) and `Server` (dispatch logic).
