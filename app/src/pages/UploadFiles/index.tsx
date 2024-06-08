import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import MultiFileUpload from '../../components/MultiFileUpload';
// import { QrReader } from "react-qr-reader";
import { FileTable, QRCode } from '../../components';
import { useService } from '../../api/service/useService';
import { TScanQRResponse, TUploadFileResponse } from '../../types/Response';
import { downloadFile } from '../../utils/helperDom';
import { BASE_URL } from '../../api/axios';
import { isMobile } from '../../utils';
import { UploadInput } from '../../components/UploadInput';
import { toast } from 'react-toastify';

const UploadFile = () => {
  const [files, setFiles] = useState<File[]>([]);
  const mobileView = isMobile();
  const [progress, setProgress] = useState<number>(0);
  const [qrResponse, setQRResponse] = useState<TScanQRResponse | null>(null);
  const qrInputRef = useRef(null);
  const scanQrInputRef = useRef(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [fileUploadResponse, setFileUploadResponse] = useState<TUploadFileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const inputRef = useRef(null);
  const { uploadFileToServer, uploadQRToServer, deleteFiles } = useService();

  const uploadFile = useCallback(async () => {
    if (qrResponse) {
      setQRResponse(null);
      setFileUploadResponse(null);
    }
    if (files.length === 0) {
      if (inputRef.current) {
        //@ts-ignore
        inputRef.current.click();
      }
      return;
    }
    setLoading(true);

    const value = await uploadFileToServer(files, {
      onUploadProgress: (progressEvent: any) => {
        console.log(progressEvent);
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setProgress(percentCompleted);
      }
    });
    if (value) {
      setFileUploadResponse(value);
      setProgress(100);
    }

    setLoading(false);
  }, [files, qrResponse, uploadFileToServer]);

  const handleQRInput = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      setLoading(true);
      const files = e.target.files;
      if (files && files?.length > 0) {
        if (fileUploadResponse) {
          setFileUploadResponse(null);
          setFiles([]);
        }
        const res = await uploadQRToServer(files[0]);
        toast.success('Valid QR');
        if (res) setQRResponse(res);
      }
      setLoading(false);
    },
    [fileUploadResponse, uploadQRToServer]
  );

  const handleDelete = useCallback(async () => {
    if (qrResponse) {
      await deleteFiles(qrResponse.upload_details.hash, selected.length === qrResponse.files.length ? '' : selected.join(',')).then(() => {
        toast.success('File Deleted ');
        setQRResponse((prev) => {
          //@ts-ignore
          prev!.files! = prev?.files.filter(({ id }) => !selected.includes(id));
          if (prev?.files.length === 0) {
            setQRResponse(null);
          }
          return prev;
        });
      });
    }
  }, [deleteFiles, qrResponse, selected]);

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
  return (
    <div className=" flex-col items-center justify-between p-5 mb-2 h-full">
      <h1 className="font-bold m-5 whitespace-nowrap text-center">File Sharer</h1>
      {fileUploadResponse?.qr && (
        <QRCode isMobile={mobileView} fileUploadResponse={fileUploadResponse} setFileUploadResponse={setFileUploadResponse} />
      )}

      <div className="w-full  h-fit flex flex-col items-center">
        {qrResponse ? (
          <div className=" overflow-auto">
            <div className="h-64">
              <FileTable files={qrResponse.files} hash={qrResponse.upload_details.hash} selected={selected} setSelected={setSelected} />
            </div>
            {selected.length > 1 && qrResponse.files.length > 1 && (
              <button
                onClick={() =>
                  downloadFile(
                    `${BASE_URL}/v1/file/download/${
                      selected.length < qrResponse.files.length ? `${qrResponse.upload_details.hash}/${selected.join(',')}/` : ''
                    }`,
                    `${qrResponse.upload_details.hash}.zip`
                  )
                }
                className="btn m-5"
              >
                Download
                {selected.length === qrResponse.files.length ? ' All' : ' Selected'}
              </button>
            )}
            {selected.length > 0 && (
              <button onClick={() => handleDelete()} className="btn m-5">
                Delete
                {selected.length === qrResponse.files.length ? ' All' : ' Selected'}
              </button>
            )}
          </div>
        ) : (
          <MultiFileUpload
            onFilesSelected={(files: File[]) => {
              setFiles(files);
            }}
            inputRef={inputRef}
            width="60%"
          />
        )}
        {loading && (
          <div className="w-full bg-gray-200 rounded-full dark:bg-gray-700 m-5">
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
        <button className="btn btn-outline   w-[60%] m-3" disabled={loading} onClick={uploadFile}>
          Upload files
        </button>
        <div className="my-6 flex justify-between  ">
          <button
            className="btn btn-outline mx-3"
            disabled={loading}
            onClick={() => {
              if (qrInputRef.current) {
                //@ts-ignore
                qrInputRef.current.click();
              }
            }}
          >
            Upload QR
          </button>
          {mobileView && (
            <button
              className="btn  btn-outline mx-3"
              disabled={loading}
              onClick={() => {
                if (scanQrInputRef.current) {
                  //@ts-ignore
                  scanQrInputRef.current.click();
                }
              }}
            >
              Scan QR
            </button>
          )}
        </div>
      </div>
      <UploadInput handleQRInput={handleQRInput} qrInputRef={qrInputRef} scanQrInputRef={scanQrInputRef} />
    </div>
  );
};

export default UploadFile;
