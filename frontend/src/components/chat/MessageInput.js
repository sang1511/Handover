import React, { useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { sendMessage } from '../../api/services/chat.service';

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
  const { currentConversation } = useChat();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [file, setFile] = useState(null);

  const handleSend = async (e) => {
    e.preventDefault();
    if ((!text.trim() && !file) || !currentConversation) return;
    setSending(true);
    try {
      await sendMessage(currentConversation._id, file ? { text, file } : { text });
      setText('');
      setFile(null);
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  return (
    <form onSubmit={handleSend} style={{ display: 'flex', borderTop: '1.5px solid #e0e7ef', padding: 16, background: '#fff', alignItems: 'center', boxShadow: '0 -2px 8px #e0e7ef' }}>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Nhập tin nhắn..."
        style={{ flex: 1, padding: '12px 18px', border: '1.5px solid #b6c2d1', borderRadius: 24, fontSize: 16, outline: 'none', background: '#f8fafc', marginRight: 14, transition: 'border 0.2s', boxShadow: '0 1px 4px #e0e7ef' }}
        disabled={sending}
        autoComplete="off"
      />
      <label style={{ marginRight: 10, cursor: 'pointer' }} title="Đính kèm file">
        <input type="file" style={{ display: 'none' }} onChange={handleFileChange} disabled={sending} />
        <UploadFileIcon color="#3578e5" size={22} />
      </label>
      {file && (
        <span style={{ marginRight: 10, fontSize: 13, color: '#007bff', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={file.name}>
          {file.name}
          <button type="button" onClick={() => setFile(null)} style={{ marginLeft: 6, color: '#dc3545', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
        </span>
      )}
      <button
        type="submit"
        disabled={sending || (!text.trim() && !file)}
        style={{
          background: 'linear-gradient(90deg,#4f8cff 60%,#6fc3ff 100%)',
          color: '#fff', border: 'none', borderRadius: '50%', width: 44, height: 44,
          fontWeight: 600, fontSize: 16, cursor: sending || (!text.trim() && !file) ? 'not-allowed' : 'pointer',
          opacity: sending || (!text.trim() && !file) ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 8px #e0e7ef', transition: 'background 0.2s, box-shadow 0.2s, transform 0.2s',
        }}
        onMouseOver={e => { if (!sending && (text.trim() || file)) e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="Gửi tin nhắn"
      >
        <PaperPlaneIcon color="#fff" size={22} />
      </button>
    </form>
  );
};

export default MessageInput; 