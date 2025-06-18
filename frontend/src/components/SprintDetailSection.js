import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NewTaskPopup from './NewTaskPopup';

const SprintDetailSection = ({
  selectedSprint,
  getSprintStatusStyle,
  formatDate,
  handleCopy,
  copyFeedback,
  getFileIcon,
  formatFileSize,
  handleDownloadSprintDeliverable,
  styles,
  activeSprintSubTab,
  setActiveSprintSubTab,
  onRefreshSprintSection,
  currentUser,
  formatDateTime
}) => {
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isNewTaskPopupOpen, setIsNewTaskPopupOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tất cả trạng thái');
  const [filterReviewResult, setFilterReviewResult] = useState('Tất cả kết quả');
  const [sprintMembers, setSprintMembers] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState('');

  useEffect(() => {
    if (selectedSprint && selectedSprint.tasks) {
      const uniqueMembers = new Map();

      selectedSprint.tasks.forEach(task => {
        const roles = ['assigner', 'assignee', 'reviewer', 'receiver'];
        roles.forEach(role => {
          const member = task[role];
          if (member && member._id && !uniqueMembers.has(member._id)) {
            uniqueMembers.set(member._id, {
              userID: member.userID || 'N/A',
              name: member.name || 'N/A',
              phoneNumber: member.phoneNumber || 'N/A',
              role: member.role || 'N/A',
              email: member.email || 'N/A',
              companyName: member.companyName || '',
              resource: member.companyName === 'NNS' ? 'Nội bộ' : 'Đối tác',
            });
          }
        });
      });
      setSprintMembers(Array.from(uniqueMembers.values()));
    }
  }, [selectedSprint]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .tooltip-container {
        position: relative;
        display: inline-block;
      }
      .tooltip-container:hover .tooltip {
        opacity: 1;
        visibility: visible;
      }
      .tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 8px;
        background-color: rgba(0, 0, 0, 0.8);
        color: #fff;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        opacity: 0;
        visibility: hidden;
        transition: all 0.2s ease;
        margin-bottom: 5px;
        z-index: 1000;
      }
      .tooltip::after {
        content: "";
        position: absolute;
        top: 100%;
        left: 50%;
        margin-left: -5px;
        border-width: 5px;
        border-style: solid;
        border-color: rgba(0, 0, 0, 0.8) transparent transparent transparent;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  if (!selectedSprint) {
    return null; // Or a loading/placeholder component
  }

  const handleUploadFileChange = (e) => {
    setUploadFiles([...e.target.files]);
  };

  const handleUploadDocument = async () => {
    if (uploadFiles.length === 0) {
      alert('Vui lòng chọn tệp để tải lên.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vui lòng đăng nhập để tiếp tục.');
        return;
      }

      const formData = new FormData();
      uploadFiles.forEach(file => {
        formData.append('deliverables', file);
      });

      const response = await axios.post(
        `http://localhost:5000/api/sprints/${selectedSprint._id}/upload-deliverable`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      setUploadFiles([]); // Clear selected files
      onRefreshSprintSection(); // Call the refresh function passed from SprintSection
      alert('Tệp đã được tải lên thành công!');
    } catch (error) {
      alert('Có lỗi xảy ra khi tải lên tệp.' + (error.response?.data?.message || ''));
    }
  };

  const getTaskStatusStyle = (status) => {
    switch (status) {
      case 'Chưa làm': return styles.taskStatusPending;
      case 'Đang làm': return styles.taskStatusInProgress;
      case 'Đã xong': return styles.taskStatusDone;
      default: return {};
    }
  };

  const getReviewResultStyle = (result) => {
    switch (result) {
      case 'Đạt': return styles.reviewResultApproved;
      case 'Không đạt': return styles.reviewResultRejected;
      case 'Chưa duyệt': return styles.reviewResultPending;
      default: return {};
    }
  };

  const handleOpenNewTaskPopup = () => {
    setIsNewTaskPopupOpen(true);
  };

  const handleCloseNewTaskPopup = () => {
    setIsNewTaskPopupOpen(false);
  };

  const handleSaveNote = async () => {
    if (!newNoteContent.trim()) {
      alert('Nội dung ghi chú không được để trống.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Vui lòng đăng nhập để thêm ghi chú.');
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL?.endsWith('/api') 
        ? process.env.REACT_APP_API_URL 
        : `${process.env.REACT_APP_API_URL}/api`;

      const response = await axios.post(
        `${apiUrl}/sprints/${selectedSprint._id}/notes`,
        { content: newNoteContent },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      console.log('Ghi chú đã được lưu:', response.data);
      setNewNoteContent(''); // Clear input
      onRefreshSprintSection(); // Refresh sprint data to show new note
      alert('Ghi chú đã được thêm thành công!');
    } catch (error) {
      console.error('Lỗi khi lưu ghi chú:', error);
      alert('Có lỗi xảy ra khi lưu ghi chú: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      console.log('Bắt đầu cập nhật trạng thái task:', {
        taskId,
        newStatus,
        currentUser: currentUser?._id
      });

      if (!currentUser) {
        console.error('Không tìm thấy thông tin người dùng hiện tại');
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL?.endsWith('/api') 
        ? process.env.REACT_APP_API_URL 
        : `${process.env.REACT_APP_API_URL}/api`;

      const response = await axios.put(
        `${apiUrl}/sprints/tasks/${taskId}/status`,
        { status: newStatus },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      console.log('Response từ server:', response.data);
      onRefreshSprintSection();
    } catch (error) {
      console.error('Chi tiết lỗi khi cập nhật trạng thái task:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: {
          url: error.config?.url,
          method: error.config?.method,
          headers: error.config?.headers
        }
      });
    }
  };

  const handleUpdateReviewResult = async (taskId, reviewResult) => {
    try {
      console.log('Bắt đầu cập nhật kết quả review:', {
        taskId,
        reviewResult,
        currentUser: currentUser?._id
      });

      if (!currentUser) {
        console.error('Không tìm thấy thông tin người dùng hiện tại');
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL?.endsWith('/api') 
        ? process.env.REACT_APP_API_URL 
        : `${process.env.REACT_APP_API_URL}/api`;

      const response = await axios.put(
        `${apiUrl}/sprints/tasks/${taskId}/review`,
        { reviewResult },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      console.log('Response từ server:', response.data);
      onRefreshSprintSection();
    } catch (error) {
      console.error('Lỗi khi cập nhật kết quả review:', error);
    }
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'Chưa làm':
        return 'Đang làm';
      case 'Đang làm':
        return 'Đã xong';
      default:
        return null;
    }
  };

  const renderActionButtons = (task) => {
    if (!currentUser) {
      return null;
    }

    const isAssignee = task.assignee?._id === currentUser._id;
    const isReviewer = task.reviewer?._id === currentUser._id;
    const isCompleted = task.status === 'Đã xong';

    const buttonBaseStyle = {
      padding: '8px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      width: '32px',
      height: '32px'
    };

    const getStatusButtonStyle = (status) => ({
      ...buttonBaseStyle,
      backgroundColor: task.status === status ? '#e6e6e6' : '#fff',
      color: task.status === status ? '#333' : '#666',
      border: `1px solid ${task.status === status ? '#999' : '#ddd'}`,
      '&:hover': {
        backgroundColor: task.status === status ? '#e6e6e6' : '#f5f5f5',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }
    });

    const getReviewButtonStyle = (result) => ({
      ...buttonBaseStyle,
      backgroundColor: task.reviewResult === result ? '#e6e6e6' : '#fff',
      color: task.reviewResult === result ? '#333' : '#666',
      border: `1px solid ${task.reviewResult === result ? '#999' : '#ddd'}`,
      '&:hover': {
        backgroundColor: task.reviewResult === result ? '#e6e6e6' : '#f5f5f5',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }
    });

    return (
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {isAssignee && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {task.status === 'Chưa làm' && (
              <div className="tooltip-container">
                <button
                  onClick={() => handleStatusChange(task._id, 'Đang làm')}
                  style={getStatusButtonStyle('Chưa làm')}
                >
                  <span style={{ color: '#2196F3', fontSize: '16px' }}>▶</span>
                </button>
                <div className="tooltip">Bắt đầu làm</div>
              </div>
            )}
            {task.status === 'Đang làm' && (
              <div className="tooltip-container">
                <button
                  onClick={() => handleStatusChange(task._id, 'Đã xong')}
                  style={getStatusButtonStyle('Đang làm')}
                >
                  <span style={{ color: '#4CAF50', fontSize: '16px' }}>✓</span>
                </button>
                <div className="tooltip">Hoàn thành</div>
              </div>
            )}
            {task.status === 'Đã xong' && (
              <div className="tooltip-container">
                <button
                  style={{
                    ...getStatusButtonStyle('Đã xong'),
                    cursor: 'default',
                    opacity: 0.8
                  }}
                  disabled
                >
                  <span style={{ color: '#4CAF50', fontSize: '16px' }}>✓</span>
                </button>
                <div className="tooltip">Đã hoàn thành</div>
              </div>
            )}
          </div>
        )}
        {isReviewer && isCompleted && (
          <div style={{ display: 'flex', gap: '6px' }}>
            {task.reviewResult === 'Chưa duyệt' && (
              <>
                <div className="tooltip-container">
                  <button
                    onClick={() => handleUpdateReviewResult(task._id, 'Đạt')}
                    style={getReviewButtonStyle('Đạt')}
                  >
                    <span style={{ color: '#4CAF50', fontSize: '16px' }}>✓</span>
                  </button>
                  <div className="tooltip">Đạt</div>
                </div>
                <div className="tooltip-container">
                  <button
                    onClick={() => handleUpdateReviewResult(task._id, 'Không đạt')}
                    style={getReviewButtonStyle('Không đạt')}
                  >
                    <span style={{ color: '#F44336', fontSize: '16px' }}>✕</span>
                  </button>
                  <div className="tooltip">Không đạt</div>
                </div>
              </>
            )}
            {task.reviewResult !== 'Chưa duyệt' && (
              <div className="tooltip-container">
                <button
                  onClick={() => handleUpdateReviewResult(task._id, 'Chưa duyệt')}
                  style={getReviewButtonStyle('Chưa duyệt')}
                >
                  <span style={{ color: '#FFA000', fontSize: '16px' }}>⏳</span>
                </button>
                <div className="tooltip">Đặt lại trạng thái duyệt</div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.sprintContent}>
      <div style={styles.sprintDetailTabs}>
        <button
          style={{
            ...styles.sprintDetailTabButton,
            color: activeSprintSubTab === 'info' ? '#007BFF' : styles.sprintDetailTabButton.color,
            borderBottom: activeSprintSubTab === 'info' ? '2px solid #007BFF' : '2px solid transparent',
          }}
          onClick={() => setActiveSprintSubTab('info')}
        >
          Thông tin sprint
        </button>
        <button
          style={{
            ...styles.sprintDetailTabButton,
            color: activeSprintSubTab === 'tasks' ? '#007BFF' : styles.sprintDetailTabButton.color,
            borderBottom: activeSprintSubTab === 'tasks' ? '2px solid #007BFF' : '2px solid transparent',
          }}
          onClick={() => setActiveSprintSubTab('tasks')}
        >
          Danh sách task
        </button>
        <button
          style={{
            ...styles.sprintDetailTabButton,
            color: activeSprintSubTab === 'members' ? '#007BFF' : styles.sprintDetailTabButton.color,
            borderBottom: activeSprintSubTab === 'members' ? '2px solid #007BFF' : '2px solid transparent',
          }}
          onClick={() => setActiveSprintSubTab('members')}
        >
          Nhân sự tham gia
        </button>
        <button
          style={{
            ...styles.sprintDetailTabButton,
            color: activeSprintSubTab === 'notes' ? '#007BFF' : styles.sprintDetailTabButton.color,
            borderBottom: activeSprintSubTab === 'notes' ? '2px solid #007BFF' : '2px solid transparent',
          }}
          onClick={() => setActiveSprintSubTab('notes')}
        >
          Ghi chú
        </button>
        <button
          style={{
            ...styles.sprintDetailTabButton,
            color: activeSprintSubTab === 'history' ? '#007BFF' : styles.sprintDetailTabButton.color,
            borderBottom: activeSprintSubTab === 'history' ? '2px solid #007BFF' : '2px solid transparent',
          }}
          onClick={() => setActiveSprintSubTab('history')}
        >
          Lịch sử cập nhật
        </button>
      </div>

      {activeSprintSubTab === 'info' && (
        <div>
          <div style={styles.sprintInfoGrid}>
            <div style={styles.sprintInfoRow}>
              <span style={styles.sprintInfoLabel}>Thời gian:</span>
              <span style={styles.sprintInfoValue}>{`${formatDate(selectedSprint.startDate)} - ${formatDate(selectedSprint.endDate)}`}</span>
            </div>
            <div style={styles.sprintInfoRow}>
              <span style={styles.sprintInfoLabel}>Trạng thái sprint:</span>
              <span style={getSprintStatusStyle(selectedSprint.status)}>{selectedSprint.status}</span>
            </div>
          </div>

          <h3 style={styles.subSectionTitle}>Thông tin Git</h3>
          <div style={styles.sprintInfoGrid}>
            {selectedSprint.gitBranch && (
              <div style={styles.sprintInfoRow}>
                <span style={styles.sprintInfoLabel}>Branch:</span>
                <span style={styles.sprintInfoValue}>{selectedSprint.gitBranch}</span>
              </div>
            )}
            {selectedSprint.pullRequest && (
              <div style={styles.sprintInfoRow}>
                <span style={styles.sprintInfoLabel}>Pull Request:</span>
                <div style={styles.pullRequestContainer}>
                  <a
                    href={selectedSprint.pullRequest}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.link}
                  >
                    {selectedSprint.pullRequest.length > 40 ? 
                      selectedSprint.pullRequest.substring(0, 37) + '...' : 
                      selectedSprint.pullRequest
                    }
                  </a>
                  <button onClick={() => handleCopy(selectedSprint.pullRequest)} style={styles.copyButton}>
                    <img src="https://img.icons8.com/ios-filled/15/000000/copy.png" alt="copy icon" />
                  </button>
                  {copyFeedback.show && copyFeedback.message && (
                    <span style={styles.copyFeedback}>{copyFeedback.message}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {selectedSprint.deliverables && selectedSprint.deliverables.length > 0 && (
            <div style={styles.attachedFilesSection}>
              <h3 style={styles.subSectionTitle}>Tài liệu sprint:</h3>
              <div style={styles.fileListContainer}>
                {selectedSprint.deliverables.map((file, index) => (
                  <div key={file._id || index} style={styles.fileItemCard}>
                    <div style={styles.fileContentLeft}>
                      {getFileIcon(file.fileUrl.split('/').pop())}
                      <div style={styles.fileTextDetails}>
                        <span style={styles.fileCardName}>{
                          (() => {
                            const fileName = file.fileName || file.fileUrl.split('/').pop();
                            if (fileName.length > 20) {
                              const lastDotIndex = fileName.lastIndexOf('.');
                              if (lastDotIndex !== -1 && lastDotIndex > fileName.length - 8) { // Preserve up to 7 chars for extension
                                return fileName.substring(0, 16) + '...' + fileName.substring(lastDotIndex);
                              } else {
                                return fileName.substring(0, 17) + '...';
                              }
                            }
                            return fileName;
                          })()
                        }</span>
                        {file.size && <span style={styles.fileCardSize}>{formatFileSize(file.size)}</span>}
                        {file.uploadedBy && (
                          <span style={styles.fileCardDetails}>Upload by: {file.uploadedBy.name}</span>
                        )}
                        {file.uploadedAt && (
                          <span style={styles.fileCardDetails}>Updated at: {formatDate(file.uploadedAt)}</span>
                        )}
                      </div>
                    </div>
                    <button
                      style={styles.fileCardDownloadButton}
                      onClick={() => handleDownloadSprintDeliverable(selectedSprint._id, file._id, file.fileName)}
                    >
                      <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download icon" style={{ width: '16px', height: '16px' }}/>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={styles.fileUploadControl}>
            <label htmlFor="sprint-file-upload" style={styles.uploadDocumentButton}>
              + Upload/Cập nhật tài liệu
            </label>
            <input
              id="sprint-file-upload"
              type="file"
              multiple
              onChange={handleUploadFileChange}
              style={{ display: 'none' }}
            />
            {uploadFiles.length > 0 && (
              <span style={styles.uploadFileNameDisplay}>
                {uploadFiles.map(file => file.name).join(', ')}
              </span>
            )}
            {uploadFiles.length > 0 && (
              <button onClick={handleUploadDocument} style={styles.uploadConfirmButton}>
                Tải lên
              </button>
            )}
          </div>
        </div>
      )}

      {activeSprintSubTab === 'tasks' && (
        <div>
          <div style={styles.headerControlsContainer}>
            <div style={styles.searchAndFiltersWrapper}>
              <div style={styles.searchInputWrapper}>
                <img
                  src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
                  alt="search icon"
                  style={styles.searchIconStyle}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo ID hoặc tên task..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={styles.searchInputField}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={styles.filterDropdownStyle}
              >
                <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                <option value="Chưa làm">Chưa làm</option>
                <option value="Đang làm">Đang làm</option>
                <option value="Đã xong">Đã xong</option>
              </select>
              <select
                value={filterReviewResult}
                onChange={(e) => setFilterReviewResult(e.target.value)}
                style={styles.filterDropdownStyle}
              >
                <option value="Tất cả kết quả">Tất cả kết quả</option>
                <option value="Đạt">Đạt</option>
                <option value="Không đạt">Không đạt</option>
                <option value="Chưa duyệt">Chưa duyệt</option>
              </select>
            </div>
            <button onClick={handleOpenNewTaskPopup} style={styles.addTaskButton}>+ Thêm Task</button>
          </div>
          <div style={styles.taskTableContainer}>
            <table style={styles.taskTable}>
              <thead>
                <tr>
                  <th style={{...styles.taskTableHeader, ...styles.taskIDColumn}}>ID</th>
                  <th style={{...styles.taskTableHeader, ...styles.taskNameColumn}}>Tên task</th>
                  <th style={{...styles.taskTableHeader, ...styles.taskPersonColumn}}>Người giao</th>
                  <th style={{...styles.taskTableHeader, ...styles.taskPersonColumn}}>Người xử lý</th>
                  <th style={{...styles.taskTableHeader, ...styles.taskStatusColumn}}>Trạng thái</th>
                  <th style={{...styles.taskTableHeader, ...styles.taskPersonColumn}}>Người review</th>
                  <th style={{...styles.taskTableHeader, ...styles.taskPersonColumn}}>Người nhận</th>
                  <th style={{...styles.taskTableHeader, ...styles.taskResultColumn}}>Kết quả</th>
                  <th style={{...styles.taskTableHeader, ...styles.taskActionColumn}}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {selectedSprint.tasks && (() => {
                  const filteredTasks = selectedSprint.tasks.filter(task => {
                    const matchesSearchTerm = searchTerm === '' ||
                      task.taskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      task.name.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesStatus = filterStatus === 'Tất cả trạng thái' || task.status === filterStatus;
                    const matchesReviewResult = filterReviewResult === 'Tất cả kết quả' || task.reviewResult === filterReviewResult;
                    return matchesSearchTerm && matchesStatus && matchesReviewResult;
                  });

                  if (filteredTasks.length === 0) {
                    return (
                      <tr>
                        <td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>
                          Không tìm thấy task dự án.
                          <br />
                          Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc.
                        </td>
                      </tr>
                    );
                  }

                  return filteredTasks.map((task, index) => (
                    <tr key={task.taskId || index} style={styles.taskTableRow}>
                      <td style={{...styles.taskTableCell, ...styles.taskIDColumn}}>{task.taskId}</td>
                      <td style={{...styles.taskTableCell, ...styles.taskNameColumn}}>{task.name}</td>
                      <td style={{...styles.taskTableCell, ...styles.taskPersonColumn}}>{task.assigner?.name || '-'}</td>
                      <td style={{...styles.taskTableCell, ...styles.taskPersonColumn}}>{task.assignee?.name || '-'}</td>
                      <td style={{ ...styles.taskTableCell, ...styles.taskStatusColumn }}>
                        <span style={getTaskStatusStyle(task.status)}>{task.status || '-'}</span>
                      </td>
                      <td style={{...styles.taskTableCell, ...styles.taskPersonColumn}}>{task.reviewer?.name || '-'}</td>
                      <td style={{...styles.taskTableCell, ...styles.taskPersonColumn}}>{task.receiver?.name || '-'}</td>
                      <td style={{ ...styles.taskTableCell, ...styles.taskResultColumn }}>
                        <span style={getReviewResultStyle(task.reviewResult)}>{task.reviewResult || '-'}</span>
                      </td>
                      <td style={{...styles.taskTableCell, ...styles.taskActionColumn}}>
                        {renderActionButtons(task)}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {activeSprintSubTab === 'members' && (
        <div>
          <h3 style={styles.subSectionTitle}>Danh sách nhân sự tham gia Sprint:</h3>
          {sprintMembers.length > 0 ? (
            <div style={styles.taskTableContainer}>
              <table style={styles.taskTable}>
                <thead>
                  <tr>
                    <th style={styles.taskTableHeader}>ID</th>
                    <th style={styles.taskTableHeader}>Tên</th>
                    <th style={styles.taskTableHeader}>SĐT</th>
                    <th style={styles.taskTableHeader}>Email</th>
                    <th style={styles.taskTableHeader}>Vai trò</th>
                    <th style={styles.taskTableHeader}>Nguồn lực</th>
                  </tr>
                </thead>
                <tbody>
                  {sprintMembers.map((member, index) => (
                    <tr key={member.userID || index} style={styles.taskTableRow}>
                      <td style={styles.taskTableCell}>{member.userID}</td>
                      <td style={styles.taskTableCell}>{member.name}</td>
                      <td style={styles.taskTableCell}>{member.phoneNumber}</td>
                      <td style={styles.taskTableCell}>{member.email}</td>
                      <td style={styles.taskTableCell}>{member.role}</td>
                      <td style={styles.taskTableCell}>{member.resource}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: 'center', padding: '20px', color: '#777' }}>Không có nhân sự nào trong sprint này.</p>
          )}
        </div>
      )}
      {activeSprintSubTab === 'notes' && (
        <div style={styles.notesSection}>
          <h3 style={styles.subSectionTitle}>Thêm ghi chú/lời nhắn:</h3>
          <textarea
            style={styles.noteInput}
            placeholder="Nhập ghi chú hoặc lời nhắn mới..."
            value={newNoteContent}
            onChange={(e) => setNewNoteContent(e.target.value)}
            rows="4"
          />
          <button onClick={handleSaveNote} style={styles.saveNoteButton}>Lưu Ghi Chú</button>
          
          {selectedSprint.notes && selectedSprint.notes.length > 0 ? (
            <div style={styles.noteListContainer}>
              <h3 style={styles.subSectionTitle}>Các ghi chú hiện có:</h3>
              {selectedSprint.notes.map((note, index) => (
                <div key={note._id || index} style={styles.noteItem}>
                  <p style={styles.noteContent}>{note.content}</p>
                  <p style={styles.noteMeta}>Được tạo bởi {note.createdBy?.name || 'Người dùng ẩn danh'} vào lúc {formatDateTime(note.createdAt)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.noNotesMessage}>Chưa có ghi chú nào cho sprint này.</p>
          )}
        </div>
      )}
      {activeSprintSubTab === 'history' && (
        <div style={styles.historySection}>
          <h3 style={styles.subSectionTitle}>Lịch sử cập nhật Sprint và Task:</h3>
          {(() => {
            if (!selectedSprint.history && (!selectedSprint.tasks || selectedSprint.tasks.every(task => !task.history))) {
              return <p style={styles.noHistoryMessage}>Chưa có lịch sử cập nhật nào cho sprint này.</p>;
            }

            let combinedHistory = [];

            // Add sprint history
            if (selectedSprint.history) {
              combinedHistory = combinedHistory.concat(selectedSprint.history.map(item => ({ type: 'sprint', ...item })));
            }

            // Add task histories
            if (selectedSprint.tasks) {
              selectedSprint.tasks.forEach(task => {
                if (task.history) {
                  combinedHistory = combinedHistory.concat(task.history.map(item => ({ type: 'task', taskId: task.taskId, taskName: task.name, ...item })));
                }
              });
            }

            // Sort by updatedAt in descending order (newest first)
            combinedHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            return (
              <div style={styles.historyListContainer}>
                {combinedHistory.map((item, index) => (
                  <div key={index} style={styles.historyItem}>
                    <p style={styles.historyContent}>
                      <span style={styles.historyTimestamp}>{formatDateTime(item.updatedAt)}</span>
                      <span style={styles.historyUser}> {item.updatedBy?.name || 'Người dùng ẩn danh'}</span>
                      <span style={styles.historyAction}> {item.action}</span>
                      {item.type === 'task' && (
                        <span style={styles.historyTaskInfo}> cho task: {item.taskName} ({item.taskId})</span>
                      )}
                      {item.field && item.field !== 'Thông tin chung' && item.field !== 'Tài liệu chung' && (
                        <span style={styles.historyField}> {item.field}:</span>
                      )}
                      {item.oldValue !== undefined && item.oldValue !== null && item.oldValue !== '' && (
                        <span style={styles.historyChange}> từ "{item.oldValue}"</span>
                      )}
                      {item.newValue !== undefined && item.newValue !== null && item.newValue !== '' && (
                        <span style={styles.historyChange}> sang "{item.newValue}"</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      <NewTaskPopup 
        isOpen={isNewTaskPopupOpen} 
        onClose={handleCloseNewTaskPopup} 
        sprintId={selectedSprint?._id} 
        onTaskAdded={onRefreshSprintSection} 
        styles={styles} // Pass styles from parent for consistency
      />
    </div>
  );
};

export default SprintDetailSection; 