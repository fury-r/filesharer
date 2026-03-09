import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { useService } from '../../../api/service/useService';
import { TMcpMessage, TMcpPeer, TMcpRole, TMcpSessionResponse, TMcpSignalMessage, TMcpTimelineEvent, TMcpTool } from '../../../types/mcp';

const LOCAL_MCP_TOOLS: TMcpTool[] = [
  {
    name: 'get_device_status',
    description: 'Return the live status of the peer device and transport health.',
    parameters: {
      device_id: 'edge-gateway-01'
    }
  },
  {
    name: 'get_recent_logs',
    description: 'Read a limited number of recent edge logs without syncing the full dataset.',
    parameters: {
      device_id: 'thermostat_4',
      limit: 5
    }
  },
  {
    name: 'run_diagnostics',
    description: 'Run an on-device health check and summarize the result.',
    parameters: {
      device_id: 'thermostat_4',
      include_network: true
    }
  },
  {
    name: 'restart_device',
    description: 'Simulate a protected restart request that remains on the peer device.',
    parameters: {
      device_id: 'thermostat_4',
      reason: 'apply_config'
    }
  }
];

const TOOL_PARAMETER_MAP = LOCAL_MCP_TOOLS.reduce<Record<string, string>>((acc, tool) => {
  acc[tool.name] = JSON.stringify(tool.parameters, null, 2);
  return acc;
}, {});

const getSocketBaseUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${import.meta.env.VITE_API_ENDPOINT || 'localhost:8001'}`;
};

const createTimelineEvent = (direction: TMcpTimelineEvent['direction'], title: string, detail: string): TMcpTimelineEvent => ({
  id: uuidv4(),
  direction,
  title,
  detail,
  timestamp: new Date().toLocaleTimeString()
});

const clampTimeline = (events: TMcpTimelineEvent[]) => events.slice(-16);

export const usePeerMcp = () => {
  const { createMcpSession, getMcpSession } = useService();
  const localPeerId = useMemo(() => uuidv4().slice(0, 8), []);
  const [role, setRole] = useState<TMcpRole>('provider');
  const [peerName, setPeerName] = useState('Edge Gateway');
  const [sessionInput, setSessionInput] = useState('');
  const [session, setSession] = useState<TMcpSessionResponse | null>(null);
  const [remotePeers, setRemotePeers] = useState<TMcpPeer[]>([]);
  const [remoteTools, setRemoteTools] = useState<TMcpTool[]>([]);
  const [selectedTool, setSelectedTool] = useState(LOCAL_MCP_TOOLS[0].name);
  const [parametersText, setParametersText] = useState(TOOL_PARAMETER_MAP[LOCAL_MCP_TOOLS[0].name]);
  const [timeline, setTimeline] = useState<TMcpTimelineEvent[]>([]);
  const [lastResult, setLastResult] = useState('');
  const [signalingState, setSignalingState] = useState<'idle' | 'connecting' | 'ready' | 'closed'>('idle');
  const [webrtcState, setWebrtcState] = useState('idle');
  const [channelState, setChannelState] = useState<'idle' | 'opening' | 'open' | 'closed'>('idle');
  const [isBusy, setIsBusy] = useState(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const remotePeerIdRef = useRef<string>();
  const offerStartedRef = useRef(false);
  const queuedIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  const appendTimeline = useCallback((direction: TMcpTimelineEvent['direction'], title: string, detail: string) => {
    setTimeline((previous) => clampTimeline([...previous, createTimelineEvent(direction, title, detail)]));
  }, []);

  const resetPeerConnection = useCallback(() => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close();
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    dataChannelRef.current = null;
    peerConnectionRef.current = null;
    remotePeerIdRef.current = undefined;
    offerStartedRef.current = false;
    queuedIceCandidatesRef.current = [];
    setWebrtcState(session ? 'signaling-ready' : 'idle');
    setChannelState('idle');
  }, [session]);

  const publishPeerPresence = useCallback(
    (nextRole: TMcpRole) => {
      websocketRef.current?.send(
        JSON.stringify({
          type: 'peer_announce',
          name: peerName.trim() || (nextRole === 'provider' ? 'Edge Gateway' : 'AI Client'),
          role: nextRole,
          tools: nextRole === 'provider' ? LOCAL_MCP_TOOLS : []
        })
      );
    },
    [peerName]
  );

  const sendSignalMessage = useCallback((targetPeerId: string, signalType: TMcpSignalMessage['signal_type'], payload: TMcpSignalMessage['payload']) => {
    websocketRef.current?.send(
      JSON.stringify({
        type: 'signal',
        target_peer_id: targetPeerId,
        signal_type: signalType,
        payload
      })
    );
  }, []);

  const getProviderResult = useCallback(
    (toolName: string, parameters: Record<string, unknown>) => {
      const deviceId = String(parameters.device_id || 'edge-gateway-01');
      switch (toolName) {
        case 'get_device_status':
          return {
            device_id: deviceId,
            session_id: session?.session_id,
            peer: peerName,
            transport: 'webrtc-datachannel',
            status: 'healthy',
            active_peers: remotePeers.length + 1,
            last_seen: new Date().toISOString()
          };
        case 'get_recent_logs':
          return Array.from({ length: Math.min(Number(parameters.limit) || 5, 10) }, (_, index) => ({
            timestamp: new Date(Date.now() - index * 60_000).toISOString(),
            level: index === 0 ? 'warning' : 'info',
            message: `${deviceId}: telemetry window ${index + 1} stayed on the peer device`
          }));
        case 'run_diagnostics':
          return {
            device_id: deviceId,
            checks: {
              cpu: 'nominal',
              memory: 'nominal',
              network: parameters.include_network ? 'direct-peer-link-ready' : 'skipped'
            },
            recommendation: 'No action required'
          };
        case 'restart_device':
          return {
            device_id: deviceId,
            status: 'queued',
            authorization: 'local-confirmation-required',
            reason: parameters.reason || 'unspecified'
          };
        default:
          return {
            error: `Unknown tool: ${toolName}`
          };
      }
    },
    [peerName, remotePeers.length, session?.session_id]
  );

  const handleDataChannelMessage = useCallback(
    (rawMessage: string) => {
      const message = JSON.parse(rawMessage) as TMcpMessage;

      if (message.type === 'tool_catalog') {
        setRemoteTools(message.tools);
        appendTimeline('inbound', 'Tool catalog synced', `${message.tools.length} tools published by ${message.peerName}`);
        if (message.tools.length > 0) {
          setSelectedTool(message.tools[0].name);
          setParametersText(JSON.stringify(message.tools[0].parameters, null, 2));
        }
        return;
      }

      if (message.type === 'tool_call') {
        appendTimeline('inbound', `Tool call • ${message.tool}`, JSON.stringify(message.parameters, null, 2));
        if (role !== 'provider' || !dataChannelRef.current) {
          return;
        }

        const result = getProviderResult(message.tool, message.parameters);
        dataChannelRef.current.send(
          JSON.stringify({
            type: 'tool_result',
            requestId: message.requestId,
            tool: message.tool,
            result,
            ok: !('error' in (result as Record<string, unknown>))
          })
        );
        appendTimeline('outbound', `Tool result • ${message.tool}`, 'Result returned directly over the encrypted data channel');
        return;
      }

      if (message.type === 'tool_result') {
        setLastResult(JSON.stringify(message.result, null, 2));
        appendTimeline('inbound', `Tool result • ${message.tool}`, message.ok ? 'Received a successful peer response' : 'Peer returned an error');
      }
    },
    [appendTimeline, getProviderResult, role]
  );

  const attachDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dataChannelRef.current = channel;
      setChannelState(channel.readyState === 'open' ? 'open' : 'opening');

      channel.onopen = () => {
        setChannelState('open');
        appendTimeline('system', 'Data channel open', 'MCP messages are now moving peer-to-peer over WebRTC');
        if (role === 'provider') {
          channel.send(
            JSON.stringify({
              type: 'tool_catalog',
              tools: LOCAL_MCP_TOOLS,
              peerName
            })
          );
        }
      };

      channel.onclose = () => {
        setChannelState('closed');
        appendTimeline('system', 'Data channel closed', 'The direct peer link was closed');
      };

      channel.onerror = () => {
        toast.error('The MCP data channel encountered an error');
      };

      channel.onmessage = (event) => {
        handleDataChannelMessage(event.data);
      };
    },
    [appendTimeline, handleDataChannelMessage, peerName, role]
  );

  const applyQueuedIceCandidates = useCallback(async () => {
    if (!peerConnectionRef.current || !peerConnectionRef.current.remoteDescription) {
      return;
    }

    for (const candidate of queuedIceCandidatesRef.current) {
      await peerConnectionRef.current.addIceCandidate(candidate);
    }
    queuedIceCandidatesRef.current = [];
  }, []);

  const createPeerConnection = useCallback(
    (targetPeerId: string, shouldCreateDataChannel: boolean) => {
      const connection = new RTCPeerConnection();
      remotePeerIdRef.current = targetPeerId;
      peerConnectionRef.current = connection;
      setWebrtcState('negotiating');

      connection.onconnectionstatechange = () => {
        setWebrtcState(connection.connectionState);
      };

      connection.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignalMessage(targetPeerId, 'ice', {
            candidate: event.candidate.toJSON()
          });
        }
      };

      connection.ondatachannel = (event) => {
        attachDataChannel(event.channel);
      };

      if (shouldCreateDataChannel) {
        attachDataChannel(connection.createDataChannel('mcp-tools', { ordered: true }));
      }

      return connection;
    },
    [attachDataChannel, sendSignalMessage]
  );

  const startOffer = useCallback(
    async (targetPeerId: string) => {
      if (offerStartedRef.current) {
        return;
      }

      offerStartedRef.current = true;
      appendTimeline('system', 'Negotiating WebRTC', `Creating an SDP offer for peer ${targetPeerId}`);
      const connection = createPeerConnection(targetPeerId, true);
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);
      sendSignalMessage(targetPeerId, 'offer', {
        sdp: offer.sdp,
        type: offer.type
      });
    },
    [appendTimeline, createPeerConnection, sendSignalMessage]
  );

  const handleSignalMessage = useCallback(
    async (message: TMcpSignalMessage) => {
      if (message.target_peer_id && message.target_peer_id !== localPeerId) {
        return;
      }

      if (message.signal_type === 'offer') {
        appendTimeline('inbound', 'Received offer', `Peer ${message.from_peer_id} requested a direct MCP channel`);
        const connection = createPeerConnection(message.from_peer_id, false);
        await connection.setRemoteDescription(
          new RTCSessionDescription({
            type: message.payload.type || 'offer',
            sdp: message.payload.sdp || ''
          })
        );
        const answer = await connection.createAnswer();
        await connection.setLocalDescription(answer);
        await applyQueuedIceCandidates();
        sendSignalMessage(message.from_peer_id, 'answer', {
          sdp: answer.sdp,
          type: answer.type
        });
        return;
      }

      if (!peerConnectionRef.current) {
        return;
      }

      if (message.signal_type === 'answer') {
        appendTimeline('inbound', 'Received answer', `Peer ${message.from_peer_id} accepted the direct link`);
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription({
            type: message.payload.type || 'answer',
            sdp: message.payload.sdp || ''
          })
        );
        await applyQueuedIceCandidates();
        return;
      }

      if (message.signal_type === 'ice' && message.payload.candidate) {
        if (peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(message.payload.candidate);
          return;
        }
        queuedIceCandidatesRef.current.push(message.payload.candidate);
      }
    },
    [appendTimeline, applyQueuedIceCandidates, createPeerConnection, localPeerId, sendSignalMessage]
  );

  useEffect(() => {
    if (!session?.session_id) {
      return;
    }

    setSignalingState('connecting');
    const socket = new WebSocket(`${getSocketBaseUrl()}/ws/mcp/${session.session_id}/${localPeerId}`);
    websocketRef.current = socket;

    socket.onopen = () => {
      setSignalingState('ready');
      appendTimeline('system', 'Signaling connected', 'Using Django Channels only for SDP and ICE exchange');
      publishPeerPresence(role);
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as TMcpSignalMessage | (TMcpSessionResponse & { type: 'peer_snapshot' });
      if (payload.type === 'signal') {
        handleSignalMessage(payload);
        return;
      }

      const peers = payload.peers.filter((peer) => peer.peer_id !== localPeerId);
      setSession((previous) =>
        previous
          ? {
              ...previous,
              peer_count: payload.peer_count,
              peers: payload.peers
            }
          : null
      );
      setRemotePeers(peers);

      const providerPeer = peers.find((peer) => peer.role === 'provider');
      if (providerPeer?.tools?.length) {
        setRemoteTools(providerPeer.tools);
        if (!TOOL_PARAMETER_MAP[selectedTool]) {
          setSelectedTool(providerPeer.tools[0].name);
          setParametersText(JSON.stringify(providerPeer.tools[0].parameters, null, 2));
        }
      }

      if (role === 'client' && providerPeer && !peerConnectionRef.current && !offerStartedRef.current) {
        void startOffer(providerPeer.peer_id);
      }

      if (!providerPeer && role === 'client') {
        resetPeerConnection();
      }
    };

    socket.onclose = () => {
      setSignalingState('closed');
    };

    return () => {
      socket.close();
      websocketRef.current = null;
      resetPeerConnection();
      setRemotePeers([]);
    };
  }, [appendTimeline, handleSignalMessage, localPeerId, publishPeerPresence, resetPeerConnection, role, selectedTool, session?.session_id, startOffer]);

  useEffect(() => {
    if (role === 'provider') {
      setRemoteTools(LOCAL_MCP_TOOLS);
      return;
    }

    const nextTool = remoteTools.find((tool) => tool.name === selectedTool) || remoteTools[0];
    if (nextTool) {
      setSelectedTool(nextTool.name);
      setParametersText(JSON.stringify(nextTool.parameters, null, 2));
    }
  }, [remoteTools, role, selectedTool]);

  const startProviderSession = useCallback(async () => {
    setIsBusy(true);
    setTimeline([]);
    setLastResult('');
    resetPeerConnection();
    const nextSession = await createMcpSession();
    if (nextSession) {
      setRole('provider');
      setSession(nextSession);
      setSessionInput(nextSession.session_id);
      setRemotePeers([]);
      appendTimeline('system', 'Provider session created', `Share code ${nextSession.session_id.toUpperCase()} with an AI client`);
      toast.success('Provider session created');
    } else {
      toast.error('Unable to create an MCP session');
    }
    setIsBusy(false);
  }, [appendTimeline, createMcpSession, resetPeerConnection]);

  const joinClientSession = useCallback(async () => {
    if (!sessionInput.trim()) {
      toast.error('Enter a session code first');
      return;
    }

    setIsBusy(true);
    setTimeline([]);
    setLastResult('');
    resetPeerConnection();
    const existingSession = await getMcpSession(sessionInput.trim());
    if (existingSession) {
      setRole('client');
      setPeerName((current) => current || 'AI Client');
      setSession(existingSession);
      setRemotePeers(existingSession.peers.filter((peer) => peer.peer_id !== localPeerId));
      const providerPeer = existingSession.peers.find((peer) => peer.role === 'provider');
      setRemoteTools(providerPeer?.tools || []);
      appendTimeline('system', 'Client joined session', `Preparing a direct link to ${sessionInput.trim().toUpperCase()}`);
      toast.success('Joined signaling session');
    } else {
      toast.error('Session not found');
    }
    setIsBusy(false);
  }, [appendTimeline, getMcpSession, localPeerId, resetPeerConnection, sessionInput]);

  const invokeTool = useCallback(() => {
    if (!dataChannelRef.current || dataChannelRef.current.readyState !== 'open') {
      toast.error('The peer-to-peer channel is not ready yet');
      return;
    }

    try {
      const parameters = JSON.parse(parametersText) as Record<string, unknown>;
      const requestId = uuidv4();
      const message: TMcpMessage = {
        type: 'tool_call',
        requestId,
        tool: selectedTool,
        parameters
      };
      dataChannelRef.current.send(JSON.stringify(message));
      appendTimeline('outbound', `Tool call • ${selectedTool}`, JSON.stringify(parameters, null, 2));
      setLastResult('Waiting for remote peer response...');
    } catch (error) {
      toast.error('Parameters must be valid JSON');
    }
  }, [appendTimeline, parametersText, selectedTool]);

  const copySessionCode = useCallback(async () => {
    if (!session?.session_id) {
      return;
    }

    try {
      await navigator.clipboard.writeText(session.session_id);
      toast.success('Session code copied');
    } catch (error) {
      toast.error('Clipboard access is not available');
    }
  }, [session?.session_id]);

  const closeSession = useCallback(() => {
    websocketRef.current?.close();
    websocketRef.current = null;
    resetPeerConnection();
    setSession(null);
    setRemotePeers([]);
    setRemoteTools([]);
    setTimeline([]);
    setLastResult('');
    setSignalingState('idle');
    toast.info('Session cleared');
  }, [resetPeerConnection]);

  return {
    channelState,
    closeSession,
    copySessionCode,
    invokeTool,
    isBusy,
    joinClientSession,
    lastResult,
    localPeerId,
    parametersText,
    peerName,
    remotePeers,
    remoteTools,
    role,
    selectedTool,
    session,
    sessionInput,
    setParametersText,
    setPeerName,
    setSelectedTool,
    setSessionInput,
    signalingState,
    startProviderSession,
    timeline,
    tools: LOCAL_MCP_TOOLS,
    webrtcState
  };
};
