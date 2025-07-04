import axios from '../axios';

// Lấy danh sách cuộc trò chuyện
export const getConversations = () => axios.get('/conversations');

// Lấy tin nhắn của một cuộc trò chuyện
export const getMessages = (conversationId) => axios.get(`/conversations/${conversationId}/messages`);

// Gửi tin nhắn (text/file)
export const sendMessage = (conversationId, data) => {
  if (data.file) {
    const formData = new FormData();
    if (data.text) formData.append('text', data.text);
    formData.append('file', data.file);
    return axios.post(`/conversations/${conversationId}/messages`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  } else {
    return axios.post(`/conversations/${conversationId}/messages`, data);
  }
};

// Tạo hoặc lấy cuộc trò chuyện 1-1
export const createOrGetConversation = (receiverId) => axios.post('/conversations', { receiverId });

// Tạo group chat
export const createGroupChat = (name, participants) => axios.post('/conversations/group', { name, participants }); 

// Xóa group chat
export const deleteGroupChat = (conversationId) => axios.delete(`/conversations/${conversationId}`);

// Thêm thành viên vào group chat
export const addMembersToGroup = (conversationId, userIds) => axios.post(`/conversations/${conversationId}/add-members`, { userIds }); 