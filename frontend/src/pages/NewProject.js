import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import SuccessToast from '../components/common/SuccessToast';
import styles from './NewProject.module.css';

const NewProject = () => {
  // Tất cả hooks phải được gọi trước khi có bất kỳ return nào
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

  // Kiểm tra quyền user sau khi đã gọi tất cả hooks
  const userStr = localStorage.getItem('user');
  let role = '';
  if (userStr) {
    try {
      role = JSON.parse(userStr).role;
    } catch {}
  }

  // Nếu không có quyền, hiển thị thông báo
  if (role !== 'admin' && role !== 'pm') {
    return (
      <div className={styles.permissionDenied}>
        <div className={styles.permissionIcon}>⛔</div>
        <div className={styles.permissionMessage}>Bạn không có quyền tạo dự án mới.</div>
        <button onClick={() => navigate('/dashboard')} className={styles.backButton}>
          Quay lại Dashboard
        </button>
      </div>
    );
  }

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



  return (
    <div className={styles.pageWrapper}>
      <SuccessToast show={showToast} message={toastMsg} onClose={() => setShowToast(false)} />
      <form onSubmit={handleSubmit} encType="multipart/form-data" className={styles.formCard}>        
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Thông tin dự án</h3>
          <div className={styles.contentGrid}>
            <div className={styles.leftColumn}>
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>Tên dự án <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                  placeholder="Nhập tên dự án"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="description" className={styles.label}>Mô tả</label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  placeholder="Mô tả dự án..."
                />
              </div>
            </div>
            
            <div className={styles.rightColumn}>
              <div className={styles.formGroup}>
                <label htmlFor="version" className={styles.label}>Version <span className={styles.required}>*</span></label>
                <input
                  type="text"
                  id="version"
                  value={formData.version}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                  placeholder="VD: 1.0.0"
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="startDate" className={styles.label}>Ngày bắt đầu <span className={styles.required}>*</span></label>
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  required
                  className={styles.input}
                />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="endDate" className={styles.label}>Ngày kết thúc</label>
                <input
                  type="date"
                  id="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className={styles.input}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Tài liệu tổng quan</h3>
          <div className={styles.documentGrid}>

            <div className={styles.dropZoneColumn}>
              <div
                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current.click()}
              >
                <div className={styles.dropZoneText}>
                  <div className={styles.dropZoneIcon}>☁️</div>
                  <div>Kéo và thả file vào đây<br />hoặc <span className={styles.dropZoneLink}>chọn file</span></div>
                </div>
                <input
                  type="file"
                  id="overviewDocs"
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className={styles.hiddenInput}
                />
              </div>
            </div>
            
            <div className={styles.fileListColumn}>
              <div className={styles.fileListBox}>
                {files.length > 0 && (
                  <div className={styles.fileCount}>Đã chọn {files.length} file</div>
                )}
                {files.length > 0 ? (
                  <div className={styles.fileListScroll}>
                    {files.map((file, idx) => (
                      <div key={idx} className={styles.fileItem}>
                        <span className={styles.fileIcon}>📄</span>
                        <span className={styles.fileName} title={file.name}>
                          <span className={styles.fileBase}>{(() => {
                            const name = file.name || '';
                            const dotIdx = name.lastIndexOf('.');
                            return dotIdx !== -1 ? name.slice(0, dotIdx).replace(/\s+$/, '') : name.replace(/\s+$/, '');
                          })()}</span>
                          <span className={styles.fileExt}>{(() => {
                            const name = file.name || '';
                            const dotIdx = name.lastIndexOf('.');
                            return dotIdx !== -1 ? name.slice(dotIdx) : '';
                          })()}</span>
                        </span>
                        <span className={styles.fileSize}>{formatFileSize(file.size)}</span>
                        <button type="button" className={styles.fileRemoveBtn} onClick={() => handleRemoveFile(file)} title="Xóa file">×</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.noFileMessage}>
                    <div className={styles.noFileIcon}>📁</div>
                    <div>Chưa có file nào được chọn</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.buttonSection}>
          <div className={styles.buttonRow}>
            <button type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Đang tạo...' : '+ Tạo dự án'}
            </button>
            <button type="button" className={styles.cancelButton} onClick={handleCancel}>Hủy</button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NewProject;
