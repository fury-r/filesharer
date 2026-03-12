import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { QrReader } from 'react-qr-reader';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import { toast } from 'react-toastify';

type TSignalType = 'offer' | 'answer';
type TScanMode = 'sender-await-answer' | 'receiver-await-offer';

type TSignalEnvelope = {
  kind: 'p2p-file-share';
  version: 1;
  signal: TSignalType;
  sdp: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
};

type TInboundFileState = {
  name: string;
  size: number;
  type: string;
  receivedBytes: number;
  chunks: ArrayBuffer[];
};

const FILE_CHUNK_SIZE = 64 * 1024;
const MAX_BUFFERED_AMOUNT = 4 * 1024 * 1024;
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
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

const encodeSignal = (envelope: TSignalEnvelope) => {
  const raw = JSON.stringify(envelope);
  const compressed = compressToEncodedURIComponent(raw);
  if (compressed) {
    return `fswebrtcz:${compressed}`;
  }
  return `fswebrtc:${toBase64Url(raw)}`;
};

const decodeSignal = (raw: string): TSignalEnvelope => {
  const trimmed = raw.trim();
  let decodedText = '';

  if (trimmed.startsWith('fswebrtcz:')) {
    const payload = trimmed.slice('fswebrtcz:'.length);
    const decompressed = decompressFromEncodedURIComponent(payload);
    if (!decompressed) {
      throw new Error('Invalid compressed QR payload');
    }
    decodedText = decompressed;
  } else {
    const payload = trimmed.startsWith('fswebrtc:') ? trimmed.slice('fswebrtc:'.length) : trimmed;
    decodedText = fromBase64Url(payload);
  }

  const parsed = JSON.parse(decodedText) as TSignalEnvelope;
  if (parsed.kind !== 'p2p-file-share' || parsed.version !== 1) {
    throw new Error('Unsupported QR payload');
  }
  return parsed;
};

const isLikelySignalPayload = (raw: string) => {
  const value = raw.trim();
  return value.startsWith('fswebrtcz:') || value.startsWith('fswebrtc:');
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForIceGatheringComplete = async (connection: RTCPeerConnection) => {
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
};

const buildSignalQrDataUrl = async (signal: string) =>
  QRCode.toDataURL(signal, {
    margin: 1,
    // L keeps modules simpler to scan for dense SDP payloads.
    errorCorrectionLevel: 'L',
    width: 520
  });

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });

const decodeQrFromImageFile = async (file: File): Promise<string> => {
  const source = await readFileAsDataUrl(file);
  const image = new Image();
  image.src = source;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Could not load image'));
  });

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create decoding canvas');
  }

  context.drawImage(image, 0, 0);
  const detectorClass = (window as unknown as { BarcodeDetector?: new (opts?: { formats?: string[] }) => { detect: (input: HTMLCanvasElement) => Promise<Array<{ rawValue?: string }>> } }).BarcodeDetector;

  if (detectorClass) {
    const detector = new detectorClass({ formats: ['qr_code'] });
    const codes = await detector.detect(canvas);
    const value = codes.find((item) => typeof item.rawValue === 'string' && item.rawValue.trim().length > 0)?.rawValue;
    if (value) {
      return value;
    }
  }

  // Fallback for browsers without BarcodeDetector support.
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const qr = jsQR(imageData.data, imageData.width, imageData.height);
  if (!qr?.data) {
    throw new Error('No QR code detected in selected image');
  }

  return qr.data;
};

