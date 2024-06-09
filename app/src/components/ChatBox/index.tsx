import { FaUser } from 'react-icons/fa';
import { IoSend } from 'react-icons/io5';
import { MdCancel } from 'react-icons/md';
import { TChat } from '../../types/common';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FaMessage } from 'react-icons/fa6';

interface IChatBox {
  chats: TChat[];
  onSend: (text: string) => void;
  sessionHash: string;
}

const ChatBox = ({ chats, onSend, sessionHash }: IChatBox) => {
  const [text, setText] = useState('');
  const [show, setShow] = useState(false);
  const [update, setUpdate] = useState(chats.length > 0);
  const ref = useRef<HTMLDivElement>(null);

  const handleSend = useCallback(() => {
    onSend(text);
    setText('');
  }, [onSend, text]);

  useEffect(() => {
    const listener = (ev: KeyboardEvent) => {
      if (ev.code === 'Enter') {
        handleSend();
      }
    };
    window.addEventListener('keydown', listener);

    // const divOutsideListener = (event: MouseEvent) => {
    //   if (ref.current && !ref.current.contains(event.target as Node)) {
    //     setShow(false);
    //   }
    // };
    // window.addEventListener('click', divOutsideListener);
    return () => {
      window.removeEventListener('keydown', listener);
      //   window.removeEventListener('click', divOutsideListener);
    };
  }, [handleSend]);

  useEffect(() => {
    setUpdate(chats.length > 0);
  }, [chats]);

  return (
    <div ref={ref} id="chat-box" data-theme="dark" className="absolute   bottom-5 right-5  flex flex-col justify-between">
      {show ? (
        <div className="   border-2 border-solid border-white w-[250px] h-[300px]  bg-white shadow-md rounded-lg flex flex-col justify-between">
          <div className="flex flex-row justify-between items-center p-2">
            <div className="flex w-[200px] flex-row">
              <h3 className="font-bold">Session</h3>:
              <h4 title={sessionHash} className="text-ellipsis w-4/6 whitespace-nowrap overflow-hidden">
                {sessionHash}
              </h4>
            </div>
            <MdCancel onClick={() => setShow(false)} />
          </div>
          <div className="overflow-auto h-5/6">
            {chats.map((value, key) => {
              return value.user === 2 ? (
                <div className="chat chat-start" key={key}>
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      <FaUser className="text-gray-700" size="100%" />
                    </div>
                  </div>

                  <div className="chat-bubble chat-bubble-primary">{value.message}</div>
                </div>
              ) : (
                <div className="chat chat-end" key={key}>
                  <div className="chat-image avatar">
                    <div className="w-10 rounded-full">
                      <FaUser className="text-gray-700" size="100%" />
                    </div>
                  </div>
                  <div className="chat-bubble chat-bubble-info">{value.message}</div>
                </div>
              );
            })}
          </div>
          <div className="m-2  flex flex-row items-center">
            <input
              value={text}
              className="h-8 rounded-l-xl p-3 "
              data-theme="dark"
              type="text"
              onChange={(e) => {
                setText(e.target.value);
              }}
            />
            <button className="h-8  rounded-r-xl w-full flex flex-row items-center justify-center" onClick={handleSend} data-theme="dark">
              <IoSend />
            </button>
          </div>
        </div>
      ) : (
        <button
          className="absolute bottom-5 right-5 rounded-xl m-2 "
          onClick={() => {
            setShow(true);
            setUpdate(false);
          }}
        >
          {update && <div className="rounded-badge h-[8px] w-[8px] bg-red-600 absolute top-[-5px] right-[-2px]"></div>}
          <FaMessage size="30px" />
        </button>
      )}
    </div>
  );
};

export default ChatBox;
