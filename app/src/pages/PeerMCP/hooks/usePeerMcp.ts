import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { P2PMcpClient, TMcpRole, TMcpTimelineEvent, TMcpTool } from '../../../modules/p2p-mcp';

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

const MAX_TIMELINE_ENTRIES = 20;
const MAX_LOG_ENTRIES = 10;
const MS_PER_MINUTE = 60_000;

type TManualSignalType = 'offer' | 'answer';

type TManualSignalEnvelope = {
  kind: 'p2p-mcp';
  version: 1;
  signal: TManualSignalType;
  sdp: string;
  type?: RTCSdpType;
  senderRole: TMcpRole;
  senderName: string;
  senderPeerId: string;
};

const toBase64Url = (value: string) => {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const fromBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return new TextDecoder().decode(bytes);
};

const encodeSignal = (envelope: TManualSignalEnvelope) => {
  const raw = JSON.stringify(envelope);
  return `mcpwebrtc:${toBase64Url(raw)}`;
};

const decodeSignal = (raw: string): TManualSignalEnvelope => {
  const trimmed = raw.trim();
  const payload = trimmed.startsWith('mcpwebrtc:') ? trimmed.slice('mcpwebrtc:'.length) : trimmed;
  const decoded = JSON.parse(fromBase64Url(payload)) as TManualSignalEnvelope;

  if (decoded.kind !== 'p2p-mcp' || decoded.version !== 1) {
    throw new Error('Unsupported signal payload');
  }

  if (!decoded.sdp || !decoded.signal) {
    throw new Error('Malformed signal payload');
  }

  return decoded;
};

const clampTimeline = (events: TMcpTimelineEvent[]) => events.slice(-MAX_TIMELINE_ENTRIES);

