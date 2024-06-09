import { TScanQRResponse, TSessionFileUploadResponse, TUploadFileResponse } from '../../types/Response';
import axiosInstance from '../axios';

export const useService = () => {
  const uploadFileToServer = async (files: File[], callbackFunctions?: object): Promise<TUploadFileResponse | void> => {
    const data = new FormData();
    files.forEach((value) => {
      data.append(value.name, value);
    });
    try {
      const response = await axiosInstance.post('/v1/file/upload/', data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        ...callbackFunctions
      });
      return response.data as {
        qr: string;
        hash: string;
      };
    } catch (err) {
      console.error(err);
    }
  };

  const uploadQRToServer = async (qr: File): Promise<TScanQRResponse | void> => {
    try {
      const data = new FormData();
      data.append('qr', qr);
      const response = await axiosInstance.post(
        '/v1/file/get/',
        {
          qr
        },
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      return response.data as TScanQRResponse;
    } catch (err) {
      console.error(err);
    }
  };
  const deleteFiles = async (hash_id: string, files: string): Promise<void> => {
    try {
      await axiosInstance.delete(`/v1/file/delete/${hash_id}/${files}`, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    } catch (err) {
      console.error(err);
    }
  };

  const generateLiveShareSession = async (): Promise<TUploadFileResponse | void> => {
    try {
      const response = await axiosInstance.get('/v1/file/live/session');
      return response.data as TUploadFileResponse;
    } catch (err) {
      console.error(err);
    }
  };

  const uploadFilesInSession = async (
    files: File[],
    hash: string,
    callbackFunctions?: object
  ): Promise<TSessionFileUploadResponse | undefined> => {
    const data = new FormData();
    files.forEach((value) => {
      data.append(value.name, value);
    });
    try {
      const response = await axiosInstance.post(`/v1/file/live/session/${hash}/`, data, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        ...callbackFunctions
      });
      return response.data as TSessionFileUploadResponse;
    } catch (err) {
      console.error(err);
    }
  };

  return {
    uploadFileToServer,
    uploadQRToServer,
    deleteFiles,
    generateLiveShareSession,
    uploadFilesInSession
  };
};
