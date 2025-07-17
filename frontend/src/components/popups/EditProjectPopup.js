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

const EditProjectPopup = ({ open, onClose, project, onSubmit, membersList, errorMessage, loading }) => {
  const [name, setName] = useState(project?.name || '');
  const [version, setVersion] = useState(project?.version || '');
  const [startDate, setStartDate] = useState(formatDateInput(project?.startDate));
  const [endDate, setEndDate] = useState(formatDateInput(project?.endDate));
  const [description, setDescription] = useState(project?.description || '');
  const [members] = useState(project?.members?.map(m => m.user?._id) || []);
  const [files, setFiles] = useState([]); // new files
  const [keepFiles, setKeepFiles] = useState(project?.overviewDocs?.map(f => f.publicId) || []);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef();
  const requiredMark = <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span>;

  useEffect(() => {
    if (open) {
      setName(project?.name || '');
      setVersion(project?.version || '');
      setStartDate(formatDateInput(project?.startDate));
      setEndDate(formatDateInput(project?.endDate));
      setDescription(project?.description || '');
      setFiles([]);
      setKeepFiles(project?.overviewDocs?.map(f => f.publicId) || []);
      setErrors({});
      // Nếu có setMembers thì reset lại members ở đây
    }
  }, [open, project]);

  if (!open) return null;

  const handleFileChange = (e) => {
    setFiles([...files, ...Array.from(e.target.files)]);
    e.target.value = '';
  };

  const handleRemoveOldFile = (publicId) => {
    setKeepFiles(keepFiles.filter(id => id !== publicId));
  };

  const handleRemoveNewFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Vui lòng nhập tên dự án';
    if (!version.trim()) newErrors.version = 'Vui lòng nhập phiên bản';
    if (!startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!endDate) newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    // Kiểm tra không thay đổi gì
    const isUnchanged =
      name === project?.name &&
      version === project?.version &&
      startDate === formatDateInput(project?.startDate) &&
      endDate === formatDateInput(project?.endDate) &&
      description === (project?.description || '') &&
      JSON.stringify(keepFiles) === JSON.stringify(project?.overviewDocs?.map(f => f.publicId) || []) &&
      files.length === 0;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    if (isUnchanged) {
      setErrors({ submit: 'Bạn chưa thay đổi thông tin nào!' });
      return;
    }
    const formData = new FormData();
    formData.append('name', name);
    formData.append('version', version);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('description', description);
    formData.append('keepFiles', JSON.stringify(keepFiles));
    members.forEach((m, idx) => {
      formData.append(`members[${idx}][user]`, m);
    });
    files.forEach(f => {
      formData.append('overviewDocs', f);
    });
    onSubmit(formData);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={styles.headerSection}>
          <h2 style={styles.title}>Chỉnh sửa dự án</h2>
        </div>
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Phần trên: Thông tin cơ bản */}
          <div style={styles.infoGrid}>
            {/* Cột trái */}
            <div style={styles.infoColLeft}>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Tên dự án {requiredMark}</label>
                <input 
                  style={{
                    ...styles.input,
                    borderColor: errors.name ? '#dc3545' : '#ccc',
                  }} 
                  value={name} 
                  onChange={e => {
                    setName(e.target.value);
                    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                  }}
                />
                {errors.name && <div style={styles.errorTextInline}>{errors.name}</div>}
              </div>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Phiên bản {requiredMark}</label>
                <input 
                  style={{
                    ...styles.input,
                    borderColor: errors.version ? '#dc3545' : '#ccc',
                  }} 
                  value={version} 
                  onChange={e => {
                    setVersion(e.target.value);
                    if (errors.version) setErrors(prev => ({ ...prev, version: '' }));
                  }}
                />
                {errors.version && <div style={styles.errorTextInline}>{errors.version}</div>}
              </div>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Ngày bắt đầu {requiredMark}</label>
                <input 
                  style={{
                    ...styles.input,
                    borderColor: errors.startDate ? '#dc3545' : '#ccc',
                  }} 
                  type="date" 
                  value={startDate} 
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
                  }}
                />
                {errors.startDate && <div style={styles.errorTextInline}>{errors.startDate}</div>}
              </div>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Ngày kết thúc {requiredMark}</label>
                <input 
                  style={{
                    ...styles.input,
                    borderColor: errors.endDate ? '#dc3545' : '#ccc',
                  }} 
                  type="date" 
                  value={endDate} 
                  onChange={e => {
                    setEndDate(e.target.value);
                    if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
                  }}
                />
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
                  <label style={styles.label}>Tài liệu tổng quan</label>
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
                  {project?.overviewDocs?.filter(f => keepFiles.includes(f.publicId)).map(f => (
                    <div key={f.publicId} style={styles.fileItem}>
                      <span style={styles.fileIcon}>📄</span>
                      <span style={styles.fileName} title={f.fileName}>{formatFileName(f.fileName)}</span>
                      <button
                        type="button"
                        style={styles.removeFileBtn}
                        onClick={() => handleRemoveOldFile(f.publicId)}
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
                  {project?.overviewDocs?.filter(f => keepFiles.includes(f.publicId)).length === 0 && files.length === 0 && (
                    <div style={styles.noFileText}>Chưa chọn file nào</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {errors.submit && (
            <div style={{
              color: '#d32f2f',
              fontWeight: 500,
              fontSize: 14,
              textAlign: 'center',
              padding: '12px',
              margin: '16px 0 8px 0',
              background: '#ffebee',
              borderRadius: 6,
              border: '1px solid #ffcdd2'
            }}>
              {errors.submit}
            </div>
          )}

          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={() => { setErrors({}); onClose(); }}>
              Hủy
            </button>
            <button type="submit"
              style={typeof styles.submitBtn === 'object' && !Array.isArray(styles.submitBtn) ? {
                ...styles.submitBtn,
                opacity: loading ? 0.7 : 1,
                pointerEvents: loading ? 'none' : 'auto',
              } : {
                opacity: loading ? 0.7 : 1,
                pointerEvents: loading ? 'none' : 'auto',
              }}
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
        {errorMessage && <div style={{color:'#d32f2f', fontWeight:500, marginTop:2}}>{errorMessage}</div>}
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
    minHeight: 129,
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
    padding: '7px 12px', // giảm padding
    minHeight: 32,      // giảm minHeight
    width: '100%',
    fontWeight: 600,
    fontSize: 13,       // giảm fontSize
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
    maxHeight: 114,     // tăng maxHeight
    overflowY: 'auto',
    border: '1px solid #eee',
    borderRadius: 6,
    background: '#fafbfc',
    padding: 12,        // tăng padding
    display: 'flex',
    flexDirection: 'column',
    gap: 6,             // tăng gap
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

export default EditProjectPopup; 