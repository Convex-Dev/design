# NFT Metadata

## Overview

NFTs are uniquely identifiable digital assets on Convex

Each NFT may define metadata which is accessible on-chain on a per-NFT basis

## Metadata Format

Metadata SHOULD be expressed as a Convex data structure value that is representable as a JSON Object

This implies that the following values are permissible:
- A Hashmap with Strings as Keys
- A String
- Boolean values
- A Vector of values
- Numbers (must be a small integer or double precision floating point value to fit within valid JSON ranges)
- `nil`

```clojure
{
  "name" "Bob"
  "image" "http://foo.com/image1.png"
}
```
Which would be equivalently expressed in JSON as:

```json
{
  "name": "Bob",
  "image": "http://foo.com/image1.png"
}
```

## Metadata API

Metadata MUST be accessed using the following interface either directly or indirectly:

```
;; Using scoped actor
(call [nft-actor nft-id] (get-metadata))

;; Using a argument
(call nft-argument (get-metadata nft-id))
```

## Stored vs. Generated metadata

NFT implementations MAY either generate metadata dynamically on demand or store metadata on-chain.

