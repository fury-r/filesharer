import { useState, useMemo, useCallback, ChangeEvent, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useService } from '../../../api/service/useService';
import { TChat } from '../../../types/common';
import { TUploadFileResponse, TScanQRResponse } from '../../../types/Response';
import { v4 as uuidv4 } from 'uuid';

export const useLiveShare = () => {
  const [files, setFiles] = useState<File[]>([]);
  const { generateLiveShareSession, uploadQRToServer, uploadFilesInSession, deleteFiles } = useService();
  const [session, setSession] = useState<TUploadFileResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [qrResponse, setQRResponse] = useState<TScanQRResponse | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [userCount, setUserCount] = useState(0);
  const uuid = useMemo(() => uuidv4(), []);
  const [socketconnect, setSocketConnect] = useState<WebSocket>();
  const [chats, setChats] = useState<TChat[]>([]);

  const [progress, setProgress] = useState<number>(0);

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
          if (chats.length > 0) {
            setChats([]);
          }
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
    [chats.length, session, uploadQRToServer]
  );
  const handleCreateSession = useCallback(async () => {
    setLoading(true);
    const response = await generateLiveShareSession();
    if (response) setSession(response);
    setLoading(false);
    setUserCount(1);
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
    if (session?.hash && !socketconnect) {
      const sockets = new WebSocket(`ws://${import.meta.env.VITE_API_ENDPOINT || 'localhost:8001'}/ws/file/${session.hash}/${uuid}`);
      sockets.onmessage = (e) => {
        const data = JSON.parse(e.data);
        console.log(data);
        if (data?.files) {
          toast.success('New file added');

          setSession((prev) => ({
            ...(prev as TUploadFileResponse),
            files: data.files
          }));
        }
        if (data?.count) {
          toast.success('Users updated');

          setUserCount(data?.count);
        }
        if (data?.chats) {
          setChats(data?.chats);
        }
      };
      sockets.onopen = (e) => {
        console.log(e);
      };
      setSocketConnect(sockets);
    }
  }, [session, socketconnect, uuid]);

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

  return {
    chats,
    session,
    qrResponse,
    loading,
    progress,
    socketconnect,
    uuid,
    userCount,
    files,
    selected,
    setSelected,
    handleDelete,
    handleCreateSession,
    handleQRInput,
    handleUpload,
    setSession
  };
};
