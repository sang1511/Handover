import React, { useState, useMemo, useCallback } from 'react';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import { createOrGetConversation, createGroupChat } from '../../api/services/chat.service';
import { MdAddComment, MdGroupAdd } from 'react-icons/md';
import NewChatPopup from '../popups/NewChatPopup';
import NewGroupChatPopup from '../popups/NewGroupChatPopup';
import styles from './ConversationList.module.css';

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
            className={styles.avatarImage}
          />
        );
      }
    }
    // Group chat hoặc không có avatar: fallback chữ cái đầu
    const color = getColorFromString(name);
    return (
      <div 
        className={styles.avatarFallback}
        style={{ background: color }}
      >
        {getInitial(name)}
      </div>
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
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.searchContainer}>
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <img
              src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
              alt="search icon"
              className={styles.searchIcon}
            />
          </div>
          <button
            onClick={handleCreateConversation}
            className={`${styles.actionButton} ${styles.createChatButton}`}
            title="Tạo cuộc trò chuyện"
          >
            <MdAddComment size={20} />
          </button>
          <button
            onClick={handleCreateGroupChat}
            className={`${styles.actionButton} ${styles.createGroupButton}`}
            title="Tạo nhóm chat"
          >
            <MdGroupAdd size={20} />
          </button>
        </div>
      </div>
      <div className={styles.conversationsList}>
        {filteredConversations.length === 0 && (
          <div className={styles.emptyState}>Không có cuộc trò chuyện nào.</div>
        )}
        <div className={styles.conversationsContainer}>
        {filteredConversations.map(conv => {
          const isActive = currentConversation?._id === conv._id;
          return (
            <div
              key={conv._id}
              onClick={() => (onSelectConversation ? onSelectConversation(conv) : setCurrentConversation(conv))}
              className={`${styles.conversationItem} ${isActive ? styles.conversationItemActive : ''}`}
            >
              <div className={styles.conversationContent}>
                {getAvatar(conv)}
                <span className={styles.conversationName}>{getConversationName(conv)}</span>
              </div>
              {conv.unreadCount > 0 && currentConversation?._id !== conv._id && (
                <span className={styles.unreadBadge}>{conv.unreadCount}</span>
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