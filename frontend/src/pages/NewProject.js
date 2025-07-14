import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';

const NewProject = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    version: '',
    projectId: generateProjectId()
  });
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef();
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  function generateProjectId() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles(prevFiles => {
      const existingNames = new Set(prevFiles.map(f => f.name));
      const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
      return [...prevFiles, ...uniqueNewFiles];
    });
  };

  const handleRemoveFile = (fileToRemove) => {
    setFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };
  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };
  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (!formData.name || !formData.startDate || !formData.version) {
      alert('Vui lòng nhập đầy đủ các trường bắt buộc: Tên dự án, Ngày bắt đầu, Version!');
      return;
    }
    setLoading(true);
    try {
      const data = new FormData();
      data.append('projectId', formData.projectId);
      data.append('name', formData.name);
      data.append('description', formData.description);
      data.append('startDate', formData.startDate);
      if (formData.endDate) data.append('endDate', formData.endDate);
      data.append('version', formData.version);
      // Lấy userId từ localStorage (object user)
      const userStr = localStorage.getItem('user');
      let userId = '';
      if (userStr) {
        try {
          userId = JSON.parse(userStr)._id;
        } catch {}
      }
      if (userId) {
        const membersJson = JSON.stringify([{ user: userId }]);
        data.append('members', membersJson);
      }
      files.forEach(file => {
        data.append('overviewDocs', file);
      });
      await axiosInstance.post('/projects', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setToastMsg('Tạo dự án thành công!');
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate('/projects');
      }, 1800);
    } catch (error) {
      console.error('Lỗi khi tạo dự án:', error);
      alert('Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại!');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
      navigate('/projects');
    }
  };

  const formatFileSize = (size) => {
    if (!size) return '0 B';
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  };

  const truncateFileName = (name, maxLength = 30) => {
    if (name.length <= maxLength) return name;
    const extIndex = name.lastIndexOf('.');
    const ext = extIndex !== -1 ? name.slice(extIndex) : '';
    const base = name.slice(0, maxLength - ext.length - 3);
    return base + '...' + ext;
  };

  return (
    <div style={styles.pageWrapper}>
      {showToast && (
        <div style={{
          position: 'fixed',
          top: 30,
          right: 30,
          background: '#28a745',
          color: '#fff',
          padding: '16px 32px',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 16,
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
        }}>{toastMsg}</div>
      )}
      <form onSubmit={handleSubmit} encType="multipart/form-data" style={styles.formCard}>        
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Thông tin dự án</h3>
          <div style={styles.contentGrid}>
            <div style={styles.leftColumn}>
              <div style={styles.formGroup}>
                <label htmlFor="name" style={styles.label}>Tên dự án <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="Nhập tên dự án"
                />
              </div>
              <div style={styles.formGroup}>
                <label htmlFor="description" style={styles.label}>Mô tả</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  style={styles.textarea}
                  placeholder="Mô tả dự án..."
                />
              </div>
            </div>
            
            <div style={styles.rightColumn}>
              <div style={styles.formGroup}>
                <label htmlFor="version" style={styles.label}>Version <span style={styles.required}>*</span></label>
                <input
                  type="text"
                  id="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                  placeholder="VD: 1.0.0"
                />
              </div>
              <div style={styles.formGroup}>
                <label htmlFor="startDate" style={styles.label}>Ngày bắt đầu <span style={styles.required}>*</span></label>
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label htmlFor="endDate" style={styles.label}>Ngày kết thúc</label>
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
            </div>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>Tài liệu tổng quan</h3>
          <div style={styles.documentGrid}>

            <div style={styles.dropZoneColumn}>
              <div
                style={{
                  ...styles.dropZone,
                  borderColor: dragActive ? '#007BFF' : '#e0e0e0',
                  background: dragActive ? '#f0f8ff' : '#fafbfc',
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <div style={{ textAlign: 'center', color: '#888', fontSize: 16, cursor: 'pointer' }}>
                  <div style={{ fontSize: 36, marginBottom: 8 }}>☁️</div>
                  <div>Kéo và thả file vào đây<br />hoặc <span style={{ color: '#007BFF', textDecoration: 'underline' }}>chọn file</span></div>
                </div>
                <input
                  type="file"
                  id="overviewDocs"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            
            <div style={styles.fileListColumn}>
              <div style={styles.fileListBox}>
                {files.length > 0 && (
                  <div style={styles.fileCount}>Đã chọn {files.length} file</div>
                )}
                {files.length > 0 ? (
                  <div style={styles.fileListScroll}>
                    {files.map((file, idx) => (
                      <div key={idx} style={styles.fileItem}>
                        <span style={styles.fileIcon}>📄</span>
                        <span style={styles.fileName} title={file.name}>{truncateFileName(file.name, 30)}</span>
                        <span style={styles.fileSize}>{formatFileSize(file.size)}</span>
                        <button type="button" style={styles.fileRemoveBtn} onClick={() => handleRemoveFile(file)} title="Xóa file">×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={styles.noFileMessage}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>📁</div>
                    <div>Chưa có file nào được chọn</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.buttonSection}>
          <div style={styles.buttonRow}>
            <button type="submit" style={styles.submitButton}>
              {loading ? 'Đang tạo...' : '+ Tạo dự án'}
            </button>
            <button type="button" style={styles.cancelButton} onClick={handleCancel}>Hủy</button>
          </div>
        </div>
      </form>
    </div>
  );
};

const styles = {
  pageWrapper: {
    minHeight: '100vh',
    background: '#f5f7fa',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  },
  formCard: {
    background: '#fff',
    borderRadius: 18,
    boxShadow: '0 4px 32px rgba(0,0,0,0.08)',
    padding: '40px 32px',
    maxWidth: 1000,
    width: '100%',
    margin: '40px 0',
    display: 'flex',
    flexDirection: 'column',
    gap: 32,
  },

  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: '#333',
    marginBottom: 8,
  },
  contentGrid: {
    display: 'flex',
    gap: 32,
    width: '100%',
  },
  leftColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  rightColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  documentGrid: {
    display: 'flex',
    gap: 32,
    width: '100%',
  },
  dropZoneColumn: {
    flex: 1,
  },
  fileListColumn: {
    flex: 1,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  label: {
    fontWeight: 600,
    color: '#333',
    fontSize: 15,
    marginBottom: 2,
  },
  required: {
    color: '#DC3545',
    marginLeft: 2,
    fontSize: 14,
  },
  input: {
    border: '1.5px solid #e0e0e0',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 16,
    outline: 'none',
    background: '#fafbfc',
    transition: 'border-color 0.2s',
  },
  textarea: {
    border: '1.5px solid #e0e0e0',
    borderRadius: 10,
    padding: '12px 14px',
    fontSize: 16,
    outline: 'none',
    background: '#fafbfc',
    minHeight: 120,
    resize: 'vertical',
    height: 145,
  },
  dropZone: {
    border: '2px dashed #e0e0e0',
    borderRadius: 12,
    padding: '40px 20px',
    background: '#fafbfc',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background 0.2s',
    minHeight: 220,
    maxHeight: 220,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileListBox: {
    background: '#f8f9fa',
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.03)',
    minHeight: 220,
    maxHeight: 220,
    border: '1px solid #e9ecef',
  },
  fileListScroll: {
    maxHeight: 160,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  fileCount: {
    color: '#007BFF',
    fontWeight: 500,
    fontSize: 15,
    marginBottom: 8,
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#fff',
    borderRadius: 8,
    padding: '12px 16px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
    fontSize: 15,
  },
  fileIcon: {
    fontSize: 20,
    color: '#007BFF',
  },
  fileName: {
    flex: 1,
    color: '#333',
    fontWeight: 500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: 260,
    display: 'inline-block',
  },
  fileSize: {
    color: '#888',
    fontSize: 13,
    minWidth: 60,
    textAlign: 'right',
  },
  fileRemoveBtn: {
    color: '#dc3545',
    background: 'none',
    border: 'none',
    fontSize: 20,
    cursor: 'pointer',
    marginLeft: 8,
    lineHeight: 1,
    padding: 0,
  },
  noFileMessage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#888',
    fontSize: 16,
    textAlign: 'center',
    height: '100%',
    minHeight: 160,
  },
  buttonSection: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginTop: 16,
  },
  buttonRow: {
    display: 'flex',
    gap: 16,
  },
  submitButton: {
    background: '#fa2b4d',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 32px',
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
    transition: 'background 0.2s',
  },
  cancelButton: {
    background: '#f1f3f5',
    color: '#333',
    border: 'none',
    borderRadius: 10,
    padding: '12px 32px',
    fontSize: 17,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    transition: 'background 0.2s',
  },
};

export default NewProject;
