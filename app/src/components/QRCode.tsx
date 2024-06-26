import { Dispatch, SetStateAction } from 'react';
import { TUploadFileResponse } from '../types/Response';
import { MdCancel } from 'react-icons/md';
import { downloadFile } from '../utils/helperDom';

export const QRCode = ({
  fileUploadResponse,
  setFileUploadResponse,
  isMobile
}: {
  isMobile: boolean;
  fileUploadResponse: TUploadFileResponse;
  setFileUploadResponse: Dispatch<SetStateAction<TUploadFileResponse | null>>;
}) => (
  <div className="flex flex-col justify-between items-center my-2 p">
    <div className="flex flex-row items-center justify-between ">
      <label className="mr-2 my-2  whitespace-break-spaces text-ellipsis w-full">QR code with hash</label>
      <MdCancel onClick={() => setFileUploadResponse(null)} />
    </div>
    <h4 className="my-2 text-ellipsis whitespace-nowrap overflow-hidden w-1/2">{fileUploadResponse.hash} </h4>
    <img
      src={`data:image/png;base64,${fileUploadResponse.qr}`}
      className={`${isMobile ? ' w-1/2' : 'w-1/3'} my-2`}
      onClick={() => downloadFile(`data:image/png;base64,${fileUploadResponse.qr}`, 'qr.png')}
      alt="qr"
      loading="lazy"
    />

    <h2>Click Image to download QR code</h2>
    <h4>Share this QR code</h4>
  </div>
);
