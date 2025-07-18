import React, { useRef, useEffect, useState } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { deleteGroupChat, addMembersToGroup } from '../../api/services/chat.service';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
import AddMemberPopup from '../popups/AddMemberPopup';
import axiosInstance from '../../api/axios';

const formatTime = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Generate a consistent color from a string (for avatar background)
const getColorFromString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 70%, 75%)`;
  return color;
};

const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '?';

const MessageAvatar = ({ name }) => (
  <div style={{
    width: 32, height: 32, borderRadius: '50%',
    background: getColorFromString(name),
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 700, fontSize: 15, color: '#2d3a4a',
    marginRight: 8, userSelect: 'none',
    boxShadow: '0 1px 4px #e0e7ef',
  }}>{getInitial(name)}</div>
);

// SVG icon hiện đại cho các loại file
const FileIcons = {
  image: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#e3f0ff"/><rect x="7" y="7" width="18" height="18" rx="3" fill="#fff" stroke="#4f8cff" strokeWidth="2"/><circle cx="12" cy="13" r="2" fill="#4f8cff"/><path d="M9 21l4.5-6 4.5 6 5-7 3 4v3a3 3 0 0 1-3 3H10a1 1 0 0 1-1-1z" fill="#b6d6ff"/></svg>
  ),
  pdf: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#fff3f0"/><rect x="7" y="7" width="18" height="18" rx="3" fill="#fff" stroke="#ff6b6b" strokeWidth="2"/><path d="M12 12h8M12 16h8M12 20h5" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  doc: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#f0f7ff"/><rect x="7" y="7" width="18" height="18" rx="3" fill="#fff" stroke="#3578e5" strokeWidth="2"/><path d="M12 12h8M12 16h8M12 20h5" stroke="#3578e5" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  zip: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#fffbe6"/><rect x="7" y="7" width="18" height="18" rx="3" fill="#fff" stroke="#ffb300" strokeWidth="2"/><rect x="13" y="12" width="6" height="8" rx="1" fill="#ffe082" stroke="#ffb300" strokeWidth="1.5"/><path d="M16 12v8" stroke="#ffb300" strokeWidth="1.5"/></svg>
  ),
  default: (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none"><rect width="32" height="32" rx="8" fill="#f4f6fb"/><rect x="7" y="7" width="18" height="18" rx="3" fill="#fff" stroke="#b6c2d1" strokeWidth="2"/><path d="M12 12h8M12 16h8M12 20h5" stroke="#b6c2d1" strokeWidth="2" strokeLinecap="round"/></svg>
  )
};

const getFileIconSVG = (fileName, fileType) => {
  const ext = (fileName || '').split('.').pop().toLowerCase();
  if (["jpg","jpeg","png","gif","bmp","webp"].includes(ext)) return FileIcons.image;
  if (["pdf"].includes(ext)) return FileIcons.pdf;
  if (["doc","docx"].includes(ext)) return FileIcons.doc;
  if (["xls","xlsx"].includes(ext)) return FileIcons.doc;
  if (["ppt","pptx"].includes(ext)) return FileIcons.doc;
  if (["zip","rar","7z"].includes(ext)) return FileIcons.zip;
  return FileIcons.default;
};

// Icon SVG
const UserPlusIcon = ({ size = 22, color = '#3578e5' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="4" stroke={color} strokeWidth="2"/><path d="M17 11v6M20 14h-6" stroke={color} strokeWidth="2" strokeLinecap="round"/><path d="M3 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1" stroke={color} strokeWidth="2"/></svg>
);
const TrashIcon = ({ size = 22, color = '#ff6b6b' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><rect x="5" y="7" width="14" height="12" rx="2" stroke={color} strokeWidth="2"/><path d="M3 7h18" stroke={color} strokeWidth="2" strokeLinecap="round"/><path d="M10 11v4M14 11v4" stroke={color} strokeWidth="2" strokeLinecap="round"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" stroke={color} strokeWidth="2"/></svg>
);

// Helper để lấy nhãn ngày
const getDateLabel = (date) => {
  if (isToday(date)) return 'Hôm nay';
  if (isYesterday(date)) return 'Hôm qua';
  return format(date, 'dd/MM/yyyy');
};

const ChatWindow = () => {
  const { messages, loading, currentConversation } = useChat();
  const { user } = useAuth();
  const bottomRef = useRef();
  const navigate = useNavigate();
  const [showAddMember, setShowAddMember] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Thêm hàm download file qua axios
  const handleDownloadFile = async (msg) => {
    try {
      const response = await axiosInstance.get(`/conversations/${msg.conversationId}/files/${msg.publicId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', msg.fileName || 'file');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (err) {
      alert('Không thể tải file!');
    }
  };

  if (!currentConversation) return <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Chọn cuộc trò chuyện để bắt đầu chat</div>;
  if (loading) return <div style={{ flex: 1, padding: 24 }}>Đang tải tin nhắn...</div>;
  const isGroup = currentConversation.isGroupChat;
  const isAdmin = isGroup && currentConversation.groupAdmin === user?._id;
  const title = isGroup ? currentConversation.name : (currentConversation.participants?.find(u => u._id !== user?._id)?.name || 'Chat');
  const avatarName = isGroup ? currentConversation.name : (currentConversation.participants?.find(u => u._id !== user?._id)?.name || 'Chat');

  // Xử lý xóa nhóm
  const handleDeleteGroup = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhóm này?')) return;
    try {
      await deleteGroupChat(currentConversation._id);
      alert('Đã xóa nhóm!');
      navigate('/chats');
      window.location.reload();
    } catch (err) {
      alert('Xóa nhóm thất bại!');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', background: '#f4f6fb' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #e0e7ef', background: '#fff', fontWeight: 700, fontSize: 18, letterSpacing: 1, display: 'flex', alignItems: 'center', minHeight: 56, boxShadow: '0 2px 8px #f0f1f3', zIndex: 1 }}>
        <MessageAvatar name={avatarName} />
        <span style={{ fontWeight: 800, fontSize: 19, color: '#3578e5', flex: 1 }}>{title}</span>
        {isAdmin && (
          <>
            <span style={{position:'relative', display:'inline-block', marginRight:10}}>
              <button onClick={() => setShowAddMember(true)} style={{background:'none', border:'none', padding:6, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <UserPlusIcon size={22} />
              </button>
              <span style={{visibility:'hidden', opacity:0, position:'absolute', top:36, left:'50%', transform:'translateX(-50%)', background:'#222', color:'#fff', borderRadius:6, padding:'4px 10px', fontSize:13, whiteSpace:'nowrap', transition:'opacity 0.18s', pointerEvents:'none', zIndex:10}} className="tooltip-add-member">Thêm thành viên</span>
            </span>
            <span style={{position:'relative', display:'inline-block'}}>
              <button onClick={handleDeleteGroup} style={{background:'none', border:'none', padding:6, borderRadius:'50%', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <TrashIcon size={22} />
              </button>
              <span style={{visibility:'hidden', opacity:0, position:'absolute', top:36, left:'50%', transform:'translateX(-50%)', background:'#222', color:'#fff', borderRadius:6, padding:'4px 10px', fontSize:13, whiteSpace:'nowrap', transition:'opacity 0.18s', pointerEvents:'none', zIndex:10}} className="tooltip-delete-group">Xóa nhóm</span>
            </span>
            <style>{`
              .tooltip-add-member:hover, .tooltip-delete-group:hover { visibility: visible !important; opacity: 1 !important; }
              span[style*='inline-block']:hover .tooltip-add-member { visibility: visible; opacity: 1; }
              span[style*='inline-block']:hover .tooltip-delete-group { visibility: visible; opacity: 1; }
            `}</style>
          </>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px', background: '#f4f6fb', display: 'flex', flexDirection: 'column' }}>
        {messages.map((msg, idx) => {
          const isMe = msg.sender?._id === user?._id;
          const senderName = msg.sender?.name || 'Ẩn danh';
          // Điều kiện là cuối chuỗi: tin cuối, hoặc tin tiếp theo khác người gửi, hoặc cách nhau > 5 phút
          const isLast = idx === messages.length - 1;
          let isEndOfGroup = false;
          if (isLast) {
            isEndOfGroup = true;
          } else {
            const nextMsg = messages[idx + 1];
            const sameSender = nextMsg.sender?._id === msg.sender?._id;
            const timeDiff = Math.abs(new Date(nextMsg.createdAt) - new Date(msg.createdAt));
            if (!sameSender || timeDiff > 5 * 60 * 1000) {
              isEndOfGroup = true;
            }
          }

          // Separator ngày
          let showDateSeparator = false;
          const msgDate = new Date(msg.createdAt);
          if (idx === 0) {
            showDateSeparator = true;
          } else {
            const prevMsgDate = new Date(messages[idx - 1].createdAt);
            if (msgDate.toDateString() !== prevMsgDate.toDateString()) {
              showDateSeparator = true;
            }
          }

          return (
            <React.Fragment key={msg._id}>
              {showDateSeparator && (
                <div style={{
                  textAlign: 'center',
                  margin: '18px 0 12px 0',
                  color: '#888',
                  fontSize: 13,
                  fontWeight: 600,
                  opacity: 0.8,
                  letterSpacing: 1,
                  background: 'rgba(200,210,230,0.13)',
                  borderRadius: 12,
                  padding: '4px 18px',
                  display: 'inline-block',
                  alignSelf: 'center',
                }}>
                  {getDateLabel(msgDate)}
                </div>
              )}
              <div style={{
                display: 'flex', flexDirection: isMe ? 'row-reverse' : 'row', alignItems: 'flex-end', marginBottom: isEndOfGroup ? 18 : 4,
                animation: 'slideInMsg 0.4s cubic-bezier(0.4,0,0.2,1)',
              }}>
                {!isMe && isEndOfGroup && <MessageAvatar name={senderName} />}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                  <div style={{
                    background: isMe ? 'linear-gradient(90deg,#4f8cff 60%,#6fc3ff 100%)' : '#fff',
                    color: isMe ? '#fff' : '#222',
                    borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                    padding: '10px 18px',
                    minWidth: 40,
                    fontSize: 15,
                    fontWeight: 500,
                    boxShadow: '0 2px 12px #e0e7ef',
                    wordBreak: 'break-word',
                    marginLeft: !isMe && isEndOfGroup ? 0 : 40,
                    marginRight: isMe ? 0 : 0,
                    transition: 'background 0.2s',
                  }}>
                    {msg.text}
                    {msg.fileUrl && (
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(msg)}
                        style={{
                          display: 'flex',
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 14,
                          background: '#fff',
                          borderRadius: 12,
                          padding: '12px 16px',
                          marginTop: msg.text ? 8 : 0,
                          textDecoration: 'none',
                          boxShadow: '0 1px 6px #e0e7ef',
                          transition: 'box-shadow 0.2s, border 0.2s',
                          border: '1.5px solid #e0e7ef',
                          maxWidth: 340,
                          minWidth: 180,
                          cursor: 'pointer',
                          outline: 'none',
                          borderColor: '#4f8cff',
                        }}
                        title={msg.fileName || 'Tải file'}
                        onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 12px #b6c2d1'}
                        onMouseOut={e => e.currentTarget.style.boxShadow = '0 1px 6px #e0e7ef'}
                      >
                        <span style={{ flexShrink: 0 }}>{getFileIconSVG(msg.fileName, msg.fileType)}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontWeight: 600, color: '#222', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                            {msg.fileName || 'Tải file'}
                          </span>
                          {msg.fileSize && (
                            <span style={{ fontWeight: 400, fontSize: 13, color: '#888', marginTop: 2 }}>
                              {(msg.fileSize/1024).toFixed(1)} KB
                            </span>
                          )}
                        </div>
                      </button>
                    )}
                  </div>
                  {isEndOfGroup && (
                  <div style={{ fontSize: 12, color: '#b6c2d1', marginTop: 4, marginRight: isMe ? 2 : 0, marginLeft: isMe ? 0 : 2, textAlign: isMe ? 'right' : 'left' }}>
                    {isMe ? 'Bạn' : senderName} • {formatTime(msg.createdAt)}
                  </div>
                  )}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <AddMemberPopup
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        loading={adding}
        currentMembers={currentConversation.participants.map(u => u._id)}
        onAdd={async (userIds) => {
          setAdding(true);
          try {
            await addMembersToGroup(currentConversation._id, userIds);
            alert('Đã thêm thành viên!');
            setShowAddMember(false);
            window.location.reload();
          } catch (err) {
            alert('Thêm thành viên thất bại!');
          } finally {
            setAdding(false);
          }
        }}
      />
      {/* Animation keyframes for slide in */}
      <style>{`
        @keyframes slideInMsg {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default ChatWindow; 