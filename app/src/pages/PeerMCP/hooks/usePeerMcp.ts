import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { useService } from '../../../api/service/useService';
import { FilesharerP2PMcpClient, TMcpPeer, TMcpRole, TMcpSessionResponse, TMcpTimelineEvent, TMcpTool } from '../../../modules/p2p-mcp';

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
const MAX_TIMELINE_ENTRIES = 16;
const MAX_LOG_ENTRIES = 10;
const MS_PER_MINUTE = 60_000;

const getSocketBaseUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${import.meta.env.VITE_API_ENDPOINT || 'localhost:8001'}`;
};

const clampTimeline = (events: TMcpTimelineEvent[]) => events.slice(-MAX_TIMELINE_ENTRIES);

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
  const clientRef = useRef<FilesharerP2PMcpClient | null>(null);
  const peerNameRef = useRef(peerName);
  const sessionIdRef = useRef(session?.session_id || '');
  const remotePeerCountRef = useRef(remotePeers.length);
  const selectedToolRef = useRef(selectedTool);

  const appendTimeline = useCallback((event: TMcpTimelineEvent) => {
    setTimeline((previous) => clampTimeline([...previous, event]));
  }, []);

  useEffect(() => {
    peerNameRef.current = peerName;
    sessionIdRef.current = session?.session_id || '';
    remotePeerCountRef.current = remotePeers.length;
    selectedToolRef.current = selectedTool;
  }, [peerName, remotePeers.length, selectedTool, session?.session_id]);

  const getProviderResult = useCallback((toolName: string, parameters: Record<string, unknown>) => {
    const activePeerName = peerNameRef.current;
    const activeSessionId = sessionIdRef.current;
    const activePeerCount = remotePeerCountRef.current + 1;
    const deviceId = String(parameters.device_id || 'edge-gateway-01');

    switch (toolName) {
      case 'get_device_status':
        return {
          device_id: deviceId,
          session_id: activeSessionId,
          peer: activePeerName,
          transport: 'webrtc-datachannel',
          status: 'healthy',
          active_peers: activePeerCount,
          last_seen: new Date().toISOString()
        };
      case 'get_recent_logs':
        return Array.from({ length: Math.min(Math.max(parseInt(String(parameters.limit || 5), 10) || 5, 1), MAX_LOG_ENTRIES) }, (_, index) => ({
          timestamp: new Date(Date.now() - index * MS_PER_MINUTE).toISOString(),
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
  }, []);

  const resetClient = useCallback(() => {
    clientRef.current?.disconnect();
    clientRef.current = null;
    setSignalingState('idle');
    setWebrtcState('idle');
    setChannelState('idle');
  }, []);

  const syncSelectedTool = useCallback((tools: TMcpTool[]) => {
    if (tools.length === 0) {
      return;
    }

    const activeTool = tools.find((tool) => tool.name === selectedToolRef.current) || tools[0];
    setSelectedTool(activeTool.name);
    setParametersText(JSON.stringify(activeTool.parameters, null, 2));
  }, []);

  const buildClient = useCallback(
    (nextRole: TMcpRole) =>
      new FilesharerP2PMcpClient({
        signalingBaseUrl: getSocketBaseUrl(),
        identity: {
          peerId: localPeerId,
          peerName: peerNameRef.current.trim() || (nextRole === 'provider' ? 'Edge Gateway' : 'AI Client'),
          role: nextRole,
          tools: nextRole === 'provider' ? LOCAL_MCP_TOOLS : []
        },
        toolCallHandler: async (message) => getProviderResult(message.tool, message.parameters),
        onConnectionStateChange: (state) => {
          setSignalingState(state.signalingState);
          setWebrtcState(state.webrtcState);
          setChannelState(state.channelState);
        },
        onPeerSnapshot: (snapshot) => {
          const peers = snapshot.peers.filter((peer) => peer.peer_id !== localPeerId);
          setSession((previous) =>
            previous
              ? {
                  ...previous,
                  peer_count: snapshot.peer_count,
                  peers: snapshot.peers
                }
              : null
          );
          setRemotePeers(peers);

          const providerPeer = peers.find((peer) => peer.role === 'provider');
          if (nextRole === 'client') {
            setRemoteTools(providerPeer?.tools || []);
            if (providerPeer?.tools?.length) {
              syncSelectedTool(providerPeer.tools);
            }
          }
        },
        onTimelineEvent: appendTimeline,
        onToolCatalog: (message) => {
          setRemoteTools(message.tools);
          syncSelectedTool(message.tools);
        },
        onToolResult: (message) => {
          setLastResult(JSON.stringify(message.result, null, 2));
        }
      }),
    [appendTimeline, getProviderResult, localPeerId, syncSelectedTool]
  );

  useEffect(() => {
    if (!session?.session_id) {
      return;
    }

    const client = buildClient(role);
    clientRef.current = client;
    void client.connect(session.session_id);

    return () => {
      client.disconnect();
      if (clientRef.current === client) {
        clientRef.current = null;
      }
    };
  }, [buildClient, role, session?.session_id]);

  useEffect(() => {
    if (role === 'provider') {
      setRemoteTools(LOCAL_MCP_TOOLS);
    }

    clientRef.current?.updateIdentity({
      peerName,
      role,
      tools: role === 'provider' ? LOCAL_MCP_TOOLS : []
    });
  }, [peerName, role]);

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
    resetClient();
    const nextSession = await createMcpSession();
    if (nextSession) {
      setRole('provider');
      setSession(nextSession);
      setSessionInput(nextSession.session_id);
      setRemotePeers([]);
      setRemoteTools(LOCAL_MCP_TOOLS);
      toast.success('Provider session created');
    } else {
      toast.error('Unable to create an MCP session');
    }
    setIsBusy(false);
  }, [createMcpSession, resetClient]);

  const joinClientSession = useCallback(async () => {
    if (!sessionInput.trim()) {
      toast.error('Enter a session code first');
      return;
    }

    setIsBusy(true);
    setTimeline([]);
    setLastResult('');
    resetClient();
    const existingSession = await getMcpSession(sessionInput.trim());
    if (existingSession) {
      setRole('client');
      setPeerName((current) => current || 'AI Client');
      setSession(existingSession);
      setRemotePeers(existingSession.peers.filter((peer) => peer.peer_id !== localPeerId));
      const providerPeer = existingSession.peers.find((peer) => peer.role === 'provider');
      setRemoteTools(providerPeer?.tools || []);
      if (providerPeer?.tools?.length) {
        syncSelectedTool(providerPeer.tools);
      }
      toast.success('Joined signaling session');
    } else {
      toast.error('Session not found');
    }
    setIsBusy(false);
  }, [getMcpSession, localPeerId, resetClient, sessionInput, syncSelectedTool]);

  const invokeTool = useCallback(() => {
    try {
      const parameters = JSON.parse(parametersText) as Record<string, unknown>;
      clientRef.current?.sendToolCall(selectedTool, parameters);
      setLastResult('Waiting for remote peer response...');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Parameters must be valid JSON');
    }
  }, [parametersText, selectedTool]);

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
    resetClient();
    setSession(null);
    setRemotePeers([]);
    setRemoteTools(role === 'provider' ? LOCAL_MCP_TOOLS : []);
    setTimeline([]);
    setLastResult('');
    toast.info('Session cleared');
  }, [resetClient, role]);

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
