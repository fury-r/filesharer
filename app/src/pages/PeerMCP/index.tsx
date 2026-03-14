import { FaArrowRight, FaCloud, FaLock, FaMicrochip, FaPlug, FaSatelliteDish } from 'react-icons/fa';
import { MdContentCopy, MdOutlineSensors, MdOutlineTipsAndUpdates } from 'react-icons/md';
import { usePeerMcp } from './hooks/usePeerMcp';

const statusTone: Record<string, string> = {
  idle: 'badge-ghost',
  connecting: 'badge-warning',
  ready: 'badge-success',
  'signaling-ready': 'badge-info',
  negotiating: 'badge-warning',
  connected: 'badge-success',
  open: 'badge-success',
  closed: 'badge-error',
  disconnected: 'badge-error',
  failed: 'badge-error'
};

const PeerMCP = () => {
  const {
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
    tools,
    webrtcState
  } = usePeerMcp();

  const visibleTools = role === 'provider' ? tools : remoteTools;

  return (
    <div className="min-h-full rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 text-left text-white shadow-2xl shadow-indigo-950/30 md:p-6">
      <div className="mb-6 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="badge badge-primary badge-outline">WebRTC + MCP</span>
            <span className="badge badge-outline border-cyan-400/60 text-cyan-200">Direct tool invocation</span>
            <span className="badge badge-outline border-emerald-400/60 text-emerald-200">Backend-free signaling</span>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-white">Peer-to-Peer MCP communication</h1>
          <p className="max-w-3xl text-base text-slate-200 md:text-lg">
            Use manual offer and answer payloads to negotiate WebRTC directly between two browser peers, then invoke MCP-style tools over
            an encrypted data channel without backend signaling endpoints.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <FaSatelliteDish className="mb-3 text-2xl text-cyan-300" />
              <h3 className="font-semibold">Manual signaling</h3>
              <p className="mt-2 text-sm text-slate-300">Exchange offer and answer payloads by copy and paste between two peers.</p>
            </div>
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <FaLock className="mb-3 text-2xl text-violet-300" />
              <h3 className="font-semibold">Secure by default</h3>
              <p className="mt-2 text-sm text-slate-300">WebRTC data channels use DTLS, so tool traffic stays peer-to-peer.</p>
            </div>
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
              <FaMicrochip className="mb-3 text-2xl text-emerald-300" />
              <h3 className="font-semibold">Edge-friendly tools</h3>
              <p className="mt-2 text-sm text-slate-300">Simulate diagnostics, logs, and restart requests directly on the provider peer.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-6 shadow-lg shadow-black/20">
          <div className="mb-4 flex items-center gap-2">
            <MdOutlineTipsAndUpdates className="text-2xl text-amber-300" />
            <h2 className="text-xl font-bold">Connection health</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-300">Signaling mode</span>
              <span className={`badge ${statusTone[signalingState] || 'badge-outline'}`}>{signalingState}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-300">WebRTC</span>
              <span className={`badge ${statusTone[webrtcState] || 'badge-outline'}`}>{webrtcState}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-sm text-slate-300">Data channel</span>
              <span className={`badge ${statusTone[channelState] || 'badge-outline'}`}>{channelState}</span>
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Local peer id</p>
            <p className="mt-2 font-mono text-lg text-cyan-200">{localPeerId}</p>
            <p className="mt-3 text-sm text-slate-300">
              Open two browser windows: generate offer on provider window, apply offer on client window, then paste answer back to provider.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Reusable module</p>
            <p className="mt-2 text-sm text-slate-200">
              This flow is powered by <span className="font-mono text-emerald-200">@fury-r/mcp-webrtc-transport</span> in local source mode.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <FaPlug className="text-cyan-300" />
              <h2 className="text-xl font-bold">Manual setup</h2>
            </div>

            <label className="form-control mb-4">
              <span className="label-text mb-2 text-slate-300">Peer name</span>
              <input
                className="input input-bordered w-full border-white/10 bg-white/5 text-white"
                value={peerName}
                onChange={(event) => setPeerName(event.target.value)}
                placeholder="Edge Gateway or AI Client"
              />
            </label>

            <button className="btn btn-primary w-full" disabled={isBusy} onClick={generateProviderOffer}>
              Generate provider offer
            </button>

            <div className="divider text-slate-500">signal exchange</div>

            <label className="form-control">
              <span className="label-text mb-2 text-slate-300">Paste mcpwebrtc payload</span>
              <textarea
                className="textarea textarea-bordered h-40 w-full border-white/10 bg-white/5 font-mono text-xs text-white"
                value={signalInput}
                onChange={(event) => setSignalInput(event.target.value)}
                placeholder="Paste offer here on client, paste answer here on provider"
              />
            </label>

            <div className="mt-3 grid gap-2">
              <button className="btn btn-outline border-cyan-400/40 text-cyan-100" disabled={isBusy} onClick={applySignalAsOffer}>
                Treat as offer (client)
              </button>
              <button className="btn btn-outline border-emerald-400/40 text-emerald-100" disabled={isBusy} onClick={applySignalAsAnswer}>
                Treat as answer (provider)
              </button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <FaCloud className="text-violet-300" />
              <h2 className="text-xl font-bold">Signal payload</h2>
            </div>

            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Current role</p>
              <p className="mt-2 text-lg font-bold capitalize">{role}</p>
              <p className="mt-2 text-sm text-slate-200">Copy this payload to the other peer after generating offer or answer.</p>
              <button className="btn btn-ghost btn-sm mt-2 text-cyan-100" onClick={copyLatestSignalText}>
                <MdContentCopy />
                Copy latest signal text
              </button>
            </div>

            <pre className="mt-4 max-h-56 overflow-auto rounded-2xl bg-black/30 p-3 text-xs text-emerald-200">
              {latestSignalText || 'No signal payload generated yet.'}
            </pre>

            <button className="btn btn-ghost mt-4 w-full text-slate-300" onClick={closeSession}>
              Clear session
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
              <div className="mb-4 flex items-center gap-2">
                <MdOutlineSensors className="text-2xl text-emerald-300" />
                <h2 className="text-xl font-bold">{role === 'provider' ? 'Published tools' : 'Remote tool catalog'}</h2>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {visibleTools.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                    Waiting for data channel to open and receive tool catalog from provider.
                  </div>
                ) : (
                  visibleTools.map((tool) => (
                    <button
                      key={tool.name}
                      className={`rounded-2xl border p-4 text-left transition ${
                        selectedTool === tool.name
                          ? 'border-cyan-400/60 bg-cyan-500/10 shadow-lg shadow-cyan-900/20'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                      onClick={() => {
                        setSelectedTool(tool.name);
                        setParametersText(JSON.stringify(tool.parameters, null, 2));
                      }}
                    >
                      <p className="font-semibold text-white">{tool.name}</p>
                      <p className="mt-2 text-sm text-slate-300">{tool.description}</p>
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
              <h2 className="text-xl font-bold">MCP message flow</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-200">1</span>
                  <span>Provider creates a manual offer payload and shares it with the client.</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-200">2</span>
                  <span>Client applies offer, generates answer payload, and sends it back.</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">3</span>
                  <span>Tool calls and results flow directly over the encrypted data channel.</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-slate-400">
                <span>Provider</span>
                <FaArrowRight />
                <span>Manual signal exchange</span>
                <FaArrowRight />
                <span>AI Client</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
              <h2 className="text-xl font-bold">Tool request composer</h2>
              <p className="mt-2 text-sm text-slate-400">
                Use structured JSON parameters to invoke an MCP tool on the remote peer. Signaling is already complete at this stage.
              </p>

              <textarea
                className="textarea textarea-bordered mt-4 h-64 w-full border-white/10 bg-white/5 font-mono text-sm text-white"
                value={parametersText}
                onChange={(event) => setParametersText(event.target.value)}
              />

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="text-sm text-slate-400">
                  Selected tool: <span className="font-semibold text-white">{selectedTool}</span>
                </div>
                <button className="btn btn-accent" disabled={role !== 'client' || channelState !== 'open'} onClick={invokeTool}>
                  Invoke tool over WebRTC
                </button>
              </div>

              {role !== 'client' && (
                <p className="mt-3 text-xs text-slate-500">Switch to client role in another window to invoke provider tools.</p>
              )}
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
              <h2 className="text-xl font-bold">Latest result</h2>
              <pre className="mt-4 min-h-64 overflow-auto rounded-2xl bg-black/30 p-4 text-sm text-emerald-200">
                {lastResult || '{\n  "status": "Awaiting a peer response"\n}'}
              </pre>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
            <h2 className="text-xl font-bold">Realtime transport timeline</h2>
            <div className="mt-4 space-y-3">
              {timeline.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                  Timeline entries will appear as offer and answer payloads are applied and MCP messages are exchanged.
                </div>
              ) : (
                timeline.map((event) => (
                  <div key={event.id} className="rounded-2xl bg-white/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-white">{event.title}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {event.direction} • {event.timestamp}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-300">{event.detail}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeerMCP;
