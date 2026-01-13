# CAD015: Peer Communications

## Overview

Peers in Convex need to communicate messages to ensure the effective running of the protocol and communication with clients and other peers. We need highly efficient messaging that is well suited for distributed systems dealing with advanced lattice data structures and operations.

This CAD describes the Convex / lattice messaging model. 

Objectives:

- Resilient to network failures and deliberate attacks
- Low latency communications
- Messaging efficiency
- Asynchronous model supported by default
- Flexibility to adapt to different transport protocols
- Consistency with lattice data principles
- Usage of CAD3 data for message payloads

## Messages

Peers communicate via messages. A message is an atomic, asynchronous piece of data passed from a sender to a receiver.

Each message has a CAD3 payload.

### Message Encoding

The Message encoding format is designed to efficiently encode a CAD3 payload. Since CAD3 structures can contain multiple branches, each with their own encoding, the key idea is to send the top level encoding first, then follow this with any required child branches.

A Message is normally encoded as a Blob of bytes consisting of the following:
 
- Encoded top level message payload (according to CAD3 Cell encoding rules)
- Optional: One or more additional branch cell encodings
    - A VLC encoded length 
    - Branch cell encoding (according to Cell encoding rules)

Each individual cell encoding MUST fit within a fixed size buffer (currently 16383 bytes). However, by including the additional branch cell encodings, it is possible to include branch cells referenced by the payload. In this way:
- Large data structures can be passed in a single message
- Branch cells can be omitted, in which case the message is regarded as **partial**. Partial messages are appropriate for values such as lattice deltas where the recipient is expected to already be in possession of the omitted branches. A partial message is valid, however the receiver may not be able to access the full payload immediately.

The overall size of the message is not part of the message itself, but will typically be provided by the transport mechanism e.g.:
- For binary protocol messages, the message length precedes the message
- For HTTP messages of type `application/cvx-raw` the message length is specified in the HTTP `Content-Length` header.
- For messages passed as an octet stream, the message length is naturally delineated by the end of the stream

### Message Types

The type of the message can be inferred from the payload. Any CAD3 value may form a valid Message, so the interpretation of these values is part of the peer protocol (i.e. application specific). 

Currently recognised message types follow:

#### BELIEF

```
CAD3 Payload:
Belief
```

This message specifies a belief from an other peer that is being shared as part of the CPoS consensus algorithm.

Receiving peers SHOULD validate this belief message, and if valid perform a belief merge with their current belief.

Receiving peers MAY ignore beliefs if they are experiencing high demand and need to throttle the number of belief merges being performed.

Receiving peers SHOULD ignore and/or minimise processing for beliefs that have already been received and merged. This is safe because belief merges are idempotent.

#### QUERY

```
CAD3 Payload:
[:QR msg-id form address?]
```

This message represents a request for a peer to compute the results of a query (considered as a read-only transaction).

Peers SHOULD make a best effort attempt to respond to queries from authorised clients.

Peers MAY reject queries if they are experiencing high demand. In such cases peers MUST attempt to return a result message with an error code indicating temporary failure due to load.

#### TRANSACT

```
CAD3 Payload:
[:TX msg-id signed-transaction]
```

This message represents a request for a Peer to process a transaction by incorporating it into a subsequent Block that the Peer proposes to the Network.

Peers MUST reject transactions that are not correctly signed. Failure to do so may result in slashing.

Peers MUST reject transactions that have a previously used sequence number.

#### RESULT

```
CAD3 Payload:
Result
```

This message represents the result of another message request (usually a transaction or query).

A Result message MUST reference the message ID of the original message. Results that do not correspond to a pending  outgoing request ID should normally be ignored.

#### STATUS

```
CAD3 Payload:
[:SR msg-id]
```

This message represents a request for a Peer to provide information about its current status, including data about latest consensus state.

Peers SHOULD respond to the status request immediately if able. 

Peers MAY cache their most recent status response for efficiency reasons.

#### DATA_REQUEST

```
CAD3 Payload:
[:DR msg-id hash0 hash1 .....]
```

This message represents a request for missing data. Usually, this is sent by a peer when it is attempting to process a partial message but some data is missing locally, and it needs to acquire the missing data before proceeding.

The Missing Data request must include the Value IDs (hash of encoding) for the missing data branches. Note: It is guaranteed that if a peer has received a partial message, it must be able to determine the hashes of any directly missing data (since they will be encoded as branch refs in the partial message).

Peer that send this message MAY suspend processing of a message pending receipt of missing data from the original sender. If the original sender is unable to satisfy this request in a timely manner, the suspended message SHOULD be discarded.

Receiving Peers SHOULD respond by sending a `RESULT` message containing the missing data specified. 

### Trust

Peers in general SHOULD only trust outbound connections to other peers where the other peer is able to prove their authenticity by signing a unique challenge with the peer's private key.

Peers SHOULD reject messages that appear to be malicious, incorrectly formed or too large for reasonable handling.

Peers MAY accept messages from any source, but if they do, they SHOULD prioritise messages from trusted sources.

## Transport

### TCP Connections

The standard mechanism for message passing is TCP connections established between peers.

Messages are sent as:
- a VLQ encoded message length N
- N bytes representing the Message encoding

### UDP Connections

UDP will be explored as a potential future transport protocol for efficiency and performance reasons.





