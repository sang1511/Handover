import React, { useState } from 'react';
import { Modal, Box } from '@mui/material';
import axios from 'axios';

const NewSprintPopup = ({ isOpen, onClose, projectId, onSprintCreated }) => {
  const [sprintName, setSprintName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gitBranch, setGitBranch] = useState('');
  const [pullRequest, setPullRequest] = useState('');
  const [associatedFiles, setAssociatedFiles] = useState([]);

  // Helper to generate a short task ID
  const generateShortTaskId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const [tasks, setTasks] = useState([{
    name: '',
    request: '',
    assigner: '',
    assignee: '',
    receiver: '',
    reviewer: '',
    taskId: generateShortTaskId()
  }]);

  const handleFileChange = (e) => {
    setAssociatedFiles([...associatedFiles, ...e.target.files]);
  };

  const handleAddTask = () => {
    setTasks([...tasks, {
      name: '',
      request: '',
      assigner: '',
      assignee: '',
      receiver: '',
      reviewer: '',
      taskId: generateShortTaskId()
    }]);
  };

  const handleRemoveTask = (index) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  const handleTaskChange = (index, field, value) => {
    const newTasks = [...tasks];
    newTasks[index][field] = value;
    setTasks(newTasks);
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Handle case where token is missing, e.g., redirect to login
        console.error('No authentication token found.');
        return;
      }

      const sprintData = {
        name: sprintName,
        goal: goal,
        startDate,
        endDate,
        gitBranch,
        pullRequest,
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

      // For file uploads, we need to use FormData
      const formData = new FormData();
      for (const key in sprintData) {
        if (key === 'tasks') {
          formData.append(key, JSON.stringify(sprintData[key]));
        } else {
          formData.append(key, sprintData[key]);
        }
      }
      associatedFiles.forEach((file) => {
        formData.append('deliverables', file);
      });

      const response = await axios.post('http://localhost:5000/api/sprints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
      });

      onClose(); // Close the popup on successful submission
      onSprintCreated(); // Refresh the sprints list
      // TODO: Optionally, refresh the sprint list in ProjectDetail.js

      // Reset form fields after successful submission
      setSprintName('');
      setGoal('');
      setStartDate('');
      setEndDate('');
      setGitBranch('');
      setPullRequest('');
      setAssociatedFiles([]);
      setTasks([{ 
        name: '',
        request: '',
        assigner: '',
        assignee: '',
        receiver: '',
        reviewer: '',
        taskId: generateShortTaskId()
      }]);

    } catch (error) {
      console.error('Error creating sprint:', error.response ? error.response.data : error.message);
      alert('Có lỗi xảy ra khi tạo sprint.' + (error.response?.data?.message || ''));
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="new-sprint-modal-title"
      aria-describedby="new-sprint-modal-description"
      sx={{ ...styles.modalOverlay, zIndex: 9999 }}
    >
      <Box sx={styles.modalContainer}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle} id="new-sprint-modal-title">Tạo Sprint Mới</h2>
          <button onClick={onClose} style={styles.closeButton}>&times;</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tên Sprint</label>
              <input
                type="text"
                style={styles.input}
                placeholder="VD: Sprint 1"
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Mục tiêu Sprint</label>
              <textarea
                style={styles.textarea}
                placeholder="Mục tiêu của Sprint này"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              ></textarea>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tài liệu liên quan</label>
              <div style={styles.fileInputContainer}>
                <label htmlFor="file-upload" style={styles.fileUploadButton}>Chọn tệp</label>
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <div style={styles.fileNameDisplay}>
                  {associatedFiles.length > 0 ? 
                    associatedFiles.map((file, index) => {
                      const fileName = file.name;
                      const maxLength = 20; // Define your desired max length
                      let displayedFileName = fileName;
                      if (fileName.length > maxLength) {
                        const lastDotIndex = fileName.lastIndexOf('.');
                        if (lastDotIndex !== -1 && lastDotIndex > fileName.length - 8) { // Preserve up to 7 chars for extension
                          displayedFileName = fileName.substring(0, maxLength - 4) + '...' + fileName.substring(lastDotIndex);
                        } else {
                          displayedFileName = fileName.substring(0, maxLength - 3) + '...';
                        }
                      }
                      return (
                        <div key={file.name + index}>{displayedFileName}</div>
                      );
                    }) : (
                    <div>Không có tệp nào được chọn</div>
                  )}
                </div>
              </div>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Thời gian bắt đầu</label>
              <input
                type="date"
                style={styles.input}
                placeholder="dd/mm/yyyy"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Thời gian kết thúc</label>
              <input
                type="date"
                style={styles.input}
                placeholder="dd/mm/yyyy"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Git Branch</label>
              <input
                type="text"
                style={styles.input}
                placeholder="VD: feature/sprint-1"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Pull Request</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Link PR"
                value={pullRequest}
                onChange={(e) => setPullRequest(e.target.value)}
              />
            </div>
          </div>

          <h3 style={styles.sectionTitle}>Danh sách Task</h3>
          <button onClick={handleAddTask} style={styles.addTaskButton}>+ Thêm Task</button>

          {tasks.map((task, index) => (
            <div key={index} style={styles.taskCard}>
              <div style={styles.taskHeader}>
                <span style={styles.taskNumber}>Task {index + 1}</span>
                <button onClick={() => handleRemoveTask(index)} style={styles.removeTaskButton}>
                  <img src="https://img.icons8.com/ios-filled/20/DC3545/trash.png" alt="remove task"/>
                </button>
              </div>
              <div style={styles.formGrid}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tên Task</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Tên task"
                    value={task.name}
                    onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Yêu cầu Task</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Chi tiết yêu cầu"
                    value={task.request}
                    onChange={(e) => handleTaskChange(index, 'request', e.target.value)}
                  ></textarea>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Người giao</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="ID người giao"
                    value={task.assigner}
                    onChange={(e) => handleTaskChange(index, 'assigner', e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Người thực hiện</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="ID người thực hiện"
                    value={task.assignee}
                    onChange={(e) => handleTaskChange(index, 'assignee', e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Người nhận</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="ID người nhận"
                    value={task.receiver}
                    onChange={(e) => handleTaskChange(index, 'receiver', e.target.value)}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Người đánh giá</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="ID người đánh giá"
                    value={task.reviewer}
                    onChange={(e) => handleTaskChange(index, 'reviewer', e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

        </div>
        <div style={styles.modalFooter}>
          <button onClick={handleSubmit} style={styles.createSprintButton}>Tạo Sprint</button>
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
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: '10px',
    width: '90%',
    maxWidth: '900px',
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
    // Material-UI Modal handles z-index, so we can remove it here
    // zIndex: 1300,
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #eee',
  },
  modalTitle: {
    fontSize: '1.8em',
    fontWeight: 'bold',
    color: '#333',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '2em',
    cursor: 'pointer',
    color: '#777',
  },
  modalBody: {
    padding: '20px',
    flexGrow: 1,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '8px',
    fontWeight: 'bold',
    color: '#555',
    fontSize: '0.95em',
  },
  input: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '1em',
  },
  textarea: {
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '1em',
    minHeight: '80px',
    resize: 'vertical',
  },
  fileInputContainer: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #ddd',
    borderRadius: '5px',
    overflow: 'hidden',
  },
  fileUploadButton: {
    backgroundColor: '#007BFF',
    color: '#fff',
    padding: '10px 15px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    borderRight: '1px solid #0056b3',
  },
  fileNameDisplay: {
    padding: '10px',
    flexGrow: 1,
    color: '#555',
  },
  sectionTitle: {
    fontSize: '1.5em',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '15px',
    marginTop: '25px',
  },
  addTaskButton: {
    backgroundColor: '#28A745',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
    marginBottom: '20px',
  },
  taskCard: {
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    backgroundColor: '#fdfdfd',
    boxShadow: '0 2px 5px rgba(0,0,0,0.03)',
  },
  taskHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    paddingBottom: '10px',
    borderBottom: '1px dashed #eee',
  },
  taskNumber: {
    fontWeight: 'bold',
    fontSize: '1.1em',
    color: '#555',
  },
  removeTaskButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '5px',
  },
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid #eee',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  createSprintButton: {
    backgroundColor: '#343A40',
    color: '#fff',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1.1em',
    fontWeight: 'bold',
  },
};

export default NewSprintPopup; 