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

## Messages

Peers communicate via messages. A message is an atomic, asynchronous piece of data passed from a sender to a receiver.

A Message consists of:
 
- A Message Type tag (one byte)
- Encoded message payload (according to Cell encoding rules)
- Optional: One or more additional branch cell encodings
    - A VLC encoded length 
    - Branch cell encoding (according to Cell encoding rules)

Encoded message data depends on the message type.

Each individual cell encoding MUST fit within a fixed size buffer (currently 8192 bytes). However, by including the additional branch cell encodings, it is possible to include branch cells referenced by the payload. In this way:
- Large data structures can be passed in a single message
- Branch cells can be omitted, in which case the message is regarded as **partial**. Partial messages are appropriate for values such as lattice deltas where the recipient is expected to already be in possession of the omitted branches.

The overall size of the message is not part of the message itself, but will be provided by the transport mechanism e.g.:
- For binary protocol messages, the message length precedes the message
- For HTTP messages of type `application/cvx-raw` the message length is specified in the HTTP `Content-Length` header.
- For messages passed as an octet stream, the message length is naturally delineated by the end of the stream

### Message Types

#### BELIEF

This message specifies a belief from an other peer that is being shared as part of the CPoS consensus algorithm.

Receiving peers SHOULD validate this belief message, and if valid perform a belief merge with their current belief.

Receiving peers MAY ignore beliefs if they are experiencing high demand and need to throttle the number of belief merges being performed.

Receiving peers SHOULD ignore and/or minimise processing for beliefs that have already been received and merged. This is safe because belief merges are idempotent.

#### DATA

This message type provides one or more encoded cells of data. Usually, this will be a component part of a longer message or a response to a `MISSING_DATA` message.

#### QUERY

This message represents a request for a peer to compute the results of a query (considered as a read-only transaction).

Peers SHOULD make a best effort attempt to respond to queries from authorised clients.

Peers MAY reject queries if they are experiencing high demand. In such cases peers MUST attempt to return a result message with an error code indicating temporary failure due to load.

#### TRANSACT

This message represents a request for a Peer to process a transaction by incorporating it into a subsequent Block that the Peer proposes to the Network.

Peers MUST reject transactions that are not correctly signed. Failure to do so may result in slashing.

Peers MUST reject transactions that have a previously used sequence number.

#### RESULT

This message represents the result of another message request (usually a transaction or query).

A Result message MUST reference the message ID of the original message.

#### STATUS

This message represents a request for a Peer to provide information about its current status, including data about latest consensus state.

Peers SHOULD respond to the status request immediately if able. 

Peers MAY cache their most recent status response for efficiency reasons.

#### MISSING_DATA

This message represents a request for missing data. Usually, this is sent by a peer when it is attempting to process a partial message but some data is missing locally, and it needs to acquire the missing data before proceeding.

The Missing Data request must include the Value ID (hash of encoding) for the missing data. Note: It is guaranteed that if a peer has received a partial message, it must be able to determine the hashes of any directly missing data (since they will be encoded as refs in the partial message).

Peer that send this message MAY suspend processing of a message pending receipt of missing data from the original sender. If the original sender is unable to satisfy this request in a timely manner, the suspended message SHOULD be discarded.

Receiving Peers SHOULD respond by sending a `DATA` message containing the missing data specified. Failure to do so may result in a previous message being ignored.

### Trust

Peers in general SHOULD only trust outbound connections to other peers where the other peer is able to prove their authenticity by signing a unique challenge with the peer's private key.

Peers SHOULD reject messages that appear to be malicious, incorrectly formed or too large for reasonable handling.

Peers MAY accept messages from any source, but if they do, they SHOULD prioritise messages from trusted sources.

## Transport

### TCP Connections

The standard mechanism for message passing is TCP connections established between peers.

### UDP Connections

UDP will be explored as a potential future transport protocol for efficiency and performance reasons.





