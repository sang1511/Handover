import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import UserService from '../api/services/user.service';

const NewProject = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    deadline: '',
    repoLink: '',
    gitBranch: '',
    handedOverTo: '',
    files: [],
    projectId: generateProjectId()
  });
  const [handedOverToDisplay, setHandedOverToDisplay] = useState('');
  const [handedOverToError, setHandedOverToError] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const debounceTimeoutRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    UserService.getAllUsers().then(users => setAllUsers(users)).catch(() => setAllUsers([]));
  }, []);

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
      setFormData(prev => ({ ...prev, handedOverTo: value }));
      setHandedOverToError('');
      setHandedOverToDisplay('');
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = setTimeout(() => {
        if (!value.trim()) {
          setFilteredUsers([]);
          setShowUserDropdown(false);
          return;
        }
        const lower = value.toLowerCase();
        const filtered = allUsers.filter(u =>
          (u.name && u.name.toLowerCase().includes(lower)) ||
          (u.email && u.email.toLowerCase().includes(lower)) ||
          (u.userID && u.userID.toLowerCase().includes(lower))
        );
        setFilteredUsers(filtered);
        setShowUserDropdown(true);
      }, 200);
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSelectUser = (user) => {
    setFormData(prev => ({ ...prev, handedOverTo: user.userID }));
    setHandedOverToDisplay(user.name + (user.email ? ` (${user.email})` : ''));
    setFilteredUsers([]);
    setShowUserDropdown(false);
    setHandedOverToError('');
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
    const selectedUser = allUsers.find(u => u.userID === formData.handedOverTo);
    if (!selectedUser) {
      setHandedOverToError('Vui lòng chọn đúng người nhận từ danh sách gợi ý.');
      return;
    }
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('projectId', formData.projectId);
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('deadline', formData.deadline);
      formDataToSend.append('handedOverTo', selectedUser.userID);
      if (formData.repoLink) {
        formDataToSend.append('repoLink', formData.repoLink);
      }
      if (formData.gitBranch) {
        formDataToSend.append('gitBranch', formData.gitBranch);
      }
      if (formData.files && formData.files.length > 0) {
        formData.files.forEach(file => {
          formDataToSend.append('files', file);
        });
      }
      await axiosInstance.post('/projects', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      alert('Tạo dự án thành công!');
      navigate('/projects');
    } catch (error) {
      if (error.response?.status === 401) {
        return;
      }
      console.error('Lỗi khi tạo dự án:', error);
      if (error.response) {
        alert(error.response.data.message || 'Có lỗi xảy ra khi tạo dự án. Vui lòng thử lại!');
      } else if (error.request) {
        alert('Không nhận được phản hồi từ máy chủ. Vui lòng thử lại!');
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
    <div className="newproject-page-wrapper" style={styles.pageWrapper}>
      <div className="newproject-container" style={styles.container}>
        <form onSubmit={handleSubmit}>
          <div className="newproject-grid2cols1row" style={styles.grid2Cols1Row}>
            {/* SectionBox trái: grid 4 hàng */}
            <div className="newproject-sectionboxgrid4rows" style={styles.sectionBoxGrid4Rows}>
              <div className="newproject-gridrowitem">
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
              <div style={{...styles.gridRowItem, gridRow: '2 / span 3', display: 'flex', flexDirection: 'column'}}>
                <label htmlFor="description" style={styles.label}>Mô tả dự án <span style={styles.required}>*</span></label>
                <textarea
                  id="description"
                  placeholder="Mô tả dự án của bạn..."
                  style={{...styles.textarea, minHeight: 180, height: '100%'}}
                  rows="8"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                ></textarea>
              </div>
            </div>
            {/* SectionBox phải: grid 4 hàng */}
            <div className="newproject-sectionboxgrid4rows" style={styles.sectionBoxGrid4Rows}>
              <div className="newproject-gridrowitem">
                <label htmlFor="handedOverTo" style={styles.label}>Người nhận bàn giao <span style={styles.required}>*</span></label>
                <div style={{...styles.inputWithNameWrapper, position: 'relative'}}>
                  <input 
                    type="text" 
                    id="handedOverTo" 
                    placeholder="Nhập ID, email hoặc tên người nhận bàn giao" 
                    style={{
                      ...styles.input,
                      paddingRight: handedOverToDisplay ? 120 : 16
                    }}
                    value={handedOverToDisplay || formData.handedOverTo}
                    onChange={e => {
                      setHandedOverToDisplay('');
                      handleInputChange(e);
                    }}
                    autoComplete="off"
                    required 
                    onBlur={() => setTimeout(() => setShowUserDropdown(false), 150)}
                    onFocus={() => { if (filteredUsers.length > 0) setShowUserDropdown(true); }}
                  />
                  {showUserDropdown && (
                    <div style={{
                      maxHeight: 180,
                      overflowY: 'auto',
                      background: '#fff',
                      border: '1px solid #e0e7ef',
                      borderRadius: 8,
                      boxShadow: '0 2px 8px #e0e7ef',
                      zIndex: 10,
                      position: 'absolute',
                      width: '100%',
                      left: 0,
                      top: '100%',
                      marginTop: 4,
                    }}>
                      {filteredUsers.length === 0 && (
                        <div style={{ padding: 10, color: '#888' }}>Không tìm thấy</div>
                      )}
                      {filteredUsers.map(u => (
                        <div
                          key={u._id}
                          style={{ padding: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseDown={e => { e.preventDefault(); handleSelectUser(u); }}
                        >
                          <span style={{ fontWeight: 600 }}>{u.name}</span>
                          <span style={{ color: '#888', fontSize: 13 }}>({u.userID || u.email || u._id})</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {handedOverToError && <span style={styles.inlineErrorHint}>{handedOverToError}</span>}
                </div>
              </div>
              <div className="newproject-gridrowitem">
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
              <div className="newproject-gridrowitem">
                <label htmlFor="repoLink" style={styles.label}>Liên kết Repository</label>
                <input 
                  type="text" 
                  id="repoLink" 
                  placeholder="Nhập liên kết Repository" 
                  style={styles.input}
                  value={formData.repoLink}
                  onChange={handleInputChange}
                />
              </div>
              <div className="newproject-gridrowitem">
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
          </div>

          {/* File upload section */}
          <div className="newproject-sectionbox newproject-fileuploadsection" style={{...styles.sectionBox, ...styles.fileUploadSection, marginTop: 32, marginBottom: 32}}>
            <label
              htmlFor="files"
              style={{
                ...styles.fileUploadBox,
                borderColor: isDragActive ? '#007bff' : '#e0e7ef',
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
            <div className="newproject-filelistcontainer" style={styles.fileListContainer}>
              <h4 className="newproject-filelisttitle" style={styles.fileListTitle}>File đã chọn ({formData.files.length})</h4>
              <div className="newproject-filelist" style={styles.fileList}>
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

          <div className="newproject-buttoncontainer" style={styles.buttonContainer}>
            <button type="button" className="newproject-cancelbutton" style={styles.cancelButton} onClick={handleCancel}>Hủy</button>
            <button type="submit" className="newproject-addbutton" style={styles.addButton}>+ Thêm mới</button>
          </div>
        </form>
      </div>
      <style>{responsiveStyle}</style>
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
    padding: '10px 20px',
    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 6px 24px rgba(0, 0, 0, 0.05)',
    border: '1px solid #e9ecef',
    padding: '40px',
    width: '100%',
    maxWidth: '1100px',
  },
  grid2Cols1Row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    marginBottom: '0',
    alignItems: 'stretch',
  },
  sectionBoxGrid4Rows: {
    background: '#fff',
    border: '1px solid #e0e7ef',
    borderRadius: '10px',
    padding: '32px 28px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    display: 'grid',
    gridTemplateRows: 'repeat(4, 1fr)',
    minHeight: 380,
    height: '100%',
    alignItems: 'start',
  },
  gridRowItem: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    height: '100%',
  },
  sectionBox: {
    background: '#fff',
    border: '1px solid #e0e7ef',
    borderRadius: '10px',
    padding: '24px',
    marginBottom: 0,
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    transition: 'box-shadow 0.2s, border-color 0.2s',
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
    transition: 'border-color .15s, box-shadow .15s',
    outline: 'none',
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
    transition: 'border-color .15s, box-shadow .15s',
    outline: 'none',
  },
  fileUploadSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    alignItems: 'flex-start',
    marginTop: '32px',
    marginBottom: '32px',
    background: '#fff',
    border: '1px solid #e0e7ef',
    borderRadius: '10px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    padding: '24px',
    transition: 'box-shadow 0.2s, border-color 0.2s',
  },
  fileUploadBox: {
    border: '2px dashed #e0e7ef',
    borderRadius: '10px',
    padding: '20px',
    backgroundColor: '#f8f9fa',
    textAlign: 'center',
    minWidth: '180px',
    height: '250px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'border-color 0.2s, background-color 0.2s, box-shadow 0.2s',
    outline: 'none',
  },
  uploadIcon: {
    fontSize: '38px',
    color: '#007bff',
    marginBottom: '8px',
  },
  fileUploadText: {
    fontSize: '15px',
    color: '#343a40',
    margin: '10px 0 2px 0',
    fontWeight: 500,
  },
  fileUploadSubText: {
    fontSize: '13px',
    color: '#6c757d',
    margin: '0 0 10px 0',
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
    cursor: 'pointer',
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
    minWidth: '180px',
    display: 'flex',
    flexDirection: 'column',
  },
  fileList: {
    border: '1px solid #e9ecef',
    borderRadius: '10px',
    padding: '10px',
    backgroundColor: '#f8f9fa',
    minHeight: '120px',
    maxHeight: '216px',
    overflowY: 'auto',
  },
  fileListTitle: {
    margin: '0 0 10px 0',
    fontSize: '16px',
    fontWeight: 600,
    color: '#343a40',
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 10px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    marginBottom: '8px',
    border: '1px solid #e9ecef',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  },
  fileIcon: {
    fontSize: '20px',
    marginRight: '10px',
  },
  fileDetails: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  fileName: {
    fontSize: '14px',
    color: '#212529',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '180px',
    display: 'block',
  },
  fileSize: {
    fontSize: '12px',
    color: '#6c757d',
  },
  removeFileButton: {
    background: '#f1f3f5',
    border: 'none',
    color: '#868e96',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
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
    fontSize: '14px',
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
    fontSize: '14px',
    pointerEvents: 'none',
    background: '#fff',
    padding: '0 4px',
  },
  inlineErrorHint: {
    position: 'absolute',
    right: 16,
    color: '#dc3545',
    fontWeight: 600,
    fontSize: '14px',
    pointerEvents: 'none',
    background: '#fff',
    padding: '0 4px',
  },
  flexCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
  },
};

// Responsive styles for mobile
const responsiveStyle = `
@media (max-width: 768px) {
  .newproject-page-wrapper {
    padding: 4px 2px !important;
  }
  .newproject-container {
    padding: 16px !important;
    max-width: 100vw !important;
    min-width: 0 !important;
  }
  .newproject-grid2cols1row {
    grid-template-columns: 1fr !important;
    gap: 16px !important;
  }
  .newproject-sectionboxgrid4rows {
    padding: 16px 8px !important;
    min-height: unset !important;
  }
  .newproject-sectionbox {
    padding: 12px !important;
  }
  .newproject-fileuploadsection {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    padding: 12px !important;
  }
  .newproject-filelist {
    min-height: 60px !important;
    max-height: 120px !important;
    font-size: 13px !important;
  }
  .newproject-buttoncontainer {
    flex-direction: column !important;
    gap: 8px !important;
    align-items: stretch !important;
    padding-top: 16px !important;
  }
  .newproject-addbutton, .newproject-cancelbutton {
    width: 100% !important;
    font-size: 14px !important;
    padding: 10px 0 !important;
  }
  .newproject-label, .newproject-filelisttitle {
    font-size: 13px !important;
  }
  .newproject-input, .newproject-textarea {
    font-size: 14px !important;
    padding: 8px 10px !important;
  }
}
`;

export default NewProject;
