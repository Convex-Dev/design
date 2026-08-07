# CAD033: Convex CVM Types

## Overview

Convex uses the [CAD3 encoding](../003_encoding/index.md) to represent data. CAD3 is an extensible format: it fully specifies the generic data types (integers, strings, blobs, vectors, maps etc.) while reserving several tag categories for application use — byte flags (`0xBx`), coded values (`0xCx`), data records (`0xDx`) and extension values (`0xEx`).

The CVM is one such application. This CAD is the registry of every CAD3 application tag the CVM assigns, with its encoding and a reference to the CAD that specifies its semantics. Generic encoding rules (VLQ counts, embedded references, cell structure) are defined in CAD003 and not repeated here.

Implementations reading CVM values (peers, clients, block explorers, archival tools) MUST interpret these tags as specified below. Tags in the application categories not listed here are not used by the CVM and MUST be rejected when validating CVM state.

## Summary of tag assignments

| Tag | Category | CVM type | Semantics |
|------|----------|----------|-----------|
| `0xB0` | Byte flag | Boolean `false` | [CAD002](../002_values/index.md) |
| `0xB1` | Byte flag | Boolean `true` | [CAD002](../002_values/index.md) |
| `0xC0` | Coded value | Coded op (Constant, Try, Query, Lambda) | [CAD005](../005_cvmex/index.md) |
| `0xC1` | Coded value | Lookup op | [CAD005](../005_cvmex/index.md) |
| `0xC2` | Coded value | Let op | [CAD005](../005_cvmex/index.md) |
| `0xC3` | Coded value | Loop op | [CAD005](../005_cvmex/index.md) |
| `0xCD` | Coded value | Def op | [CAD005](../005_cvmex/index.md) |
| `0xD0` | Data record | Invoke transaction | [CAD010](../010_transactions/index.md) |
| `0xD1` | Data record | Transfer transaction | [CAD010](../010_transactions/index.md) |
| `0xD2` | Data record | Call transaction | [CAD010](../010_transactions/index.md) |
| `0xD3` | Data record | Multi transaction | [CAD010](../010_transactions/index.md) |
| `0xD4` | Data record | Belief | [CAD015](../015_peercomms/index.md) |
| `0xD5` | Data record | State | [CAD001](../001_arch/index.md) |
| `0xD6` | Data record | Block | [CAD015](../015_peercomms/index.md) |
| `0xD7` | Data record | Order | [CAD015](../015_peercomms/index.md) |
| `0xD8` | Data record | Account status | [CAD004](../004_accounts/index.md) |
| `0xD9` | Data record | Peer status | [CAD016](../016_peerstake/index.md) |
| `0xDA` | Data record | Do op | [CAD005](../005_cvmex/index.md) |
| `0xDB` | Data record | Invoke op | [CAD005](../005_cvmex/index.md) |
| `0xDC` | Data record | Cond op | [CAD005](../005_cvmex/index.md) |
| `0xDD` | Data record | Result | [CAD011](../011_errors/index.md) |
| `0xDE` | Data record | Block result | [CAD015](../015_peercomms/index.md) |
| `0xDF` | Data record | Function / closure | [CAD005](../005_cvmex/index.md) |
| `0xE5` | Extension value | Special symbol op | [CAD005](../005_cvmex/index.md) |
| `0xE6` | Extension value | Local reference op | [CAD005](../005_cvmex/index.md) |
| `0xEA` | Extension value | Address | [CAD004](../004_accounts/index.md) |
| `0xED` | Extension value | Core definition | [CAD026](../026_lisp/index.md) |

The CVM also assigns `0x88` (Syntax) in the data-structures category; its encoding is specified directly in [CAD003](../003_encoding/index.md).

## Byte flags

### `0xB0` - `0xB1` Boolean

The possible Boolean values are `true` and `false`, which are coded as 1-byte Byte Flags.

```
Encoded as:
0xB0 <=> false
0xB1 <=> true
```

The two Boolean Values `true` or `false` have the Encodings `0xb1` and `0xb0` respectively.

Note: These Tags are chosen to aid human readability, such that the first hexadecimal digit `b` suggests "binary" or "boolean", and the second hexadecimal digit represents the bit value.

## Coded values: CVM ops

Compiled CVM code is a tree of **ops** (see [CAD005](../005_cvmex/index.md)). Ops with exactly two components encode as CAD3 coded values, `<tag> <code> <value>`:

### `0xC0` Coded op

```
0xC0 <Opcode: Byte Flag> <Value>
```

The generic coded op, where the code component is a Byte Flag selecting the op sub-type:

