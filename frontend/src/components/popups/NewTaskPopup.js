import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axiosInstance from '../../api/axios';

const NewTaskPopup = ({ isOpen, onClose, sprintId, onTaskAdded, members = [] }) => {
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
    assignee: { value: '', display: '' }, assigneeError: '',
    reviewer: { value: '', display: '' }, reviewerError: '',
    taskId: generateTaskId()
  }]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown state cho từng task
  const [assigneeDropdown, setAssigneeDropdown] = useState({});
  const [reviewerDropdown, setReviewerDropdown] = useState({});
  // Ref cho input để lấy vị trí
  const assigneeInputRefs = useRef({});
  const reviewerInputRefs = useRef({});
  const [assigneeDropdownPos, setAssigneeDropdownPos] = useState({});
  const [reviewerDropdownPos, setReviewerDropdownPos] = useState({});

  const resetForm = useCallback(() => {
    setTasks([{
      name: '',
      request: '',
      assignee: { value: '', display: '' },
      assigneeName: '',
      assigneeError: '',
      reviewer: { value: '', display: '' },
      reviewerName: '',
      reviewerError: '',
      taskId: generateTaskId()
    }]);
  }, []);

  // Khi mở popup reset dropdown
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      setAssigneeDropdown({});
      setReviewerDropdown({});
    }
  }, [isOpen, resetForm]);

  // Tìm kiếm user
  const filterMembers = (search) => {
    if (!search) return members;
    const s = search.toLowerCase();
    return members.filter(m =>
      m.name?.toLowerCase().includes(s) ||
      m.email?.toLowerCase().includes(s) ||
      (m.userID && m.userID.toLowerCase().includes(s))
    );
  };

  // Xử lý thay đổi input
  const handleTaskChange = (index, field, value) => {
    const newTasks = [...tasks];
    if (field === 'assignee' || field === 'reviewer') {
      newTasks[index][field] = { value: '', display: value };
      newTasks[index][`${field}Error`] = '';
    } else {
      newTasks[index][field] = value;
    }
    setTasks(newTasks);
  };

  // Chọn user từ dropdown
  const handleSelectUser = (index, field, user) => {
    const newTasks = [...tasks];
    newTasks[index][field] = { value: user._id, display: user.name + (user.email ? ` (${user.email})` : '') };
    newTasks[index][`${field}Error`] = '';
    setTasks(newTasks);
    if (field === 'assignee') setAssigneeDropdown(prev => ({ ...prev, [index]: false }));
    if (field === 'reviewer') setReviewerDropdown(prev => ({ ...prev, [index]: false }));
  };

  // Validate
  const validateTasks = () => {
    let valid = true;
    const newTasks = tasks.map((task, idx) => {
      const t = { ...task };
      if (!t.name.trim()) { t.nameError = 'Vui lòng nhập tên task'; valid = false; }
      else t.nameError = '';
      if (!t.request.trim()) { t.requestError = 'Vui lòng nhập yêu cầu task'; valid = false; } else t.requestError = '';
      // Validate assignee
      if (!t.assignee.value || !members.find(m => m._id === t.assignee.value)) {
        t.assigneeError = 'Vui lòng chọn người thực hiện từ danh sách'; valid = false;
      } else t.assigneeError = '';
      // Validate reviewer
      if (!t.reviewer.value || !members.find(m => m._id === t.reviewer.value)) {
        t.reviewerError = 'Vui lòng chọn người đánh giá từ danh sách'; valid = false;
      } else t.reviewerError = '';
      return t;
    });
    setTasks(newTasks);
    return valid;
  };

  // Submit
  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validateTasks()) return;
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vui lòng đăng nhập để tiếp tục.');
        return;
      }
      const validTasks = tasks.filter(task => task.name && task.request && task.assignee.value && task.reviewer.value);
      if (validTasks.length === 0) {
        alert('Vui lòng điền thông tin cho ít nhất một task hợp lệ.');
        return;
      }
      let hasError = false;
      for (const task of validTasks) {
        try {
          await axiosInstance.post(
            `${process.env.REACT_APP_API_URL || ''}/tasks`,
            {
              taskId: task.taskId,
              name: task.name,
              goal: task.request,
              assignee: task.assignee.value,
              reviewer: task.reviewer.value,
              sprint: sprintId,
            },
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
        } catch (error) {
          hasError = true;
          // Có thể báo lỗi cụ thể từng task nếu muốn
        }
      }
      if (hasError) {
        alert('Có một số task không thể tạo. Vui lòng kiểm tra lại.');
      }
      onTaskAdded();
      onClose();
    } catch (error) {
      alert('Có lỗi xảy ra khi thêm task. ' + (error.response?.data?.message || ''));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTask = () => {
    setTasks([...tasks, {
      name: '',
      request: '',
      assignee: { value: '', display: '' },
      assigneeName: '',
      assigneeError: '',
      reviewer: { value: '', display: '' },
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

  // Khi mở dropdown, tính toán vị trí
  const handleAssigneeFocus = (index) => {
    setAssigneeDropdown(prev => ({ ...prev, [index]: true }));
    const input = assigneeInputRefs.current[index];
    if (input) {
      const rect = input.getBoundingClientRect();
      setAssigneeDropdownPos(prev => ({
        ...prev,
        [index]: {
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        }
      }));
    }
  };
  const handleReviewerFocus = (index) => {
    setReviewerDropdown(prev => ({ ...prev, [index]: true }));
    const input = reviewerInputRefs.current[index];
    if (input) {
      const rect = input.getBoundingClientRect();
      setReviewerDropdownPos(prev => ({
        ...prev,
        [index]: {
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width
        }
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.popup}>
        <div style={styles.headerSection}>
          <h2 style={styles.title} id="new-task-modal-title">Thêm Task Mới</h2>
          <button 
            onClick={onClose} 
            style={styles.closeButton}
            onMouseOver={e => e.currentTarget.style.backgroundColor = '#e9ecef'}
            onMouseOut={e => e.currentTarget.style.backgroundColor = '#f1f3f5'}
          >&times;</button>
        </div>
        <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} style={styles.form}>
          <div style={styles.bodySection}>
            {tasks.map((task, index) => (
              <div key={index} style={styles.taskCard}>
                <div style={styles.taskHeader}>
                  <span style={styles.taskNumber}>Task #{task.taskId}</span>
                  {tasks.length > 1 && (
                    <button onClick={() => handleRemoveTask(index)} style={styles.removeTaskButton} type="button">
                      <img src="https://img.icons8.com/ios-glyphs/20/d9480f/trash.png" alt="remove task"/>
                    </button>
                  )}
                </div>
                <div style={styles.taskBodyContent}>
                  <div style={{...styles.fieldGroup, position: 'relative'}}>
                    <label style={styles.label}>Tên Task <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span></label>
                    <input
                      type="text"
                      style={{...styles.input, borderColor: task.nameError ? '#dc3545' : '#ccc'}}
                      placeholder="Tên công việc cụ thể"
                      value={task.name}
                      onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                    />
                    {task.nameError && <div style={styles.errorTextInline}>{task.nameError}</div>}
                  </div>
                  <div style={{...styles.fieldGroup, position: 'relative'}}>
                    <label style={styles.label}>Yêu cầu Task <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span></label>
                    <textarea
                      style={{...styles.textarea, borderColor: task.requestError ? '#dc3545' : '#ccc'}}
                      placeholder="Mô tả chi tiết yêu cầu của công việc"
                      value={task.request}
                      onChange={(e) => handleTaskChange(index, 'request', e.target.value)}
                      rows={3}
                    ></textarea>
                    {task.requestError && <div style={styles.errorTextInline}>{task.requestError}</div>}
                  </div>
                  <div style={styles.formGrid}> 
                    {/* Người thực hiện */}
                    <div style={{...styles.fieldGroup, position: 'relative'}}>
                      <label style={styles.label}>Người thực hiện <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span></label>
                      <input
                        style={{...styles.input, borderColor: task.assigneeError ? '#dc3545' : '#ccc'}}
                        placeholder="Tìm theo tên, email hoặc ID"
                        value={task.assignee.display}
                        onChange={e => handleTaskChange(index, 'assignee', e.target.value)}
                        onFocus={() => handleAssigneeFocus(index)}
                        onBlur={() => setTimeout(() => setAssigneeDropdown(prev => ({ ...prev, [index]: false })), 120)}
                        autoComplete="off"
                        ref={el => assigneeInputRefs.current[index] = el}
                      />
                      {task.assigneeError && <div style={styles.errorTextInline}>{task.assigneeError}</div>}
                      {assigneeDropdown[index] && assigneeDropdownPos[index] && ReactDOM.createPortal(
                        <div style={{
                          ...styles.autocompleteList,
                          position: 'absolute',
                          top: assigneeDropdownPos[index].top,
                          left: assigneeDropdownPos[index].left,
                          width: assigneeDropdownPos[index].width,
                          zIndex: 9999,
                          maxHeight: 220,
                          overflowY: 'auto',
                        }}>
                          {filterMembers(task.assignee.display).length > 0 ? (
                            filterMembers(task.assignee.display).map((m) => (
                              <div
                                key={m._id}
                                style={{
                                  ...styles.autocompleteItem,
                                  backgroundColor: task.assignee.value === m._id ? '#e3f2fd' : 'transparent',
                                }}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  handleSelectUser(index, 'assignee', m);
                                }}
                              >
                                {m.name} {m.email && <span style={{ color: '#888' }}>({m.email})</span>}
                              </div>
                            ))
                          ) : task.assignee.display.trim() ? (
                            <div style={{ ...styles.autocompleteItem, color: '#888', fontStyle: 'italic' }}>Không tìm thấy</div>
                          ) : null}
                        </div>,
                        document.body
                      )}
                    </div>
                    {/* Người đánh giá */}
                    <div style={{...styles.fieldGroup, position: 'relative'}}>
                      <label style={styles.label}>Người đánh giá <span style={{color:'#FA2B4D', fontSize:15, marginLeft:2, verticalAlign:'middle'}}>*</span></label>
                      <input
                        style={{...styles.input, borderColor: task.reviewerError ? '#dc3545' : '#ccc'}}
                        placeholder="Tìm theo tên, email hoặc ID"
                        value={task.reviewer.display}
                        onChange={e => handleTaskChange(index, 'reviewer', e.target.value)}
                        onFocus={() => handleReviewerFocus(index)}
                        onBlur={() => setTimeout(() => setReviewerDropdown(prev => ({ ...prev, [index]: false })), 120)}
                        autoComplete="off"
                        ref={el => reviewerInputRefs.current[index] = el}
                      />
                      {task.reviewerError && <div style={styles.errorTextInline}>{task.reviewerError}</div>}
                      {reviewerDropdown[index] && reviewerDropdownPos[index] && ReactDOM.createPortal(
                        <div style={{
                          ...styles.autocompleteList,
                          position: 'absolute',
                          top: reviewerDropdownPos[index].top,
                          left: reviewerDropdownPos[index].left,
                          width: reviewerDropdownPos[index].width,
                          zIndex: 9999,
                          maxHeight: 220,
                          overflowY: 'auto',
                        }}>
                          {filterMembers(task.reviewer.display).length > 0 ? (
                            filterMembers(task.reviewer.display).map((m) => (
                              <div
                                key={m._id}
                                style={{
                                  ...styles.autocompleteItem,
                                  backgroundColor: task.reviewer.value === m._id ? '#e3f2fd' : 'transparent',
                                }}
                                onMouseDown={e => {
                                  e.preventDefault();
                                  handleSelectUser(index, 'reviewer', m);
                                }}
                              >
                                {m.name} {m.email && <span style={{ color: '#888' }}>({m.email})</span>}
                              </div>
                            ))
                          ) : task.reviewer.display.trim() ? (
                            <div style={{ ...styles.autocompleteItem, color: '#888', fontStyle: 'italic' }}>Không tìm thấy</div>
                          ) : null}
                        </div>,
                        document.body
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <button 
              onClick={handleAddTask} 
              style={styles.addTaskButton}
              type="button"
              onMouseOver={e => { e.currentTarget.style.backgroundColor = '#e6f2ff'; e.currentTarget.style.borderColor = '#0056b3';}}
              onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = '#007BFF';}}
            >+ Thêm Task</button>
          </div>
          <div style={styles.actions}>
            <button 
              type="button"
              style={styles.cancelBtn}
              onClick={onClose}
            >
              Hủy
            </button>
            <button 
              type="submit"
              style={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? `Đang thêm...` : `Thêm ${tasks.length > 1 ? `${tasks.length} Task` : 'Task'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    margin: 0,
    marginBottom: 4,
    letterSpacing: 0.5,
    color: '#1a2236',
    flex: 1,
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
    position: 'absolute',
    right: 0,
    top: 0,
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  bodySection: {
    padding: '0 0 8px 0',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    marginBottom: 16,
  },
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
    minHeight: 80,
    boxSizing: 'border-box',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginTop: 8,
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
  autocompleteList: {
    border: '1px solid #ccc',
    borderRadius: 4,
    backgroundColor: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    zIndex: 1000,
    maxHeight: 220,
    overflowY: 'auto',
  },
  autocompleteItem: {
    padding: '8px 12px',
    cursor: 'pointer',
    fontSize: 14,
    color: '#333',
    borderBottom: '1px solid #eee',
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

export default NewTaskPopup; 