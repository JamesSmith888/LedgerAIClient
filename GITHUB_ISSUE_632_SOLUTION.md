# Solution for Issue #632: Connection keep closing on React Native

## Problem Analysis

**Yes, this is the exact same issue!** The root cause is that React Native's WebSocket implementation **truncates NULL bytes (`\x00`)** when sending text frames, but STOMP protocol **requires** every frame to end with a NULL byte.

### What's happening:

1. `@stomp/stompjs` sends a CONNECT frame like this (60 bytes):
   ```
   CONNECT\n
   accept-version:1.2,1.1,1.0\n
   heart-beat:10000,10000\n
   \n
   \x00  ← NULL terminator (required by STOMP spec)
   ```

2. React Native WebSocket sends it as a **text frame**, which strips the `\x00`

3. Backend receives only **59 bytes** (missing the NULL terminator)

4. Spring Boot's `StompDecoder` waits forever for the `\x00`, reports "Incomplete frame"

5. Connection times out and closes

### Why `appendMissingNULLonIncoming` and `forceBinaryWSFrames` don't work:

- `appendMissingNULLonIncoming`: Only affects **incoming** messages, not outgoing
- `forceBinaryWSFrames`: This flag is for the **entire connection**, but doesn't solve the encoding issue in RN

## Solution

Create a WebSocket wrapper that intercepts STOMP frames and sends them as **binary frames** (ArrayBuffer) instead of text frames. Binary frames preserve all bytes including NULL.

### Step 1: Install required dependency

```bash
npm install text-encoding
```

### Step 2: Create the WebSocket wrapper

```javascript
// Add polyfills first
import * as encoding from 'text-encoding';
Object.assign(global, {
  TextEncoder: encoding.TextEncoder,
  TextDecoder: encoding.TextDecoder,
});

/**
 * WebSocket wrapper for React Native
 * Converts STOMP frames to binary to preserve NULL terminator
 */
class RNWebSocketWrapper {
  constructor(url) {
    this.ws = new WebSocket(url);
  }

  // Proxy all WebSocket properties
  get readyState() { return this.ws.readyState; }
  get url() { return this.ws.url; }
  get protocol() { return this.ws.protocol; }
  get binaryType() { return this.ws.binaryType; }
  set binaryType(value) { this.ws.binaryType = value; }

  // Proxy event handlers
  set onopen(handler) { this.ws.onopen = handler; }
  set onclose(handler) { this.ws.onclose = handler; }
  set onerror(handler) { this.ws.onerror = handler; }
  set onmessage(handler) { this.ws.onmessage = handler; }

  get onopen() { return this.ws.onopen; }
  get onclose() { return this.ws.onclose; }
  get onerror() { return this.ws.onerror; }
  get onmessage() { return this.ws.onmessage; }

  // KEY FIX: Intercept send() method
  send(data) {
    if (typeof data === 'string' && this.isStompFrame(data)) {
      // Convert STOMP frame to binary
      const encoder = new TextEncoder();
      const buffer = encoder.encode(data);
      this.ws.send(buffer);
    } else {
      this.ws.send(data);
    }
  }

  isStompFrame(data) {
    return /^(CONNECT|SEND|SUBSCRIBE|UNSUBSCRIBE|BEGIN|COMMIT|ABORT|ACK|NACK|DISCONNECT)/.test(data);
  }

  close(code, reason) {
    this.ws.close(code, reason);
  }

  addEventListener(type, listener) {
    this.ws.addEventListener(type, listener);
  }

  removeEventListener(type, listener) {
    this.ws.removeEventListener(type, listener);
  }
}
```

### Step 3: Use the wrapper in STOMP Client

```javascript
import { Client } from '@stomp/stompjs';
import 'react-native-url-polyfill/auto';

const client = new Client({
  brokerURL: 'ws://localhost:8080/ws',
  
  // KEY: Use the wrapper instead of default WebSocket
  webSocketFactory: () => {
    return new RNWebSocketWrapper('ws://localhost:8080/ws');
  },
  
  connectionTimeout: 15000,
  heartbeatIncoming: 10000,
  heartbeatOutgoing: 10000,
  
  onConnect: (frame) => {
    console.log('✅ Connected successfully!');
  },
  
  onStompError: (frame) => {
    console.error('STOMP error:', frame);
  },
  
  debug: (str) => {
    console.log('[STOMP]', str);
  },
});

client.activate();
```

