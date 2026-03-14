export type TMcpRole = 'provider' | 'client';

export type TMcpTool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

export type TMcpPeer = {
  peer_id: string;
  name: string;
  role: TMcpRole;
  tools: TMcpTool[];
  updated_at: number;
};

export type TMcpSessionResponse = {
  session_id: string;
  created_at?: number;
  peer_count: number;
  peers: TMcpPeer[];
  transport: 'webrtc-datachannel';
  signaling_transport: 'websocket';
};

export type TMcpSignalPayload = {
  candidate?: RTCIceCandidateInit;
  sdp?: string;
  type?: RTCSdpType;
};

export type TMcpSignalMessage = {
  type: 'signal';
  session_id: string;
  from_peer_id: string;
  target_peer_id?: string;
  signal_type: 'offer' | 'answer' | 'ice';
  payload: TMcpSignalPayload;
};

export type TMcpPeerSnapshotMessage = {
  type: 'peer_snapshot';
  session_id: string;
  created_at?: number;
  peer_count: number;
  peers: TMcpPeer[];
};

export type TMcpMessage =
  | {
      type: 'tool_catalog';
      tools: TMcpTool[];
      peerName: string;
    }
  | {
      type: 'tool_call';
      requestId: string;
      tool: string;
      parameters: Record<string, unknown>;
    }
  | {
      type: 'tool_result';
      requestId: string;
      tool: string;
      result: unknown;
      ok: boolean;
    };

export type TMcpTimelineEvent = {
  id: string;
  direction: 'system' | 'outbound' | 'inbound';
  title: string;
  detail: string;
  timestamp: string;
};

export type TMcpConnectionState = {
  signalingState: 'idle' | 'connecting' | 'ready' | 'closed';
  webrtcState: string;
  channelState: 'idle' | 'opening' | 'open' | 'closed';
};

export type TMcpClientIdentity = {
  peerId?: string;
  peerName: string;
  role: TMcpRole;
  tools?: TMcpTool[];
};

export type TMcpClientOptions = {
  signalingBaseUrl?: string;
  rtcConfiguration?: RTCConfiguration;
  identity: TMcpClientIdentity;
  toolCallHandler?: (message: Extract<TMcpMessage, { type: 'tool_call' }>) => Promise<unknown> | unknown;
  onConnectionStateChange?: (state: TMcpConnectionState) => void;
  onPeerSnapshot?: (snapshot: TMcpPeerSnapshotMessage) => void;
  onTimelineEvent?: (event: TMcpTimelineEvent) => void;
  onToolCatalog?: (message: Extract<TMcpMessage, { type: 'tool_catalog' }>) => void;
  onToolResult?: (message: Extract<TMcpMessage, { type: 'tool_result' }>) => void;
};
