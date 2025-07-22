import React, { useState, useRef } from 'react';
import axiosInstance from '../../api/axios';

function formatFileName(fileName) {
  if (!fileName) return '';
  if (fileName.length <= 30) return fileName;
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return fileName.substring(0, 27) + '...';
  const name = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  if (name.length <= 27) return fileName;
  return name.substring(0, 27) + '...' + extension;
}

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
    gap: 32,
    marginBottom: 16,
    alignItems: 'start',
  },
  infoColLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  infoColRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 0,
  },
  dateRow: {
    display: 'flex',
    gap: 18,
    marginBottom: 0,
  },
  dateCol: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  gridItemFiles: { display: 'flex', flexDirection: 'column', gap: 0, minHeight: 120 },
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
  fileListLimited: {
    maxHeight: 117, overflowY: 'auto', border: '1px solid #eee', borderRadius: 6,
    background: '#fafbfc', padding: 6, display: 'flex', flexDirection: 'column', gap: 4,
  },
  fileItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '4px 8px', borderRadius: 4, background: '#fff', fontSize: 13,
    border: '1px solid #e0e0e0', gap: 6,
  },
  fileName: { color: '#1976d2', fontSize: 13, wordBreak: 'break-all' },
  fileIcon: { fontSize: 18, marginRight: 6, color: '#1976d2' },
  removeFileBtn: {
    background: 'none', border: 'none', color: '#dc3545', fontWeight: 700, fontSize: 18,
    cursor: 'pointer', marginLeft: 8, lineHeight: 1, padding: 0,
  },
  noFileText: { color: '#aaa', fontSize: 14, padding: 8, textAlign: 'center' },
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
    height:128,
    minHeight: 128,
    boxSizing: 'border-box',
    marginBottom: 0,
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
};