| Opcode | Op | Value component |
|--------|----|-----------------|
| `0xB0` | Constant | the constant value |
| `0xBA` | Try | vector of alternative ops |
| `0xBB` | Query | vector of ops to execute with state rollback |
| `0xBF` | Lambda | the function value |

### `0xC1` Lookup

```
0xC1 <Address or nil> <Symbol>
```

Dynamic lookup of a symbol in an account environment. The code component is the target account (`nil` for a lookup in the current environment).

### `0xC2` Let / `0xC3` Loop

```
0xC2 <Binding vector> <Body ops>
0xC3 <Binding vector> <Body ops>
```

Local binding forms. The two tags share one structure: `0xC3` marks the form as a loop target for `recur`.

### `0xCD` Def

```
0xCD <Symbol or Syntax> <Op>
```

Environment definition: evaluates the op and defines the result in the account environment under the given symbol (with optional metadata when the code component is a Syntax value).

## Data records

CVM structured types encode as CAD3 dense records: the tag followed by the field values in the fixed order given below. Field semantics are specified in the referenced CADs.

### Transactions ([CAD010](../010_transactions/index.md))

| Tag | Type | Fields (in order) |
|-----|------|-------------------|
| `0xD0` | Invoke | `origin`, `sequence`, `command` |
| `0xD1` | Transfer | `origin`, `sequence`, `target`, `amount` |
| `0xD2` | Call | `origin`, `sequence`, `target`, `offer`, `call`, `args` |
| `0xD3` | Multi | `origin`, `sequence`, `mode`, `txs` |

### Consensus and global state

| Tag | Type | Fields (in order) |
|-----|------|-------------------|
| `0xD4` | Belief | `orders` |
| `0xD5` | State | `accounts`, `peers`, `globals`, `schedule` |
| `0xD6` | Block | `timestamp`, `transactions` |
| `0xD7` | Order | `timestamp`, `consensus`, `blocks` |
| `0xD8` | Account status | `sequence`, `key`, `balance`, `allowance`, `holdings`, `controller`, `environment`, `metadata`, `parent` |
| `0xD9` | Peer status | `controller`, `stake`, `stakes`, `delegated-stake`, `metadata`, `timestamp`, `balance` |

### Results

| Tag | Type | Fields (in order) |
|-----|------|-------------------|
| `0xDD` | Result | `id`, `result`, `error`, `log`, `info` |
| `0xDE` | Block result | `state`, `results` |

`Result` is the record returned to clients for queries and transactions; error semantics are specified in [CAD011](../011_errors/index.md).

### Multi-ops

Ops containing a variable number of child ops encode as dense records whose fields are the child ops in execution order:

| Tag | Op |
|-----|----|
| `0xDA` | Do — execute children sequentially, returning the last result |
| `0xDB` | Invoke — function invocation; first child evaluates to the function, the rest to its arguments |
| `0xDC` | Cond — conditional; alternating test/result children |

### `0xDF` Function

```
0xDF <Sub-type: Byte Flag> <Params> <Env> <Body>
```

A function or closure, encoded as a 4-field dense record: a Byte Flag sub-type (`0xB0` = normal function), the parameter vector, the captured lexical environment (`nil` when nothing is captured), and the body op.

## Extension values

Extension values encode as `<tag> <VLQ Count>` per CAD003.

### `0xE5` Special

```
0xE5 <VLQ Count = special symbol index>
```

An op reading one of the CVM special symbols (`*address*`, `*balance*`, `*caller*` etc.), referenced by its index in the fixed special-symbol table defined by the CVM version.

### `0xE6` Local

```
0xE6 <VLQ Count = local stack position>
```

An op reading a local binding by its position on the local binding stack.

### `0xEA` Address

Addresses are used to reference sequentially allocated accounts in Convex, conventionally written as `#14567`. As such, they are conveniently encoded as CAD3 extension values with the tag `0xEA`

```
0xEA <VLQ Count = address number>
```

An Address is encoded by the tag byte followed by a VLQ Encoding of the 64-bit value of the Address.

The address number MUST be positive, i.e. a 63-bit positive integer.

Since addresses are allocated sequentially from zero (and accounts can be re-used), this usually results in a short encoding.

Addresses MAY be used by implementations outside the CVM for other types of sequentially allocated values.

### `0xED` Core definition

```
0xED <VLQ Count = core definition index>
```

A reference to a definition in the Convex core environment (`convex.core` functions such as `map` or `+`), by index. This keeps compiled code compact: core functions appear constantly in CVM code, and an extension value encodes in a few bytes what would otherwise be a full symbol lookup.