## Why This Works

**Before fix:**
- Frontend sends: 60 bytes (text frame)
- Backend receives: 59 bytes ❌ (NULL byte stripped)
- Result: "Incomplete frame" error

**After fix:**
- Frontend sends: 60 bytes (binary frame via ArrayBuffer)
- Backend receives: 60 bytes ✅ (NULL byte preserved)
- Result: Connection succeeds!

## TypeScript Version

If you're using TypeScript, here's the complete implementation:

```typescript
import { Client, StompSubscription } from '@stomp/stompjs';
import 'react-native-url-polyfill/auto';

// Setup polyfills
const textEncoding = require('text-encoding');
if (typeof (globalThis as any).TextEncoder === 'undefined') {
  (globalThis as any).TextEncoder = textEncoding.TextEncoder;
}
if (typeof (globalThis as any).TextDecoder === 'undefined') {
  (globalThis as any).TextDecoder = textEncoding.TextDecoder;
}

class RNWebSocketWrapper {
  private ws: WebSocket;

  constructor(url: string) {
    this.ws = new WebSocket(url);
  }

  get readyState() { return this.ws.readyState; }
  get url() { return (this.ws as any).url; }
  get protocol() { return (this.ws as any).protocol; }
  get binaryType() { return (this.ws as any).binaryType; }
  set binaryType(value: any) { (this.ws as any).binaryType = value; }

  set onopen(handler: any) { this.ws.onopen = handler; }
  set onclose(handler: any) { this.ws.onclose = handler; }
  set onerror(handler: any) { this.ws.onerror = handler; }
  set onmessage(handler: any) { this.ws.onmessage = handler; }

  get onopen() { return this.ws.onopen; }
  get onclose() { return this.ws.onclose; }
  get onerror() { return this.ws.onerror; }
  get onmessage() { return this.ws.onmessage; }

  send(data: string | ArrayBuffer | Blob) {
    if (typeof data === 'string' && this.isStompFrame(data)) {
      const encoder = new (globalThis as any).TextEncoder();
      const buffer = encoder.encode(data);
      this.ws.send(buffer);
    } else {
      this.ws.send(data);
    }
  }

  private isStompFrame(data: string): boolean {
    return /^(CONNECT|SEND|SUBSCRIBE|UNSUBSCRIBE|BEGIN|COMMIT|ABORT|ACK|NACK|DISCONNECT)/.test(data);
  }

  close(code?: number, reason?: string) {
    this.ws.close(code, reason);
  }

  addEventListener(type: string, listener: any) {
    (this.ws as any).addEventListener(type, listener);
  }

  removeEventListener(type: string, listener: any) {
    (this.ws as any).removeEventListener(type, listener);
  }
}

// Usage
const client = new Client({
  brokerURL: 'ws://localhost:8080/ws',
  webSocketFactory: () => new RNWebSocketWrapper('ws://localhost:8080/ws') as any,
  // ... rest of your config
});
```

## Tested Environment

- ✅ React Native v0.82.0
- ✅ @stomp/stompjs v7.2.1
- ✅ Spring Boot 3.x with WebSocket
- ✅ Android physical device
- ✅ iOS simulator

## Key Takeaways

1. **The problem is RN-specific**: Browser environments work fine
2. **Root cause**: Text frames strip NULL bytes in React Native
3. **Solution**: Convert STOMP frames to binary (ArrayBuffer)
4. **No backend changes needed**: This is purely a client-side fix

## Additional Notes

- Remove `appendMissingNULLonIncoming: true` and `forceBinaryWSFrames: true` from your config - they're not needed with this solution
- No need to downgrade to v5.4.0 - this works with the latest version
- This solution is protocol-compliant and maintains full STOMP functionality

Hope this helps! 🎉
