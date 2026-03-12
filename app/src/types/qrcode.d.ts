declare module 'qrcode' {
  type TErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

  type TToDataUrlOptions = {
    margin?: number;
    width?: number;
    errorCorrectionLevel?: TErrorCorrectionLevel;
  };

  const QRCode: {
    toDataURL: (text: string, options?: TToDataUrlOptions) => Promise<string>;
  };

  export default QRCode;
}
