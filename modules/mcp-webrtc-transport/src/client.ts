import {
  TMcpClientIdentity,
  TMcpClientOptions,
  TMcpConnectionState,
  TMcpMessage,
  TMcpPeerSnapshotMessage,
  TMcpSignalMessage,
  TMcpTimelineEvent,
  TMcpTool
} from './types';

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const createTimelineEvent = (
  direction: TMcpTimelineEvent['direction'],
  title: string,
  detail: string
): TMcpTimelineEvent => ({
  id: createId(),
  direction,
  title,
  detail,
  timestamp: new Date().toLocaleTimeString()
});

export class P2PMcpClient {
  private readonly signalingBaseUrl?: string;
  private readonly rtcConfiguration?: RTCConfiguration;
  private readonly onConnectionStateChange?: TMcpClientOptions['onConnectionStateChange'];
  private readonly onPeerSnapshot?: TMcpClientOptions['onPeerSnapshot'];
  private readonly onTimelineEvent?: TMcpClientOptions['onTimelineEvent'];
  private readonly onToolCatalog?: TMcpClientOptions['onToolCatalog'];
  private readonly onToolResult?: TMcpClientOptions['onToolResult'];
  private readonly toolCallHandler?: TMcpClientOptions['toolCallHandler'];
  private websocket: WebSocket | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private identity: Required<TMcpClientIdentity>;
  private sessionId = '';
  private offerStarted = false;
  private queuedIceCandidates: RTCIceCandidateInit[] = [];
  private connectionState: TMcpConnectionState = {
    signalingState: 'idle',
    webrtcState: 'idle',
    channelState: 'idle'
  };

  constructor(options: TMcpClientOptions) {
    this.signalingBaseUrl = options.signalingBaseUrl;
    this.rtcConfiguration = options.rtcConfiguration;
    this.onConnectionStateChange = options.onConnectionStateChange;
    this.onPeerSnapshot = options.onPeerSnapshot;
    this.onTimelineEvent = options.onTimelineEvent;
    this.onToolCatalog = options.onToolCatalog;
    this.onToolResult = options.onToolResult;
    this.toolCallHandler = options.toolCallHandler;
    this.identity = {
      peerId: options.identity.peerId || createId().slice(0, 8),
      peerName: options.identity.peerName,
      role: options.identity.role,
      tools: options.identity.tools || []
    };
  }

  get peerId() {
    return this.identity.peerId;
  }

  updateIdentity(identity: Partial<Omit<TMcpClientIdentity, 'peerId'>> & { tools?: TMcpTool[] }) {
    this.identity = {
      ...this.identity,
      ...identity,
      tools: identity.tools || (identity.role === 'provider' ? this.identity.tools : [])
    };

    if (this.websocket?.readyState === WebSocket.OPEN) {
      this.publishPeerPresence();
    }
  }

  async connect(sessionId: string) {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    if (!this.signalingBaseUrl) {
      throw new Error('signalingBaseUrl is required for websocket signaling mode');
    }

    this.disconnect();
    this.sessionId = sessionId;
    this.updateConnectionState({ signalingState: 'connecting' });
    this.websocket = new WebSocket(`${this.signalingBaseUrl}/ws/mcp/${sessionId}/${this.identity.peerId}`);

    this.websocket.onopen = () => {
      this.updateConnectionState({ signalingState: 'ready' });
      this.publishTimeline('system', 'Signaling connected', 'Using Django Channels only for SDP and ICE exchange');
      this.publishPeerPresence();
    };

    this.websocket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as TMcpSignalMessage | TMcpPeerSnapshotMessage;
      if (payload.type === 'signal') {
        void this.handleSignalMessage(payload);
        return;
      }
      this.handlePeerSnapshot(payload);
    };

