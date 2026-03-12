import { Suspense, lazy, useEffect, useState } from 'react';
import './App.css';
// import { QrReader } from "react-qr-reader";
import { SplashScreen } from './components/SplashScreen';

type EPage = 'UPLOAD_FILE' | 'LIVE_SHARE' | 'PEER_MCP' | 'P2P_SHARE';
const APP_MODE = import.meta.env.VITE_APP_MODE;
const P2P_ONLY_MODE = APP_MODE === 'p2p-share';
const DEFAULT_PAGE: EPage = 'P2P_SHARE';
const UploadFile = lazy(() => import('./pages/UploadFiles'));
const LiveShare = lazy(() => import('./pages/LiveShare'));
const PeerMCP = lazy(() => import('./pages/PeerMCP'));
const P2PShare = lazy(() => import('./pages/P2PShare'));

function App() {
  const [page, setPage] = useState<EPage>((localStorage.getItem('option') as EPage) || DEFAULT_PAGE);
  const [isSplashScreen, setIsSplashScreen] = useState<boolean>(true);

  useEffect(() => {
    if (P2P_ONLY_MODE && page !== 'P2P_SHARE') {
      setPage('P2P_SHARE');
    }
  }, [page]);

  useEffect(() => {
    if (isSplashScreen) {
      const interval = setInterval(() => {
        if (isSplashScreen) {
          clearInterval(interval);
          setIsSplashScreen(false);
        }
      }, 1000);
    }
  }, [isSplashScreen]);

  useEffect(() => {
    localStorage.setItem('option', page);
  }, [page]);
  return isSplashScreen ? (
    <SplashScreen />
  ) : (
    <div className="h-full w-full bg-slate-950 p-5 text-white">
      <div className="mb-6 flex min-h-24 flex-wrap items-center gap-3 rounded-[28px] border border-white/10 bg-white/5 p-4 shadow-xl shadow-black/20">
        {!P2P_ONLY_MODE && (
          <button className="btn btn-outline m-1" disabled={page === 'UPLOAD_FILE'} onClick={() => setPage('UPLOAD_FILE')}>
            File Upload
          </button>
        )}
        {!P2P_ONLY_MODE && (
          <button className="btn btn-outline m-1" disabled={page === 'LIVE_SHARE'} onClick={() => setPage('LIVE_SHARE')}>
            Live Share
          </button>
        )}
        {!P2P_ONLY_MODE && (
          <button className="btn btn-outline m-1" disabled={page === 'PEER_MCP'} onClick={() => setPage('PEER_MCP')}>
            P2P MCP
          </button>
        )}
        <button className="btn btn-outline m-1" disabled={page === 'P2P_SHARE'} onClick={() => setPage('P2P_SHARE')}>
          P2P Share
        </button>
      </div>
      <div className="h-[calc(100%-7rem)] w-full">
        <Suspense fallback={<div className="p-6 text-slate-300">Loading page...</div>}>
          {P2P_ONLY_MODE ? <P2PShare /> : page === 'UPLOAD_FILE' ? <UploadFile /> : page === 'LIVE_SHARE' ? <LiveShare /> : page === 'PEER_MCP' ? <PeerMCP /> : <P2PShare />}
        </Suspense>
      </div>
    </div>
  );
}

export default App;