export const usePeerMcp = () => {
  const localPeerId = useMemo(() => uuidv4().slice(0, 8), []);
  const [role, setRole] = useState<TMcpRole>('provider');
  const [peerName, setPeerName] = useState('Edge Gateway');
  const [signalInput, setSignalInput] = useState('');
  const [latestSignalText, setLatestSignalText] = useState('');
  const [remoteTools, setRemoteTools] = useState<TMcpTool[]>([]);
  const [selectedTool, setSelectedTool] = useState(LOCAL_MCP_TOOLS[0].name);
  const [parametersText, setParametersText] = useState(TOOL_PARAMETER_MAP[LOCAL_MCP_TOOLS[0].name]);
  const [timeline, setTimeline] = useState<TMcpTimelineEvent[]>([]);
  const [lastResult, setLastResult] = useState('');
  const [signalingState, setSignalingState] = useState<'idle' | 'connecting' | 'ready' | 'closed'>('idle');
  const [webrtcState, setWebrtcState] = useState('idle');
  const [channelState, setChannelState] = useState<'idle' | 'opening' | 'open' | 'closed'>('idle');
  const [isBusy, setIsBusy] = useState(false);

  const clientRef = useRef<P2PMcpClient | null>(null);
  const peerNameRef = useRef(peerName);
  const selectedToolRef = useRef(selectedTool);

  const appendTimeline = useCallback((event: TMcpTimelineEvent) => {
    setTimeline((previous) => clampTimeline([...previous, event]));
  }, []);

  useEffect(() => {
    peerNameRef.current = peerName;
    selectedToolRef.current = selectedTool;
  }, [peerName, selectedTool]);

  const getProviderResult = useCallback((toolName: string, parameters: Record<string, unknown>) => {
    const activePeerName = peerNameRef.current;
    const deviceId = String(parameters.device_id || 'edge-gateway-01');

    switch (toolName) {
      case 'get_device_status':
        return {
          device_id: deviceId,
          peer: activePeerName,
          transport: 'webrtc-datachannel',
          status: 'healthy',
          active_peers: 2,
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

  const createClient = useCallback(
    (nextRole: TMcpRole) =>
      new P2PMcpClient({
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
    clientRef.current?.updateIdentity({
      peerName,
      role,
      tools: role === 'provider' ? LOCAL_MCP_TOOLS : []
    });
  }, [peerName, role]);

  useEffect(() => {
    if (role === 'provider') {
      return;
    }

    const nextTool = remoteTools.find((tool) => tool.name === selectedTool) || remoteTools[0];
    if (nextTool) {
      setSelectedTool(nextTool.name);
      setParametersText(JSON.stringify(nextTool.parameters, null, 2));
    }
  }, [remoteTools, role, selectedTool]);

  const generateProviderOffer = useCallback(async () => {
    setIsBusy(true);
    setTimeline([]);
    setLastResult('');
    setRole('provider');
    setRemoteTools([]);
    resetClient();

    try {
      const client = createClient('provider');
      clientRef.current = client;
      const offer = await client.createManualOffer();
      const signal = encodeSignal({
        kind: 'p2p-mcp',
        version: 1,
        signal: 'offer',
        sdp: offer.sdp,
        type: offer.type,
        senderRole: 'provider',
        senderName: peerNameRef.current,
        senderPeerId: localPeerId
      });
      setLatestSignalText(signal);
      setSignalInput(signal);
      toast.success('Provider offer generated. Share it with the client peer.');
    } catch (error) {
      console.error(error);
      resetClient();
      toast.error(error instanceof Error ? error.message : 'Unable to create provider offer');
    }

    setIsBusy(false);
  }, [createClient, localPeerId, resetClient]);

  const applySignalAsOffer = useCallback(async () => {
    if (!signalInput.trim()) {
      toast.error('Paste a provider offer payload first');
      return;
    }

    setIsBusy(true);
    setTimeline([]);
    setLastResult('');
    setRole('client');
    setRemoteTools([]);
    resetClient();

    try {
      const decoded = decodeSignal(signalInput);
      if (decoded.signal !== 'offer') {
        throw new Error('Expected an offer payload');
      }

      const client = createClient('client');
      clientRef.current = client;
      const answer = await client.createManualAnswer({
        sdp: decoded.sdp,
        type: decoded.type || 'offer'
      });

      const responseSignal = encodeSignal({
        kind: 'p2p-mcp',
        version: 1,
        signal: 'answer',
        sdp: answer.sdp,
        type: answer.type,
        senderRole: 'client',
        senderName: peerNameRef.current,
        senderPeerId: localPeerId
      });

      setLatestSignalText(responseSignal);
      setSignalInput(responseSignal);
      toast.success('Answer created. Send it back to the provider peer.');
    } catch (error) {
      console.error(error);
      resetClient();
      toast.error(error instanceof Error ? error.message : 'Could not apply offer payload');
    }

    setIsBusy(false);
  }, [createClient, localPeerId, resetClient, signalInput]);

  const applySignalAsAnswer = useCallback(async () => {
    if (!signalInput.trim()) {
      toast.error('Paste a client answer payload first');
      return;
    }

    if (!clientRef.current || role !== 'provider') {
      toast.error('Generate provider offer first');
      return;
    }

    setIsBusy(true);

    try {
      const decoded = decodeSignal(signalInput);
      if (decoded.signal !== 'answer') {
        throw new Error('Expected an answer payload');
      }

      await clientRef.current.applyManualAnswer({
        sdp: decoded.sdp,
        type: decoded.type || 'answer'
      });
      toast.success('Answer applied. Waiting for data channel to open.');
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Could not apply answer payload');
    }

    setIsBusy(false);
  }, [role, signalInput]);

  const invokeTool = useCallback(() => {
    try {
      const parameters = JSON.parse(parametersText) as Record<string, unknown>;
      clientRef.current?.sendToolCall(selectedTool, parameters);
      setLastResult('Waiting for remote peer response...');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Parameters must be valid JSON');
    }
  }, [parametersText, selectedTool]);

  const copyLatestSignalText = useCallback(async () => {
    if (!latestSignalText) {
      toast.error('No signal payload available yet');
      return;
    }

    try {
      await navigator.clipboard.writeText(latestSignalText);
      toast.success('Signal payload copied');
    } catch (error) {
      toast.error('Clipboard access is not available');
    }
  }, [latestSignalText]);

  const closeSession = useCallback(() => {
    resetClient();
    setRemoteTools([]);
    setTimeline([]);
    setLastResult('');
    setLatestSignalText('');
    setSignalInput('');
    toast.info('Session cleared');
  }, [resetClient]);

  return {
    applySignalAsAnswer,
    applySignalAsOffer,
    channelState,
    closeSession,
    copyLatestSignalText,
    generateProviderOffer,
    invokeTool,
    isBusy,
    lastResult,
    latestSignalText,
    localPeerId,
    parametersText,
    peerName,
    remoteTools,
    role,
    selectedTool,
    setParametersText,
    setPeerName,
    setSelectedTool,
    setSignalInput,
    signalInput,
    signalingState,
    timeline,
    tools: LOCAL_MCP_TOOLS,
    webrtcState
  };
};
