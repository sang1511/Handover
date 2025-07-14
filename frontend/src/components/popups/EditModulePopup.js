import React, { useState, useRef, useEffect } from 'react';

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
}

function formatFileName(fileName) {
  if (!fileName) return '';
  if (fileName.length <= 20) return fileName;
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return fileName.substring(0, 17) + '...';
  const name = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  if (name.length <= 17) return fileName;
  return name.substring(0, 17) + '...' + extension;
}

const EditModulePopup = ({ open, onClose, module, onSubmit, usersList }) => {
  const [name, setName] = useState(module?.name || '');
  const [version, setVersion] = useState(module?.version || '');
  const [owner, setOwner] = useState(module?.owner?._id || '');
  const [startDate, setStartDate] = useState(formatDateInput(module?.startDate));
  const [endDate, setEndDate] = useState(formatDateInput(module?.endDate));
  const [description, setDescription] = useState(module?.description || '');
  const [files, setFiles] = useState([]); // new files
  const [keepFiles, setKeepFiles] = useState(module?.docs?.map(f => f.fileId) || []);
  const fileInputRef = useRef();
  
  // State cho owner search
  const [ownerSearch, setOwnerSearch] = useState(module?.owner?.name || '');
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const ownerBlurTimeout = useRef();
  const [errors, setErrors] = useState({});
  const requiredMark = <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span>;

  useEffect(() => {
    if (open) {
      setName(module?.name || '');
      setVersion(module?.version || '');
      setOwner(module?.owner?._id || '');
      setOwnerSearch(module?.owner?.name || '');
      setStartDate(formatDateInput(module?.startDate));
      setEndDate(formatDateInput(module?.endDate));
      setDescription(module?.description || '');
      setFiles([]);
      setKeepFiles(module?.docs?.map(f => f.fileId) || []);
      setErrors({});
    }
  }, [open, module]);

  if (!open) return null;

  // Filter users based on search
  const handleOwnerSearch = (searchTerm) => {
    setOwnerSearch(searchTerm);
    setOwner(''); // reset owner khi gõ tay
    if (!searchTerm.trim()) {
      setFilteredUsers([]);
      setShowOwnerDropdown(false);
      return;
    }
    
    const filtered = usersList.filter(user => 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userID?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
    setShowOwnerDropdown(filtered.length > 0);
  };

  const handleSelectOwner = (user) => {
    setOwner(user._id);
    setOwnerSearch(user.name);
    setShowOwnerDropdown(false);
  };

  const handleFileChange = (e) => {
    setFiles([...files, ...Array.from(e.target.files)]);
    e.target.value = '';
  };

  const handleRemoveOldFile = (fileId) => {
    setKeepFiles(keepFiles.filter(id => id !== fileId));
  };

  const handleRemoveNewFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Vui lòng nhập tên module';
    if (!version.trim()) newErrors.version = 'Vui lòng nhập phiên bản';
    if (!owner || !usersList.find(u => u._id === owner)) newErrors.owner = 'Vui lòng chọn người phụ trách hợp lệ';
    if (!startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!endDate) newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    const formData = new FormData();
    formData.append('name', name);
    formData.append('version', version);
    formData.append('owner', owner);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('description', description);
    formData.append('keepFiles', JSON.stringify(keepFiles));
    files.forEach(f => {
      formData.append('docs', f);
    });
    onSubmit(formData);
  };
  const handleOwnerBlur = () => {
    ownerBlurTimeout.current = setTimeout(() => setShowOwnerDropdown(false), 120);
  };
  const handleOwnerFocus = () => {
    if (ownerBlurTimeout.current) clearTimeout(ownerBlurTimeout.current);
    setShowOwnerDropdown(true);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={styles.headerSection}>
          <h2 style={styles.title}>Chỉnh sửa module</h2>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.infoGrid}>
            {/* Cột trái */}
            <div style={styles.infoColLeft}>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Tên module {requiredMark}</label>
                <input style={{
                  ...styles.input,
                  borderColor: errors.name ? '#dc3545' : '#ccc',
                }} value={name} onChange={e => setName(e.target.value)} />
                {errors.name && <div style={styles.errorTextInline}>{errors.name}</div>}
              </div>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Phiên bản {requiredMark}</label>
                <input style={{
                  ...styles.input,
                  borderColor: errors.version ? '#dc3545' : '#ccc',
                }} value={version} onChange={e => setVersion(e.target.value)} />
                {errors.version && <div style={styles.errorTextInline}>{errors.version}</div>}
              </div>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Người phụ trách {requiredMark}</label>
                <div style={{position: 'relative'}}>
                  <input 
                    style={{
                      ...styles.input,
                      borderColor: errors.owner ? '#dc3545' : '#ccc',
                      width: '100%',
                    }} 
                    value={ownerSearch} 
                    onChange={e => handleOwnerSearch(e.target.value)}
                    onFocus={handleOwnerFocus}
                    onBlur={handleOwnerBlur}
                    placeholder="Tìm theo tên, email hoặc userID..."
                  />
                  {errors.owner && <div style={styles.errorTextInline}>{errors.owner}</div>}
                  {showOwnerDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: '#fff',
                      border: '1px solid #e3e8f0',
                      borderRadius: 8,
                      maxHeight: 200,
                      overflowY: 'auto',
                      zIndex: 1000,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}>
                      {filteredUsers.length > 0 ? filteredUsers.map(user => (
                        <div 
                          key={user._id}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            borderBottom: '1px solid #f0f0f0',
                            ':hover': {background: '#f8f9fa'}
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                          onMouseLeave={(e) => e.target.style.background = '#fff'}
                          onClick={() => handleSelectOwner(user)}
                        >
                          <div style={{fontWeight: 600, color: '#333'}}>{user.name}</div>
                          <div style={{fontSize: 12, color: '#666'}}>{user.email} • {user.userID}</div>
                        </div>
                      )) : (
                        <div style={{padding: '10px 12px', color: '#888', fontStyle: 'italic'}}>
                          Không tìm thấy người dùng
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Ngày bắt đầu {requiredMark}</label>
                <input style={{
                  ...styles.input,
                  borderColor: errors.startDate ? '#dc3545' : '#ccc',
                }} type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                {errors.startDate && <div style={styles.errorTextInline}>{errors.startDate}</div>}
              </div>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Ngày kết thúc {requiredMark}</label>
                <input style={{
                  ...styles.input,
                  borderColor: errors.endDate ? '#dc3545' : '#ccc',
                }} type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                {errors.endDate && <div style={styles.errorTextInline}>{errors.endDate}</div>}
              </div>
            </div>
            {/* Cột phải */}
            <div style={styles.infoColRight}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Mô tả</label>
                <textarea style={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} rows={4} />
              </div>
              <div style={styles.fieldGroup}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
                  <label style={styles.label}>Tài liệu nghiệp vụ</label>
                  <button
                    type="button"
                    style={styles.uploadIconBtn}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Tải lên tài liệu"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 14V4M10 4L6 8M10 4L14 8" stroke="#1976d2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="4" y="15" width="12" height="2" rx="1" fill="#1976d2"/>
                    </svg>
                  </button>
                </div>
                <input
                  type="file"
                  style={{ display: 'none' }}
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <div style={styles.fileListLimited}>
                  {module?.docs?.filter(f => keepFiles.includes(f.fileId)).map(f => (
                    <div key={f.fileId} style={styles.fileItem}>
                      <span style={styles.fileIcon}>📄</span>
                      <span style={styles.fileName} title={f.fileName}>{formatFileName(f.fileName)}</span>
                      <button
                        type="button"
                        style={styles.removeFileBtn}
                        onClick={() => handleRemoveOldFile(f.fileId)}
                        title="Xóa file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {files.map((f, idx) => (
                    <div key={idx} style={styles.fileItem}>
                      <span style={styles.fileIcon}>🆕</span>
                      <span style={styles.fileName} title={f.name}>{formatFileName(f.name)}</span>
                      <button
                        type="button"
                        style={styles.removeFileBtn}
                        onClick={() => handleRemoveNewFile(idx)}
                        title="Xóa file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {module?.docs?.filter(f => keepFiles.includes(f.fileId)).length === 0 && files.length === 0 && (
                    <div style={styles.noFileText}>Chưa chọn file nào</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={() => { setErrors({}); onClose(); }}>
              Hủy
            </button>
            <button type="submit" style={styles.submitBtn}>
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(30,34,45,0.22)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(2.5px)',
  },
  popup: {
    background: '#fafdff',
    borderRadius: 28,
    padding: '20px 40px',
    width: '92vw',
    maxWidth: 800,
    minWidth: 480,
    maxHeight: '92vh',
    overflowY: 'auto',
    boxShadow: '0 8px 40px 0 rgba(30,34,45,0.18)',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
    border: '1.5px solid #e3e8f0',
  },
  headerSection: {
    textAlign: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    marginBottom: 4,
    letterSpacing: 0.5,
    color: '#1a2236',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 24,
    marginBottom: 16,
  },
  infoColLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  infoColRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 0,
  },
  label: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 6,
    color: '#333',
  },
  input: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 14,
    background: '#fff',
    transition: 'all 0.2s ease',
    outline: 'none',
    height: 40,
    boxSizing: 'border-box',
    marginBottom: 0,
  },
  textarea: {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 14,
    background: '#fff',
    resize: 'vertical',
    transition: 'border 0.2s',
    outline: 'none',
    minHeight: 214,
    boxSizing: 'border-box',
    marginBottom: 0,
  },
  uploadBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    background: '#e3f2fd',
    color: '#1976d2',
    border: 'none',
    borderRadius: 12,
    padding: '12px 18px',
    minHeight: 48,
    width: '100%',
    fontWeight: 600,
    fontSize: 16,
    cursor: 'pointer',
    transition: 'background 0.2s',
    marginTop: 8,
    marginBottom: 8,
  },
  uploadIcon: {
    fontSize: 22,
    marginRight: 2,
  },
  fileListLimited: {
    maxHeight: 114,
    overflowY: 'auto',
    border: '1px solid #eee',
    borderRadius: 6,
    background: '#fafbfc',
    padding: 6,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '4px 8px',
    borderRadius: 4,
    background: '#fff',
    fontSize: 13,
    border: '1px solid #e0e0e0',
    gap: 6,
  },
  fileName: {
    color: '#1976d2',
    fontSize: 13,
    wordBreak: 'break-all',
  },
  fileIcon: {
    fontSize: 18,
    marginRight: 6,
    color: '#1976d2',
  },
  removeFileBtn: {
    background: 'none',
    border: 'none',
    color: '#dc3545',
    fontWeight: 700,
    fontSize: 18,
    cursor: 'pointer',
    marginLeft: 8,
    lineHeight: 1,
    padding: 0,
  },
  noFileText: {
    color: '#aaa',
    fontSize: 14,
    padding: 8,
    textAlign: 'center',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 18,
  },
  cancelBtn: {
    background: '#f0f0f0',
    color: '#333',
    border: 'none',
    borderRadius: 6,
    padding: '10px 20px',
    fontSize: 14,
    cursor: 'pointer',
  },
  submitBtn: {
    background: '#FA2B4D',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 24px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  },
  errorTextInline: {
    color: '#dc3545',
    fontSize: 11,
    fontWeight: 500,
    position: 'absolute',
    bottom: -16,
    left: 0,
    zIndex: 1,
    animation: 'fadeIn 0.2s ease-in',
  },
  uploadIconBtn: {
    background: '#e3f2fd',
    border: 'none',
    borderRadius: '50%',
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    padding: 0,
    transition: 'background 0.18s',
  },
};

export default EditModulePopup; 