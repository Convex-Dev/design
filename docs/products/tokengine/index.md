# TokEngine

TokEngine is a cutting-edge, open-source cross-chain token interoperability bridge that leverages the efficiency and scalability of Convex's lattice technology to enable seamless, high-speed digital asset transfers across diverse blockchain networks. Designed for flexibility, TokEngine empowers anyone to operate a server and facilitate cross-chain token exchanges for their chosen digital assets, fostering a decentralised and inclusive financial ecosystem. Released under the Apache 2.0 License, TokEngine is freely accessible for developers and organizations worldwide.

![TokEngine Logo](image.png)

## About the project

TokEngine is proudly supported by the [Convex Foundation](https://convex.world) and funded by the EU's [Next Generation Internet](https://ngi.eu/) initiative, championing sustainable and efficient cross-chain interoperability. Developed by Convex Ecosystem Services Limited in collaboration with [Werenode](https://werenode.com/), TokEngine is built to drive innovation in decentralised finance and blockchain connectivity.
TokEngine is an open source product supported by the Convex Foundation

## Key Functionality

- **Deposit and Virtual Balances**: Accept deposits and convert them into "Virtual Balances" for cross-chain use.
- **Cross-Chain Payouts**: Redeem "Virtual Balances" as equivalent tokens on any supported distributed ledger technology (DLT).
- **End-to-End Swaps**: Execute seamless cross-chain token swaps.
- **Wrapped Tokens**: Support for wrapped token functionality.
- **Audit Logging**: Optional logging to a Kafka queue for transparency and tracking.
- **CAIP Compatibility**: Aligns with [Chain Agnostic Improvement Protocols (CAIPs)](https://chainagnostic.org/) for standardised interoperability.

## Supported DLTs

TokEngine's plugin adapter system enables integration with various DLT networks, offering operators unparalleled flexibility.

### Convex 

With an embedded Convex Peer, TokEngine ensures ultra-low-latency communication with Convex networks, achieving end-to-end transactions in under 300ms. It can connect to existing Convex networks or operate in standalone mode. 

TokEngine supports the following on Convex based networks e.g. Protonet:
- Convex coins (native token)
- CAD029 tokens (i.e. compatible with the convex.fungible library) 

### EVM

TokEngine integrates with EVM-compatible chains using the [Web3j](https://www.web3labs.com/web3j-sdk) library, with key storage in standard EVM wallet files.

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

Join the TokEngine community to contribute, collaborate, or stay updated:
- Explore the code and get involved with OSS development at the [GitHub repository](https://github.com/Convex-Dev/tokengine).
Open source developers wishing to get involved with TokEngine should visit the 
- Engage in discussions on the [Convex Community Discord](https://discord.com/invite/xfYGq4CT7v).
