import React, { ChangeEvent } from 'react';

export const UploadInput = ({
  scanQrInputRef,
  qrInputRef,
  handleQRInput
}: {
  handleQRInput: (e: ChangeEvent<HTMLInputElement>) => Promise<void>;
  scanQrInputRef: React.MutableRefObject<null>;
  qrInputRef: React.MutableRefObject<null>;
}) => {
  return (
    <>
      <input type="file" accept="image/*" ref={scanQrInputRef} onChange={handleQRInput} capture="environment" hidden />
      <input type="file" accept="image/*" ref={qrInputRef} onChange={handleQRInput} hidden />
    </>
  );
};
