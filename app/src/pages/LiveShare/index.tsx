import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import MultiFileUpload from '../../components/MultiFileUpload';
import { TScanQRResponse, TUploadFileResponse } from '../../types/Response';
import { UploadInput } from '../../components/UploadInput';
import { useService } from '../../api/service/useService';
import { FileTable, QRCode } from '../../components';
import { downloadFile, isMobile } from '../../utils';
import { BASE_URL } from '../../api/axios';
import { toast } from 'react-toastify';

const LiveShare = () => {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef(null);
  const { generateLiveShareSession, uploadQRToServer, uploadFilesInSession, deleteFiles } = useService();
  const [session, setSession] = useState<TUploadFileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [qrResponse, setQRResponse] = useState<TScanQRResponse | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [userCount, setUserCount] = useState(0);

  const mobileView = isMobile();
  const [progress, setProgress] = useState<number>(0);
  const qrInputRef = useRef(null);
  const scanQrInputRef = useRef(null);

  const handleQRInput = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      setLoading(true);
      const files = e.target.files;
      if (files && files?.length > 0) {
        if (session) {
          setSession(null);
          setFiles([]);
        }
        const res = await uploadQRToServer(files[0]);

        if (res) {
          setQRResponse(res);
          const reader = new FileReader();
          reader.readAsDataURL(files[0]);
          reader.onload = () => {
            setSession({
              hash: res.upload_details.hash,
              qr: (reader.result as string).split(',')[1],
              files: res.files
            });
          };
        }
      }
      setLoading(false);
    },
    [session, uploadQRToServer]
  );
  const handleCreateSession = useCallback(async () => {
    setLoading(true);
    const response = await generateLiveShareSession();
    if (response) setSession(response);
    setLoading(false);
    toast.success('Session Created');
  }, [generateLiveShareSession]);

  const handleDelete = useCallback(async () => {
    if (qrResponse) {
      await deleteFiles(qrResponse.upload_details.hash, selected.length === qrResponse.files.length ? '' : selected.join(',')).then(() => {
        toast.success('File Deleted ');
        setSession((prev) => {
          //@ts-ignore
          prev!.files! = prev?.files.filter(({ id }) => !selected.includes(id));
          if (prev?.files!.length === 0) {
            setQRResponse(null);
          }
          return prev;
        });
      });
    }
  }, [deleteFiles, qrResponse, selected]);

  const handleUpload = useCallback(
    async (files: File[]) => {
      console.log('called');
      if (files.length > 0) {
        const res = await uploadFilesInSession(files, session!.hash!, {
          onUploadProgress: (progressEvent: any) => {
            console.log(progressEvent);
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        });
        if (res) {
          setFiles([]);
        }
      }
    },
    [session, uploadFilesInSession]
  );

  useEffect(() => {
    if (session?.hash) {
      const sockets = new WebSocket(`ws://${import.meta.env.VITE_API_ENDPOINT || 'localhost:8001'}/ws/file/${session.hash}/`);
      sockets.onmessage = (e) => {
        console.log(e);
        const data = JSON.parse(e.data);
        if (data?.files) {
          toast.success('New file added');

          setSession((prev) => ({
            ...(prev as TUploadFileResponse),
            files: data.files
          }));
        }
        if (data?.count) {
          toast.success('New User Joined');

          setUserCount(data?.count);
        }
      };
      sockets.onopen = (e) => {
        console.log(e);
      };
    }
  }, [session]);

  useEffect(() => {
    if (progress === 100) {
      const interval = setInterval(() => {
        if (interval) {
          setProgress(0);
          clearInterval(interval);
          toast.success('File Uploaded');
        }
      }, 2000);
    }
  }, [progress]);

  return !session?.qr && !qrResponse?.upload_details.hash ? (
    <div className="flex justify-center items-center h-4/6">
      <button className="btn btn-outline     m-3" onClick={handleCreateSession} disabled={loading}>
        Create Session
      </button>
      <button
        className="btn btn-outline m-3"
        disabled={loading}
        onClick={() => {
          if (mobileView && scanQrInputRef.current) {
            //@ts-ignore
            scanQrInputRef.current.click();
          } else if (qrInputRef.current) {
            //@ts-ignore
            qrInputRef.current.click();
          }
        }}
      >
        Upload QR to join Session
      </button>
      <UploadInput handleQRInput={handleQRInput} qrInputRef={qrInputRef} scanQrInputRef={scanQrInputRef} />
    </div>
  ) : (
    <div className="flex flex-col items-center ">
      <h3>Total Live Users: {userCount}</h3>
      {session?.files && session?.files.length > 0 ? (
        <div className=" overflow-auto  h-1/2  m-5">
          <FileTable files={session.files} hash={session.hash} selected={selected} setSelected={setSelected} />
          {selected.length > 1 && session.files.length > 1 && (
            <button
              onClick={() =>
                downloadFile(
                  `${BASE_URL}/v1/file/download/${selected.length < session.files!.length ? `${session.hash}/${selected.join(',')}/` : ''}`,
                  `${session.hash}.zip`
                )
              }
              className="btn m-5"
            >
              Download
              {selected.length === session.files.length ? ' All' : ' Selected'}
            </button>
          )}
          {selected.length > 0 && (
            <button onClick={() => handleDelete()} className="btn m-5">
              Delete
              {selected.length === session.files.length ? ' All' : ' Selected'}
            </button>
          )}
        </div>
      ) : (
        <div className="m-5 p-5 text-2xl font-bold underline border-white border-dotted border-spacing-2 border-[1px] rounded-md">
          No files uploaded yet
        </div>
      )}
      <div>{session?.hash && <MultiFileUpload fileState={files} onFilesSelected={handleUpload} inputRef={inputRef} width="100%" />}</div>
      {session?.qr && <QRCode isMobile={mobileView} fileUploadResponse={session} setFileUploadResponse={setSession} />}

      {progress > 0 && (
        <div className="w-full h-fit bg-gray-200 rounded-full dark:bg-gray-700 m-5">
          <div
            className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-0.5 leading-none rounded-full"
            style={{
              width: `${progress}%`
            }}
          >
            {progress}%
          </div>
        </div>
      )}
    </div>
  );
};
export default LiveShare;
