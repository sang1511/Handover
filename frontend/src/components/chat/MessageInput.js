import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { sendMessage } from '../../api/services/chat.service';
import styles from './MessageInput.module.css';

const PaperPlaneIcon = ({ color = '#fff', size = 22 }) => (
  <svg width={size} height={size} fill="none" viewBox="0 0 24 24">
    <path d="M3 20v-6l7-2-7-2V4l19 8-19 8z" fill={color}/>
  </svg>
);

const UploadFileIcon = ({ color = '#3578e5', size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth="2"/>
    <path d="M12 16V8" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 11L12 8L15 11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MessageInput = () => {
  const { currentConversation, setMessages } = useChat();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);
  const inputRef = useRef(null);

  // Auto focus input when selecting a conversation
  useEffect(() => {
    if (currentConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentConversation]);

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !file) || !currentConversation) return;
    setSending(true);
    try {
      const res = await sendMessage(currentConversation._id, file ? { text, file } : { text });
      if (res && res.data && res.data._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === res.data._id)) return prev;
          return [...prev, res.data];
        });
      }
      setText('');
      setFile(null);
    } catch (err) {
      console.error('[MessageInput] Error sending message:', err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Handle Enter/Shift+Enter in input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  return (
    <form onSubmit={handleSend} className={styles.messageInputForm}>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Nhập tin nhắn..."
        className={styles.textInput}
        disabled={sending}
        autoComplete="off"
        ref={inputRef}
        onKeyDown={handleKeyDown}
      />
      <label className={styles.fileInputLabel} title="Đính kèm file">
        <input type="file" className={styles.fileInput} onChange={handleFileChange} disabled={sending} />
        <UploadFileIcon color="#65676b" size={20} />
      </label>
      {file && (
        <div className={styles.filePreview} title={file.name}>
          <span className={styles.fileName}>{file.name}</span>
          <button type="button" onClick={() => setFile(null)} className={styles.removeFileButton}>×</button>
        </div>
      )}
      <button
        type="submit"
        disabled={sending || (!text.trim() && !file)}
        className={`${styles.sendButton} ${(sending || (!text.trim() && !file)) ? styles.disabled : ''}`}
        title="Gửi tin nhắn"
      >
        <PaperPlaneIcon color="#fff" size={18} />
      </button>
    </form>
  );
};

export default MessageInput;