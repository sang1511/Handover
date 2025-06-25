import React, { useState, useEffect } from 'react';
import { Modal, Box } from '@mui/material';
import axios from 'axios';

const NewTaskPopup = ({ isOpen, onClose, sprintId, onTaskAdded }) => {
  const [taskName, setTaskName] = useState('');
  const [request, setRequest] = useState('');
  const [assigner, setAssigner] = useState('');
  const [assignee, setAssignee] = useState('');
  const [reviewer, setReviewer] = useState('');
  const [receiver, setReceiver] = useState('');
  const [status, setStatus] = useState('Chưa làm');
  const [reviewResult, setReviewResult] = useState('Chưa duyệt');

  // Helper to generate a short task ID
  const generateShortTaskId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const resetForm = () => {
    setTaskName('');
    setRequest('');
    setAssigner('');
    setAssignee('');
    setReviewer('');
    setReceiver('');
    setStatus('Chưa làm');
    setReviewResult('Chưa duyệt');
  };

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vui lòng đăng nhập để tiếp tục.');
        return;
      }

      const taskData = {
        taskId: generateShortTaskId(),
        name: taskName,
        request: request,
        assigner: assigner, // This will be userID string from input
        assignee: assignee,
        reviewer: reviewer,
        receiver: receiver,
        status: status,
        reviewResult: reviewResult,
      };

      const response = await axios.post(
        `http://localhost:5000/api/sprints/${sprintId}/tasks`,
        taskData,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      onTaskAdded(); // Call the refresh function
      onClose(); // Close the popup
    } catch (error) {
      alert('Có lỗi xảy ra khi thêm task.' + (error.response?.data?.message || ''));
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      aria-labelledby="new-task-modal-title"
      aria-describedby="new-task-modal-description"
    >
      <Box sx={modalContentStyle}>
        <div style={styles.modalHeader}>
          <h2 style={styles.modalTitle} id="new-task-modal-title">Thêm Task Mới</h2>
          <button onClick={onClose} style={styles.closeButton}>&times;</button>
        </div>
        <div style={styles.modalBody}>
          <div style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Tên Task</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Tên task"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Yêu cầu Task</label>
              <textarea
                style={styles.textarea}
                placeholder="Chi tiết yêu cầu"
                value={request}
                onChange={(e) => setRequest(e.target.value)}
              ></textarea>
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Người giao (UserID)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="UserID người giao"
                value={assigner}
                onChange={(e) => setAssigner(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Người thực hiện (UserID)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="UserID người thực hiện"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Người đánh giá (UserID)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="UserID người đánh giá"
                value={reviewer}
                onChange={(e) => setReviewer(e.target.value)}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Người nhận (UserID)</label>
              <input
                type="text"
                style={styles.input}
                placeholder="UserID người nhận"
                value={receiver}
                onChange={(e) => setReceiver(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div style={styles.modalFooter}>
          <button onClick={handleSubmit} style={styles.createTaskButton}>Thêm Task</button>
        </div>
      </Box>
    </Modal>
  );
};

const modalContentStyle = {
  backgroundColor: '#fff',
  borderRadius: '10px',
  width: '90%',
  maxWidth: '600px',
  maxHeight: 'calc(100vh - 40px)',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
};

const styles = {
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
  modalFooter: {
    padding: '20px',
    borderTop: '1px solid #eee',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  createTaskButton: {
    backgroundColor: '#28A745',
    color: '#fff',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1.1em',
    fontWeight: 'bold',
  },
};

export default NewTaskPopup; 