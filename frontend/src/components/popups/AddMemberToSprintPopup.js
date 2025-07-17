import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';

const Chip = ({ label, onDelete }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', background: '#e3f0ff', color: '#3578e5', borderRadius: 16, padding: '4px 12px', margin: '0 6px 6px 0', fontWeight: 600, fontSize: 15
  }}>
    {label}
    <span onClick={onDelete} style={{marginLeft:8, cursor:'pointer', fontWeight:700}}>&times;</span>
  </span>
);

const AddMemberToSprintPopup = ({ open, onClose, sprintId, existingUserIds = [], onAdded, projectMembers = [] }) => {
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setSearch('');
      setSelectedUsers([]);
    }
  }, [open]);

  const filteredUsers = (projectMembers || []).filter(u =>
    ((u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      (u.userID && u.userID.toLowerCase().includes(search.toLowerCase()))) &&
    !selectedUsers.some(su => su._id === u._id) &&
    !existingUserIds.includes(u._id)
  );

  const handleAddUser = (user) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearch('');
  };
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) return;
    setLoading(true);
    try {
      await axiosInstance.post(`/sprints/${sprintId}/add-members`, {
        userIds: selectedUsers.map(u => u._id)
      });
      if (onAdded) onAdded();
    } catch {
      alert('Không thể thêm nhân sự vào sprint.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 28, borderRadius: 16, minWidth: 380, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', position: 'relative', maxWidth: 420, width: '100%' }}>
        <h4 style={{margin:'0 0 18px 0'}}>Thêm nhân sự vào sprint</h4>
        <div style={{marginBottom: 10, position: 'relative'}}>
          <input
            type="text"
            placeholder="Tìm theo tên, email, userID..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #e0e7ef', fontSize: 16, outline: 'none', background: '#f8fafc' }}
            disabled={loading}
            onBlur={() => setTimeout(() => setSearch(''), 150)}
            onFocus={() => { if (filteredUsers.length > 0) setSearch(search); }}
          />
          {search && (
            <div style={{
              maxHeight: 180,
              overflowY: 'auto',
              background: '#fff',
              border: '1.5px solid #e0e7ef',
              borderRadius: 10,
              marginTop: 4,
              boxShadow: '0 4px 16px #e0e7ef',
              zIndex: 20,
              position: 'absolute',
              left: 0,
              width: '100%',
              minWidth: 0,
              right: 0,
            }}>
              {filteredUsers.length === 0 && <div style={{ padding: 10, color: '#888' }}>Không tìm thấy</div>}
              {filteredUsers.map(u => (
                <div key={u._id} style={{ padding: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #f0f1f3', transition: 'background 0.18s', borderRadius: 8 }} onMouseDown={e => { e.preventDefault(); handleAddUser(u); }} onMouseOver={e => e.currentTarget.style.background = '#f4f6fb'} onMouseOut={e => e.currentTarget.style.background = '#fff'}>
                  <span style={{ fontWeight: 600 }}>{u.name}</span>
                  <span style={{ color: '#888', fontSize: 13 }}>({u.userID || u.email || u._id})</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{marginBottom: 16, minHeight: 32, display: 'flex', flexWrap: 'wrap'}}>
          {selectedUsers.map(u => (
            <Chip key={u._id} label={u.name || u.userID || u.email || u._id} onDelete={() => handleRemoveUser(u._id)} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} disabled={loading} style={{padding:'8px 18px', borderRadius:8, border:'none', background:'#e9ecef', fontWeight:600, cursor:'pointer'}}>Hủy</button>
          <button type="submit" disabled={loading || selectedUsers.length === 0} style={{padding:'8px 18px', borderRadius:8, border:'none', background:'#1976d2', color:'#fff', fontWeight:600, cursor: loading || selectedUsers.length === 0 ? 'not-allowed' : 'pointer'}}>Thêm</button>
        </div>
      </form>
    </div>
  );
};

export default AddMemberToSprintPopup; 