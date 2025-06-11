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
        // Lỗi từ server
        setHandedOverToError(error.response.data.message || 'Không thể kiểm tra người dùng. Vui lòng thử lại.');
      } else if (error.request) {
        // Không nhận được response
        setHandedOverToError('Không thể kết nối đến server. Vui lòng kiểm tra lại kết nối.');
      } else {
        // Lỗi khác
        setHandedOverToError('Có lỗi xảy ra. Vui lòng thử lại.');
      }
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...files]
    }));
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

      const response = await axios.post('/projects', formDataToSend, {
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
              <input 
                type="text" 
                id="handedOverTo" 
                placeholder="Nhập ID người nhận bàn giao" 
                style={styles.input}
                value={formData.handedOverTo}
                onChange={handleInputChange}
                required 
              />
              {handedOverToDisplayName && <p style={styles.userNameDisplay}>Tên: {handedOverToDisplayName}</p>}
              {handedOverToError && <p style={styles.errorMessage}>{handedOverToError}</p>}
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
            <div style={styles.fileUploadBox}>
              <span style={styles.cloudIcon}>☁️</span>
              <p style={styles.fileUploadText}>Chọn file tài liệu đính kèm</p>
              <input
                type="file"
                id="files"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <label htmlFor="files" style={styles.browseButton}>
                Chọn File
              </label>
            </div>

            {formData.files.length > 0 && (
              <div style={styles.fileList}>
                <h4 style={styles.fileListTitle}>Danh sách file đã chọn:</h4>
                {formData.files.map((file, index) => (
                  <div key={index} style={styles.fileItem}>
                    <div style={styles.fileInfo}>
                      <span style={styles.fileName}>{file.name}</span>
                      <span style={styles.fileSize}>({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      style={styles.removeFileButton}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
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
    backgroundColor: '#f4f6f8',
    minHeight: '90vh',
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    padding: '35px',
    margin: '0px 4%',
    width: '100%',
    maxWidth: '1100px',
  },
  formRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    marginBottom: '25px',
  },
  formGroup: {
    flex: '1',
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
    fontSize: '15px',
    color: '#444',
    fontWeight: '600',
    marginBottom: '8px',
  },
  required: {
    color: '#e53e3e',
    marginLeft: '4px',
  },
  input: {
    padding: '12px 15px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '15px',
    backgroundColor: '#fff',
    color: '#333',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '12px 15px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '15px',
    backgroundColor: '#fff',
    color: '#333',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  fileUploadSection: {
    marginTop: '20px',
    marginBottom: '30px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  fileUploadBox: {
    border: '2px dashed #bbb',
    borderRadius: '10px',
    padding: '10px 50px',
    backgroundColor: '#fafafa',
    textAlign: 'center',
    width: '100%',
    maxWidth: '480px',
  },
  cloudIcon: {
    fontSize: '36px',
    color: '#aaa',
    marginBottom: '15px',
  },
  fileUploadText: {
    fontSize: '16px',
    color: '#666',
    marginBottom: '15px',
  },
  browseButton: {
    backgroundColor: '#f7f7f7',
    border: '1px solid #ccc',
    borderRadius: '5px',
    padding: '10px 20px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '15px',
    marginTop: '20px',
  },
  cancelButton: {
    backgroundColor: '#6c757d',
    color: '#fff',
    padding: '12px 20px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
  },
  addButton: {
    backgroundColor: '#e53e3e',
    color: '#fff',
    padding: '12px 25px',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '15px',
  },
  fileList: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    width: '100%',
    maxWidth: '480px',
  },
  fileListTitle: {
    margin: '0 0 10px 0',
    fontSize: '16px',
    color: '#495057',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#fff',
    borderRadius: '4px',
    marginBottom: '8px',
    border: '1px solid #dee2e6',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  fileName: {
    fontSize: '14px',
    color: '#212529',
  },
  fileSize: {
    fontSize: '12px',
    color: '#6c757d',
  },
  removeFileButton: {
    background: 'none',
    border: 'none',
    color: '#dc3545',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '0 5px',
    lineHeight: '1',
    '&:hover': {
      color: '#c82333',
    },
  },
  userNameDisplay: {
    fontSize: '14px',
    color: '#28a745',
    marginTop: '5px',
    fontWeight: 'bold',
  },
  errorMessage: {
    fontSize: '14px',
    color: '#dc3545',
    marginTop: '5px',
  },
};

export default NewProject;
