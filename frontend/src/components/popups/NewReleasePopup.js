import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

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

const NewReleasePopup = ({ open, onClose, onSubmit, users = [] }) => {
  const [form, setForm] = useState({
    version: '',
    startDate: '',
    endDate: '',
    fromUser: '',
    toUser: '',
    files: [],
    gitRepo: '',
    branch: '',
  });
  const [releaseId, setReleaseId] = useState('');
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [filteredFrom, setFilteredFrom] = useState(users);
  const [filteredTo, setFilteredTo] = useState(users);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef();
  const [showDropdownFrom, setShowDropdownFrom] = useState(false);
  const [showDropdownTo, setShowDropdownTo] = useState(false);

  useEffect(() => {
    if (searchFrom.trim() === '') setFilteredFrom(users);
    else {
      const s = searchFrom.toLowerCase();
      setFilteredFrom(users.filter(u =>
        u.name.toLowerCase().includes(s) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.userID && u.userID.toLowerCase().includes(s))
      ));
    }
  }, [searchFrom, users]);

  useEffect(() => {
    if (searchTo.trim() === '') setFilteredTo(users);
    else {
      const s = searchTo.toLowerCase();
      setFilteredTo(users.filter(u =>
        u.name.toLowerCase().includes(s) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.userID && u.userID.toLowerCase().includes(s))
      ));
    }
  }, [searchTo, users]);

  useEffect(() => {
    if (open) {
      setForm({
        version: '',
        startDate: '',
        endDate: '',
        fromUser: '',
        toUser: '',
        files: [],
        gitRepo: '',
        branch: '',
      });
      setSearchFrom('');
      setSearchTo('');
      setErrors({});
      // Sinh releaseId ngẫu nhiên khi mở popup
      setReleaseId(Math.floor(100000 + Math.random() * 900000).toString());
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open]);

  if (!open) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setForm(prev => ({ ...prev, files: [...prev.files, ...files] }));
    e.target.value = '';
  };

  const handleRemoveFile = (idx) => {
    setForm(prev => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.version.trim()) {
      newErrors.version = 'Phiên bản bàn giao là bắt buộc';
    }
    
    if (!form.startDate) {
      newErrors.startDate = 'Ngày bàn giao là bắt buộc';
    }
    
    if (!form.endDate) {
      newErrors.endDate = 'Ngày kết thúc dự kiến là bắt buộc';
    }
    
    if (!form.fromUser) {
      newErrors.fromUser = 'Vui lòng chọn người bàn giao từ danh sách';
    }
    
    if (!form.toUser) {
      newErrors.toUser = 'Vui lòng chọn người nhận bàn giao từ danh sách';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={styles.headerSection}>
          <h2 style={styles.title}>Tạo release mới</h2>
          <div style={styles.moduleIdLabel}>
            Mã release: <span style={styles.moduleIdValue}>{releaseId}</span>
          </div>
        </div>
        <form
          style={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            if (loading) return;
            
            if (!validateForm()) {
              return;
            }
            
            setLoading(true);
            const submitResult = onSubmit && onSubmit({ ...form, releaseId });
            if (submitResult && typeof submitResult.then === 'function') {
              await submitResult;
            }
            setLoading(false);
          }}
        >
          <div style={styles.infoGrid}>
            <div style={styles.infoColLeft}>
              <div style={{ ...styles.fieldGroup, position: 'relative' }}>
                <label style={styles.label}>Phiên bản bàn giao <span style={styles.requiredMark}>*</span></label>
                <input
                  style={{ ...styles.input, borderColor: errors.version ? '#dc3545' : '#ccc' }}
                  value={form.version}
                  onChange={e => {
                    setForm({ ...form, version: e.target.value });
                    if (errors.version) setErrors(prev => ({ ...prev, version: '' }));
                  }}
                  autoFocus
                />
                {errors.version && <div style={styles.errorTextInline}>{errors.version}</div>}
              </div>
              <div style={{ ...styles.fieldGroup, position: 'relative' }}>
                <label style={styles.label}>Ngày bàn giao <span style={styles.requiredMark}>*</span></label>
                <input
                  type="date"
                  style={{ ...styles.input, borderColor: errors.startDate ? '#dc3545' : '#ccc' }}
                  value={form.startDate}
                  onChange={e => {
                    setForm({ ...form, startDate: e.target.value });
                    if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
                  }}
                />
                {errors.startDate && <div style={styles.errorTextInline}>{errors.startDate}</div>}
              </div>
              <div style={{ ...styles.fieldGroup, position: 'relative' }}>
                <label style={styles.label}>Ngày kết thúc dự kiến <span style={styles.requiredMark}>*</span></label>
                <input
                  type="date"
                  style={{ ...styles.input, borderColor: errors.endDate ? '#dc3545' : '#ccc' }}
                  value={form.endDate}
                  onChange={e => {
                    setForm({ ...form, endDate: e.target.value });
                    if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
                  }}
                />
                {errors.endDate && <div style={styles.errorTextInline}>{errors.endDate}</div>}
              </div>
              <div style={{ ...styles.fieldGroup, position: 'relative' }}>
                <label style={styles.label}>Người bàn giao <span style={styles.requiredMark}>*</span></label>
                <input
                  style={{ ...styles.input, borderColor: errors.fromUser ? '#dc3545' : '#ccc' }}
                  placeholder="Tìm theo tên, email hoặc ID"
                  value={searchFrom}
                  onChange={e => {
                    setSearchFrom(e.target.value);
                    if (errors.fromUser) setErrors(prev => ({ ...prev, fromUser: '' }));
                  }}
                  onFocus={() => setShowDropdownFrom(true)}
                  onBlur={() => setTimeout(() => setShowDropdownFrom(false), 120)}
                  autoComplete="off"
                />
                {errors.fromUser && <div style={styles.errorTextInline}>{errors.fromUser}</div>}
                {showDropdownFrom && (
                  <div style={{ ...styles.autocompleteList, position: 'absolute', top: 67, left: 0, right: 0, zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                    {filteredFrom.length > 0 ? (
                      filteredFrom.map(u => (
                        <div
                          key={u._id || u.userID || u.email}
                          style={{ ...styles.autocompleteItem, backgroundColor: form.fromUser === u._id ? '#e3f2fd' : 'transparent' }}
                          onMouseDown={e => {
                            e.preventDefault();
                            setForm({ ...form, fromUser: u._id });
                            setSearchFrom(u.name + (u.userID ? ` (${u.userID})` : '') + (u.email ? ` (${u.email})` : ''));
                            setShowDropdownFrom(false);
                            if (errors.fromUser) setErrors(prev => ({ ...prev, fromUser: '' }));
                          }}
                        >
                          {u.name} {u.email && <span style={{ color: '#888' }}>({u.email})</span>}
                        </div>
                      ))
                    ) : searchFrom.trim() ? (
                      <div style={{ ...styles.autocompleteItem, color: '#888', fontStyle: 'italic' }}>Không tìm thấy</div>
                    ) : null}
                  </div>
                )}
              </div>
              <div style={{ ...styles.fieldGroup, position: 'relative' }}>
                <label style={styles.label}>Người nhận bàn giao <span style={styles.requiredMark}>*</span></label>
                <input
                  style={{ ...styles.input, borderColor: errors.toUser ? '#dc3545' : '#ccc' }}
                  placeholder="Tìm theo tên, email hoặc ID"
                  value={searchTo}
                  onChange={e => {
                    setSearchTo(e.target.value);
                    if (errors.toUser) setErrors(prev => ({ ...prev, toUser: '' }));
                  }}
                  onFocus={() => setShowDropdownTo(true)}
                  onBlur={() => setTimeout(() => setShowDropdownTo(false), 120)}
                  autoComplete="off"
                />
                {errors.toUser && <div style={styles.errorTextInline}>{errors.toUser}</div>}
                {showDropdownTo && (
                  <div style={{ ...styles.autocompleteList, position: 'absolute', top: 67, left: 0, right: 0, zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                    {filteredTo.length > 0 ? (
                      filteredTo.map(u => (
                        <div
                          key={u._id || u.userID || u.email}
                          style={{ ...styles.autocompleteItem, backgroundColor: form.toUser === u._id ? '#e3f2fd' : 'transparent' }}
                          onMouseDown={e => {
                            e.preventDefault();
                            setForm({ ...form, toUser: u._id });
                            setSearchTo(u.name + (u.userID ? ` (${u.userID})` : '') + (u.email ? ` (${u.email})` : ''));
                            setShowDropdownTo(false);
                            if (errors.toUser) setErrors(prev => ({ ...prev, toUser: '' }));
                          }}
                        >
                          {u.name} {u.email && <span style={{ color: '#888' }}>({u.email})</span>}
                        </div>
                      ))
                    ) : searchTo.trim() ? (
                      <div style={{ ...styles.autocompleteItem, color: '#888', fontStyle: 'italic' }}>Không tìm thấy</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            <div style={styles.infoColRight}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Link source code (Git repo)</label>
                <input
                  style={styles.input}
                  value={form.gitRepo}
                  onChange={e => setForm({ ...form, gitRepo: e.target.value })}
                  placeholder="https://github.com/..."
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Branch</label>
                <input
                  style={styles.input}
                  value={form.branch}
                  onChange={e => setForm({ ...form, branch: e.target.value })}
                  placeholder="Tên branch"
                />
              </div>
              <div style={styles.fieldGroup}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
                  <label style={styles.label}>Tài liệu/biên bản bàn giao</label>
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
                  {form.files.length > 0 ? (
                    form.files.map((file, idx) => (
                      <div key={idx} style={styles.fileItem}>
                        <span style={styles.fileIcon}>📄</span>
                        <span style={styles.fileName} title={file.name}>{formatFileName(file.name)}</span>
                        <button
                          type="button"
                          style={styles.removeFileBtn}
                          onClick={() => handleRemoveFile(idx)}
                          title="Xóa file"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  ) : (
                    <div style={styles.noFileText}>Chưa chọn file nào</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }} disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo release'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

NewReleasePopup.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func,
  users: PropTypes.array,
};

const styles = {
  '@keyframes fadeIn': {
    from: { opacity: 0, transform: 'translateY(-2px)' },
    to: { opacity: 1, transform: 'translateY(0)' },
  },
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
  autocompleteList: {
    maxHeight: 100,
    overflowY: 'auto',
    background: '#fff',
    border: '1px solid #eee',
    borderRadius: 6,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    marginTop: 2,
  },
  autocompleteItem: {
    padding: '7px 12px',
    cursor: 'pointer',
    fontSize: 14,
    borderBottom: '1px solid #f0f0f0',
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
    maxHeight: 205,
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
  requiredMark: {
    color: '#FA2B4D',
    fontSize: 15,
    marginLeft: 2,
    verticalAlign: 'middle',
  },
  moduleIdLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 0,
  },
  moduleIdValue: {
    fontWeight: 700,
    color: '#1976d2',
    fontSize: 16,
    marginLeft: 4,
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

export default NewReleasePopup; 