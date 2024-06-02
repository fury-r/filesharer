export type TUploadFileResponse = {
  qr: string;
  hash: string;
};

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

export type TScanQRResponse = {
  upload_details: TUpload;
  files: TFile[];
};
