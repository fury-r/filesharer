import { Dispatch, SetStateAction } from 'react';
import { TFile } from '../types/Response';
import { BASE_URL } from '../api/axios';
import { downloadFile, formatBytes } from '../utils';

interface IFileTable {
  setSelected: Dispatch<SetStateAction<number[]>>;
  files: TFile[];
  selected: number[];
  hash: string;
}
export const FileTable = ({ setSelected, selected, files, hash }: IFileTable) => {
  return (
    <div className="w-full max-h-96 min-h-fit ">
      <h3>Total File:{files.length}</h3>
      <table className="table  ">
        <thead>
          <tr>
            <th>
              <label>
                <input
                  type="checkbox"
                  onChange={() => {
                    setSelected(() => (selected.length < files.length ? files.map((value) => value.id) : []));
                  }}
                  className="checkbox"
                  checked={selected.length === files.length}
                />
              </label>
            </th>
            <th>Name</th>
            <th>Content-type</th>
            <th>Size</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {files.map((value) => (
            <tr id="table-body">
              <th>
                <label>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={selected.includes(value.id)}
                    onChange={() => {
                      if (selected.includes(value.id)) {
                        setSelected(selected.filter((id) => id != value.id));
                      } else {
                        setSelected((prev) => [...prev, value.id]);
                      }
                    }}
                  />
                </label>
              </th>
              <td>
                <div className="flex items-center gap-3">
                  {value.name.length > 30 ? value.name.substring(0, 10) + '...' + value.name.substring(value.name.length - 10) : value.name}
                </div>
              </td>
              <td>
                <div className="flex items-center gap-3">{value.content_type}</div>
              </td>
              <td>
                <div className="flex items-center gap-3">{formatBytes(value.size)}</div>
              </td>
              <td>
                <div className="flex items-center gap-3">
                  <button className="btn" onClick={() => downloadFile(`${BASE_URL}/v1/file/download/${hash}/${value.id}/`, value.name)}>
                    Download
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
