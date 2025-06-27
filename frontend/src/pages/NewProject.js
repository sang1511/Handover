import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../utils/axios';

const NewProject = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline: '',
    pullRequest: '',
    gitBranch: '',
    handedOverTo: '',
    files: [],
    projectId: generateProjectId()
  });
  const [handedOverToDisplayName, setHandedOverToDisplayName] = useState('');
  const [handedOverToError, setHandedOverToError] = useState('');
  const debounceTimeoutRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

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
    if (id === 'handedOverTo') {
      setFormData(prev => ({
        ...prev,
        [id]: value
      }));
      setHandedOverToError('');
      setHandedOverToDisplayName('');

      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        checkHandedOverToId(value);
      }, 500); 
    } else {
      setFormData(prev => ({
        ...prev,
        [id]: value
      }));
    }
  };

  const checkHandedOverToId = async (id) => {
    if (!id) {
      setHandedOverToError('');
      setHandedOverToDisplayName('');
      return;
    }
    try {
      const response = await axios.get(`http://localhost:5000/api/users/check-id/${id}`);
      if (response.data.name) {
        setHandedOverToDisplayName(response.data.name);
        setHandedOverToError('');
      } else {
        setHandedOverToDisplayName('');
        setHandedOverToError('Người dùng không tồn tại.');
      }
    } catch (error) {
      console.error('Error checking user ID:', error);
      setHandedOverToDisplayName('');
      if (error.response) {
        setHandedOverToError(error.response.data.message || 'Không thể kiểm tra người dùng. Vui lòng thử lại.');
      } else if (error.request) {
        setHandedOverToError('Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối.');
      } else {
        setHandedOverToError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    }
  };

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    
    setFormData(prev => {
      const existingFileKeys = new Set(prev.files.map(f => `${f.name}-${f.size}`));
      
      const uniqueNewFiles = newFiles.filter(file => {
        const fileKey = `${file.name}-${file.size}`;
        return !existingFileKeys.has(fileKey);
      });

      return {
      ...prev,
        files: [...prev.files, ...uniqueNewFiles]
      };
    });
  };

  const removeFile = (index) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.handedOverTo && !handedOverToDisplayName) {
      alert('Vui lòng nhập một UserID hợp lệ cho Người nhận bàn giao.');
      return;
    }

    try {
      const formDataToSend = new FormData();
      
      formDataToSend.append('projectId', formData.projectId);
      
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('deadline', formData.deadline);
      formDataToSend.append('handedOverTo', formData.handedOverTo);
      
      if (formData.pullRequest) {
        formDataToSend.append('pullRequest', formData.pullRequest);
      }
      if (formData.gitBranch) {
        formDataToSend.append('gitBranch', formData.gitBranch);
      }
      
      if (formData.files && formData.files.length > 0) {
        formData.files.forEach(file => {
          formDataToSend.append('files', file);
        });
      }

      await axios.post('/projects', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      alert('Tạo dự án thành công!');
      navigate('/projects');
    } catch (error) {
      console.error('Lỗi khi tạo dự án:', error);
      if (error.response) {
        alert(error.response.data.message || 'Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại!');
      } else if (error.request) {
        alert('Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối.');
      } else {
        alert('Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại!');
      }
    }
  };

  const handleCancel = () => {
    if (window.confirm('Bạn có chắc chắn muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
      navigate('/projects');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles && droppedFiles.length > 0) {
      setFormData(prev => {
        const existingFileKeys = new Set(prev.files.map(f => `${f.name}-${f.size}`));
        const uniqueNewFiles = droppedFiles.filter(file => {
          const fileKey = `${file.name}-${file.size}`;
          return !existingFileKeys.has(fileKey);
        });
        return {
          ...prev,
          files: [...prev.files, ...uniqueNewFiles]
        };
      });
    }
  };

  return (
    <div style={styles.pageWrapper}>
      <div style={styles.container}>
        <form onSubmit={handleSubmit}>
          <div style={styles.formRow}>
            <div style={styles.formGroup45}>
              <label htmlFor="name" style={styles.label}>Tên dự án <span style={styles.required}>*</span></label>
              <input 
                type="text" 
                id="name" 
                placeholder="Nhập tên dự án" 
                style={styles.input}
                value={formData.name}
                onChange={handleInputChange}
                required 
              />
            </div>

            <div style={styles.formGroup45}>
              <label htmlFor="handedOverTo" style={styles.label}>Người nhận bàn giao <span style={styles.required}>*</span></label>
              <div style={styles.inputWithNameWrapper}>
                <input 
                  type="text" 
                  id="handedOverTo" 
                  placeholder="Nhập ID người nhận bàn giao" 
                  style={{
                    ...styles.input,
                    paddingRight: (handedOverToDisplayName || handedOverToError) ? 120 : 16
                  }}
                  value={formData.handedOverTo}
                  onChange={handleInputChange}
                  required 
                />
                {handedOverToError ? (
                  <span style={styles.inlineErrorHint}>
                    {handedOverToError}
                  </span>
                ) : handedOverToDisplayName && (
                  <span style={styles.inlineNameHint}>
                    {handedOverToDisplayName}
                  </span>
                )}
              </div>
            </div>

            <div style={styles.formGroup10}>
              <label htmlFor="deadline" style={styles.label}>Hạn chót <span style={styles.required}>*</span></label>
              <input 
                type="date" 
                id="deadline" 
                style={styles.input}
                value={formData.deadline}
                onChange={handleInputChange}
                required 
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroupFullWidth}>
              <label htmlFor="description" style={styles.label}>Mô tả dự án <span style={styles.required}>*</span></label>
              <textarea
                id="description"
                placeholder="Mô tả dự án của bạn..."
                style={styles.textarea}
                rows="4"
                value={formData.description}
                onChange={handleInputChange}
                required
              ></textarea>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label htmlFor="pullRequest" style={styles.label}>Liên kết Pull Request</label>
              <input 
                type="text" 
                id="pullRequest" 
                placeholder="Nhập liên kết Pull Request" 
                style={styles.input}
                value={formData.pullRequest}
                onChange={handleInputChange}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="gitBranch" style={styles.label}>Branch Git</label>
              <input 
                type="text" 
                id="gitBranch" 
                placeholder="Nhập branch Git" 
                style={styles.input}
                value={formData.gitBranch}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div style={styles.fileUploadSection}>
            <label
              htmlFor="files"
              style={{
                ...styles.fileUploadBox,
                borderColor: isDragActive ? '#007bff' : '#ced4da',
                backgroundColor: isDragActive ? '#e3f2fd' : '#f8f9fa',
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                type="file"
                id="files"
                multiple
                onChange={handleFileChange}
                onClick={(event)=> { event.target.value = null }}
                style={{ display: 'none' }}
              />
              <span style={styles.uploadIcon}>☁️</span>
              <p style={styles.fileUploadText}>Kéo và thả file vào đây</p>
              <p style={styles.fileUploadSubText}>hoặc</p>
              <span style={styles.uploadButton}>Duyệt file</span>
            </label>

            <div style={styles.fileListContainer}>
              <h4 style={styles.fileListTitle}>File đã chọn ({formData.files.length})</h4>
              <div style={styles.fileList}>
                {formData.files.length > 0 ? (
                  formData.files.map((file, index) => (
                  <div key={index} style={styles.fileItem}>
                      <div style={styles.fileIcon}>📄</div>
                      <div style={styles.fileDetails}>
                      <span style={styles.fileName}>{file.name}</span>
                        <span style={styles.fileSize}>{formatFileSize(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={styles.removeFileButton}
                    >
                      ×
                    </button>
                  </div>
                  ))
                ) : (
                  <div style={styles.fileListPlaceholder}>
                    <p>Chưa có file nào được chọn</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={styles.buttonContainer}>
            <button type="button" style={styles.cancelButton} onClick={handleCancel}>Hủy</button>
            <button type="submit" style={styles.addButton}>+ Thêm mới</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles = {
  pageWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    padding: '40px 20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e9ecef',
    padding: '40px',
    width: '100%',
    maxWidth: '1200px',
  },
  formRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '25px',
    marginBottom: '30px',
  },
  formGroup: {
    flex: '1 1 calc(50% - 12.5px)',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
  },
  formGroupFullWidth: {
    flex: '1 1 100%',
    display: 'flex',
    flexDirection: 'column',
  },
  formGroup45: {
    flex: '1 1 300px',
    minWidth: '250px',
    display: 'flex',
    flexDirection: 'column',
  },
  formGroup10: {
    flex: '0 0 220px',
    minWidth: '220px',
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    color: '#495057',
    fontWeight: '500',
    marginBottom: '8px',
  },
  required: {
    color: '#dc3545',
    marginLeft: '3px',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #ced4da',
    fontSize: '15px',
    backgroundColor: '#fff',
    color: '#495057',
    width: '100%',
    boxSizing: 'border-box',
    transition: 'border-color .15s ease-in-out, box-shadow .15s ease-in-out',
  },
  textarea: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid #ced4da',
    fontSize: '15px',
    backgroundColor: '#fff',
    color: '#495057',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    transition: 'border-color .15s ease-in-out, box-shadow .15s ease-in-out',
  },
  fileUploadSection: {
    marginTop: '25px',
    marginBottom: '35px',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: '30px',
    alignItems: 'stretch',
    width: '100%',
  },
  fileUploadBox: {
    border: '2px dashed #ced4da',
    borderRadius: '12px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    flex: '1',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'border-color .2s, background-color .2s',
  },
  uploadIcon: {
    fontSize: '42px',
    color: '#007bff',
  },
  fileUploadText: {
    fontSize: '16px',
    color: '#343a40',
    margin: '15px 0 5px 0',
    fontWeight: 500,
  },
  fileUploadSubText: {
    fontSize: '14px',
    color: '#6c757d',
    margin: '0 0 15px 0',
  },
  uploadButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    borderRadius: '6px',
    padding: '8px 20px',
    fontWeight: '500',
    fontSize: '14px',
    border: 'none',
    display: 'inline-block',
    transition: 'background-color 0.2s',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    marginTop: '30px',
    borderTop: '1px solid #e9ecef',
    paddingTop: '30px',
  },
  cancelButton: {
    backgroundColor: '#f8f9fa',
    color: '#6c757d',
    padding: '12px 24px',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    transition: 'background-color 0.2s, border-color 0.2s',
  },
  addButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '12px 28px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '15px',
    boxShadow: '0 4px 12px rgba(0, 123, 255, 0.2)',
    transition: 'background-color 0.2s, box-shadow 0.2s',
  },
  fileListContainer: {
    flex: '1',
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
  },
  fileList: {
    border: '1px solid #e9ecef',
    borderRadius: '12px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    minHeight: '220px',
    maxHeight: '350px',
    overflowY: 'auto',
  },
  fileListTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    fontWeight: 600,
    color: '#343a40',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    marginBottom: '10px',
    border: '1px solid #e9ecef',
    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
  },
  fileIcon: {
    fontSize: '24px',
    marginRight: '12px',
  },
  fileDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  fileName: {
    fontSize: '15px',
    color: '#212529',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '260px',
    display: 'block',
  },
  fileSize: {
    fontSize: '13px',
    color: '#6c757d',
  },
  removeFileButton: {
    background: '#f1f3f5',
    border: 'none',
    color: '#868e96',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    lineHeight: '1',
    transition: 'background-color 0.2s, color 0.2s',
  },
  userNameDisplay: {
    fontSize: '14px',
    color: '#28a745',
    marginTop: '8px',
    fontWeight: '500',
  },
  errorMessage: {
    fontSize: '14px',
    color: '#dc3545',
    marginTop: '8px',
  },
  fileListPlaceholder: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#6c757d',
    fontSize: '15px',
  },
  inputWithNameWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inlineNameHint: {
    position: 'absolute',
    right: 16,
    color: '#218838',
    fontWeight: 600,
    fontSize: '15px',
    pointerEvents: 'none',
    background: '#fff',
    padding: '0 4px',
  },
  inlineErrorHint: {
    position: 'absolute',
    right: 16,
    color: '#dc3545',
    fontWeight: 600,
    fontSize: '15px',
    pointerEvents: 'none',
    background: '#fff',
    padding: '0 4px',
  },
};

export default NewProject;
