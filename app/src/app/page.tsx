'use client';
import { useEffect, useState } from 'react';

import { SplashScreen } from '../components/SplashScreen';
import UploadFile from './UploadFiles';
import LiveShare from './LiveShare';
import { useThemeContext } from '@/context/ThemeContext/useContext';
import { CiSun } from 'react-icons/ci';
import { FaRegMoon } from 'react-icons/fa';

type EPage = 'UPLOAD_FILE' | 'LIVE_SHARE';

function App() {
  const [page, setPage] = useState<EPage>((localStorage.getItem('option') as EPage) || 'LIVE_SHARE');
  const [isSplashScreen, setIsSplashScreen] = useState<boolean>(true);
  const { theme, changeTheme } = useThemeContext();

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
      <div className=" h-1/6 flex flex-row">
        <div className="tooltip tooltip-bottom" data-tip="Upload and share qr">
          <button className="btn btn-outline m-3" disabled={page === 'UPLOAD_FILE'} onClick={() => setPage('UPLOAD_FILE')}>
            File Upload
          </button>
        </div>
        <div className="tooltip tooltip-bottom" data-tip="Live Sharing between connected Users.">
          <button className="btn btn-outline m-3" disabled={page === 'LIVE_SHARE'} onClick={() => setPage('LIVE_SHARE')}>
            Live Share
          </button>
        </div>
        <button className="btn btn-outline m-3" onClick={() => changeTheme(theme === 'dark' ? 'cupcake' : 'dark')}>
          {theme === 'dark' ? <CiSun /> : <FaRegMoon />}
        </button>
      </div>
      <div className="w-full h-5/6 ">{page === 'UPLOAD_FILE' ? <UploadFile /> : <LiveShare />}</div>
    </div>
  );
}

export default App;
