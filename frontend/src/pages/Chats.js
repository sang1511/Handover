import React, { useEffect, useState } from 'react';
import useIsMobile from '../hooks/useIsMobile';
import { useChat } from '../contexts/ChatContext';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import MessageInput from '../components/chat/MessageInput';
import { useParams, useNavigate } from 'react-router-dom';
import { MdMenu, MdClose } from 'react-icons/md';
import styles from './Chats.module.css';

const ChatsContent = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { conversations, setCurrentConversation, currentConversation } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  // Khi conversationId trên URL thay đổi, tự động chọn conversation
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const found = conversations.find(c => c._id === conversationId);
      if (found) setCurrentConversation(found);
    }
    // Nếu không có conversationId, bỏ chọn hội thoại
    if (!conversationId) {
      setCurrentConversation(null);
    }
  }, [conversationId, conversations, setCurrentConversation]);

  // Khi click vào một conversation, điều hướng đến URL mới
  const handleSelectConversation = (conv) => {
    navigate(`/chats/${conv._id}`);
    setCurrentConversation(conv);
    // Đóng sidebar sau khi chọn conversation trên mobile
    setSidebarOpen(false);
  };

  // Toggle sidebar trên mobile
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Determine if we should force sidebar open (mobile, no conversation selected)
  const forceSidebarOpen = isMobile && !currentConversation;
  const showSidebar = sidebarOpen || forceSidebarOpen;

  return (
    <div className={styles.chatContainer}>
      {/* Sidebar Overlay for mobile */}
      {showSidebar && isMobile && (
        <div className={styles.sidebarOverlay} onClick={() => setSidebarOpen(false)} />
      )}

      <div className={`${styles.conversationSidebar} ${showSidebar ? styles.open : ''}`}>
        <ConversationList onSelectConversation={handleSelectConversation} />
      </div>
      <div className={styles.chatMainArea}>
        {currentConversation ? (
          <>
            <div className={styles.chatWindowContainer}>
              <ChatWindow 
                onToggleSidebar={toggleSidebar} 
                sidebarOpen={showSidebar}
              />
            </div>
            <div className={styles.messageInputContainer}>
              <MessageInput />
            </div>
          </>
        ) : (
          // Only show empty state if NOT mobile, otherwise sidebar will be full screen
          !isMobile && (
            <div className={styles.emptyState}>
              <button 
                className={styles.mobileToggleEmpty}
                onClick={toggleSidebar}
                aria-label="Toggle conversation list"
              >
                {sidebarOpen ? <MdClose size={24} /> : <MdMenu size={24} />}
              </button>
              <div className={styles.emptyStateIcon}>💬</div>
              <h3 className={styles.emptyStateTitle}>Chọn cuộc trò chuyện</h3>
              <p className={styles.emptyStateText}>Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

const Chats = () => {
  return (
    <ChatsContent />
  );
};

export default Chats; 