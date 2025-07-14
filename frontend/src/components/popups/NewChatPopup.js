import React, { useState, useEffect } from 'react';
import UserService from '../../api/services/user.service';
import { useChat } from '../../contexts/ChatContext';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NewChatPopup = ({ open, onClose, onCreate, loading }) => {
  const [search, setSearch] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [error, setError] = useState('');
  const { conversations } = useChat();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      UserService.getAllUsers().then(users => setAllUsers(users)).catch(() => setAllUsers([]));
      setSearch('');
      setSelectedUser(null);
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers([]);
      return;
    }
    const lower = search.toLowerCase();
    setFilteredUsers(
      allUsers.filter(u =>
        (u.name && u.name.toLowerCase().includes(lower)) ||
        (u.email && u.email.toLowerCase().includes(lower)) ||
        (u.userID && u.userID.toLowerCase().includes(lower))
      )
    );
  }, [search, allUsers]);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSearch('');
    setFilteredUsers([]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    // Kiểm tra tạo với chính mình
    if (currentUser && selectedUser._id === currentUser._id) {
      setError('Không thể tạo cuộc trò chuyện với chính bạn!');
      return;
    }
    // Kiểm tra đã có hội thoại chưa
    const existed = conversations.find(conv =>
      !conv.isGroupChat && conv.participants.some(p => p._id === selectedUser._id)
    );
    if (existed) {
      onClose && onClose();
      navigate(`/chats/${existed._id}`);
      return;
    }
    onCreate(selectedUser._id);
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 28, borderRadius: 12, minWidth: 340, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', position: 'relative' }}>
        <h4 style={{margin:'0 0 18px 0'}}>Tạo cuộc trò chuyện mới với</h4>
        <div style={{marginBottom: 18, position: 'relative'}}>
          <input
            type="text"
            placeholder="Tìm theo tên, email, userID..."
            value={selectedUser ? selectedUser.name || selectedUser.userID || selectedUser.email : search}
            onChange={e => { setSearch(e.target.value); setSelectedUser(null); setError(''); }}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #e0e7ef', fontSize: 16, outline: 'none' }}
            disabled={loading}
            autoFocus
            onBlur={() => setTimeout(() => setFilteredUsers([]), 150)}
            onFocus={() => { if (allUsers.length > 0 && search) setFilteredUsers(
              allUsers.filter(u =>
                (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
                (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
                (u.userID && u.userID.toLowerCase().includes(search.toLowerCase()))
              )
            ); }}
          />
          {search && (
            <div style={{ maxHeight: 180, overflowY: 'auto', background: '#fff', border: '1px solid #e0e7ef', borderRadius: 8, marginTop: 4, boxShadow: '0 2px 8px #e0e7ef', zIndex: 10, position: 'absolute', width: '100%' }}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map(u => (
                  <div key={u._id} style={{ padding: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onMouseDown={e => { e.preventDefault(); handleSelectUser(u); }}>
                    <span style={{ fontWeight: 600 }}>{u.name}</span>
                    <span style={{ color: '#888', fontSize: 13 }}>({u.userID || u.email || u._id})</span>
                  </div>
                ))
              ) : (
                <div style={{ padding: 10, color: '#888', fontStyle: 'italic' }}>Không tìm thấy</div>
              )}
            </div>
          )}
          {error && <div style={{ color: '#dc3545', fontWeight: 600, fontSize: 15, marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} disabled={loading} style={{padding:'8px 18px', borderRadius:8, border:'none', background:'#e9ecef', fontWeight:600, cursor:'pointer'}}>Hủy</button>
          <button type="submit" disabled={loading || !selectedUser} style={{padding:'8px 18px', borderRadius:8, border:'none', background:'#3578e5', color:'#fff', fontWeight:600, cursor: loading || !selectedUser ? 'not-allowed' : 'pointer'}}>Tạo</button>
        </div>
      </form>
    </div>
  );
};

export default NewChatPopup; 