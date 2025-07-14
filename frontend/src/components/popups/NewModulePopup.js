import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

function generateUniqueModuleId(existingIds) {
  let id;
  do {
    id = Math.floor(1000 + Math.random() * 9000).toString();
  } while (existingIds.includes(id));
  return id;
}

// Thêm hàm rút gọn tên file
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

const NewModulePopup = ({ open, onClose, members, onSubmit, modules = [] }) => {
  const [form, setForm] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    owner: '',
    version: '',
    files: [], // array of File
  });
  const [search, setSearch] = useState('');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [generatedId, setGeneratedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (search.trim() === '') {
      setFilteredMembers(members);
    } else {
      const s = search.toLowerCase();
      setFilteredMembers(
        members.filter((m) =>
          m.name.toLowerCase().includes(s) ||
          m.email.toLowerCase().includes(s) ||
          (m.userID && m.userID.toLowerCase().includes(s))
        )
      );
    }
  }, [search, members]);

  useEffect(() => {
    if (open) {
      setForm({
        name: '',
        description: '',
        startDate: '',
        endDate: '',
        owner: '',
        version: '',
        files: [],
      });
      setSearch('');
      setErrors({});
      const existingIds = modules.map((m) => m.moduleId);
      const newId = generateUniqueModuleId(existingIds);
      setGeneratedId(newId);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [open, modules]);

  if (!open) return null;

  // Xử lý chọn file
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setForm((prev) => ({ ...prev, files: [...prev.files, ...files] }));
    // reset input để có thể chọn lại file vừa xóa
    e.target.value = '';
  };

  // Xử lý xóa file
  const handleRemoveFile = (idx) => {
    setForm((prev) => ({ ...prev, files: prev.files.filter((_, i) => i !== idx) }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên module';
    }
    
    if (!form.version.trim()) {
      newErrors.version = 'Vui lòng nhập phiên bản';
    }
    
    if (!form.owner) {
      newErrors.owner = 'Vui lòng chọn người phụ trách từ danh sách';
    }
    
    if (!form.startDate) {
      newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    }
    
    if (!form.endDate) {
      newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        {/* Phần 1: Header */}
        <div style={styles.headerSection}>
          <h2 style={styles.title}>Tạo module mới</h2>
          <div style={styles.moduleIdLabel}>
            Mã module: <span style={styles.moduleIdValue}>{generatedId}</span>
          </div>
        </div>
        {/* Phần 2: Thông tin */}
        <form
          style={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            if (loading) return;
            
            if (!validateForm()) {
              return;
            }
            
            setLoading(true);
            const submitResult = onSubmit && onSubmit({
              ...form,
              moduleId: generatedId,
            });
            if (submitResult && typeof submitResult.then === 'function') {
              // onSubmit trả về Promise
              await submitResult;
            }
            setLoading(false);
          }}
        >
          <div style={styles.infoGrid}>
            {/* Cột trái */}
            <div style={styles.infoColLeft}>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Tên module <span style={styles.requiredMark}>*</span></label>
                <input
                  style={{...styles.input, borderColor: errors.name ? '#dc3545' : '#ccc'}}
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value });
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                  autoFocus
                />
                {errors.name && <div style={styles.errorTextInline}>{errors.name}</div>}
              </div>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Phiên bản <span style={styles.requiredMark}>*</span></label>
                <input
                  style={{...styles.input, borderColor: errors.version ? '#dc3545' : '#ccc'}}
                  value={form.version}
                  onChange={(e) => {
                    setForm({ ...form, version: e.target.value });
                    if (errors.version) setErrors(prev => ({ ...prev, version: '' }));
                  }}
                />
                {errors.version && <div style={styles.errorTextInline}>{errors.version}</div>}
              </div>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Người phụ trách <span style={styles.requiredMark}>*</span></label>
                <input
                  style={{...styles.input, borderColor: errors.owner ? '#dc3545' : '#ccc'}}
                  placeholder="Tìm theo tên, email hoặc ID"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    if (errors.owner) setErrors(prev => ({ ...prev, owner: '' }));
                  }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 120)}
                />
                {errors.owner && <div style={styles.errorTextInline}>{errors.owner}</div>}
                {showDropdown && (
                  <div style={{
                    ...styles.autocompleteList,
                    position: 'absolute',
                    top: 70,
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    maxHeight: 180,
                    overflowY: 'auto',
                  }}>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((m) => (
                        <div
                          key={m._id || m.userID || m.email}
                          style={{
                            ...styles.autocompleteItem,
                            backgroundColor: form.owner === m._id ? '#e3f2fd' : 'transparent',
                          }}
                          onMouseDown={e => {
                            e.preventDefault();
                            setForm({ ...form, owner: m._id });
                            setSearch(m.name + (m.email ? ` (${m.email})` : ''));
                            setShowDropdown(false);
                            if (errors.owner) setErrors(prev => ({ ...prev, owner: '' }));
                          }}
                        >
                          {m.name} {m.email && <span style={{ color: '#888' }}>({m.email})</span>}
                        </div>
                      ))
                    ) : search.trim() ? (
                      <div style={{ ...styles.autocompleteItem, color: '#888', fontStyle: 'italic' }}>Không tìm thấy</div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
            {/* Cột phải */}
            <div style={styles.infoColRight}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Mô tả</label>
                <textarea
                  style={styles.textarea}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          </div>
          {/* Hàng ngày bắt đầu/ngày kết thúc thẳng hàng */}
          <div style={styles.dateRow}>
            <div style={{...styles.dateCol, position: 'relative'}}>
              <label style={styles.label}>Ngày bắt đầu <span style={styles.requiredMark}>*</span></label>
              <input
                type="date"
                style={{...styles.input, borderColor: errors.startDate ? '#dc3545' : '#ccc'}}
                value={form.startDate}
                onChange={(e) => {
                  setForm({ ...form, startDate: e.target.value });
                  if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
                }}
              />
              {errors.startDate && <div style={styles.errorTextInline}>{errors.startDate}</div>}
            </div>
            <div style={{...styles.dateCol, position: 'relative'}}>
              <label style={styles.label}>Ngày kết thúc dự kiến <span style={styles.requiredMark}>*</span></label>
              <input
                type="date"
                style={{...styles.input, borderColor: errors.endDate ? '#dc3545' : '#ccc'}}
                value={form.endDate}
                onChange={(e) => {
                  setForm({ ...form, endDate: e.target.value });
                  if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
                }}
              />
              {errors.endDate && <div style={styles.errorTextInline}>{errors.endDate}</div>}
            </div>
          </div>
          {/* Phần 3: Tài liệu nghiệp vụ */}
          <div style={styles.docsGrid}>
            {/* Cột trái: chọn file */}
            <div style={styles.docsColLeft}>
              <label style={styles.label}>Tài liệu nghiệp vụ</label>
              <button
                type="button"
                style={styles.uploadBtn}
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                <span style={styles.uploadIcon}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 16V4M12 4L7 9M12 4L17 9" stroke="#1976d2" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <rect x="4" y="17" width="16" height="3" rx="1.5" fill="#1976d2"/>
                  </svg>
                </span> Tải lên tài liệu...
              </button>
              <input
                type="file"
                style={{ display: 'none' }}
                multiple
                ref={fileInputRef}
                onChange={handleFileChange}
              />
            </div>
            {/* Cột phải: danh sách file đã chọn */}
            <div style={styles.docsColRight}>
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
          {/* Phần 4: Nút nhấn */}
          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Hủy
            </button>
            <button type="submit" style={{...styles.submitBtn, opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto'}} disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

NewModulePopup.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  members: PropTypes.array.isRequired,
  onSubmit: PropTypes.func,
  modules: PropTypes.array,
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
  dateRow: {
    display: 'flex',
    gap: 24,
    marginBottom: 16,
  },
  dateCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  docsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 16,
    margin: '12px 0 0 0',
    alignItems: 'flex-start',
  },
  docsColLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  docsColRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    minHeight: 40,
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
    maxHeight: 100,
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
};

export default NewModulePopup;
