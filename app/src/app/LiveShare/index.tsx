import { useCallback, useRef } from 'react';
import MultiFileUpload from '../../components/MultiFileUpload';
import { UploadInput } from '../../components/UploadInput';
import { FileTable, QRCode } from '../../components';
import { downloadFile, isMobile } from '../../utils';
import { BASE_URL } from '../../api/axios';
import ChatBox from '../../components/ChatBox';
import { useLiveShare } from './hooks/useLiveShare';

const LiveShare = () => {
  const inputRef = useRef(null);
  const {
    chats,
    loading,
    progress,
    qrResponse,
    session,
    socketconnect,
    userCount,
    uuid,
    files,
    selected,
    handleQRInput,
    handleCreateSession,
    handleUpload,
    setSession,
    setSelected,
    handleDelete
  } = useLiveShare();

  const mobileView = isMobile();
  const qrInputRef = useRef(null);
  const scanQrInputRef = useRef(null);

  const onSend = useCallback(
    (message: string) => {
      socketconnect?.send(JSON.stringify({ uuid, message, session_hash: session?.hash }));
    },
    [session?.hash, socketconnect, uuid]
  );

  return !session?.qr && !qrResponse?.upload_details.hash ? (
    <div className="flex justify-center items-center h-4/6">
      <button className="btn btn-outline m-3" onClick={handleCreateSession} disabled={loading}>
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
      {session?.hash && <ChatBox chats={chats} onSend={onSend} sessionHash={session.hash} />}
    </div>
  );
};
export default LiveShare;
