export type TUpload = {
  hash: string;
  published_date: string;
  total_files: 1;
  id: number;
};

export type TFile = {
  name: string;
  size: string;
  upload_id: number;
  content_type: string;
  id: number;
};
export type TUploadFileResponse = {
  qr: string;
  hash: string;
  files?: TFile[];
};
export type TScanQRResponse = {
  upload_details: TUpload;
  files: TFile[];
};

export type TSessionFileUploadResponse = {
  msg_id: string;
  files: TFile[];
};