const P2PShare = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [senderQrDataUrl, setSenderQrDataUrl] = useState('');
  const [receiverQrDataUrl, setReceiverQrDataUrl] = useState('');
  const [senderSignalText, setSenderSignalText] = useState('');
  const [receiverSignalText, setReceiverSignalText] = useState('');
  const [manualSignalInput, setManualSignalInput] = useState('');
  const [scanMode, setScanMode] = useState<TScanMode | null>(null);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [status, setStatus] = useState('Idle');
  const [sendProgress, setSendProgress] = useState(0);
  const [receiveProgress, setReceiveProgress] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [receivedSize, setReceivedSize] = useState(0);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const inboundFileRef = useRef<TInboundFileState | null>(null);
  const senderQrUploadRef = useRef<HTMLInputElement | null>(null);
  const receiverQrUploadRef = useRef<HTMLInputElement | null>(null);
  const lastScannedSignalRef = useRef('');

  const canGenerateSenderQr = useMemo(() => Boolean(selectedFile) && !isTransferring, [isTransferring, selectedFile]);

  const resetTransferState = useCallback(() => {
    setIsTransferring(false);
    setSendProgress(0);
    setReceiveProgress(0);
    setIsSessionActive(false);
    inboundFileRef.current = null;
  }, []);

  const closePeer = useCallback(() => {
    dataChannelRef.current?.close();
    peerConnectionRef.current?.close();
    dataChannelRef.current = null;
    peerConnectionRef.current = null;
    setIsSessionActive(false);
  }, []);

  const clearAll = useCallback(() => {
    closePeer();
    resetTransferState();
    setSenderQrDataUrl('');
    setReceiverQrDataUrl('');
    setSenderSignalText('');
    setReceiverSignalText('');
    setManualSignalInput('');
    setStatus('Idle');
    setScanMode(null);
    if (downloadUrl) {
      URL.revokeObjectURL(downloadUrl);
    }
    setDownloadUrl('');
    setDownloadName('');
    setReceivedSize(0);
  }, [closePeer, downloadUrl, resetTransferState]);

  const handleInboundDataMessage = useCallback((data: string | ArrayBuffer | Blob) => {
    if (typeof data === 'string') {
      const parsed = JSON.parse(data) as
        | { type: 'file-meta'; name: string; size: number; fileType: string }
        | { type: 'file-complete' };

      if (parsed.type === 'file-meta') {
        inboundFileRef.current = {
          name: parsed.name,
          size: parsed.size,
          type: parsed.fileType,
          receivedBytes: 0,
          chunks: []
        };
        setReceiveProgress(0);
        setStatus(`Receiving ${parsed.name}`);
      }

      if (parsed.type === 'file-complete') {
        const inbound = inboundFileRef.current;
        if (!inbound) {
          return;
        }
        const blob = new Blob(inbound.chunks, { type: inbound.type || 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl((previous) => {
          if (previous) {
            URL.revokeObjectURL(previous);
          }
          return url;
        });
        setDownloadName(inbound.name);
        setReceivedSize(inbound.receivedBytes);
        setStatus('File received. Session is still active.');
        setIsTransferring(false);
        toast.success('File received successfully');
      }
      return;
    }

    if (data instanceof Blob) {
      return;
    }

    const inbound = inboundFileRef.current;
    if (!inbound) {
      return;
    }

    inbound.chunks.push(data);
    inbound.receivedBytes += data.byteLength;
    setReceiveProgress(Math.min(100, Math.round((inbound.receivedBytes / Math.max(1, inbound.size)) * 100)));
  }, []);

  const attachReceiverDataChannel = useCallback((channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    channel.binaryType = 'arraybuffer';
    channel.onopen = () => {
      setStatus('Connected. Waiting for sender file selection.');
      setIsSessionActive(true);
      setIsTransferring(false);
    };
    channel.onclose = () => {
      setStatus('Session ended');
      resetTransferState();
    };
    channel.onmessage = (event) => {
      handleInboundDataMessage(event.data as string | ArrayBuffer | Blob);
    };
  }, [handleInboundDataMessage, resetTransferState]);

  const sendSelectedFile = useCallback(async () => {
    const channel = dataChannelRef.current;
    const file = selectedFile;

    if (!channel || channel.readyState !== 'open' || !file || isTransferring) {
      return;
    }

    setStatus(`Sending ${file.name}`);
    setIsTransferring(true);
    setSendProgress(0);

    channel.send(
      JSON.stringify({
        type: 'file-meta',
        name: file.name,
        size: file.size,
        fileType: file.type || 'application/octet-stream'
      })
    );

    let sent = 0;
    for (let offset = 0; offset < file.size; offset += FILE_CHUNK_SIZE) {
      const chunk = await file.slice(offset, offset + FILE_CHUNK_SIZE).arrayBuffer();
      while (channel.bufferedAmount > MAX_BUFFERED_AMOUNT) {
        await wait(20);
      }
      channel.send(chunk);
      sent += chunk.byteLength;
      setSendProgress(Math.min(100, Math.round((sent / Math.max(1, file.size)) * 100)));
    }

    channel.send(JSON.stringify({ type: 'file-complete' }));
    setStatus('File sent. Session is still active.');
    setIsTransferring(false);
    toast.success('File sent successfully');
  }, [isTransferring, selectedFile]);

  const createSenderOffer = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Pick a file first');
      return;
    }

    clearAll();
    setSelectedFile(selectedFile);

    const connection = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = connection;

    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'connected') {
        setStatus('Connected. Sending selected file...');
        return;
      }
      if (connection.connectionState === 'failed') {
        setStatus('Connection failed. Regenerate QR and try again.');
        toast.error('WebRTC connection failed');
      }
    };

    const dataChannel = connection.createDataChannel('p2p-file', { ordered: true });
    dataChannelRef.current = dataChannel;
    dataChannel.binaryType = 'arraybuffer';

    dataChannel.onopen = () => {
      setIsSessionActive(true);
      setStatus('Connected. Sending selected file...');
      void sendSelectedFile();
    };

    dataChannel.onclose = () => {
      setStatus('Session ended');
      resetTransferState();
    };

    setStatus('Creating sender offer');
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);
    await waitForIceGatheringComplete(connection);

    const localDescription = connection.localDescription;
    if (!localDescription?.sdp) {
      toast.error('Failed to create sender offer');
      return;
    }

    const envelope: TSignalEnvelope = {
      kind: 'p2p-file-share',
      version: 1,
      signal: 'offer',
      sdp: localDescription.sdp,
      fileName: selectedFile.name,
      fileSize: selectedFile.size,
      fileType: selectedFile.type || 'application/octet-stream'
    };

    const signal = encodeSignal(envelope);
    setSenderSignalText(signal);
    try {
      const qrDataUrl = await buildSignalQrDataUrl(signal);
      setSenderQrDataUrl(qrDataUrl);
      setStatus('Sender QR ready. Receiver should scan it and return an answer QR.');
    } catch (error) {
      console.error(error);
      setSenderQrDataUrl('');
      setStatus('Sender signal ready. QR is too dense, use Copy latest signal text and paste on receiver.');
      toast.warn('Sender QR could not be generated. Use manual signal paste.');
    }
  }, [clearAll, resetTransferState, selectedFile, sendSelectedFile]);

  const applySignal = useCallback(
    async (raw: string, mode: TScanMode) => {
      try {
        const envelope = decodeSignal(raw);

        if (mode === 'receiver-await-offer') {
          if (envelope.signal !== 'offer') {
            toast.error('Expected an offer QR');
            return;
          }

          clearAll();
          const connection = new RTCPeerConnection(RTC_CONFIG);
          peerConnectionRef.current = connection;

          connection.onconnectionstatechange = () => {
            if (connection.connectionState === 'connected') {
              setStatus('Connected. Waiting for sender file selection.');
              return;
            }
            if (connection.connectionState === 'failed') {
              setStatus('Connection failed. Ask sender to regenerate QR.');
              toast.error('WebRTC connection failed');
            }
          };

          connection.ondatachannel = (event) => {
            attachReceiverDataChannel(event.channel);
          };

          await connection.setRemoteDescription({ type: 'offer', sdp: envelope.sdp });
          setStatus('Creating receiver answer');
          const answer = await connection.createAnswer();
          await connection.setLocalDescription(answer);
          await waitForIceGatheringComplete(connection);

          const localDescription = connection.localDescription;
          if (!localDescription?.sdp) {
            toast.error('Failed to create answer');
            return;
          }

          const responseSignal = encodeSignal({
            kind: 'p2p-file-share',
            version: 1,
            signal: 'answer',
            sdp: localDescription.sdp
          });

          setReceiverSignalText(responseSignal);
          try {
            const qrDataUrl = await buildSignalQrDataUrl(responseSignal);
            setReceiverQrDataUrl(qrDataUrl);
            setStatus('Answer QR ready. Sender should scan this QR to start transfer.');
          } catch (error) {
            console.error(error);
            setReceiverQrDataUrl('');
            setStatus('Answer ready. QR is too dense, use Copy latest signal text and paste on sender as Answer.');
            toast.warn('Answer QR could not be generated. Use manual signal paste.');
          }
          if (envelope.fileName) {
            setDownloadName(envelope.fileName);
          }
          return;
        }

        if (envelope.signal !== 'answer') {
          toast.error('Expected an answer QR');
          return;
        }

        const connection = peerConnectionRef.current;
        if (!connection) {
          toast.error('Create sender QR first');
          return;
        }

        await connection.setRemoteDescription({ type: 'answer', sdp: envelope.sdp });
        setStatus('Answer applied. Waiting for data channel open...');
      } catch (error) {
        console.error(error);
        throw new Error(error instanceof Error ? error.message : 'Could not apply signal payload');
      }
    },
    [attachReceiverDataChannel, clearAll]
  );

  const terminateSession = useCallback(() => {
    closePeer();
    setIsTransferring(false);
    setStatus('Session ended');
    setSendProgress(0);
    setReceiveProgress(0);
    setScanMode(null);
  }, [closePeer]);

  const handleSignalImageUpload = useCallback(
    async (event: ChangeEvent<HTMLInputElement>, mode: TScanMode) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) {
        return;
      }

      try {
        const signal = await decodeQrFromImageFile(file);
        await applySignal(signal, mode);
        toast.success('QR signal applied');
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Could not decode QR image');
      }
    },
    [applySignal]
  );

  useEffect(() => {
    return () => {
      closePeer();
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [closePeer, downloadUrl]);

  return (
    <div className="min-h-full rounded-[28px] bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 text-white md:p-6">
      <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
        <h1 className="text-2xl font-bold md:text-3xl">P2P file sharing with WebRTC + QR</h1>
        <p className="mt-2 text-sm text-slate-300">Simple flow: sender creates QR, receiver scans, receiver returns QR, sender scans, file transfers.</p>
        <p className="mt-3 text-sm text-emerald-200">Status: {status}</p>
      </div>

      <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm">
        <p className="font-semibold text-emerald-200">Quick steps</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-200">
          <li>Sender picks file and clicks Generate Sender QR.</li>
          <li>Receiver scans or uploads the sender QR.</li>
          <li>Receiver shows answer QR back to sender.</li>
          <li>Sender scans or uploads receiver QR.</li>
        </ol>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h2 className="text-xl font-semibold">Sender</h2>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">Step 1 and Step 4</p>

          <label className="mt-3 block text-sm text-slate-300">File to send</label>
          <input
            type="file"
            className="file-input file-input-bordered mt-2 w-full"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />

          {selectedFile && (
            <p className="mt-2 text-sm text-slate-300">
              {selectedFile.name} ({Math.ceil(selectedFile.size / 1024)} KB)
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary" disabled={!canGenerateSenderQr} onClick={() => void createSenderOffer()}>
              Generate Sender QR
            </button>
            <button className="btn btn-outline" disabled={!senderQrDataUrl} onClick={() => setScanMode('sender-await-answer')}>
              Scan Receiver QR
            </button>
            <button className="btn btn-outline" disabled={!senderQrDataUrl} onClick={() => senderQrUploadRef.current?.click()}>
              Upload Receiver QR
            </button>
          </div>

          <input
            ref={senderQrUploadRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              void handleSignalImageUpload(event, 'sender-await-answer');
            }}
          />

          {senderQrDataUrl && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-sm text-slate-300">Show this QR to the receiver.</p>
              <img src={senderQrDataUrl} alt="Sender offer QR" className="mt-3 w-full max-w-xs rounded bg-white p-2" />
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              className="btn btn-outline"
              disabled={!isSessionActive || !selectedFile || isTransferring}
              onClick={() => void sendSelectedFile()}
            >
              Send Selected File
            </button>
            <button className="btn btn-warning" disabled={!isSessionActive} onClick={terminateSession}>
              End Session
            </button>
            <button className="btn btn-ghost" onClick={clearAll}>
              Reset
            </button>
          </div>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Send progress</p>
            <progress className="progress progress-success mt-2 w-full" value={sendProgress} max="100" />
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
          <h2 className="text-xl font-semibold">Receiver</h2>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">Step 2 and Step 3</p>

          <div className="mt-3 flex flex-wrap gap-2">
            <button className="btn btn-primary" onClick={() => setScanMode('receiver-await-offer')}>
              Scan Offer QR
            </button>
            <button className="btn btn-outline" onClick={() => receiverQrUploadRef.current?.click()}>
              Upload Offer QR
            </button>
          </div>

          <input
            ref={receiverQrUploadRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              void handleSignalImageUpload(event, 'receiver-await-offer');
            }}
          />

          {receiverQrDataUrl && (
            <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3">
              <p className="text-sm text-slate-300">Show this answer QR to the sender.</p>
              <img src={receiverQrDataUrl} alt="Receiver answer QR" className="mt-3 w-full max-w-xs rounded bg-white p-2" />
            </div>
          )}

          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Receive progress</p>
            <progress className="progress progress-info mt-2 w-full" value={receiveProgress} max="100" />
          </div>

          {downloadUrl && (
            <a className="btn btn-success mt-4" href={downloadUrl} download={downloadName || 'received-file'}>
              Download received file ({Math.ceil(receivedSize / 1024)} KB)
            </a>
          )}
        </section>
      </div>

      <details className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-slate-200">Advanced / manual signal mode</summary>
        <p className="mb-2 mt-3 text-sm text-slate-300">Paste a signal payload only if camera/image scan is unavailable.</p>
        <textarea
          className="textarea textarea-bordered h-24 w-full bg-black/20"
          value={manualSignalInput}
          onChange={(event) => setManualSignalInput(event.target.value)}
          placeholder="Paste fswebrtc payload here"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <button className="btn btn-sm btn-outline" disabled={!manualSignalInput.trim()} onClick={() => void applySignal(manualSignalInput, 'receiver-await-offer')}>
            Treat as Offer
          </button>
          <button className="btn btn-sm btn-outline" disabled={!manualSignalInput.trim()} onClick={() => void applySignal(manualSignalInput, 'sender-await-answer')}>
            Treat as Answer
          </button>
          <button
            className="btn btn-sm btn-ghost"
            disabled={!senderSignalText && !receiverSignalText}
            onClick={async () => {
              const text = senderSignalText || receiverSignalText;
              if (!text) {
                return;
              }
              await navigator.clipboard.writeText(text);
              toast.success('Signal copied');
            }}
          >
            Copy latest signal text
          </button>
        </div>
      </details>

      {scanMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950 p-4">
            <h3 className="text-lg font-semibold">Scan QR</h3>
            <p className="mb-3 mt-1 text-sm text-slate-300">
              {scanMode === 'receiver-await-offer' ? 'Point camera at sender offer QR' : 'Point camera at receiver answer QR'}
            </p>
            <div className="overflow-hidden rounded-xl">
              <QrReader
                constraints={{ facingMode: { ideal: 'environment' } }}
                onResult={(result) => {
                  if (!result) {
                    return;
                  }
                  const text = result.getText().trim();
                  if (!text) {
                    return;
                  }

                  if (!isLikelySignalPayload(text)) {
                    return;
                  }

                  if (lastScannedSignalRef.current === text) {
                    return;
                  }
                  lastScannedSignalRef.current = text;

                  void applySignal(text, scanMode)
                    .then(() => {
                      toast.success('QR signal applied');
                      setScanMode(null);
                    })
                    .catch((error) => {
                      console.error(error);
                      toast.error(error instanceof Error ? error.message : 'Could not apply scanned QR payload');
                      lastScannedSignalRef.current = '';
                    });
                }}
                scanDelay={200}
              />
            </div>
            <button className="btn btn-outline mt-4 w-full" onClick={() => setScanMode(null)}>
              Close scanner
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PShare;
