# Account Management

Learn how to generate, import, and manage Convex accounts and Ed25519 key pairs.

## Overview

Every Convex account has:
- **Address** - A unique identifier (e.g., `#1678`)
- **Ed25519 Seed** - 32-byte private seed (keep this secret!)
- **Public Key** - Derived from the seed (safe to share)
- **Balance** - Amount of Convex Coins owned
- **Sequence** - Transaction counter

## Generating New Key Pairs

### Random Generation

Generate a new random key pair:

```typescript
import { KeyPair } from '@convex-world/convex-ts';

// Generate random key pair
const keyPair = KeyPair.generate();

// Access the keys
console.log('Public key:', keyPair.publicKeyHex);
console.log('Seed:', keyPair.privateKeyHex);  // Keep secret!

// Access as bytes
const publicBytes: Uint8Array = keyPair.publicKey;
const seedBytes: Uint8Array = keyPair.privateKey;
```

:::danger Keep Seeds Secret
Never commit seeds to version control, share them publicly, or store them unencrypted. Anyone with your seed can control your account.
:::

### From Existing Seed

If you already have an Ed25519 seed:

```typescript
import { KeyPair } from '@convex-world/convex-ts';

// From hex string
const keyPair = KeyPair.fromSeed('your-32-byte-seed-hex');

// From bytes
const seedBytes = new Uint8Array(32);  // Your seed
const keyPair = KeyPair.fromSeed(seedBytes);

// Public key is automatically derived
console.log('Public key:', keyPair.publicKeyHex);
```

## Setting Up Your Account

### Basic Setup

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');

// Load your key pair
const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);

// Set your account
convex.setAccount('#1678', keyPair);

// Now you can transact
const info = await convex.getAccountInfo();
console.log('Balance:', info.balance);
```

### Separate Signer and Address

For advanced use cases, you can set the signer and address separately:

```typescript
// Set signer first
convex.setSigner(keyPair);

// Then set address
convex.setAddress('#1678');

// Or switch addresses with the same signer
convex.setAddress('#9999');
```

This is useful when one signer controls multiple accounts.

## Account Information

### Get Account Details

```typescript
const info = await convex.getAccountInfo();

console.log('Address:', info.address);
console.log('Balance:', info.balance / 1_000_000_000, 'coins');
console.log('Sequence:', info.sequence);
console.log('Public key:', info.publicKey);
```

### Check Balance

```typescript
// Your native coin balance
const result = await convex.balance();
console.log('Balance:', result.value, 'copper');

// Another account's balance
const other = await convex.balance('#123');
console.log('Other balance:', other.value);
```

## Key Pair Formats

### Hex Format

```typescript
const keyPair = KeyPair.generate();

// Get keys as hex strings
const publicKeyHex = keyPair.publicKeyHex;
const seedHex = keyPair.privateKeyHex;

// Restore from hex
const restored = KeyPair.fromSeed(seedHex);
```

### Bytes Format

```typescript
const keyPair = KeyPair.generate();

// Get keys as Uint8Array
const publicKey: Uint8Array = keyPair.publicKey;    // 32 bytes
const seed: Uint8Array = keyPair.privateKey;        // 32 bytes

// Restore from bytes
const restored = KeyPair.fromSeed(seed);
```

## Environment Variables

### Best Practice Storage

Store credentials in environment variables:

```typescript
// .env file (never commit this!)
CONVEX_SEED=abc123...
CONVEX_ADDRESS=#1678
CONVEX_PEER=https://peer.convex.live
```

```typescript
// app.ts
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex(process.env.CONVEX_PEER!);
const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
convex.setAccount(process.env.CONVEX_ADDRESS!, keyPair);
```

### Using dotenv

```bash
npm install dotenv
```

```typescript
import 'dotenv/config';
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex(process.env.CONVEX_PEER!);
const keyPair = KeyPair.fromSeed(process.env.CONVEX_SEED!);
convex.setAccount(process.env.CONVEX_ADDRESS!, keyPair);
```

## Key Pair Validation

### Verify Seed Length

```typescript
import { KeyPair, hexToBytes } from '@convex-world/convex-ts';

function loadKeyPair(seedHex: string): KeyPair {
  const seedBytes = hexToBytes(seedHex);

  if (seedBytes.length !== 32) {
    throw new Error(`Invalid seed length: expected 32 bytes, got ${seedBytes.length}`);
  }

  return KeyPair.fromSeed(seedBytes);
}
```

### Verify Key Derivation

```typescript
const keyPair = KeyPair.fromSeed(seed);

