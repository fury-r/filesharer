# `@filesharer/p2p-mcp`

Reusable browser-side TypeScript module for peer-to-peer MCP sessions over WebRTC.

## What it provides

- peer discovery through a signaling websocket
- SDP offer / answer exchange
- ICE candidate relay
- direct MCP tool calls over WebRTC data channels
- event callbacks for peer snapshots, tool catalogs, tool results, and connection state

## Build

From the repository frontend workspace:

```bash
cd app
npm run build:mcp-module
```

The compiled package is emitted to:

```bash
modules/filesharer-p2p-mcp/dist
```

## Example

```ts
import { FilesharerP2PMcpClient, TMcpTool } from '@filesharer/p2p-mcp';

const tools: TMcpTool[] = [
  {
    name: 'get_device_status',
    description: 'Return the current device health summary.',
    parameters: { device_id: 'edge-gateway-01' }
  }
];

const client = new FilesharerP2PMcpClient({
  signalingBaseUrl: 'ws://localhost:8001',
  identity: {
    peerName: 'Edge Gateway',
    role: 'provider',
    tools
  },
  toolCallHandler: async (message) => {
    if (message.tool === 'get_device_status') {
      return {
        device_id: 'edge-gateway-01',
        status: 'healthy',
        transport: 'webrtc-datachannel'
      };
    }

    return { error: `Unknown tool: ${message.tool}` };
  }
});

await client.connect('24f5e189');
```

## Signaling contract

This package expects a signaling backend that exposes:

- `GET /v1/mcp/session/`
- `GET /v1/mcp/session/<session_id>/`
- `ws://<host>/ws/mcp/<session_id>/<peer_id>`

In this repository, Django Channels provides that signaling layer while MCP payloads remain peer-to-peer over WebRTC.
