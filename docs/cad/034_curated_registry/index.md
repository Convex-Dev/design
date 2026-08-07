# CAD034: Curated Registry

## Overview

In many contexts, it is necessary to have a curated registry of authorised entities. Example use cases:

- A list of members in a DAO or membership organisation
- A list of verified Tokens for use in end user wallets

CAD34 defines a generic, extensible interface for such registries, in order to support flexible tools and administration of registries that follow the standard.

Design goals:

- Support for any kind of unique ID / entity
- Integration with the [CAD22 trust monitor model](../022_trustmon/index.md)
- Support for flexible administrative control at a per-registry level
- Support for a single Actor hosting many registries

There is no reference implementation of this CAD in the core Convex distribution yet: this document specifies the interface that implementations MUST provide.

## Registry references

Since a single registry actor may host many registries, an individual registry is identified by a **scoped reference** in the standard Convex form:

```clojure
[registry-actor registry-id]
```

where `registry-id` is the value returned by `create-registry`. Operations on an individual registry are `call`ed against this scoped reference. Operations that manage the registries themselves (creation and deletion) are called against the unscoped `registry-actor`.

## Trust integration

Every registry has a **controller**: a CAD22 trust monitor governing actions on that registry. When enforcing access, the registry actor MUST check the relevant controller with:

- **subject** — the `*caller*` of the operation
- **action** — the keyword naming the operation (e.g. `:register`)
- **object** — the registry ID

Implementations MAY apply additional, finer-grained checks, but MUST NOT grant an operation the controller denies.

## Key functions

### Create Registry

```clojure
(call registry-actor (create-registry controller {:optional :metadata}))
```

Where:

- `controller` is a trust monitor for registry actions
- An arbitrary metadata map may be provided, which will be attached to the registry

The registry actor MUST enforce that only a caller allowed to use the `:create-registry` action is able to execute this, otherwise MUST fail with a `:TRUST` error. 

If permitted, the registry actor MUST create a registry with the given metadata, and return a new registry ID.

### Delete Registry

```clojure
(call registry-actor (delete-registry registry-id))
```

The registry actor MUST enforce that only a caller allowed to use the `:delete-registry` action is able to execute this, otherwise MUST fail with a `:TRUST` error. 

If permitted, the registry actor MUST delete the entire registry.

The registry actor MUST NOT re-issue the same registry ID for any newly created registry.

An administrator of the registry actor MAY re-instate the registry, but will have to restore this from off-chain information.

### Register

```clojure
(call [registry-actor registry-id] (register subject metadata))
```

The registry actor MUST enforce that only a caller allowed to use the `:register` action on the registry's controller is able to execute this, otherwise MUST fail with a `:TRUST` error.

If successful, the call MUST add `subject` to the given registry with the given metadata.

If the `subject` already exists, the call MUST replace the metadata for the given subject.

The `subject` may be any CVM value that uniquely identifies the entity within the registry: typically an account address, a scoped reference such as `[token-actor token-id]`, or an integer ID. The metadata SHOULD be a map, and SHOULD NOT be `nil` (see Lookup below).

### Deregister

```clojure
(call [registry-actor registry-id] (deregister subject))
```

The registry actor MUST enforce that only a caller allowed to use the `:deregister` action on the registry's controller is able to execute this, otherwise MUST fail with a `:TRUST` error.

If permitted, the call MUST remove `subject` and its metadata from the registry. The call MUST succeed without effect if the subject is not present, returning `true` if a subject was removed and `false` otherwise.

### Lookup

```clojure
(call [registry-actor registry-id] (lookup subject))
```

Returns the metadata registered for `subject`, or `nil` if the subject is not registered. This is a read-only operation: the registry actor MUST NOT require any trust check, and MUST NOT modify state.

Note that a subject registered with `nil` metadata is indistinguishable from an unregistered subject via `lookup` — this is why non-`nil` metadata is recommended. Where the distinction matters, use `registered?`.

```clojure
(call [registry-actor registry-id] (registered? subject))
```

MUST return `true` if the subject is present in the registry, and `false` otherwise.

### Enumeration

```clojure
(call [registry-actor registry-id] (subjects))
```

Returns the complete set of registered subjects. This supports tools such as wallets displaying a verified-token list.

Registries may grow large, so callers SHOULD use enumeration in queries rather than transactions: a query is free and cannot fail on juice, whereas enumerating a large registry inside a transaction may be expensive or exceed juice limits.

### Registry metadata

```clojure
(call [registry-actor registry-id] (registry-metadata))
```

Returns the metadata map attached to the registry at creation (or `nil` if none was provided). Read-only, with no trust check required.

## Use as a trust monitor

A curated registry is itself a natural access-control list, so a registry actor SHOULD implement the CAD22 `check-trusted?` SPI for its scoped registry references:

```clojure
(defn ^:callable check-trusted?
  [subject action object]
  (boolean (registered-in? *scope* subject)))
```

This allows a scoped registry reference to be plugged in anywhere a trust monitor is accepted — for example, a DAO membership registry used directly as the controller of another actor:

```clojure
(trust/trusted? [registry-actor dao-members] *caller*)
```

Implementations MAY additionally interpret `action` and `object` to provide finer-grained semantics, but the plain membership check above is the baseline behaviour tools can rely on.

## Error handling

| Condition | Error |
|-----------|-------|
| Caller not authorised for the attempted action | `:TRUST` |
| Operation on a registry ID that does not exist (or was deleted) | `:STATE` |
| Malformed arguments (e.g. non-map metadata where the registry requires one) | `:ARGUMENT` |
