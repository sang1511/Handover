import React, { createContext, useContext, useState, useEffect } from 'react';
import socketManager from '../utils/socket';
import {
  getConversations,
  getMessages,
} from '../api/services/chat.service';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  // Hàm reload lại danh sách conversation
  const reloadConversations = async () => {
    try {
      const res = await getConversations();
      setConversations(res?.data || []);
    } catch (err) {
      setConversations([]);
      // Có thể log nếu cần: console.warn('reloadConversations error:', err);
    }
  };

  // Lấy danh sách conversation khi load
  useEffect(() => {
    reloadConversations();
  }, []);

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
  }, [currentConversation?._id]);

  // Lắng nghe tin nhắn mới realtime
  useEffect(() => {
    const handleNewMessage = (msg) => {
      // Chỉ thêm tin nhắn nếu đúng conversation đang mở
      if (currentConversation && msg.conversationId === currentConversation._id) {
        setMessages(prev => [...prev, msg]);
        socketManager.markAsRead(currentConversation._id);
      }
      reloadConversations();
    };
    socketManager.on('newMessage', handleNewMessage);
    return () => {
      socketManager.off('newMessage');
    };
  }, [currentConversation]);

  return (
    <ChatContext.Provider value={{
      conversations, setConversations,
      currentConversation, setCurrentConversation,
      messages, setMessages,
      loading
    }}>
      {children}
    </ChatContext.Provider>
  );
}; 