import { useEffect, useState } from 'react';
import './App.css';
// import { QrReader } from "react-qr-reader";
import { SplashScreen } from './components/SplashScreen';
import UploadFile from './pages/UploadFiles';
import LiveShare from './pages/LiveShare';
import PeerMCP from './pages/PeerMCP';

type EPage = 'UPLOAD_FILE' | 'LIVE_SHARE' | 'PEER_MCP';

function App() {
  const [page, setPage] = useState<EPage>((localStorage.getItem('option') as EPage) || 'LIVE_SHARE');
  const [isSplashScreen, setIsSplashScreen] = useState<boolean>(true);

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
        <button className="btn btn-outline m-1" disabled={page === 'UPLOAD_FILE'} onClick={() => setPage('UPLOAD_FILE')}>
          File Upload
        </button>
        <button className="btn btn-outline m-1" disabled={page === 'LIVE_SHARE'} onClick={() => setPage('LIVE_SHARE')}>
          Live Share
        </button>
        <button className="btn btn-outline m-1" disabled={page === 'PEER_MCP'} onClick={() => setPage('PEER_MCP')}>
          P2P MCP
        </button>
      </div>
      <div className="h-[calc(100%-7rem)] w-full">
        {page === 'UPLOAD_FILE' ? <UploadFile /> : page === 'LIVE_SHARE' ? <LiveShare /> : <PeerMCP />}
      </div>
    </div>
  );
}

export default App;