export default function EditSprintPopup({ open, sprint, onClose, onUpdated, errorMessage }) {
  const [form, setForm] = useState({
    name: sprint?.name || '',
    startDate: sprint?.startDate ? sprint.startDate.slice(0,10) : '',
    endDate: sprint?.endDate ? sprint.endDate.slice(0,10) : '',
    goal: sprint?.goal || '',
    repoLink: sprint?.repoLink || '',
    gitBranch: sprint?.gitBranch || '',
  });
  const [existingFiles, setExistingFiles] = useState(sprint?.docs?.map(f => ({ ...f, publicId: f.publicId })) || []);
  const [newFiles, setNewFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef();
  
  // Reset form when popup opens
  React.useEffect(() => {
    if (open && sprint) {
      setForm({
        name: sprint.name || '',
        startDate: sprint.startDate ? sprint.startDate.slice(0,10) : '',
        endDate: sprint.endDate ? sprint.endDate.slice(0,10) : '',
        goal: sprint.goal || '',
        repoLink: sprint.repoLink || '',
        gitBranch: sprint.gitBranch || '',
      });
      setExistingFiles((sprint.docs || []).map(f => ({ ...f, publicId: f.publicId })));
      setNewFiles([]);
      setErrors({});
    }
  }, [open, sprint]);
  
  if (!open) return null;

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(errs => ({ ...errs, [e.target.name]: undefined }));
  };
  const handleFileChange = (e) => {
    setNewFiles(prev => [...prev, ...Array.from(e.target.files)]);
    e.target.value = '';
  };
  const handleRemoveFile = (idx) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };
  const handleRemoveExistingFile = (publicId) => {
    setExistingFiles(prev => prev.filter(f => f.publicId !== publicId));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    let newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Vui lòng nhập tên sprint';
    if (!form.startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!form.endDate) newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    if (form.startDate && form.endDate && form.endDate < form.startDate) newErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    // Kiểm tra nếu không thay đổi gì so với dữ liệu gốc
    const isUnchanged =
      form.name === (sprint?.name || '') &&
      form.startDate === (sprint?.startDate ? sprint.startDate.slice(0,10) : '') &&
      form.endDate === (sprint?.endDate ? sprint.endDate.slice(0,10) : '') &&
      form.goal === (sprint?.goal || '') &&
      form.repoLink === (sprint?.repoLink || '') &&
      form.gitBranch === (sprint?.gitBranch || '') &&
      JSON.stringify(existingFiles.map(f => f.publicId)) === JSON.stringify((sprint?.docs || []).map(f => f.publicId)) &&
      newFiles.length === 0;
    if (isUnchanged) {
      setSubmitError('Bạn chưa thay đổi thông tin nào!');
      return;
    } else {
      setSubmitError('');
    }
    setLoading(true);
    try {
      // Create FormData with all data
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('goal', form.goal);
      formData.append('startDate', form.startDate);
      formData.append('endDate', form.endDate);
      formData.append('repoLink', form.repoLink);
      formData.append('gitBranch', form.gitBranch);
      
      // Add keepFiles (existing files to keep)
      const keepFileIds = existingFiles.map(f => f.publicId);
      formData.append('keepFiles', JSON.stringify(keepFileIds));
      
      // Add new files
      newFiles.forEach(f => formData.append('docs', f));
      
      // Update sprint with all data in one request
      await axiosInstance.put(`/sprints/${sprint._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onUpdated && onUpdated();
    } catch (e) {
      setErrors({ submit: e?.response?.data?.message || 'Có lỗi xảy ra!' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div style={styles.overlay}>
      <form style={styles.popup} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div style={styles.headerSection}>
          <h2 style={styles.title}>Chỉnh sửa Sprint</h2>
        </div>
        <div style={styles.form}>
          <div style={styles.infoGrid}>
            {/* Cột trái */}
            <div style={styles.infoColLeft}>
              <div style={{...styles.fieldGroup, position: 'relative'}}>
                <label style={styles.label}>Tên Sprint <span style={styles.requiredMark}>*</span></label>
                <input
                  type="text"
                  style={{
                    ...styles.input,
                    borderColor: errors.name ? '#dc3545' : '#ccc',
                  }}
                  placeholder="VD: Sprint 1 - Tích hợp thanh toán"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  autoFocus
                />
                {errors.name && <div style={{color:'#dc3545', fontSize:11, fontWeight:500, position:'absolute', bottom:-16, left:0, zIndex:1}}>{errors.name}</div>}
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Link Repository</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="URL của Repository"
                  name="repoLink"
                  value={form.repoLink}
                  onChange={handleChange}
                />
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Git Branch</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="VD: feature/sprint-1-payment"
                  name="gitBranch"
                  value={form.gitBranch}
                  onChange={handleChange}
                />
              </div>
              <div style={styles.dateRow}>
                <div style={{...styles.dateCol, position: 'relative'}}>
                  <label style={styles.label}>Ngày bắt đầu <span style={styles.requiredMark}>*</span></label>
                  <input
                    type="date"
                    style={{
                      ...styles.input,
                      borderColor: errors.startDate ? '#dc3545' : '#ccc',
                    }}
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                  />
                  {errors.startDate && <div style={{color:'#dc3545', fontSize:11, fontWeight:500, position:'absolute', bottom:-16, left:0, zIndex:1}}>{errors.startDate}</div>}
                </div>
                <div style={{...styles.dateCol, position: 'relative'}}>
                  <label style={styles.label}>Ngày kết thúc <span style={styles.requiredMark}>*</span></label>
                  <input
                    type="date"
                    style={{
                      ...styles.input,
                      borderColor: errors.endDate ? '#dc3545' : '#ccc',
                    }}
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                  />
                  {errors.endDate && <div style={{color:'#dc3545', fontSize:11, fontWeight:500, position:'absolute', bottom:-16, left:0, zIndex:1}}>{errors.endDate}</div>}
                </div>
              </div>
            </div>
            {/* Cột phải */}
            <div style={styles.infoColRight}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Mục tiêu sprint</label>
                <textarea
                  style={styles.textarea}
                  placeholder="Mô tả ngắn gọn mục tiêu cần đạt được trong Sprint này"
                  name="goal"
                  value={form.goal}
                  onChange={handleChange}
                  rows={8}
                ></textarea>
              </div>
              <div style={styles.gridItemFiles}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
                  <label style={styles.label}>Tài liệu sprint</label>
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
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
                <div style={styles.fileListLimited}>
                  {/* Hiện file cũ */}
                  {existingFiles.length > 0 && existingFiles.map((file, idx) => (
                    <div key={file.publicId || idx} style={styles.fileItem}>
                      <span style={styles.fileIcon}>📄</span>
                      <span style={styles.fileName} title={file.fileName}>{formatFileName(file.fileName)}</span>
                      <button
                        type="button"
                        style={styles.removeFileBtn}
                        onClick={() => handleRemoveExistingFile(file)}
                        title="Xóa file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {/* Hiện file mới */}
                  {newFiles.length > 0 && newFiles.map((file, idx) => (
                    <div key={idx} style={styles.fileItem}>
                      <span style={styles.fileIcon}>🆕</span>
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
                  ))}
                  {existingFiles.length === 0 && newFiles.length === 0 && (
                    <div style={styles.noFileText}>Chưa có tài liệu nào</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {errors.submit && <div style={{color:'#d32f2f', fontWeight:500, marginTop:2}}>{errors.submit}</div>}
          {errorMessage && <div style={{color:'#d32f2f', fontWeight:500, marginTop:2}}>{errorMessage}</div>}
          {submitError && (
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
              {submitError}
            </div>
          )}
          <div style={styles.actions}>
            <button type="button" style={styles.cancelBtn} onClick={() => { setErrors({}); setSubmitError(''); onClose(); }} disabled={loading}>
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
              {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 