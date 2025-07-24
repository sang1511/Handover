import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import socketManager from '../utils/socket';
import {
  getConversations,
  getMessages,
} from '../api/services/chat.service';
import { useAuth } from './AuthContext';

const ChatContext = createContext();
export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const location = useLocation();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const { user, accessToken } = useAuth();

  // Hàm reload lại danh sách conversation
  const reloadConversations = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(res?.data || []);
    } catch (err) {
      setConversations([]);
    }
  }, []);

  // Lấy danh sách conversation khi load
  useEffect(() => {
    if (user && accessToken) { // Chỉ gọi khi đã đăng nhập
      reloadConversations();
    }
  }, [user, accessToken, reloadConversations]);

  // Đảm bảo luôn connect socket khi user đăng nhập (dù NotificationProvider có hay không)
  useEffect(() => {
    if (user && accessToken) {
      socketManager.connect(accessToken);
    }
    // Không disconnect ở đây để tránh disconnect socket dùng chung cho notification/chat
  }, [user, accessToken]);

  // Join tất cả các room conversation khi conversations thay đổi
  useEffect(() => {
    if (conversations.length > 0) {
      conversations.forEach(conv => {
        socketManager.joinChatRoom(conv._id);
      });
    }
  }, [conversations]);

  // Join lại tất cả room mỗi khi socket connect thành công (kể cả reconnect)
  useEffect(() => {
    if (!socketManager.socket) return;
    const handleConnect = () => {
      conversations.forEach(conv => {
        socketManager.joinChatRoom(conv._id);
      });
    };
    socketManager.socket.on('connect', handleConnect);
    return () => {
      socketManager.socket.off('connect', handleConnect);
    };
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

  const reloadConversationsRef = useRef(reloadConversations);
  const currentConversationRef = useRef(currentConversation);

  useEffect(() => { reloadConversationsRef.current = reloadConversations; }, [reloadConversations]);
  useEffect(() => { currentConversationRef.current = currentConversation; }, [currentConversation]);

  // Lắng nghe tin nhắn mới realtime (dùng ref để tránh stale closure)
  useEffect(() => {
  if (!socketManager.socket) return;
  let reloadTimeout = null;
  const handleNewMessage = (msg) => {
      // Logic xử lý khi có tin nhắn mới
if (
  currentConversationRef.current &&
  String(msg.conversationId) === String(currentConversationRef.current._id) &&
  location.pathname.startsWith('/chats')
) {
        socketManager.markAsRead(msg.conversationId);
        setMessages(prev => {
        const alreadyExists = prev.some(m => m._id === msg._id);
        if (alreadyExists) return prev;
        const newMessages = [...prev, msg];
        return newMessages;
      });
      }
      // Debounce việc reload danh sách conversations
      if (reloadTimeout) clearTimeout(reloadTimeout);
      reloadTimeout = setTimeout(() => {
        try {
          reloadConversationsRef.current();
        } catch (e) {
        }
      }, 300);
    };

    // Đăng ký listener khi component mount
    socketManager.on('newMessage', handleNewMessage);

    // Hủy đăng ký khi component unmount
    return () => {
      socketManager.off('newMessage', handleNewMessage);
      if (reloadTimeout) clearTimeout(reloadTimeout);
    };
  }, [location.pathname]); // Đăng ký lại mỗi khi pathname thay đổi

  // Log khi conversations thay đổi (ảnh hưởng badge)
  useEffect(() => {
  }, [conversations]);

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