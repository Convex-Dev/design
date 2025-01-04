# CAD034: Curated Registry

## Overview

In many contexts, it is necessary to have a curated registry of authorised entities. Example use cases:

- A list of members in a DAO or membership organisation
- A list of verified Tokens for use in end user wallets

CAD34 defines a generic, extensible interface for such registries, in order to support flexible tools and administration of registries that follow the standard.

Design goals:

- Support for any kind of unique ID / entity
- Integration with teh CAD22 trust monitor model
- Support for flexible administrative control at a per-registry level
- Support for a single Actor hosting many registries

## Key functions

### Create Registry

```clojure
(call registry-actor (create-registry controller {:optional :metadata}))
```

Where:

- `controller` is a trust monitor for registry actions
- An arbitrary metadata map may be provided, which will be attached to the registry

The registry actor MUST enforce that only a caller allowed to use the `:create-registry` action is able to execute this, otherwise MUST fail with a `:TRUST` error. 

If permitted, the registry actor MUST creates a registry with the given metadata, and returns a new registry ID.

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
(call registry-actor (register subject metadata))
```

If successful, the call MUST add `subject` to the given registry with the given metadata.

If the `subject` already exists, the call MUST replace the metadata for the given subject.


