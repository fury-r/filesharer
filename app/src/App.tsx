import { useEffect, useState } from 'react';
import './App.css';
// import { QrReader } from "react-qr-reader";
import { SplashScreen } from './components/SplashScreen';
import UploadFile from './pages/UploadFiles';
import LiveShare from './pages/LiveShare';

type EPage = 'UPLOAD_FILE' | 'LIVE_SHARE';

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
    <div className="w-full h-full p-5  ">
      <div className=" h-1/6">
        <button className="btn btn-outline    m-3" disabled={page === 'UPLOAD_FILE'} onClick={() => setPage('UPLOAD_FILE')}>
          File Upload
        </button>
        <button className="btn btn-outline   m-3" disabled={page === 'LIVE_SHARE'} onClick={() => setPage('LIVE_SHARE')}>
          Live Share
        </button>
      </div>
      <div className="w-full h-5/6 ">{page === 'UPLOAD_FILE' ? <UploadFile /> : <LiveShare />}</div>
    </div>
  );
}

export default App;
