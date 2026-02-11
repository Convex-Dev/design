# Signer Interface

Learn how to integrate hardware wallets, browser extensions, and other signing mechanisms using the pluggable Signer interface.

## Overview

The Signer interface allows you to use different signing mechanisms beyond simple key pairs:
- **Hardware Wallets** - Ledger, Trezor, etc.
- **Browser Extensions** - MetaMask-style wallets
- **HSM** - Hardware Security Modules for enterprise
- **Mobile Wallets** - iOS/Android wallet apps
- **Remote Signers** - Cloud-based signing services

## Signer Interface

```typescript
interface Signer {
  // Get the public key (synchronous, cached)
  getPublicKey(): Uint8Array;

  // Sign a message (asynchronous, may require user interaction)
  sign(message: Uint8Array): Promise<Uint8Array>;

  // Sign for a specific public key (for multi-key wallets)
  signFor(publicKey: string, message: Uint8Array): Promise<Uint8Array>;
}
```

## Built-in Signers

### KeyPairSigner

The default signer that wraps a KeyPair:

```typescript
import { KeyPair, KeyPairSigner } from '@convex-world/convex-ts';

const keyPair = KeyPair.fromSeed(seed);
const signer = new KeyPairSigner(keyPair);

// Use with Convex client
convex.setSigner(signer);
convex.setAddress('#1678');

// Or use KeyPair directly (automatically wrapped)
convex.setAccount('#1678', keyPair);
```

## Custom Signer Implementation

### Basic Custom Signer

```typescript
import { Signer } from '@convex-world/convex-ts';

class CustomSigner implements Signer {
  private publicKey: Uint8Array;

  constructor(publicKey: Uint8Array) {
    this.publicKey = publicKey;
  }

  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    // Implement your signing logic
    const signature = await yourSigningFunction(message);
    return signature;
  }

  async signFor(publicKey: string, message: Uint8Array): Promise<Uint8Array> {
    // Verify the public key matches
    const ourPubKeyHex = Buffer.from(this.publicKey).toString('hex');
    if (publicKey !== ourPubKeyHex) {
      throw new Error('Public key mismatch');
    }
    return this.sign(message);
  }
}

// Use it
const signer = new CustomSigner(publicKeyBytes);
convex.setSigner(signer);
convex.setAddress('#1678');
```

### Hardware Wallet Signer

Example for a hardware wallet that requires user confirmation:

```typescript
class HardwareWalletSigner implements Signer {
  private wallet: HardwareWalletDevice;
  private publicKey: Uint8Array;

  constructor(wallet: HardwareWalletDevice) {
    this.wallet = wallet;
    // Get and cache public key
    this.publicKey = wallet.getPublicKeySync();
  }

  getPublicKey(): Uint8Array {
    // Return cached value (synchronous)
    return this.publicKey;
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    // This will prompt user on hardware device
    console.log('Please confirm transaction on your hardware wallet...');

    try {
      const signature = await this.wallet.signMessage(message);
      return signature;
    } catch (error) {
      if (error.code === 'USER_REJECTED') {
        throw new Error('Transaction rejected by user');
      }
      throw error;
    }
  }

  async signFor(publicKey: string, message: Uint8Array): Promise<Uint8Array> {
    const ourPubKeyHex = Buffer.from(this.publicKey).toString('hex');
    if (publicKey !== ourPubKeyHex) {
      throw new Error(`This hardware wallet does not control ${publicKey}`);
    }
    return this.sign(message);
  }
}

// Usage
const wallet = await HardwareWalletDevice.connect();
const signer = new HardwareWalletSigner(wallet);

convex.setSigner(signer);
convex.setAddress('#1678');

// User will be prompted on device
await convex.transfer('#456', 1_000_000_000);
```

### Browser Extension Signer

Example for a browser extension wallet:

```typescript
class ExtensionWalletSigner implements Signer {
  private publicKey: Uint8Array;
  private extension: any;

  constructor(extension: any, publicKey: Uint8Array) {
    this.extension = extension;
    this.publicKey = publicKey;
  }

  static async connect(): Promise<ExtensionWalletSigner> {
    // Connect to browser extension
    if (!(window as any).convexWallet) {
      throw new Error('Convex wallet extension not installed');
    }

    const extension = (window as any).convexWallet;
    await extension.connect();

    const accounts = await extension.getAccounts();
    if (accounts.length === 0) {
      throw new Error('No accounts found in wallet');
    }

    const publicKey = Buffer.from(accounts[0].publicKey, 'hex');
    return new ExtensionWalletSigner(extension, publicKey);
  }

  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    // Extension shows popup for user approval
    const messageHex = Buffer.from(message).toString('hex');
    const signatureHex = await this.extension.signMessage(messageHex);
    return Buffer.from(signatureHex, 'hex');
  }

  async signFor(publicKey: string, message: Uint8Array): Promise<Uint8Array> {
    const ourPubKeyHex = Buffer.from(this.publicKey).toString('hex');
    if (publicKey !== ourPubKeyHex) {
      throw new Error('Public key mismatch');
    }
    return this.sign(message);
  }
}

// Usage in browser
const signer = await ExtensionWalletSigner.connect();
convex.setSigner(signer);

// Get address from wallet
const address = await window.convexWallet.getAddress();
convex.setAddress(address);

// User approves in extension popup
await convex.transfer('#456', 1_000_000_000);
```

## Multi-Key Wallets

Some wallets manage multiple keys. Use `signFor()` to specify which key to use:

