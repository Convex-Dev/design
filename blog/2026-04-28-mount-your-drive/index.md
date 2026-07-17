---
slug: mount-your-drive
title: "Mount your decentralised drive"
authors: [mikera, claude]
tags: [convex, dlfs, mcp, agents]
---

DLFS stores an entire filesystem as one immutable, content-addressed,
mergeable lattice value — which counts for little if you can't reach it
with the tools you already use. Convex 0.8.4 fixes the access problem
three ways at once: DLFS drives are now reachable through the **Java NIO
API**, through **WebDAV** (including your OS file manager), and through
**MCP tools** for AI agents. One drive, three doors.

<!-- truncate -->

## Door one: it's just `java.nio.file`

For JVM applications, DLFS registers as a standard NIO `FileSystem`
provider. `Path`, `Files.write`, `Files.newDirectoryStream` — code written
against the standard API works against a decentralised, replicated drive
without knowing it. Libraries that take a `Path` take a DLFS path. That's
the whole story, and that's the point.

## Door two: WebDAV, or "it shows up in Finder"

Every DLFS node can serve its drives over WebDAV:

```java
DLFSServer server = DLFSServer.create(keyPair);
server.start(8080);
// drives now at http://localhost:8080/dlfs/{drive}/{path}
```

WebDAV is old, unglamorous and everywhere — spoken by Windows Explorer,
macOS Finder, most Linux file managers, and `curl`. Which means a
content-addressed Merkle-tree filesystem with CRDT merge semantics now
mounts like an ordinary network drive. Drag a file in; the mutation lands
in the lattice and syncs onward from there. The client is the file manager
you already use.

The server is built on Javalin with virtual-thread request handling, binds
to `127.0.0.1` unless you *explicitly* decide otherwise, and supports
Ed25519 JWT bearer tokens: each authenticated identity gets its own drive
namespace, and mutating requests can require authentication by default.
Identity is a key pair, not an account you register somewhere.

## Door three: hand it to an agent

The same drive operations — list, read, write, mkdir, delete — are exposed
as **Model Context Protocol tools**. Point an MCP-capable AI agent at a
DLFS node and it can work a drive with the same identity model as every
other client. We've written before about [AI meeting Convex](/blog/ai-meets-convex);
this is the filesystem half of that story: a place agents can durably read
and write that isn't a bespoke API, and that replicates without a central
service.

## Same drive, every door

The point that's easy to miss is that these aren't three storage systems
with a sync process between them — they're three *views* of one lattice
value.
Write through NIO, see it over WebDAV, let an agent read it via MCP. Under
the hood it's the same immutable structure that gave us
[exabyte sparse files](/blog/exabyte-sparse-files), with fork/sync merge
semantics for replicas.

A note on limits: the WebDAV server is DAV class 1 — the basics, solidly, not
locking or versioning extensions. That's deliberate; the lattice already
has a better answer to concurrent modification than DAV locks ever were.

Decentralised infrastructure earns adoption when it stops asking users to
change their tools. Your files, cryptographically verified, replicated on
your terms — in a window that looks exactly like every other folder on
your desktop.
