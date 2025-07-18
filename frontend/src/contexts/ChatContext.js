import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import socketManager from '../utils/socket';
import {
  getConversations,
  getMessages,
} from '../api/services/chat.service';
import { useAuth } from './AuthContext';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, token } = useAuth();

  // Hàm reload lại danh sách conversation
  const reloadConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(res?.data || []);
    } catch (err) {
      setConversations([]);
      // Có thể log nếu cần: console.warn('reloadConversations error:', err);
    }
  }, []);

  // Lấy danh sách conversation khi load
  useEffect(() => {
    if (user && token) { // Chỉ gọi khi đã đăng nhập
      reloadConversations();
    }
  }, [user, token, reloadConversations]);

  // Join tất cả các room conversation khi conversations thay đổi
  useEffect(() => {
    if (conversations.length > 0) {
      conversations.forEach(conv => {
        socketManager.joinChatRoom(conv._id);
      });
    }
  }, [conversations]);

  // Lấy messages khi chọn conversation
  useEffect(() => {
    if (currentConversation?._id) {
      setLoading(true);
      getMessages(currentConversation._id)
        .then(res => setMessages(res.data))
        .finally(() => setLoading(false));
      socketManager.joinChatRoom(currentConversation._id);
      socketManager.markAsRead(currentConversation._id);
      // Chỉ reload 1 lần duy nhất sau khi bấm vào hội thoại
      let timeout = setTimeout(() => { reloadConversations(); }, 1);
      return () => clearTimeout(timeout);
    }
  }, [currentConversation?._id, reloadConversations]);

  // Lắng nghe tin nhắn mới realtime
  useEffect(() => {
    const handleNewMessage = (msg) => {
      if (currentConversation && msg.conversationId === currentConversation._id) {
        setMessages(prev => [...prev, msg]);
        socketManager.markAsRead(currentConversation._id);
      } else {
        setConversations(prev =>
          prev.map(conv =>
            conv._id === msg.conversationId
              ? { ...conv, unreadCount: (conv.unreadCount || 0) + 1 }
              : conv
          )
        );
      }
      setTimeout(() => { reloadConversations(); }, 100);
    };
    socketManager.on('newMessage', handleNewMessage);
    return () => {
      socketManager.off('newMessage');
    };
  }, [currentConversation, reloadConversations]);

  return (
    <ChatContext.Provider value={{
      conversations, setConversations,
      currentConversation, setCurrentConversation,
      messages, setMessages,
      loading,
      reloadConversations // thêm hàm này vào context
    }}>
      {children}
    </ChatContext.Provider>
  );
}; 