```typescript
class MultiKeyWalletSigner implements Signer {
  private keys: Map<string, Uint8Array>;
  private defaultKey: Uint8Array;

  constructor(keys: Array<{ publicKey: Uint8Array; privateKey: Uint8Array }>) {
    this.keys = new Map();
    for (const key of keys) {
      const pubKeyHex = Buffer.from(key.publicKey).toString('hex');
      this.keys.set(pubKeyHex, key.privateKey);
    }
    this.defaultKey = keys[0].publicKey;
  }

  getPublicKey(): Uint8Array {
    return this.defaultKey;
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    const defaultKeyHex = Buffer.from(this.defaultKey).toString('hex');
    return this.signFor(defaultKeyHex, message);
  }

  async signFor(publicKey: string, message: Uint8Array): Promise<Uint8Array> {
    const privateKey = this.keys.get(publicKey);
    if (!privateKey) {
      throw new Error(`No private key for ${publicKey}`);
    }

    // Sign with Ed25519
    const signature = await sign(message, privateKey);
    return signature;
  }
}

// Usage with multiple addresses
const signer = new MultiKeyWalletSigner([
  { publicKey: pubKey1, privateKey: privKey1 },
  { publicKey: pubKey2, privateKey: privKey2 }
]);

convex.setSigner(signer);

// Use first address
convex.setAddress('#1678');
await convex.transfer('#456', 1_000_000_000);

// Switch to second address (same signer)
convex.setAddress('#9999');
await convex.transfer('#789', 2_000_000);
```

## Remote Signing Service

Example for cloud-based signing:

```typescript
class RemoteSignerService implements Signer {
  private apiUrl: string;
  private apiKey: string;
  private publicKey: Uint8Array;

  constructor(apiUrl: string, apiKey: string, publicKey: Uint8Array) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
    this.publicKey = publicKey;
  }

  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    const messageHex = Buffer.from(message).toString('hex');

    const response = await fetch(`${this.apiUrl}/sign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: messageHex,
        publicKey: Buffer.from(this.publicKey).toString('hex')
      })
    });

    if (!response.ok) {
      throw new Error(`Signing failed: ${response.statusText}`);
    }

    const data = await response.json();
    return Buffer.from(data.signature, 'hex');
  }

  async signFor(publicKey: string, message: Uint8Array): Promise<Uint8Array> {
    const ourPubKeyHex = Buffer.from(this.publicKey).toString('hex');
    if (publicKey !== ourPubKeyHex) {
      throw new Error('Public key mismatch');
    }
    return this.sign(message);
  }
}

// Usage
const signer = new RemoteSignerService(
  'https://signing.example.com',
  process.env.API_KEY!,
  publicKeyBytes
);

convex.setSigner(signer);
convex.setAddress('#1678');
```

## Testing Signers

### Mock Signer for Tests

```typescript
class MockSigner implements Signer {
  private publicKey: Uint8Array;
  private shouldFail: boolean;

  constructor(shouldFail = false) {
    // Generate random public key
    this.publicKey = crypto.getRandomValues(new Uint8Array(32));
    this.shouldFail = shouldFail;
  }

  getPublicKey(): Uint8Array {
    return this.publicKey;
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    if (this.shouldFail) {
      throw new Error('Mock signing failure');
    }
    // Return mock signature
    return crypto.getRandomValues(new Uint8Array(64));
  }

  async signFor(publicKey: string, message: Uint8Array): Promise<Uint8Array> {
    return this.sign(message);
  }
}

// Use in tests
describe('Transaction tests', () => {
  it('should handle signing failures', async () => {
    const signer = new MockSigner(true);
    convex.setSigner(signer);

    await expect(
      convex.transfer('#456', 1_000_000_000)
    ).rejects.toThrow('Mock signing failure');
  });
});
```

## Error Handling

### User Rejection

```typescript
try {
  await convex.transfer('#456', 1_000_000_000);
} catch (error) {
  if (error.message.includes('rejected')) {
    console.log('User cancelled the transaction');
  } else if (error.message.includes('timeout')) {
    console.log('Signing timed out');
  } else {
    console.error('Signing error:', error);
  }
}
```

### Timeout Protection

```typescript
class TimeoutSigner implements Signer {
  private inner: Signer;
  private timeout: number;

  constructor(inner: Signer, timeout = 30000) {
    this.inner = inner;
    this.timeout = timeout;
  }

  getPublicKey(): Uint8Array {
    return this.inner.getPublicKey();
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    return Promise.race([
      this.inner.sign(message),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Signing timeout')), this.timeout)
      )
    ]);
  }

  async signFor(publicKey: string, message: Uint8Array): Promise<Uint8Array> {
    return this.inner.signFor(publicKey, message);
  }
}

// Usage
const hardwareSigner = new HardwareWalletSigner(wallet);
const timeoutSigner = new TimeoutSigner(hardwareSigner, 60000);  // 60s timeout

convex.setSigner(timeoutSigner);
```

## Best Practices

### ✅ Do

- Cache public keys (they don't change)
- Make signing operations async
- Provide clear user feedback during signing
- Implement proper error handling
- Validate public key matches before signing
- Use timeouts for user interactions

### ❌ Don't

- Block the main thread during signing
- Assume signing always succeeds
- Ignore user rejection
- Store private keys in custom signers (use secure storage)
- Skip signature validation

## Next Steps

- **[Accounts](./accounts)** — Account management
- **[Transactions](./transactions)** — Submit transactions

## See Also

- [Ed25519 Signatures](https://ed25519.cr.yp.to/)
