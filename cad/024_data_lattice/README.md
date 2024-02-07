# Data Lattice
Convex depends on integral data to operate the CVM and CPoS (on-lattice).  Additionally, decentralised appliciations may require extrinsic data types (off-lattice). 
Here are some of the key reasons data storage and processing extrinsic to Convex is useful for decentralized applications:

1. Scalability: Blockchains inherently have limits on computational capacity and data throughput. Storing and analyzing large data sets is inefficient on-chain. Off-chain resources can horizontally scale to demand.

2. Privacy: Sensitive data like healthcare records or personal information requires restricted access. Public blockchains provide transparency but not confidentiality. Off-chain systems support encryption and fine-grained access control.

3. Speed & Responsiveness: Blockchains feature lengthy settlement finality and limited transactions per second. This hinders uses needing real-time data flow like messaging or IoT monitoring. Off-chain networks have fewer limits reacting to data changes. 

4. Cost Efficiency: Persisting every trivial update on global chains is tremendously expensive long term. Offloading non-critical data curtails unnecessary fees and bloat. Subnets handle localized logic.

5. Regulatory Compliance: Chains are transnational making compliance difficult. Off-chain systems can enforce jurisdiction specific rules around permissible data types, storage locations, access restrictions and lifecycles.

6. Rich Data Formats: Chains restrict data schemas to basic key-value pairs and byte strings. Document databases, media assets, and complex analytic jobs operate off-chain.

In summary, a hybrid decentralized model using blockchains for consensus/settlement alongside purpose-built off-chain coordination handles data-intensive tasks aligned to use case needs more effectively. This unlocks wider adoption.
