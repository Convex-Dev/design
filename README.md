# Convex Design & Documentation

Read online at [Convex Docs](https://docs.convex.world)

This repository is dedicated to Convex Design and Documentation.

## Key Documents

- [Convex Manifesto](docs/overview/manifesto.md)
- [Convex White Paper](docs/overview/convex-whitepaper.md)

## Current CADs

Convex Architecture Documents (CADs) are defined for standards relating to the Convex network and ecosystem, in a manner inspired by Internet RFCs.

| Code                             | Title                            | Status     | Editor
| ------------------               | -------------------------------- | ---------- | -----------
| [CAD000](docs/cad/000_principles)     | Design principles                | Active     | mikera
| [CAD001](docs/cad/001_arch)           | Vision & Architecture            | Active     | mikera
| [CAD002](docs/cad/002_values)         | CVM Values                       | Active     | mikera
| [CAD003](docs/cad/003_encoding)       | Encoding Format                  | Active     | mikera
| [CAD004](docs/cad/004_accounts)       | Account Model                    | Pending    | mikera
| [CAD005](docs/cad/005_cvmex)          | CVM Execution                    | Initial    | mikera
| [CAD006](docs/cad/006_memory)         | Memory Accounting                | Active     | mikera
| [CAD007](docs/cad/007_juice)          | Juice Accounting                 | Pending    | mikera
| [CAD008](docs/cad/008_compiler)       | Convex Lisp Compiler             | Pending    | mikera
| [CAD009](docs/cad/009_expanders)      | Expanders and Macros             | Pending    | mikera
| [CAD010](docs/cad/010_transactions)   | Transactions                     | Pending    | mikera
| [CAD011](docs/cad/011_errors)         | Error Handling                   | Active     | mikera
| [CAD012](docs/cad/012_numerics)       | Numerics                         | Pending    | mikera
| [CAD013](docs/cad/013_metadata)       | Metadata                         | Initial    | helins
| [CAD014](docs/cad/014_cns)            | CNS Registry                     | Pending    | mikera
| [CAD015](docs/cad/015_peercomms)      | Peer Connection Protocol         | Pending    | mikera
| [CAD016](docs/cad/016_peerstake)      | Peer Staking                     | Pending    | mikera
| [CAD017](docs/cad/017_peerops)        | Peer Operations                  | Pending    | mikera
| [CAD018](docs/cad/018_scheduler)      | Scheduler                        | Pending    | mikera
| [CAD019](docs/cad/019_assets)         | Asset Model                      | Draft      | mikera
| [CAD020](docs/cad/020_tokenomics)     | Tokenomics                       | Draft      | mikera
| [CAD021](docs/cad/021_observability)  | Observability                    | Draft      | mikera
| [CAD022](docs/cad/022_trustmon)       | Trust Monitors                   | Draft      | mikera
| [CAD023](docs/cad/023_keystore)       | Local Key Store                  | Draft      | mikera
| [CAD024](docs/cad/024_data_lattice)   | Data Lattice                     | Draft      | mikera
| [CAD025](docs/cad/025_wallet)         | HD Wallets                       | Draft      | mikera
| [CAD026](docs/cad/026_lisp)           | Convex Lisp                      | Draft      | mikera
| [CAD027](docs/cad/027_log)            | Event Logging                    | Draft      | mikera
| [CAD028](docs/cad/028_dlfs)           | Data Lattice File System         | Draft      | mikera
| [CAD029](docs/cad/029_fungible)       | Fungible Token Standard          | Draft      | mikera
| [CAD030](docs/cad/030_torus)          | Torus DEX                        | Draft      | mikera
| [CAD031](docs/cad/031_nft_metadata)   | NFT Metadata                     | Draft      | mikera
| [CAD032](docs/cad/032_reader)         | Convex Reader                    | Draft      | mikera
| [CAD033](docs/cad/033_cvmtypes)       | CVM Types                        | Draft      | mikera
| [CAD034](docs/cad/034_curated_registry) | Curated Registry               | Draft      | mikera
| [CAD035](docs/cad/035_cursors)        | Lattice Cursors                  | Draft      | mikera
| [CAD036](docs/cad/036_lattice_node)   | Lattice Node                     | Draft      | mikera

## Convex Project Repositories

There are the key repositories managed under the Convex-Dev organisation on GitHub.

The main [Convex repository](https://github.com/Convex-Dev/convex) is the primary code base, and includes important modules including:
- `convex-core` - the core Convex data structures and algorithms including CPoS
- `convex-peer` - Convex peer implementation and P2P networking
- `convex-gui` - Convex Desktop GUI Application
- `convex-cli` - Convex CLI utilities
- `convex-restapi` - REST API Server implementation

| Name                                                         | Description                                   | Status     | Lead Dev.
| -------------                                                | --------------------------------              | ---------- | -----
| [Convex](https://github.com/Convex-Dev/convex)               | Main Convex distribution                      | Active     | mikera
| [Convex Design](https://github.com/Convex-Dev/design)        | Architecture and design documents             | Active     | mikera
| [convex-web](https://github.com/Convex-Dev/convex-web)       | Website and live sandbox (convex.world)       | Active     | pedrorgirardi
| [convexity](https://github.com/Convex-Dev/convexity)         | Mobile application and wallet                 | Active     | pedrorgirardi
| [convex-api-py](https://github.com/Convex-Dev/convex-api-py) | Python REST client                            | Active     | billbsing
| [convex-api-js](https://github.com/Convex-Dev/convex-api-js) | NodeJS REST client                            | Active     | billbsing
| [convex.cljc](https://github.com/Convex-Dev/convex.cljc)     | Clojure libraries, Convex Lisp Runner         | Active     | helins

## Ecosystem Projects

We maintain a list of [Ecosystem Projects](ecosystem/index.md) as a shared resource for the community. 

If you would like your project listed, please send a PR for the linked page.

## Contributing

Contributions to this repository are welcome. Contributors may clarify existing design documents, or propose new formal specification changes to Convex by opening issues or pull requests.

For questions and broader discussions, please join the Convex Discord channel (https://discord.com/invite/xfYGq4CT7v).

Contributors are recommended to consult the broader community first before developing new proposals or improvements.

## License

Copyright 2020-24 Convex Foundation (UK) and contributors.

Contributors retain copyright in their contributions, but agree that the Convex Foundation may freely distribute these contributions under any license of its choice.

In exchange for using the information contained within this repository, you agree not to hold the Convex Foundation, its affiliates or any other party in the Convex ecosystem liable for any possible claim for damages arising from any decision you make based in whole or in part on information made available to you through this repository.
