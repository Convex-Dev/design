# Peer Communications

## Overview

Peers in Convex need to communicate certain messages to ensure the effective running of the protocol. This CAD describes peer messaging as required to implement the protocol.

Objectives:

- Resilient to network failures and deliberate attacks
- Low latency communications
- Messaging efficiency

## Message Passing

Peers communicate via messages. 

A Message consists of:
 
- A Message Type tag (one byte)
- Encoded message payload (according to Cell encoding rules)

Encoded message data depends on the message type.

Messages MUST fit within a fixed size buffer (currently 8192 bytes).

Where a large message exceeds the buffer, the message MUST be split into smaller messages.

### Message Types

#### BELIEF

This message specifies a Belief from an other eer that is being shared as part of the consensus algorithm.

Receiving Peers SHOULD validate this Belief message, and if valid perform a Belief Merge with their current Belief.

Receiving Peers MAY ignore Beliefs if they are experiencing high demand and need to throttle the number of Belief merges being performed.

Receiving Peers SHOULD ignore and/or minimise processing for Beliefs that have already been received and merged. This is safe because Belief merges are idempotent.

#### DATA

This message type provides one encoded Cell of data to the receivening Peer. Usually, this will be a component part of a longer message or a response to a `MISSING_DATA` message.

#### QUERY

This message represents a request for a Peer to compute the results of a query (considered as a read-only transaction).

Peers SHOULD make a best effort attempt to respond to all queries from permitted clients.

Peers MAY reject queries if they are experiencing high demand. In such cases Peers SHOULD send a result message with an error code indicating temporary failure due to load.

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

This message represents a request for missing data. Usually, this is sent by a peer when it is attempting to process another message but some data is missing.

The Missing Data request must include the Value ID (hash of encoding) for the missing data.

Peer that send this message MAY suspend processing of a message pending receipt of missing data from the original sender. If the original sender is unable to satisfy this request in a timely manner, the suspended message SHOULD be discarded.

Receiving Peers SHOULD respond by sending a `DATA` message containing the missing data specified. Failure to do so may result in a previous message being ignored.



### Trust

Peers in general SHOULD only trust outbound connections to other peers where the other Peer is able to prove their authenticity by signing a unique challenge with the Peer's private key.

Peers MAY accept messages from any source, but if they do, they SHOULD prioritise messages from trusted sources.

## Transport

### TCP Connections

The standard mechanism for message passing is TCP connections established between peers.

### UDP Connections

UDP will be explored as a potential future transport protocol for efficiency and performance reasons.





