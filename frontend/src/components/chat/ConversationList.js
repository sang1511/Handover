import React, { useState, useMemo, useCallback } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { createOrGetConversation, createGroupChat } from '../../api/services/chat.service';
import { MdAddComment, MdGroupAdd } from 'react-icons/md';
import NewChatPopup from '../popups/NewChatPopup';
import NewGroupChatPopup from '../popups/NewGroupChatPopup';

const getInitial = (name) => name ? name.charAt(0).toUpperCase() : '?';

// Generate a consistent color from a string (for avatar background)
const getColorFromString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${hash % 360}, 70%, 75%)`;
  return color;
};

const ConversationList = ({ onSelectConversation }) => {
  const { conversations, currentConversation, setCurrentConversation, reloadConversations } = useChat();
  const { user } = useAuth();
  const [openNewChat, setOpenNewChat] = useState(false);
  const [openNewGroup, setOpenNewGroup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const handleCreateConversation = () => setOpenNewChat(true);
  const handleCreateGroupChat = () => setOpenNewGroup(true);

  // Hàm lấy tên hội thoại
  const getConversationName = useCallback((convo) => {
    if (convo.isGroup) {
      return convo.name;
    }
    const otherParticipant = convo.participants.find(p => p._id !== user._id);
    return otherParticipant?.name || 'Unknown';
  }, [user]);

  // Hàm lấy avatar (ảnh nếu có, chữ cái đầu nếu không)
  const getAvatar = (conv) => {
    const name = getConversationName(conv);
    // 1-1 chat: lấy avatarUrl của người còn lại
    if (!conv.isGroup) {
      const otherParticipant = conv.participants.find(p => p._id !== user._id);
      if (otherParticipant && otherParticipant.avatarUrl) {
        return (
          <img
            src={otherParticipant.avatarUrl}
            alt={name}
            style={{
              width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', marginRight: 14,
              boxShadow: '0 2px 8px #e0e7ef', userSelect: 'none', border: '2px solid #e3f0ff',
            }}
          />
        );
      }
    }
    // Group chat hoặc không có avatar: fallback chữ cái đầu
    const color = getColorFromString(name);
    return (
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 18, marginRight: 14, color: '#2d3a4a',
        boxShadow: '0 2px 8px #e0e7ef', userSelect: 'none', transition: 'background 0.3s',
      }}>{getInitial(name)}</div>
    );
  };

  // Filter conversations by search
  const filteredConversations = useMemo(() => {
    if (!search.trim()) return conversations;
    return conversations.filter(conv => {
      const name = getConversationName(conv).toLowerCase();
      return name.includes(search.trim().toLowerCase());
    });
  }, [conversations, search, getConversationName]);

  return (
    <div style={{ borderRight: '1px solid #eee', width: 320, height: '100%', overflowY: 'auto', background: '#fff', boxShadow: '2px 0 12px #f0f1f3', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '16px 24px', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, marginTop: 8 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '10px 38px 10px 16px', borderRadius: 24, border: '1.5px solid #e0e7ef', background: '#f8fafc', fontSize: 15, outline: 'none',
                boxShadow: '0 1px 4px #f0f1f3', transition: 'border 0.2s',
              }}
            />
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" style={{ position: 'absolute', right: 14, top: 12, color: '#b6c2d1' }}>
              <path d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <button
            onClick={handleCreateConversation}
            style={{
              width: 36, height: 36,
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg,#4f8cff 60%,#6fc3ff 100%)',
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #e0e7ef',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s, box-shadow 0.2s, transform 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Tạo cuộc trò chuyện mới"
          >
            <MdAddComment size={20} />
          </button>
          <button
            onClick={handleCreateGroupChat}
            style={{
              width: 36, height: 36,
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg,#ff6a5b 60%,#ffb86c 100%)',
              color: '#fff',
              fontSize: 20,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #e0e7ef',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s, box-shadow 0.2s, transform 0.2s',
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'scale(1.08)'}
            onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            title="Tạo nhóm chat"
          >
            <MdGroupAdd size={20} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 16px 8px' }}>
        {filteredConversations.length === 0 && <div style={{ padding: 20, color: '#888' }}>Không có cuộc trò chuyện nào.</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredConversations.map(conv => {
          const isActive = currentConversation?._id === conv._id;
          return (
            <div
              key={conv._id}
              onClick={() => (onSelectConversation ? onSelectConversation(conv) : setCurrentConversation(conv))}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', margin: '6px 0', borderRadius: 14,
                background: isActive ? 'linear-gradient(90deg,#e3f0ff 60%,#f8fafc 100%)' : '#fff',
                cursor: 'pointer',
                boxShadow: isActive ? '0 4px 16px #e3f0ff' : '0 1px 4px #f0f1f3',
                border: isActive ? '1.5px solid #4f8cff' : '1.5px solid transparent',
                transition: 'background 0.25s, box-shadow 0.25s, border 0.25s',
                position: 'relative',
                minHeight: 56,
              }}
              onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg,#f0f7ff 60%,#f8fafc 100%)'}
              onMouseOut={e => e.currentTarget.style.background = isActive ? 'linear-gradient(90deg,#e3f0ff 60%,#f8fafc 100%)' : '#fff'}
            >
              <div style={{display:'flex',alignItems:'center',flex:1,minWidth:0}}>
                {getAvatar(conv)}
                <span style={{fontWeight:700,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',fontSize:17, color:'#222'}}>{getConversationName(conv)}</span>
              </div>
              {conv.unreadCount > 0 && currentConversation?._id !== conv._id && (
                <span style={{
                  background: '#4f8cff', color: 'white', borderRadius: '50%', padding: '2px 8px', marginLeft: 8, fontSize: 13,
                  minWidth: 20, textAlign: 'center', display: 'inline-block', fontWeight: 700, boxShadow: '0 1px 4px #b6c2d1'
                }}>{conv.unreadCount}</span>
              )}
            </div>
          );
        })}
        </div>
      </div>
      <NewChatPopup
        open={openNewChat}
        onClose={() => setOpenNewChat(false)}
        loading={loading}
        onCreate={async (userId) => {
          setLoading(true);
          try {
            await createOrGetConversation(userId);
            setOpenNewChat(false);
            reloadConversations();
          } catch {
            alert('Tạo cuộc trò chuyện thất bại!');
          } finally {
            setLoading(false);
          }
        }}
      />
      <NewGroupChatPopup
        open={openNewGroup}
        onClose={() => setOpenNewGroup(false)}
        loading={loading}
        onCreate={async (groupName, userIds) => {
          setLoading(true);
          try {
            await createGroupChat(groupName, userIds);
            setOpenNewGroup(false);
            reloadConversations();
          } catch {
            alert('Tạo nhóm chat thất bại!');
          } finally {
            setLoading(false);
          }
        }}
      />
    </div>
  );
};

export default ConversationList; 