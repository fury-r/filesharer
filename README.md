# mcp-webrtc-transport

Monorepo for a WebRTC-based MCP transport demo and the reusable `@filesharer/p2p-mcp` package.

## Repository layout

- `app/` — React + Vite frontend with the PeerMCP demo UI
- `backend/` — Django + Channels signaling backend
- `modules/filesharer-p2p-mcp/` — reusable browser-side TypeScript package

## P2P MCP transport

The reusable MCP transport in `modules/filesharer-p2p-mcp` is designed for:

- peer discovery through a signaling websocket
- SDP offer / answer exchange
- ICE candidate relay
- direct MCP tool calls over WebRTC data channels
- privacy-first, low-latency tool execution

### Screenshots

![Peer MCP overview](./docs/assets/peer-mcp-overview.png)

![Peer MCP session setup](./docs/assets/peer-mcp-session-setup.png)

### Quick snippets

#### TypeScript

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

#### Python interoperability

```py
async def handle_tool_call(message: dict) -> dict:
    if message["tool"] == "get_device_status":
        return {
            "device_id": message["parameters"].get("device_id", "edge-gateway-01"),
            "status": "healthy",
            "transport": "webrtc-datachannel",
        }
    return {"error": f"Unknown tool: {message['tool']}"}

# This transport is a browser-side TypeScript package. Python peers usually
# interoperate by implementing the same signaling contract and exchanging the
# same MCP JSON messages over a WebRTC data channel.
```

For a fuller guide, including reusable screenshot URLs and longer TypeScript/Python examples, see [`docs.md`](./docs.md).

## Local development

### Backend

```bash
cd backend
pip install -r requirements.txt
python manage.py migrate
daphne -p 8001 mysite.asgi:application
```

### Frontend

```bash
cd app
npm install --legacy-peer-deps
npm run dev
```

### Build the reusable package

```bash
cd app
npm run build:mcp-module
```

## Package publishing

The npm-publishable package in this repository is:

- `@filesharer/p2p-mcp`

It lives in:

```bash
modules/filesharer-p2p-mcp
```

The repository includes a manual publish workflow at:

```bash
.github/workflows/npm-publish.yaml
```

## Additional documentation

- [`docs.md`](./docs.md) — screenshot usage and expanded TS/Python guidance
- [`modules/filesharer-p2p-mcp/README.md`](./modules/filesharer-p2p-mcp/README.md) — package-focused README

## License

This project is licensed under the Apache 2.0 License. See [`LICENSE`](./LICENSE).
