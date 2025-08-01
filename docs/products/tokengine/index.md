# TokEngine

TokEngine is an open source cross-chain token interoperability bridge, designed to make the most of the efficiency and scalability of Convex for cross-chain economic transfers of value. It is based on the same powerful lattice technology that powers Convex, but is available as a separate system.

Anyone can operate a TokEngine server in order to provide cross-chain token exchange for digital assets of their choice.

TokEngine is open source under the Apache 2.0 License

![TokEngine Logo](image.png)

## About the project

TokEngine is an open source product supported by the Convex Foundation

The TokEngine project has been funded by the EU [Next Generation Internet](https://ngi.eu/) initiative as a solution for sustainable and efficient cross-chain interoperability. 

TokEngine is developed by Convex Ecosystem Services Limited in collaboration with [Werenode](https://werenode.com/).

## Key Functionality

- Accept deposits and turn them into "Virtual Balances"
- Payout "Virtual Balances" to an equivalent token on any DLT (typically a different DLT)
- Perform end-to-end cross-chain swaps
- Wrapped tokens
- Optional audit logging to a Kafka queue
- Compatibility with [Chain Agnostic Improvements Protocols (CAIPs)](https://chainagnostic.org/)

## Supported DLTs

TokEngine utilises a plugin adapter system for different DLT networks. With the correct plugin configured, a TokEngine operator can perform

### Convex 

TokEngine utilises an embedded Convex Peer for communication with Convex. This can be run either connected to an existing Convex newtork or locally in standalone mode. Coupled with the low latency of Convex, this enables the fastest possible token transactions (end to end transactions in under 300ms have been observed)

TokEngine supports the following on Convex based networks e.g. Protonet:
- Convex coins (native token)
- CAD029 tokens (i.e. compatible with the convex.fungible library) 

### EVM

TokEngine uses the [Web3j](https://www.web3labs.com/web3j-sdk) library to interact with EVM networks. Keys can be stored in standard EVM wallet files.

On any EVM-compatible chain, TokEngine supports
- ETH (native token)
- ERC20 token
- ERC777 tokens (coming coon)

### Tezos (Coming Soon)

On Tezos TokEngine supports: 
- tez (native token)
- FA1.2
- FA2
- FA2.1

## Community and discussion

Open source developers wishing to get involved with TokEngine should visit the [GitHub repositiory](https://github.com/Convex-Dev/tokengine)

TokEngine comunity discussions usually take place on the [Convex Community Discord](https://discord.com/invite/xfYGq4CT7v)
