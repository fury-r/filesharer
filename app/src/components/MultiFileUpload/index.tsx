import { ChangeEvent, useEffect, useState } from 'react';
import { AiOutlineCheckCircle, AiOutlineCloudUpload } from 'react-icons/ai';
import { MdClear } from 'react-icons/md';
import './style.css';

const MultiFileUpload = ({
  onFilesSelected,
  inputRef,
  width,
  height,
  fileState
}: {
  inputRef: React.MutableRefObject<null>;
  onFilesSelected: (files: File[]) => void;
  width?: string;
  height?: string;
  fileState?: File[];
}) => {
  const [files, setFiles] = useState<File[]>(fileState || []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      const newFiles = Array.from(selectedFiles);
      setFiles((prevFiles) => {
        const input = [...prevFiles, ...(newFiles as File[])];
        onFilesSelected(input);
        return input;
      });
    }
  };
  const handleDrop = (event: any) => {
    event.preventDefault();
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const newFiles = Array.from(droppedFiles);
      //@ts-ignore
      setFiles((prevFiles) => {
        const input = [...prevFiles, ...(newFiles as File[])];
        onFilesSelected(input);
        return input;
      });
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  useEffect(() => {
    setFiles(fileState || []);
  }, [fileState]);

  return (
    <section className="drag-drop" style={{ width: width, height: height }}>
      <div
        className={`document-uploader border-red-600 ${files.length > 0 ? 'upload-box active' : 'upload-box'}`}
        onDrop={handleDrop}
        onDragOver={(event) => event.preventDefault()}
      >
        <>
          <div className="upload-info">
            <AiOutlineCloudUpload />
            <div>
              <p>Drag and drop your files here</p>
            </div>
          </div>
          <input type="file" hidden id="browse" onChange={handleFileChange} ref={inputRef} multiple />
          <label htmlFor="browse" className="browse-btn">
            Browse files
          </label>
        </>

        {files.length > 0 && (
          <div className="file-list overflow-y-auto h-fit">
            <div className="file-list__container  h-fit">
              {files.map((file, index) => (
                <div className="file-item" key={index}>
                  <div className="file-info">
                    <p>{file.name}</p>
                    {/* <p>{file.type}</p> */}
                  </div>
                  <div className="file-actions">
                    <MdClear onClick={() => handleRemoveFile(index)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {files.length > 0 && (
          <div className="success-file ">
            <AiOutlineCheckCircle style={{ color: '#6DC24B', marginRight: 1 }} />
            <p>{files.length} file(s) selected</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default MultiFileUpload;