// Public key should always be 32 bytes
if (keyPair.publicKey.length !== 32) {
  throw new Error('Invalid public key length');
}

// Verify deterministic derivation
const keyPair2 = KeyPair.fromSeed(seed);
if (keyPair.publicKeyHex !== keyPair2.publicKeyHex) {
  throw new Error('Non-deterministic key derivation');
}
```

## Multiple Accounts

### Managing Multiple Key Pairs

```typescript
class AccountManager {
  private accounts = new Map<string, KeyPair>();

  addAccount(address: string, keyPair: KeyPair) {
    this.accounts.set(address, keyPair);
  }

  getKeyPair(address: string): KeyPair | undefined {
    return this.accounts.get(address);
  }

  async useAccount(convex: Convex, address: string) {
    const keyPair = this.accounts.get(address);
    if (!keyPair) {
      throw new Error(`No key pair for ${address}`);
    }
    convex.setAccount(address, keyPair);
  }
}

// Usage
const manager = new AccountManager();
manager.addAccount('#1678', KeyPair.fromSeed(seed1));
manager.addAccount('#9999', KeyPair.fromSeed(seed2));

await manager.useAccount(convex, '#1678');
await convex.transfer('#456', 1000000);

await manager.useAccount(convex, '#9999');
await convex.transfer('#789', 2000000);
```

### Switching Between Accounts

```typescript
// Use different accounts with the same client
const kp1 = KeyPair.fromSeed(seed1);
const kp2 = KeyPair.fromSeed(seed2);

// Transact as first account
convex.setAccount('#1678', kp1);
await convex.transfer('#456', 1_000_000);

// Switch to second account
convex.setAccount('#9999', kp2);
await convex.transfer('#789', 2_000_000);
```

## Security Best Practices

### ✅ Do

- Generate seeds with cryptographically secure random number generators
- Store seeds in environment variables or encrypted keystores
- Use different accounts for different purposes (hot/cold wallets)
- Back up seeds securely (encrypted, offline)
- Verify public key derivation is deterministic
- Use hardware wallets for high-value accounts

### ❌ Don't

- Hardcode seeds in source code
- Commit seeds to version control
- Share seeds via insecure channels (email, chat)
- Store seeds in browser localStorage without encryption
- Reuse seeds across different networks without understanding implications
- Generate seeds with weak random number generators (Math.random())

## Backup and Recovery

### Mnemonic Seeds (BIP39)

For better user experience, consider using BIP39 mnemonics:

```typescript
import * as bip39 from 'bip39';

// Generate mnemonic
const mnemonic = bip39.generateMnemonic();
console.log('Backup phrase:', mnemonic);
// "witch collapse practice feed shame open despair creek road again ice least"

// Derive seed from mnemonic
const seed = bip39.mnemonicToSeedSync(mnemonic);
const ed25519Seed = seed.subarray(0, 32);  // Use first 32 bytes

// Create key pair
const keyPair = KeyPair.fromSeed(ed25519Seed);
```

### Paper Backup

```typescript
// Generate QR code for backup
import QRCode from 'qrcode';

const keyPair = KeyPair.generate();

// Create QR code of seed (for paper backup)
const qrCode = await QRCode.toDataURL(keyPair.privateKeyHex);

// Display or print QR code
console.log('Scan this QR code to restore your account:');
console.log(qrCode);
```

## Account Creation

### Create via REST API

The simplest way to create an account — no existing account needed:

```typescript
import { Convex, KeyPair } from '@convex-world/convex-ts';

const convex = new Convex('https://peer.convex.live');

// Generate a fresh key pair
const keyPair = KeyPair.generate();

// Create account with faucet funding (test networks only)
const info = await convex.createAccount(keyPair, 100_000_000);
console.log('New address:', info.address);
console.log('Balance:', info.balance);

// Set the new account on the client
convex.setAccount(info.address, keyPair);
```

### Top Up with Faucet

Request additional funds for an existing account (test networks only):

```typescript
await convex.faucet('#1678', 100_000_000);
```

:::warning Faucets are test-only
Faucets are only available on test networks. On production networks, someone must transfer initial funds to your account.
:::

## Next Steps

- **[Signers](./signers)** — Hardware wallet and custom signers
- **[Asset Handles](./assets)** — Token and CNS management
- **[Transactions](./transactions)** — Using your account

## See Also

- [Ed25519 Signature Scheme](https://ed25519.cr.yp.to/)
- [BIP39 Mnemonic Codes](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki)