    this.websocket.onclose = () => {
      this.updateConnectionState({ signalingState: 'closed' });
    };
  }

  disconnect() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    if (this.websocket) {
      this.websocket.close();
    }

    this.websocket = null;
    this.dataChannel = null;
    this.peerConnection = null;
    this.offerStarted = false;
    this.queuedIceCandidates = [];
    this.updateConnectionState({
      signalingState: this.sessionId ? 'closed' : 'idle',
      webrtcState: 'idle',
      channelState: 'idle'
    });
  }

  sendToolCall(tool: string, parameters: Record<string, unknown>) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      throw new Error('The peer-to-peer data channel is not ready');
    }

    const requestId = createId();
    const message: Extract<TMcpMessage, { type: 'tool_call' }> = {
      type: 'tool_call',
      requestId,
      tool,
      parameters
    };

    this.dataChannel.send(JSON.stringify(message));
    this.publishTimeline('outbound', `Tool call • ${tool}`, JSON.stringify(parameters, null, 2));
    return requestId;
  }

  
  async createManualOffer() {
    this.disconnectPeerConnection();
    this.updateConnectionState({ signalingState: 'ready' });
    this.publishTimeline('system', 'Manual signaling', 'Created local provider offer without backend signaling');

    const connection = this.createPeerConnection('', true, false);
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await this.waitForIceGatheringComplete(connection);

    const localDescription = connection.localDescription;
    if (!localDescription?.sdp) {
      throw new Error('Failed to create manual offer');
    }

    return {
      type: localDescription.type,
      sdp: localDescription.sdp
    };
  }

  async createManualAnswer(offer: { sdp: string; type?: RTCSdpType }) {
    this.disconnectPeerConnection();
    this.updateConnectionState({ signalingState: 'ready' });
    this.publishTimeline('inbound', 'Manual offer received', 'Applying offer payload pasted from the provider peer');

    const connection = this.createPeerConnection('', false, false);
    await connection.setRemoteDescription(
      new RTCSessionDescription({
        type: offer.type || 'offer',
        sdp: offer.sdp
      })
    );

    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);
    await this.waitForIceGatheringComplete(connection);

    const localDescription = connection.localDescription;
    if (!localDescription?.sdp) {
      throw new Error('Failed to create manual answer');
    }

    return {
      type: localDescription.type,
      sdp: localDescription.sdp
    };
  }

  async applyManualAnswer(answer: { sdp: string; type?: RTCSdpType }) {
    if (!this.peerConnection) {
      throw new Error('No pending offer exists. Create an offer first.');
    }

    await this.peerConnection.setRemoteDescription(
      new RTCSessionDescription({
        type: answer.type || 'answer',
        sdp: answer.sdp
      })
    );

    await this.applyQueuedIceCandidates();
    this.publishTimeline('inbound', 'Manual answer applied', 'Provider applied answer payload and is waiting for data channel open');
  }

  private publishPeerPresence() {
    this.websocket?.send(
      JSON.stringify({
        type: 'peer_announce',
        name: this.identity.peerName.trim() || (this.identity.role === 'provider' ? 'Edge Gateway' : 'AI Client'),
        role: this.identity.role,
        tools: this.identity.role === 'provider' ? this.identity.tools : []
      })
    );
  }

  private sendSignalMessage(targetPeerId: string, signalType: TMcpSignalMessage['signal_type'], payload: TMcpSignalMessage['payload']) {
    this.websocket?.send(
      JSON.stringify({
        type: 'signal',
        target_peer_id: targetPeerId,
        signal_type: signalType,
        payload
      })
    );
  }

  private publishTimeline(direction: TMcpTimelineEvent['direction'], title: string, detail: string) {
    this.onTimelineEvent?.(createTimelineEvent(direction, title, detail));
  }

  private updateConnectionState(nextState: Partial<TMcpConnectionState>) {
    this.connectionState = {
      ...this.connectionState,
      ...nextState
    };
    this.onConnectionStateChange?.(this.connectionState);
  }

  private attachDataChannel(channel: RTCDataChannel) {
    this.dataChannel = channel;
    this.updateConnectionState({ channelState: channel.readyState === 'open' ? 'open' : 'opening' });

    channel.onopen = () => {
      this.updateConnectionState({ channelState: 'open' });
      this.publishTimeline('system', 'Data channel open', 'MCP messages are now moving peer-to-peer over WebRTC');
      if (this.identity.role === 'provider') {
        channel.send(
          JSON.stringify({
            type: 'tool_catalog',
            tools: this.identity.tools,
            peerName: this.identity.peerName
          } satisfies Extract<TMcpMessage, { type: 'tool_catalog' }>)
        );
      }
    };

    channel.onclose = () => {
      this.updateConnectionState({ channelState: 'closed' });
      this.publishTimeline('system', 'Data channel closed', 'The direct peer link was closed');
    };

    channel.onmessage = (event) => {
      void this.handleChannelMessage(event.data);
    };
  }

  private async waitForIceGatheringComplete(connection: RTCPeerConnection) {
    if (connection.iceGatheringState === 'complete') {
      return;
    }

    await new Promise<void>((resolve) => {
      const listener = () => {
        if (connection.iceGatheringState === 'complete') {
          connection.removeEventListener('icegatheringstatechange', listener);
          resolve();
        }
      };
      connection.addEventListener('icegatheringstatechange', listener);
    });
  }

  private createPeerConnection(targetPeerId: string, shouldCreateDataChannel: boolean, shouldRelayIce = true) {
    const connection = new RTCPeerConnection(this.rtcConfiguration);
    this.peerConnection = connection;
    this.updateConnectionState({ webrtcState: 'negotiating' });

    connection.onconnectionstatechange = () => {
      this.updateConnectionState({ webrtcState: connection.connectionState });
    };

    connection.onicecandidate = (event) => {
      if (event.candidate && shouldRelayIce && targetPeerId) {
        this.sendSignalMessage(targetPeerId, 'ice', {
          candidate: event.candidate.toJSON()
        });
      }
    };

    connection.ondatachannel = (event) => {
      this.attachDataChannel(event.channel);
    };

    if (shouldCreateDataChannel) {
      this.attachDataChannel(connection.createDataChannel('mcp-tools', { ordered: true }));
    }

    return connection;
  }

  private async startOffer(targetPeerId: string) {
    if (this.offerStarted) {
      return;
    }

    this.offerStarted = true;
    this.publishTimeline('system', 'Negotiating WebRTC', `Creating an SDP offer for peer ${targetPeerId}`);
    const connection = this.createPeerConnection(targetPeerId, true);
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    this.sendSignalMessage(targetPeerId, 'offer', {
      sdp: offer.sdp,
      type: offer.type
    });
  }

  private async applyQueuedIceCandidates() {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) {
      return;
    }

    for (const candidate of this.queuedIceCandidates) {
      await this.peerConnection.addIceCandidate(candidate);
    }
    this.queuedIceCandidates = [];
  }

  private handlePeerSnapshot(snapshot: TMcpPeerSnapshotMessage) {
    this.onPeerSnapshot?.(snapshot);
    const peers = snapshot.peers.filter((peer) => peer.peer_id !== this.identity.peerId);
    const providerPeer = peers.find((peer) => peer.role === 'provider');

    if (this.identity.role === 'client' && providerPeer && !this.peerConnection && !this.offerStarted) {
      void this.startOffer(providerPeer.peer_id);
    }

    if (!providerPeer && this.identity.role === 'client') {
      this.disconnectPeerConnection();
    }
  }

  private async handleSignalMessage(message: TMcpSignalMessage) {
    if (message.target_peer_id && message.target_peer_id !== this.identity.peerId) {
      return;
    }

    if (message.signal_type === 'offer') {
      this.publishTimeline('inbound', 'Received offer', `Peer ${message.from_peer_id} requested a direct MCP channel`);
      const connection = this.createPeerConnection(message.from_peer_id, false);
      await connection.setRemoteDescription(
        new RTCSessionDescription({
          type: message.payload.type || 'offer',
          sdp: message.payload.sdp || ''
        })
      );
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);
      await this.applyQueuedIceCandidates();
      this.sendSignalMessage(message.from_peer_id, 'answer', {
        sdp: answer.sdp,
        type: answer.type
      });
      return;
    }

    if (!this.peerConnection) {
      return;
    }

    if (message.signal_type === 'answer') {
      this.publishTimeline('inbound', 'Received answer', `Peer ${message.from_peer_id} accepted the direct link`);
      await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription({
          type: message.payload.type || 'answer',
          sdp: message.payload.sdp || ''
        })
      );
      await this.applyQueuedIceCandidates();
      return;
    }

    if (message.signal_type === 'ice' && message.payload.candidate) {
      if (this.peerConnection.remoteDescription) {
        await this.peerConnection.addIceCandidate(message.payload.candidate);
        return;
      }
      this.queuedIceCandidates.push(message.payload.candidate);
    }
  }

  private async handleChannelMessage(rawMessage: string) {
    const message = JSON.parse(rawMessage) as TMcpMessage;

    if (message.type === 'tool_catalog') {
      this.onToolCatalog?.(message);
      this.publishTimeline('inbound', 'Tool catalog synced', `${message.tools.length} tools published by ${message.peerName}`);
      return;
    }

    if (message.type === 'tool_call') {
      this.publishTimeline('inbound', `Tool call • ${message.tool}`, JSON.stringify(message.parameters, null, 2));
      if (!this.toolCallHandler || !this.dataChannel) {
        return;
      }

      const result = await this.toolCallHandler(message);
      this.dataChannel.send(
        JSON.stringify({
          type: 'tool_result',
          requestId: message.requestId,
          tool: message.tool,
          result,
          ok: !('error' in (result as Record<string, unknown>))
        } satisfies Extract<TMcpMessage, { type: 'tool_result' }>)
      );
      this.publishTimeline('outbound', `Tool result • ${message.tool}`, 'Result returned directly over the encrypted data channel');
      return;
    }

    this.onToolResult?.(message);
    this.publishTimeline('inbound', `Tool result • ${message.tool}`, message.ok ? 'Received a successful peer response' : 'Peer returned an error');
  }

  private disconnectPeerConnection() {
    if (this.dataChannel) {
      this.dataChannel.close();
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.dataChannel = null;
    this.peerConnection = null;
    this.offerStarted = false;
    this.queuedIceCandidates = [];
    this.updateConnectionState({
      webrtcState: 'idle',
      channelState: 'idle'
    });
  }
}
