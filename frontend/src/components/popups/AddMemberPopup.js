import React, { useState, useEffect, useRef } from 'react';
import UserService from '../../api/services/user.service';

const AddMemberPopup = ({ open, onClose, onAdd, loading, currentMembers }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (open) {
      UserService.getAllUsers().then(users => setAllUsers(users)).catch(() => setAllUsers([]));
      setSearch('');
      setSelectedUsers([]);
      setError('');
      setShowDropdown(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (
        inputRef.current && !inputRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const filteredUsers = allUsers.filter(u =>
    (u.name && u.name.toLowerCase().includes(search.toLowerCase())) ||
    (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
    (u.userID && u.userID.toLowerCase().includes(search.toLowerCase()))
  ).filter(u => !selectedUsers.some(su => su._id === u._id));

  const handleAddUser = (user) => {
    if (currentMembers.includes(user._id)) {
      setError('Người này đã có trong nhóm!');
      return;
    }
    setSelectedUsers([...selectedUsers, user]);
    setSearch('');
    setError('');
    setShowDropdown(false);
  };
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userId));
  };
  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      setError('Chọn ít nhất 1 người để thêm!');
      return;
    }
    onAdd(selectedUsers.map(u => u._id));
  };
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.2)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 28, borderRadius: 12, minWidth: 340, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', position: 'relative', maxWidth: 420, width: '100%' }}>
        <h4 style={{margin:'0 0 18px 0'}}>Thêm thành viên vào nhóm</h4>
        <div style={{marginBottom: 18, position: 'relative'}}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Tìm theo tên, email, userID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setError(''); setShowDropdown(true); }}
            style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #e0e7ef', fontSize: 16, outline: 'none', background: '#f8fafc' }}
            disabled={loading}
            autoFocus
            onFocus={() => setShowDropdown(true)}
          />
          {search && showDropdown && (
            <div ref={dropdownRef} style={{
              maxHeight: 180,
              overflowY: 'auto',
              background: '#fff',
              border: '1px solid #e0e7ef',
              borderRadius: 8,
              marginTop: 4,
              boxShadow: '0 2px 8px #e0e7ef',
              zIndex: 10,
              position: 'absolute',
              width: '100%'
            }}>
              {filteredUsers.length === 0 && <div style={{ padding: 10, color: '#888' }}>Không tìm thấy</div>}
              {filteredUsers.map(u => (
                <div key={u._id} style={{ padding: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} onMouseDown={e => { e.preventDefault(); handleAddUser(u); }}>
                  <span style={{ fontWeight: 600 }}>{u.name}</span>
                  <span style={{ color: '#888', fontSize: 13 }}>({u.userID || u.email || u._id})</span>
                </div>
              ))}
            </div>
          )}
          {error && <div style={{ color: '#dc3545', fontWeight: 600, fontSize: 15, marginTop: 8 }}>{error}</div>}
        </div>
        <div style={{ margin: '0 0 18px 0' }}>
          {selectedUsers.map(u => (
            <span key={u._id} style={{ display: 'inline-flex', alignItems: 'center', background: '#e3f0ff', color: '#3578e5', borderRadius: 16, padding: '4px 12px', margin: '0 6px 6px 0', fontWeight: 600, fontSize: 15 }}>
              {u.name}
              <span onClick={() => handleRemoveUser(u._id)} style={{marginLeft:8, cursor:'pointer', fontWeight:700}}>&times;</span>
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button type="button" onClick={onClose} disabled={loading} style={{padding:'8px 18px', borderRadius:8, border:'none', background:'#e9ecef', fontWeight:600, cursor:'pointer'}}>Hủy</button>
          <button type="submit" disabled={loading || selectedUsers.length === 0} style={{padding:'8px 18px', borderRadius:8, border:'none', background:'#3578e5', color:'#fff', fontWeight:600, cursor: loading || selectedUsers.length === 0 ? 'not-allowed' : 'pointer'}}>Thêm</button>
        </div>
      </form>
    </div>
  );
};

export default AddMemberPopup; 