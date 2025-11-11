# React Native STOMP 连接问题解决方案

## 问题描述

在 React Native 环境中使用 `@stomp/stompjs` 连接 Spring Boot WebSocket 服务器时，连接失败并出现以下错误：

**前端日志**：
```
Connection not established in 15000ms, closing socket
```

**后端日志**：
```
TRACE o.s.messaging.simp.stomp.StompDecoder : Incomplete frame, resetting input buffer...
```

## 根本原因

STOMP 协议要求每个帧必须以 **NULL 字节 (`\x00`)** 结尾。然而，React Native 的 WebSocket 实现在发送**文本帧**时会自动截断 NULL 字节，导致：

1. 前端发送 60 字节的 CONNECT 帧（包含 `\x00`）
2. 后端只接收到 59 字节（缺少 `\x00`）
3. Spring Boot 的 `StompDecoder` 一直等待 NULL 终止符，报告 "Incomplete frame"
4. 连接超时失败

### 技术细节

**标准 STOMP CONNECT 帧格式**：
```
CONNECT\n
accept-version:1.2,1.1,1.0\n
heart-beat:10000,10000\n
\n
\x00  ← 必需的 NULL 终止符
```

**问题**：
- WebSocket 文本帧（`ws.send(string)`）在 React Native 中会丢失 NULL 字节
- WebSocket 二进制帧（`ws.send(ArrayBuffer)`）可以正确传输所有字节

## 解决方案

创建一个 WebSocket 包装器，拦截 STOMP 帧的发送，将其转换为二进制帧：

```typescript
class RNWebSocketWrapper {
  private ws: WebSocket;

  send(data: string | ArrayBuffer | Blob) {
    if (typeof data === 'string' && this.isStompFrame(data)) {
      // 将 STOMP 帧转换为二进制帧发送
      const encoder = new TextEncoder();
      const buffer = encoder.encode(data);
      this.ws.send(buffer);
    } else {
      this.ws.send(data);
    }
  }

  private isStompFrame(data: string): boolean {
    return /^(CONNECT|SEND|SUBSCRIBE|...)/.test(data);
  }
}
```

在 STOMP Client 配置中使用该包装器：

```typescript
const client = new Client({
  brokerURL: 'ws://localhost:8080/ws',
  webSocketFactory: () => new RNWebSocketWrapper(url) as any,
  // ... 其他配置
});
```

## 验证结果

**修复前**：
- 前端发送：60 bytes
- 后端接收：59 bytes ❌

**修复后**：
- 前端发送：60 bytes（二进制）
- 后端接收：60 bytes ✅
- 连接成功建立

## 关键要点

1. **环境特异性**：此问题仅出现在 React Native 环境，浏览器环境不受影响
2. **协议要求**：STOMP 协议强制要求 NULL 终止符
3. **解决策略**：通过二进制帧传输绕过 RN WebSocket 的字符串处理限制
4. **通用性**：该方案适用于所有需要在 React Native 中使用 STOMP 的场景

## 相关文件

- `src/services/StompService.tsx` - STOMP 服务实现
- `src/hooks/useGiftedChat.stomp.tsx` - React Hook 集成
- `src/screens/GiftedChatScreen.tsx` - UI 界面

## 参考

- STOMP 协议规范：https://stomp.github.io/stomp-specification-1.2.html
- @stomp/stompjs 文档：https://stomp-js.github.io/
- React Native WebSocket API
