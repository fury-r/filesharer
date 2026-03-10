# `@filesharer/p2p-mcp`

Reusable browser-side TypeScript module for peer-to-peer MCP sessions over WebRTC.

## What it provides

- peer discovery through a signaling websocket
- SDP offer / answer exchange
- ICE candidate relay
- direct MCP tool calls over WebRTC data channels
- event callbacks for peer snapshots, tool catalogs, tool results, and connection state

## Use case

This module is useful when an AI client needs to call tools on a nearby browser or edge device without sending the tool payloads through a central server.

For example, you can use it in a support or operations dashboard where:

- a browser-based AI assistant connects to a field gateway or kiosk
- the server is only used to help the two peers discover each other
- diagnostics, log access, and device actions are exchanged directly over WebRTC

Why use it:

- sensitive tool inputs and results stay on the peer-to-peer channel
- it reduces server bandwidth because MCP traffic does not need to be proxied
- it works well for local-device, edge-device, or privacy-first assistant workflows

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
