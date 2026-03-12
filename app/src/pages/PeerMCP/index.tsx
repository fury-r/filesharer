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
            <span className="badge badge-outline border-emerald-400/60 text-emerald-200">Privacy-first signaling</span>
          </div>
          <h1 className="mb-3 text-4xl font-black tracking-tight text-white">Peer-to-Peer MCP communication</h1>
          <p className="max-w-3xl text-base text-slate-200 md:text-lg">
            Turn this app into a lightweight signaling hub so an AI client can discover a peer device, negotiate WebRTC, and invoke
            MCP-style tools directly over an encrypted data channel.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
              <FaSatelliteDish className="mb-3 text-2xl text-cyan-300" />
              <h3 className="font-semibold">Signaling only</h3>
              <p className="mt-2 text-sm text-slate-300">Django Channels exchanges SDP offers, answers, and ICE candidates.</p>
            </div>
            <div className="rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4">
              <FaLock className="mb-3 text-2xl text-violet-300" />
              <h3 className="font-semibold">Secure by default</h3>
              <p className="mt-2 text-sm text-slate-300">WebRTC data channels use DTLS, so tool traffic stays off the central server.</p>
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
              <span className="text-sm text-slate-300">Signaling</span>
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
              Use two browser windows: create a provider session on one side, then join the same session as an AI client on the other.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-200/80">Reusable module</p>
            <p className="mt-2 text-sm text-slate-200">
              The transport layer is also available as the <span className="font-mono text-emerald-200">@fury-r/mcp-webrtc-transport</span> TypeScript
              module from this repository.
            </p>
            <pre className="mt-3 overflow-auto rounded-xl bg-black/30 p-3 text-xs text-emerald-100">
              npm run build:mcp-module
            </pre>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <FaPlug className="text-cyan-300" />
              <h2 className="text-xl font-bold">Session setup</h2>
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

            <button className="btn btn-primary w-full" disabled={isBusy} onClick={startProviderSession}>
              Start provider session
            </button>

            <div className="divider text-slate-500">or</div>

            <label className="form-control">
              <span className="label-text mb-2 text-slate-300">Join with session code</span>
              <input
                className="input input-bordered w-full border-white/10 bg-white/5 font-mono uppercase text-white"
                value={sessionInput}
                onChange={(event) => setSessionInput(event.target.value)}
                placeholder="e.g. A1B2C3D4"
              />
            </label>
            <button className="btn btn-outline mt-3 w-full border-cyan-400/40 text-cyan-100" disabled={isBusy} onClick={joinClientSession}>
              Join as AI client
            </button>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
            <div className="mb-4 flex items-center gap-2">
              <FaCloud className="text-violet-300" />
              <h2 className="text-xl font-bold">Session discovery</h2>
            </div>

            {session ? (
              <>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">Session code</p>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="font-mono text-2xl font-bold tracking-[0.2em]">{session.session_id.toUpperCase()}</span>
                    <button className="btn btn-ghost btn-sm text-cyan-100" onClick={copySessionCode}>
                      <MdContentCopy />
                    </button>
                  </div>
                  <p className="mt-2 text-sm text-slate-200">
                    Role: <span className="font-semibold capitalize text-white">{role}</span>
                  </p>
                </div>

                <div className="mt-4 space-y-2">
                  {remotePeers.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                      Waiting for another peer to join this session.
                    </div>
                  ) : (
                    remotePeers.map((peer) => (
                      <div key={peer.peer_id} className="rounded-2xl bg-white/5 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-white">{peer.name}</p>
                            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{peer.peer_id}</p>
                          </div>
                          <span className="badge badge-outline capitalize">{peer.role}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-300">{peer.tools.length} published MCP tools</p>
                      </div>
                    ))
                  )}
                </div>

                <button className="btn btn-ghost mt-4 w-full text-slate-300" onClick={closeSession}>
                  Clear session
                </button>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-400">
                Create a provider session to advertise tools, or join an existing session to behave like an AI client.
              </div>
            )}
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
                    Waiting for the provider to publish an MCP tool catalog over the peer connection.
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
                  <span>Provider advertises tools through the signaling layer.</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-200">2</span>
                  <span>AI client creates an SDP offer and negotiates ICE candidates.</span>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-200">3</span>
                  <span>Tool calls and results flow directly over the encrypted data channel.</span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-slate-400">
                <span>AI Client</span>
                <FaArrowRight />
                <span>Signaling Server</span>
                <FaArrowRight />
                <span>Peer Device</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
            <div className="rounded-[28px] border border-white/10 bg-slate-900/80 p-5 shadow-lg shadow-black/20">
              <h2 className="text-xl font-bold">Tool request composer</h2>
              <p className="mt-2 text-sm text-slate-400">
                Use structured JSON parameters to invoke an MCP tool on the remote peer. The central server is not part of tool execution.
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
                <p className="mt-3 text-xs text-slate-500">Switch to an AI client in another window to send tool requests to this provider.</p>
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
                  The timeline will populate as peers announce themselves, negotiate WebRTC, and exchange MCP messages.
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
