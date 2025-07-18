import React, { useEffect } from 'react';
import { ChatProvider, useChat } from '../contexts/ChatContext';
import ConversationList from '../components/chat/ConversationList';
import ChatWindow from '../components/chat/ChatWindow';
import MessageInput from '../components/chat/MessageInput';
import { useParams, useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

const ChatsContent = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { conversations, setCurrentConversation, currentConversation } = useChat();

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
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', background: '#fff', minHeight: 0, overflow: 'hidden' }}>
      <Box sx={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <ConversationList onSelectConversation={handleSelectConversation} />
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f4f6fb', minWidth: 0, height: '100%', minHeight: 0, overflow: 'hidden' }}>
        {currentConversation ? (
          <>
            <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <ChatWindow />
            </Box>
            <MessageInput />
          </>
        ) : (
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 22, fontWeight: 500 }}>
            Chọn cuộc trò chuyện để bắt đầu chat
          </Box>
        )}
      </Box>
    </Box>
  );
};

const Chats = () => {
  return (
    <ChatsContent />
  );
};

export default Chats; 