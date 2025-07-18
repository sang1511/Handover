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
  gridItemName: { gridArea: 'name', display: 'flex', flexDirection: 'column', gap: 0 },
  gridItemRepo: { gridArea: 'repo', display: 'flex', flexDirection: 'column', gap: 0 },
  gridItemBranch: { gridArea: 'branch', display: 'flex', flexDirection: 'column', gap: 0 },
  gridItemStart: { gridArea: 'start', display: 'flex', flexDirection: 'column', gap: 0 },
  gridItemEnd: { gridArea: 'end', display: 'flex', flexDirection: 'column', gap: 0 },
  gridItemGoal: { gridArea: 'goal', display: 'flex', flexDirection: 'column', gap: 0, minHeight: 240 },
  gridItemFiles: { gridArea: 'files', display: 'flex', flexDirection: 'column', gap: 0, minHeight: 120 },
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
  uploadIcon: { fontSize: 22, marginRight: 2 },
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

const NewSprintPopup = ({ isOpen, onClose, releaseId, onSprintCreated }) => {
  const [sprintName, setSprintName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gitBranch, setGitBranch] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [files, setFiles] = useState([]); // <-- Thêm state files
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...newFiles]);
    e.target.value = '';
  };
  const handleRemoveFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!sprintName.trim()) newErrors.sprintName = 'Tên Sprint là bắt buộc';
    if (!startDate) newErrors.startDate = 'Ngày bắt đầu là bắt buộc';
    if (!endDate) newErrors.endDate = 'Ngày kết thúc là bắt buộc';
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) newErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        console.error('No authentication token found.');
        return;
      }
      // Lấy userId từ localStorage (object user)
      const userStr = localStorage.getItem('user');
      let userId = '';
      if (userStr) {
        try {
          userId = JSON.parse(userStr)._id;
        } catch {}
      }
      // Tạo FormData
      const formData = new FormData();
      formData.append('name', sprintName.trim());
      formData.append('goal', goal.trim());
      formData.append('startDate', startDate);
      formData.append('endDate', endDate);
      formData.append('gitBranch', gitBranch.trim());
      formData.append('repoLink', repoLink.trim());
      if (userId) {
        const membersJson = JSON.stringify([{ user: userId, role: 'member' }]);
        formData.append('members', membersJson);
      }
      files.forEach(f => formData.append('docs', f));
      await axiosInstance.post(`/sprints/by-release/${releaseId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      onClose(); 
      onSprintCreated(); 
      setSprintName('');
      setGoal('');
      setStartDate('');
      setEndDate('');
      setGitBranch('');
      setRepoLink('');
      setFiles([]);
      setErrors({});
    } catch (error) {
      if (error.response?.status === 401) {
        return;
      }
      console.error('Error creating sprint:', error.response ? error.response.data : error.message);
      // alert('Có lỗi xảy ra khi tạo sprint.' + (error.response?.data?.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={styles.headerSection}>
          <h2 style={styles.title}>Tạo Sprint mới</h2>
        </div>
        <form style={styles.form} onSubmit={handleSubmit}>
          <div style={styles.infoGrid}>
            {/* Cột trái */}
            <div style={styles.infoColLeft}>
              <div style={{ ...styles.fieldGroup, position: 'relative' }}>
                <label style={styles.label}>Tên Sprint <span style={styles.requiredMark}>*</span></label>
                <input
                  type="text"
                  style={{ ...styles.input, borderColor: errors.sprintName ? '#dc3545' : '#ccc' }}
                  placeholder="VD: Sprint 1 - Tích hợp thanh toán"
                  value={sprintName}
                  onChange={(e) => {
                    setSprintName(e.target.value);
                    if (errors.sprintName) setErrors(prev => ({ ...prev, sprintName: '' }));
                  }}
                  autoFocus
                />
                {errors.sprintName && <div style={styles.errorTextInline}>{errors.sprintName}</div>}
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Link Repository</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="URL của Repository"
                  value={repoLink}
                  onChange={(e) => setRepoLink(e.target.value)}
              />
            </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Git Branch</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="VD: feature/sprint-1-payment"
                  value={gitBranch}
                  onChange={(e) => setGitBranch(e.target.value)}
                />
            </div>
              <div style={{ ...styles.dateRow, position: 'relative' }}>
                <div style={{...styles.dateCol, position: 'relative'}}>
                  <label style={styles.label}>Ngày bắt đầu <span style={styles.requiredMark}>*</span></label>
                  <input
                    type="date"
                    style={{ ...styles.input, borderColor: errors.startDate ? '#dc3545' : '#ccc' }}
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
                    }}
                  />
                  {errors.startDate && <div style={styles.errorTextInline}>{errors.startDate}</div>}
                </div>
                <div style={{...styles.dateCol, position: 'relative'}}>
                  <label style={styles.label}>Ngày kết thúc <span style={styles.requiredMark}>*</span></label>
                  <input
                    type="date"
                    style={{ ...styles.input, borderColor: errors.endDate ? '#dc3545' : '#ccc' }}
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
                    }}
                  />
                  {errors.endDate && <div style={styles.errorTextInline}>{errors.endDate}</div>}
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
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
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
                  {files.length > 0 ? (
                    files.map((file, idx) => (
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
            <button type="button" style={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              Hủy
            </button>
            <button type="submit" style={{...styles.submitBtn, opacity: isSubmitting ? 0.7 : 1, pointerEvents: isSubmitting ? 'none' : 'auto'}} disabled={isSubmitting}>
            {isSubmitting ? 'Đang tạo...' : 'Tạo Sprint'}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default NewSprintPopup; 