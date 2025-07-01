import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Box } from '@mui/material';
import axios from 'axios';

const NewTaskPopup = ({ isOpen, onClose, sprintId, onTaskAdded }) => {
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
    assigner: '', assignerName: '', assignerError: '',
    assignee: '', assigneeName: '', assigneeError: '',
    receiver: '', receiverName: '', receiverError: '',
    reviewer: '', reviewerName: '', reviewerError: '',
    taskId: generateTaskId()
  }]);

  const debounceTimeoutRef = useRef({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setTasks([{
      name: '',
      request: '',
      assigner: '', assignerName: '', assignerError: '',
      assignee: '', assigneeName: '', assigneeError: '',
      receiver: '', receiverName: '', receiverError: '',
      reviewer: '', reviewerName: '', reviewerError: '',
      taskId: generateTaskId()
    }]);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);
  
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
      const response = await axios.get(`http://localhost:5000/api/users/check-id/${id}`, {
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
        alert('Vui lòng đăng nhập để tiếp tục.');
        return;
      }
      
      const validTasks = tasks.filter(task => task.name && task.request);
      if (validTasks.length === 0) {
          alert('Vui lòng điền thông tin cho ít nhất một task hợp lệ (yêu cầu có Tên và Yêu cầu Task).');
          return;
      }
      
      const tasksPayload = validTasks.map(task => ({
        taskId: task.taskId,
        name: task.name,
        request: task.request,
        assigner: task.assigner,
        assignee: task.assignee,
        reviewer: task.reviewer,
        receiver: task.receiver,
      }));

      await axios.post(
        `http://localhost:5000/api/sprints/${sprintId}/tasks/bulk`,
        { tasks: tasksPayload },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      onTaskAdded();
      onClose();
    } catch (error) {
      alert('Có lỗi xảy ra khi thêm task. ' + (error.response?.data?.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="new-task-modal-title"
    >
      <Box sx={styles.modalContainer}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle} id="new-task-modal-title">Thêm Task Mới</h2>
          <button 
            onClick={onClose} 
            style={styles.closeButton}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#e9ecef'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f3f5'}
          >&times;</button>
        </div>
        <div style={styles.modalBody}>
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
              <div style={styles.taskBodyContent}>
                <div style={{...styles.formGroup, marginBottom: '20px'}}>
                  <label style={styles.label}>Tên Task</label>
                  <input
                    type="text"
                    style={styles.input}
                    placeholder="Tên công việc cụ thể"
                    value={task.name}
                    onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                  />
                </div>
                <div style={{...styles.formGroup, marginBottom: '20px'}}>
                  <label style={styles.label}>Yêu cầu Task</label>
                  <textarea
                    style={styles.textarea}
                    placeholder="Mô tả chi tiết yêu cầu của công việc"
                    value={task.request}
                    onChange={(e) => handleTaskChange(index, 'request', e.target.value)}
                    rows={3}
                  ></textarea>
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
            style={styles.createTaskButton}
            disabled={isSubmitting}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#218838'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#28A745'}
          >
            {isSubmitting ? `Đang thêm...` : `Thêm ${tasks.length > 1 ? `${tasks.length} Task` : 'Task'}`}
          </button>
        </div>
      </Box>
    </Modal>
  );
};

const styles = {
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '850px',
    maxHeight: '90vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 30px',
    borderBottom: '1px solid #e9ecef',
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
    background: '#f8f9fa',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
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
  modalFooter: {
    padding: '20px 30px',
    borderTop: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'flex-end',
    backgroundColor: '#fff',
  },
  createTaskButton: {
    backgroundColor: '#28A745',
    color: '#fff',
    padding: '14px 30px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1.05em',
    fontWeight: 'bold',
    transition: 'background-color 0.2s',
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
  addTaskButton: {
    backgroundColor: 'transparent',
    color: '#007BFF',
    padding: '10px 20px',
    border: '2px dashed #007BFF',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 600,
    margin: '20px 0 10px 0',
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
  taskBodyContent: {
    padding: '20px',
  },
};

export default NewTaskPopup; 