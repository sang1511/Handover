import React, { useState, useRef } from 'react';
import { Modal, Box } from '@mui/material';
import axiosInstance from '../../api/axios';

const NewSprintPopup = ({ isOpen, onClose, projectId, onSprintCreated }) => {
  const [sprintName, setSprintName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gitBranch, setGitBranch] = useState('');
  const [repoLink, setRepoLink] = useState('');
  const [associatedFiles, setAssociatedFiles] = useState([]);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const debounceTimeoutRef = useRef({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateTaskId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const generateUniqueTaskId = (currentTasks) => {
    const existingTaskIds = new Set(currentTasks.map(t => t.taskId));
    let newId;
    do {
      newId = generateTaskId();
    } while (existingTaskIds.has(newId));
    return newId;
  };

  const [tasks, setTasks] = useState([{
    name: '',
    request: '',
    assigner: '',
    assignerName: '',
    assignerError: '',
    assignee: '',
    assigneeName: '',
    assigneeError: '',
    receiver: '',
    receiverName: '',
    receiverError: '',
    reviewer: '',
    reviewerName: '',
    reviewerError: '',
    taskId: generateTaskId()
  }]);

  const handleFileChange = (e) => {
    setAssociatedFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files)]);
    setFileInputKey(Date.now()); 
  };

  const handleRemoveFile = (fileToRemove) => {
    setAssociatedFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
  };

  const handleAddTask = () => {
    setTasks([...tasks, {
      name: '',
      request: '',
      assigner: '',
      assignerName: '',
      assignerError: '',
      assignee: '',
      assigneeName: '',
      assigneeError: '',
      receiver: '',
      receiverName: '',
      receiverError: '',
      reviewer: '',
      reviewerName: '',
      reviewerError: '',
      taskId: generateUniqueTaskId(tasks)
    }]);
  };

  const handleRemoveTask = (index) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const checkUserId = async (id, index, field) => {
    if (!id) {
      const newTasks = [...tasks];
      if (!newTasks[index]) return;
      newTasks[index][`${field}Name`] = '';
      newTasks[index][`${field}Error`] = '';
      setTasks(newTasks);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await axiosInstance.get(`/users/check-id/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const newTasks = [...tasks];
      if (!newTasks[index]) return;
      if (response.data.name) {
        newTasks[index][`${field}Name`] = response.data.name;
        newTasks[index][`${field}Error`] = '';
      } else {
        newTasks[index][`${field}Name`] = '';
        newTasks[index][`${field}Error`] = 'Không tìm thấy';
      }
      setTasks(newTasks);
    } catch (error) {
      const newTasks = [...tasks];
      if (!newTasks[index]) return;
      newTasks[index][`${field}Name`] = '';
      newTasks[index][`${field}Error`] = 'Không tồn tại';
      setTasks(newTasks);
    }
  };

  const handleTaskChange = (index, field, value) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;

    if (['assigner', 'assignee', 'receiver', 'reviewer'].includes(field)) {
      newTasks[index][`${field}Name`] = '';
      newTasks[index][`${field}Error`] = '';
      
      const timeoutKey = `${index}-${field}`;
      if (debounceTimeoutRef.current[timeoutKey]) {
        clearTimeout(debounceTimeoutRef.current[timeoutKey]);
      }
      debounceTimeoutRef.current[timeoutKey] = setTimeout(() => {
        checkUserId(value, index, field);
      }, 500);
    }
    
    setTasks(newTasks);
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found.');
        return;
      }

      const sprintData = {
        name: sprintName,
        goal: goal,
        startDate,
        endDate,
        gitBranch,
        repoLink,
        tasks: tasks.filter(task => task.name && task.request).map(task => {
          const newTask = { ...task };
          if (!newTask.assigner) delete newTask.assigner;
          if (!newTask.assignee) delete newTask.assignee;
          if (!newTask.receiver) delete newTask.receiver;
          if (!newTask.reviewer) delete newTask.reviewer;
          return newTask;
        }),
        project: projectId,
      };

      const formData = new FormData();
      for (const key in sprintData) {
        if (key === 'tasks') {
          formData.append(key, JSON.stringify(sprintData[key]));
        } else {
          formData.append(key, sprintData[key]);
        }
      }
      
      // Only append files if there are actual files selected
      if (associatedFiles.length > 0) {
        associatedFiles.forEach((file) => {
          formData.append('deliverables', file);
        });
      }

      await axiosInstance.post('/sprints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      onClose(); 
      onSprintCreated(); 
      // TODO: Optionally, refresh the sprint list in ProjectDetail.js

      // Reset form fields after successful submission
      setSprintName('');
      setGoal('');
      setStartDate('');
      setEndDate('');
      setGitBranch('');
      setRepoLink('');
      setAssociatedFiles([]);
      setTasks([{ 
        name: '',
        request: '',
        assigner: '',
        assignerName: '',
        assignerError: '',
        assignee: '',
        assigneeName: '',
        assigneeError: '',
        receiver: '',
        receiverName: '',
        receiverError: '',
        reviewer: '',
        reviewerName: '',
        reviewerError: '',
        taskId: generateTaskId()
      }]);

    } catch (error) {
      if (error.response?.status === 401) {
        // Không hiện lỗi ra UI, chỉ log hoặc bỏ qua
        return;
      }
      console.error('Error creating sprint:', error.response ? error.response.data : error.message);
      alert('Có lỗi xảy ra khi tạo sprint.' + (error.response?.data?.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="new-sprint-modal-title"
      sx={{ ...styles.modalOverlay }}
    >
      <Box sx={styles.modalContainer}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle} id="new-sprint-modal-title">Tạo Sprint Mới</h2>
          <button 
            onClick={onClose} 
            style={styles.closeButton}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#e9ecef'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f3f5'}
          >&times;</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.formGrid}>
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.label}>Tên Sprint</label>
              <input
                type="text"
                style={styles.input}
                placeholder="VD: Sprint 1 - Tích hợp thanh toán"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
              />
            </div>
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.label}>Mục tiêu Sprint</label>
              <textarea
                style={styles.textarea}
                placeholder="Mô tả ngắn gọn mục tiêu cần đạt được trong Sprint này"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
              ></textarea>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Thời gian bắt đầu</label>
              <input
                type="date"
                style={styles.input}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Thời gian kết thúc</label>
              <input
                type="date"
                style={styles.input}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Git Branch</label>
              <input
                type="text"
                style={styles.input}
                placeholder="VD: feature/sprint-1-payment"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Link Repository</label>
              <input
                type="text"
                style={styles.input}
                placeholder="URL của Repository"
                value={repoLink}
                onChange={(e) => setRepoLink(e.target.value)}
              />
            </div>
            <div style={{...styles.formGroup, gridColumn: '1 / -1'}}>
              <label style={styles.label}>Tài liệu liên quan</label>
              <div style={styles.fileInputContainer}>
                <label htmlFor="file-upload" style={styles.fileUploadButton}>
                  <img src="https://img.icons8.com/ios-glyphs/20/ffffff/upload--v1.png" alt="upload" style={{ marginRight: 8 }}/>
                  Chọn tệp...
                </label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  key={fileInputKey}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </div>
              <div style={styles.filePreviewList}>
                {associatedFiles.length > 0 ? (
                  associatedFiles.map((file, index) => (
                    <div key={file.name + index} style={styles.filePreviewItem}>
                      <span style={styles.filePreviewName} title={file.name}>{file.name}</span>
                      <button onClick={() => handleRemoveFile(file)} style={styles.fileRemoveButton}>&times;</button>
                    </div>
                  ))
                ) : (
                  <div style={styles.emptyFilePreview}>
                    <span>Chưa có tệp nào được chọn.</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <h3 style={styles.sectionTitle}>Danh sách Task</h3>
          
          {tasks.map((task, index) => (
            <div key={index} style={styles.taskCard}>
              <div style={styles.taskHeader}>
                <span style={styles.taskNumber}>Task #{task.taskId}</span>
                {tasks.length > 1 && (
                  <button onClick={() => handleRemoveTask(index)} style={styles.removeTaskButton}>
                    <img src="https://img.icons8.com/ios-glyphs/20/d9480f/trash.png" alt="remove task"/>
                  </button>
                )}
              </div>
              <div style={styles.taskBody}>
                <div style={{...styles.formGrid, gridTemplateColumns: '1fr'}}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Tên Task</label>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="Tên công việc cụ thể"
                      value={task.name}
                      onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                    />
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Yêu cầu Task</label>
                    <textarea
                      style={styles.textarea}
                      placeholder="Mô tả chi tiết yêu cầu của công việc"
                      value={task.request}
                      onChange={(e) => handleTaskChange(index, 'request', e.target.value)}
                      rows={3}
                    ></textarea>
                  </div>
                </div>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Người giao</label>
                    <div style={styles.inputWithNameWrapper}>
                      <input
                        type="text"
                        style={{...styles.input, paddingRight: (task.assignerName || task.assignerError) ? '120px' : '16px'}}
                        placeholder="ID người giao"
                        value={task.assigner}
                        onChange={(e) => handleTaskChange(index, 'assigner', e.target.value)}
                      />
                      {task.assignerError ? ( <span style={styles.inlineErrorHint}>{task.assignerError}</span> ) 
                      : task.assignerName && ( <span style={styles.inlineNameHint}>{task.assignerName}</span> )}
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Người thực hiện</label>
                    <div style={styles.inputWithNameWrapper}>
                      <input
                        type="text"
                        style={{...styles.input, paddingRight: (task.assigneeName || task.assigneeError) ? '120px' : '16px'}}
                        placeholder="ID người thực hiện"
                        value={task.assignee}
                        onChange={(e) => handleTaskChange(index, 'assignee', e.target.value)}
                      />
                      {task.assigneeError ? ( <span style={styles.inlineErrorHint}>{task.assigneeError}</span> ) 
                      : task.assigneeName && ( <span style={styles.inlineNameHint}>{task.assigneeName}</span> )}
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Người nhận</label>
                    <div style={styles.inputWithNameWrapper}>
                      <input
                        type="text"
                        style={{...styles.input, paddingRight: (task.receiverName || task.receiverError) ? '120px' : '16px'}}
                        placeholder="ID người nhận"
                        value={task.receiver}
                        onChange={(e) => handleTaskChange(index, 'receiver', e.target.value)}
                      />
                      {task.receiverError ? ( <span style={styles.inlineErrorHint}>{task.receiverError}</span> ) 
                      : task.receiverName && ( <span style={styles.inlineNameHint}>{task.receiverName}</span> )}
                    </div>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Người đánh giá</label>
                    <div style={styles.inputWithNameWrapper}>
                      <input
                        type="text"
                        style={{...styles.input, paddingRight: (task.reviewerName || task.reviewerError) ? '120px' : '16px'}}
                        placeholder="ID người đánh giá"
                        value={task.reviewer}
                        onChange={(e) => handleTaskChange(index, 'reviewer', e.target.value)}
                      />
                      {task.reviewerError ? ( <span style={styles.inlineErrorHint}>{task.reviewerError}</span> ) 
                      : task.reviewerName && ( <span style={styles.inlineNameHint}>{task.reviewerName}</span> )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button 
            onClick={handleAddTask} 
            style={styles.addTaskButton}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e6f2ff'; e.currentTarget.style.borderColor = '#0056b3';}}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#007BFF';}}
          >+ Thêm Task</button>

        </div>
        <div style={styles.modalFooter}>
          <button 
            onClick={handleSubmit} 
            style={styles.createSprintButton}
            disabled={isSubmitting}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#d32f2f'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#e53935'}
          >
            {isSubmitting ? 'Đang tạo...' : 'Tạo Sprint'}
          </button>
        </div>
      </Box>
    </Modal>
  );
};

const styles = {
  modalOverlay: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1300,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '950px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 30px',
    borderBottom: '1px solid #e9ecef',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: '1.75em',
    fontWeight: 700,
    color: '#212529',
    margin: 0,
  },
  closeButton: {
    background: '#f1f3f5',
    border: 'none',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5em',
    cursor: 'pointer',
    color: '#868e96',
    transition: 'all 0.2s ease',
  },
  modalBody: {
    padding: '24px 30px',
    overflowY: 'auto',
    flexGrow: 1,
    background: '#f8f9fa',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '8px',
    fontWeight: 600,
    color: '#495057',
    fontSize: '0.9em',
  },
  input: {
    padding: '12px 16px',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    fontSize: '1em',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '12px 16px',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    fontSize: '1em',
    minHeight: '80px',
    resize: 'vertical',
    fontFamily: 'inherit',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
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
  fileInputContainer: {
    display: 'flex',
  },
  fileUploadButton: {
    backgroundColor: '#007BFF',
    color: '#fff',
    padding: '12px 20px',
    cursor: 'pointer',
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    fontWeight: 600,
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
  },
  filePreviewList: {
    marginTop: '12px',
    maxHeight: '120px',
    overflowY: 'auto',
    padding: '8px',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1px dashed #ced4da',
    minHeight: '60px',
    display: 'flex',
    flexDirection: 'column',
  },
  emptyFilePreview: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
    flexGrow: 1,
    color: '#868e96',
    fontSize: '0.9em',
  },
  filePreviewItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    background: '#fff',
    borderRadius: '6px',
    marginBottom: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  filePreviewName: {
    fontSize: '0.9em',
    color: '#495057',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginRight: '10px',
  },
  fileRemoveButton: {
    background: 'transparent',
    border: 'none',
    color: '#adb5bd',
    fontSize: '1.4em',
    cursor: 'pointer',
    padding: '0 4px',
    marginLeft: '12px',
    lineHeight: 1,
    transition: 'color 0.2s',
  },
  sectionTitle: {
    fontSize: '1.4em',
    fontWeight: 700,
    color: '#343a40',
    paddingBottom: '12px',
    borderBottom: '1px solid #dee2e6',
    marginBottom: '20px',
    marginTop: '30px',
  },
  addTaskButton: {
    backgroundColor: 'transparent',
    color: '#007BFF',
    padding: '10px 20px',
    border: '2px dashed #007BFF',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 600,
    margin: '10px 0 20px 0',
    display: 'block',
    width: '100%',
    transition: 'all 0.2s',
  },
  taskCard: {
    border: '1px solid #dee2e6',
    borderRadius: '12px',
    marginBottom: '24px',
    backgroundColor: '#fff',
    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: '#f1f3f5',
    borderBottom: '1px solid #dee2e6',
  },
  taskNumber: {
    fontWeight: 700,
    fontSize: '1.1em',
    color: '#495057',
  },
  removeTaskButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '5px',
  },
  taskBody: {
    padding: '20px',
  },
  modalFooter: {
    padding: '20px 30px',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  createSprintButton: {
    backgroundColor: '#DC3545',
    color: '#fff',
    padding: '14px 30px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1.05em',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
  },
};

export default NewSprintPopup; 