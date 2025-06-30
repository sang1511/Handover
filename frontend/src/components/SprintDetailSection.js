import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NewTaskPopup from './NewTaskPopup';
import CopyToast from './common/CopyToast';
import socketManager from '../utils/socket';

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
  formatDateTime,
  onProjectStatusChange,
}) => {
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isNewTaskPopupOpen, setIsNewTaskPopupOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tất cả trạng thái');
  const [filterReviewResult, setFilterReviewResult] = useState('Tất cả kết quả');
  const [sprintMembers, setSprintMembers] = useState([]);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('Tất cả vai trò');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 850);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 850);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canManageSprint = currentUser && (currentUser.role === 'admin' || currentUser.role === 'pm');

  // Socket listeners for realtime updates
  useEffect(() => {
    if (!selectedSprint) return;

    // Listen for note added
    const handleNoteAdded = (data) => {
      if (data.sprintId === selectedSprint._id) {
        // Add new note to sprint
        const updatedSprint = {
          ...selectedSprint,
          notes: [...(selectedSprint.notes || []), data.newNote],
          history: [...(selectedSprint.history || []), data.updatedHistory]
        };
        onRefreshSprintSection(updatedSprint);
      }
    };

    // Listen for acceptance status updated
    const handleAcceptanceStatusUpdated = (data) => {
      if (data.sprintId === selectedSprint._id) {
        const updatedSprint = {
          ...selectedSprint,
          acceptanceStatus: data.newStatus,
          history: [...(selectedSprint.history || []), data.updatedHistory]
        };
        onRefreshSprintSection(updatedSprint);
      }
    };

    // Listen for deliverable uploaded
    const handleDeliverableUploaded = (data) => {
      if (data.sprintId === selectedSprint._id) {
        const updatedSprint = {
          ...selectedSprint,
          deliverables: [...(selectedSprint.deliverables || []), ...data.newDeliverables],
          history: [...(selectedSprint.history || []), data.updatedHistory]
        };
        onRefreshSprintSection(updatedSprint);
      }
    };

    // Listen for deliverable deleted
    const handleDeliverableDeleted = (data) => {
      if (data.sprintId === selectedSprint._id) {
        const updatedSprint = {
          ...selectedSprint,
          deliverables: (selectedSprint.deliverables || []).filter(d => d.fileId !== data.deletedFileId),
          history: [...(selectedSprint.history || []), data.updatedHistory]
        };
        onRefreshSprintSection(updatedSprint);
      }
    };

    // Listen for task updates (existing)
    const handleTaskUpdated = (data) => {
      if (data.sprintId === selectedSprint._id) {
        const updatedSprint = {
          ...selectedSprint,
          tasks: (selectedSprint.tasks || []).map(task => 
            task._id === data.updatedTask._id ? data.updatedTask : task
          )
        };
        onRefreshSprintSection(updatedSprint);
      }
    };

    // Listen for new tasks added (existing)
    const handleTaskAdded = (data) => {
      if (data.sprintId === selectedSprint._id) {
        const updatedSprint = {
          ...selectedSprint,
          tasks: [...(selectedSprint.tasks || []), data.newTask],
          members: data.updatedMembers || selectedSprint.members
        };
        onRefreshSprintSection(updatedSprint);
      }
    };

    // Listen for bulk tasks added (existing)
    const handleTasksBulkAdded = (data) => {
      if (data.sprintId === selectedSprint._id) {
        const updatedSprint = {
          ...selectedSprint,
          tasks: [...(selectedSprint.tasks || []), ...data.newTasks],
          members: data.updatedMembers || selectedSprint.members
        };
        onRefreshSprintSection(updatedSprint);
      }
    };

    // Register socket listeners
    socketManager.on('noteAdded', handleNoteAdded);
    socketManager.on('acceptanceStatusUpdated', handleAcceptanceStatusUpdated);
    socketManager.on('deliverableUploaded', handleDeliverableUploaded);
    socketManager.on('deliverableDeleted', handleDeliverableDeleted);
    socketManager.on('taskUpdated', handleTaskUpdated);
    socketManager.on('taskAdded', handleTaskAdded);
    socketManager.on('tasksBulkAdded', handleTasksBulkAdded);

    // Cleanup listeners on unmount or when selectedSprint changes
    return () => {
      socketManager.off('noteAdded');
      socketManager.off('acceptanceStatusUpdated');
      socketManager.off('deliverableUploaded');
      socketManager.off('deliverableDeleted');
      socketManager.off('taskUpdated');
      socketManager.off('taskAdded');
      socketManager.off('tasksBulkAdded');
    };
  }, [selectedSprint, onRefreshSprintSection]);

  useEffect(() => {
    if (selectedSprint && selectedSprint.members) {
      const members = selectedSprint.members.map(({ user: member }) => {
        if (!member) {
          return null;
        }
        return {
              userID: member.userID || 'N/A',
              name: member.name || 'N/A',
              phoneNumber: member.phoneNumber || 'N/A',
              role: member.role || 'N/A',
              email: member.email || 'N/A',
              companyName: member.companyName || '',
              resource: member.companyName === 'NNS' ? 'Nội bộ' : 'Đối tác',
        };
      }).filter(Boolean); 
      setSprintMembers(members);
    } else {
      setSprintMembers([]);
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
    setUploadFiles(Array.from(e.target.files));
    e.target.value = null;
  };

  const handleRemoveUploadFile = (fileToRemove) => {
    setUploadFiles(prevFiles => prevFiles.filter(file => file !== fileToRemove));
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

      await axios.post(
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
    } catch (error) {
      alert('Có lỗi xảy ra khi tải lên tệp.' + (error.response?.data?.message || ''));
    }
  };

  const handleDeleteSprintDeliverable = async (fileId, fileName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tệp "${fileName}" không? Hành động này không thể hoàn tác.`)) {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

        await axios.delete(`${apiUrl}/sprints/${selectedSprint._id}/deliverables/${fileId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        onRefreshSprintSection(); // Refresh to show updated file list
      } catch (error) {
        alert('Có lỗi xảy ra khi xóa tài liệu: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const handleUpdateAcceptanceStatus = async (newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

      await axios.put(`${apiUrl}/sprints/${selectedSprint._id}/acceptance-status`, 
        { acceptanceStatus: newStatus },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      onRefreshSprintSection();
      if (onProjectStatusChange) {
        onProjectStatusChange(); // Gọi callback cập nhật project
      }
    } catch (error) {
      alert('Có lỗi xảy ra khi cập nhật trạng thái nghiệm thu: ' + (error.response?.data?.message || error.message));
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

      await axios.post(
        `${apiUrl}/sprints/${selectedSprint._id}/notes`,
        { content: newNoteContent },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );

      setNewNoteContent(''); // Clear input
      onRefreshSprintSection(); // Refresh sprint data to show new note
    } catch (error) {
      alert('Có lỗi xảy ra khi lưu ghi chú: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      if (!currentUser) {
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL?.endsWith('/api') 
        ? process.env.REACT_APP_API_URL 
        : `${process.env.REACT_APP_API_URL}/api`;

      await axios.put(
        `${apiUrl}/sprints/tasks/${taskId}/status`,
        { status: newStatus },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      onRefreshSprintSection();
      if (onProjectStatusChange) {
        onProjectStatusChange();
      }
    } catch (error) {
    }
  };

  const handleUpdateReviewResult = async (taskId, reviewResult) => {
    try {
      if (!currentUser) {
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL?.endsWith('/api') 
        ? process.env.REACT_APP_API_URL 
        : `${process.env.REACT_APP_API_URL}/api`;

      await axios.put(
        `${apiUrl}/sprints/tasks/${taskId}/review`,
        { reviewResult },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      onRefreshSprintSection();
      if (onProjectStatusChange) {
        onProjectStatusChange();
      }
    } catch (error) {
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
                <span className="tooltip">Bắt đầu làm</span>
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
                <span className="tooltip">Hoàn thành</span>
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
                <span className="tooltip">Đã xong</span>
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
                  <span className="tooltip">Đạt</span>
                </div>
                <div className="tooltip-container">
                  <button
                    onClick={() => handleUpdateReviewResult(task._id, 'Không đạt')}
                    style={getReviewButtonStyle('Không đạt')}
                  >
                    <span style={{ color: '#F44336', fontSize: '16px' }}>✕</span>
                  </button>
                  <span className="tooltip">Không đạt</span>
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
                <span className="tooltip">Duyệt lại</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const responsiveTabsStyle = {
    ...styles.sprintDetailTabs,
    flexWrap: isMobile ? 'wrap' : 'nowrap',
  };

  const responsiveControlsContainerStyle = {
    ...styles.headerControlsContainer,
    flexDirection: isMobile ? 'column' : 'row',
    alignItems: isMobile ? 'stretch' : 'center',
    gap: isMobile ? '1rem' : '1rem',
  };
  
  const responsiveFiltersWrapperStyle = {
    ...styles.searchAndFiltersWrapper,
    flexDirection: isMobile ? 'column' : 'row',
    width: isMobile ? '100%' : 'auto',
    gap: isMobile ? '0.5rem' : '1rem',
  };

  const responsiveAddTaskButtonStyle = {
    ...styles.addTaskButton,
    width: isMobile ? '100%' : 'auto',
    marginLeft: isMobile ? '0' : 'auto',
  };

  const newStyles = {
    searchInput: {
      width: '100%',
      padding: '12px 20px 12px 45px',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      fontSize: '14px',
      backgroundColor: '#f8f9fa',
      transition: 'all 0.3s ease',
    },
    select: {
      padding: '12px 35px 12px 15px',
      borderRadius: '8px',
      border: '1px solid #e0e0e0',
      fontSize: '14px',
      backgroundColor: '#f8f9fa',
      cursor: 'pointer',
      minWidth: '180px',
      appearance: 'none',
      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236c757d' d='M6 8.825L1.175 4 2.05 3.125 6 7.075 9.95 3.125 10.825 4z'/%3E%3C/svg%3E")`,
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'right 15px center',
      transition: 'all 0.3s ease',
    },
    searchIcon: {
      position: 'absolute',
      left: '15px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#6c757d',
      width: '20px',
      height: '20px',
    },
    searchInputWrapper: {
      position: 'relative',
      flex: '1',
      minWidth: '300px',
    }
  }

  const responsiveNewSearchInputStyle = {
    ...newStyles.searchInput,
    width: isMobile ? '100%' : newStyles.searchInput.width,
  };

  const responsiveNewFilterDropdownStyle = {
    ...newStyles.select,
    width: isMobile ? '100%' : newStyles.select.width,
  };

  return (
    <div style={styles.sprintContent}>
      <CopyToast show={copyFeedback.show} message={copyFeedback.message} onClose={() => onRefreshSprintSection ? setTimeout(() => {}, 0) : null} />
      <div style={responsiveTabsStyle}>
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

      {activeSprintSubTab === 'info' && (() => {
        const localStyles = {
          infoTabContainer: {
            padding: '24px',
            background: 'linear-gradient(135deg, #f7f8fa 60%, #e3e9f7 100%)',
            borderRadius: '16px',
            minHeight: '100px',
            fontSize: '1.09rem',
          },
          infoGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(370px, 1fr))',
            gap: '32px',
            marginBottom: '32px',
          },
          infoCard: {
            background: '#fff',
            borderRadius: '16px',
            padding: '28px 24px',
            boxShadow: '0 6px 24px rgba(0,0,0,0.07)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '180px',
          },
          cardTitle: {
            fontSize: '1.32rem',
            fontWeight: '700',
            color: '#2d3a4a',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '20px',
          },
          infoRow: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
            fontSize: '1.13rem',
            minHeight: '38px',
            gap: '10px',
            flexWrap: 'wrap',
          },
          infoLabel: {
            fontWeight: '500',
            color: '#5a6a85',
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
          },
          infoValue: {
            color: '#222',
            textAlign: 'right',
            fontWeight: '500',
          },
          badge: {
            display: 'inline-block',
            padding: '4px 14px',
            borderRadius: '16px',
            fontWeight: '600',
            fontSize: '0.98em',
            background: '#e3e9f7',
            color: '#2d3a4a',
            marginLeft: '8px',
          },
          badgeDone: { background: '#e0f7e9', color: '#219653' },
          badgeProgress: { background: '#e3f2fd', color: '#1976d2' },
          badgePending: { background: '#fff8e1', color: '#bfa100' },
          badgeRejected: { background: '#ffebee', color: '#d32f2f' },
          noInfoText: {
            color: '#888',
            fontStyle: 'italic',
            marginTop: '10px',
          },
          fileList: {
            display: 'flex',
            flexWrap: 'wrap',
            gap: '18px',
            marginTop: '8px',
          },
          fileCard: {
            background: '#f8fafc',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            minWidth: '260px',
            maxWidth: '340px',
            transition: 'background 0.2s',
            cursor: 'pointer',
          },
          fileCardHover: {
            background: '#e3e9f7',
          },
          fileIcon: {
            width: '36px',
            height: '36px',
            marginRight: '14px',
          },
          fileText: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
          },
          fileName: {
            fontWeight: '600',
            color: '#2d3a4a',
            fontSize: '1em',
            marginBottom: '2px',
          },
          fileMeta: {
            fontSize: '0.93em',
            color: '#888',
          },
          fileUploader: {
            fontSize: '0.93em',
            color: '#888',
          },
          fileActions: {
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            marginLeft: '10px',
          },
          avatar: {
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            objectFit: 'cover',
            background: '#e3e9f7',
          },
          uploadPreviewContainer: {
            width: '100%',
            marginTop: '15px',
            padding: '15px',
            background: '#f8f9fa',
            borderRadius: '12px',
            border: '1px solid #e9ecef',
          },
          uploadFileList: {
            maxHeight: '130px',
            overflowY: 'auto',
            marginBottom: '15px',
            paddingRight: '10px',
          },
          uploadFileItem: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: '#fff',
            borderRadius: '8px',
            marginBottom: '8px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          },
          uploadFileItemName: {
            color: '#333',
            fontSize: '0.95em',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            marginRight: '10px',
          },
          uploadFileRemoveBtn: {
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
          },
          uploadActions: {
            display: 'flex',
            justifyContent: 'flex-end',
          }
        };

        // Helper for badge color
        const getBadgeStyle = (status) => {
          if (status === 'Đã kết thúc' || status === 'Đã nghiệm thu') return { ...localStyles.badge, ...localStyles.badgeDone };
          if (status === 'Đang chạy') return { ...localStyles.badge, ...localStyles.badgeProgress };
          if (status === 'Chưa bắt đầu' || status === 'Chưa nghiệm thu') return { ...localStyles.badge, ...localStyles.badgePending };
          if (status === 'Không đạt') return { ...localStyles.badge, ...localStyles.badgeRejected };
          return localStyles.badge;
        };

        const fileListContainerStyle = {
          ...localStyles.fileList,
          ...(isMobile && { flexDirection: 'column', gap: '12px', flexWrap: 'nowrap' })
        };

        if (selectedSprint.deliverables && selectedSprint.deliverables.length > 3 && !isMobile) {
          fileListContainerStyle.maxHeight = '150px';
          fileListContainerStyle.overflowY = 'auto';
          fileListContainerStyle.paddingRight = '10px';
        }
        
        const fileCardStyle = {
            ...localStyles.fileCard,
            ...(isMobile && { width: '100%', minWidth: 'unset', maxWidth: 'unset', flexBasis: '100%' })
        };

        return (
          <div style={localStyles.infoTabContainer}>
            <div style={localStyles.infoGrid}>
              {/* Card 1: Thông tin chung */}
              <div style={localStyles.infoCard}>
                <h3 style={localStyles.cardTitle}><img src="https://img.icons8.com/ios-filled/28/1976d2/info--v1.png" alt="info"/>Thông tin chung</h3>
                <div style={localStyles.infoRow}>
                  <span style={localStyles.infoLabel}><img src="https://img.icons8.com/ios-filled/20/FFA726/calendar--v1.png" alt="calendar"/>Thời gian:</span>
                  <span style={localStyles.infoValue}>{`${formatDate(selectedSprint.startDate)} - ${formatDate(selectedSprint.endDate)}`}</span>
                </div>
                <div style={localStyles.infoRow}>
                  <span style={localStyles.infoLabel}><img src="https://img.icons8.com/ios-filled/20/1976d2/flag--v1.png" alt="status"/>Trạng thái sprint:</span>
                  <span style={getBadgeStyle(selectedSprint.status)}>{selectedSprint.status}</span>
                </div>
                <div style={localStyles.infoRow}>
                  <span style={localStyles.infoLabel}><img src="https://img.icons8.com/ios-filled/20/43A047/ok--v1.png" alt="accept"/>Phản hồi nghiệm thu:</span>
                  {canManageSprint ? (
                    <select value={selectedSprint.acceptanceStatus} onChange={(e) => handleUpdateAcceptanceStatus(e.target.value)} style={getBadgeStyle(selectedSprint.acceptanceStatus)}>
                      <option value="Chưa nghiệm thu">Chưa nghiệm thu</option>
                      <option value="Đã nghiệm thu">Đã nghiệm thu</option>
                    </select>
                  ) : (
                    <span style={getBadgeStyle(selectedSprint.acceptanceStatus)}>{selectedSprint.acceptanceStatus}</span>
                  )}
                </div>
              </div>

              {/* Card 2: Thông tin Git */}
              <div style={localStyles.infoCard}>
                <h3 style={localStyles.cardTitle}><img src="https://img.icons8.com/ios-filled/28/8E24AA/git.png" alt="git"/>Thông tin Git</h3>
                {selectedSprint.gitBranch ? (
                  <div style={localStyles.infoRow}>
                    <span style={localStyles.infoLabel}><img src="https://img.icons8.com/ios-filled/20/8E24AA/code-fork.png" alt="branch"/>Branch:</span>
                    <span style={localStyles.infoValue}>{selectedSprint.gitBranch}</span>
                  </div>
                ) : <p style={localStyles.noInfoText}>Không có thông tin branch.</p>}
                
                {selectedSprint.pullRequest ? (
                  <div style={localStyles.infoRow}>
                    <span style={localStyles.infoLabel}><img src="https://img.icons8.com/ios-filled/20/00ACC1/pull-request.png" alt="pr"/>Pull Request:</span>
                    <div style={{...styles.pullRequestContainer, alignItems: 'center'}}>
                      <a href={selectedSprint.pullRequest} target="_blank" rel="noopener noreferrer" style={styles.link}>
                        {selectedSprint.pullRequest.length > 40 ? selectedSprint.pullRequest.substring(0, 27) + '...' : selectedSprint.pullRequest}
                      </a>
                      <button 
                        onClick={() => handleCopy(selectedSprint.pullRequest)} 
                        style={{
                          marginLeft: 8,
                          background: '#e3e9f7',
                          borderRadius: '50%',
                          border: 'none',
                          padding: 8,
                          cursor: 'pointer',
                          transition: 'background 0.2s, transform 0.1s',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
                        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                      >
                        <img src="https://img.icons8.com/ios-filled/18/00ACC1/copy.png" alt="copy icon" />
                      </button>
                    </div>
                  </div>
                ) : <p style={localStyles.noInfoText}>Không có thông tin pull request.</p>}
              </div>
            </div>

            {/* Section 3: Tài liệu sprint */}
            <div style={{ ...localStyles.infoCard, marginTop: '24px' }}>
              <h3 style={localStyles.cardTitle}><img src="https://img.icons8.com/ios-filled/28/607D8B/documents.png" alt="doc"/>Tài liệu sprint</h3>
              {selectedSprint.deliverables && selectedSprint.deliverables.length > 0 ? (
                <div style={fileListContainerStyle}>
                  {selectedSprint.deliverables.map((file, index) => (
                    <div key={file._id || index} style={fileCardStyle} onMouseOver={e => e.currentTarget.style.background = '#e3e9f7'} onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}>
                      <img src={getFileIcon(file.fileName).props.src} alt="file" style={localStyles.fileIcon} />
                      <div style={localStyles.fileText}>
                        <span style={localStyles.fileName}>{(() => { const fileName = file.fileName; if (fileName.length > 20) { const lastDotIndex = fileName.lastIndexOf('.'); if (lastDotIndex !== -1 && lastDotIndex > fileName.length - 8) { return fileName.substring(0, 16) + '...' + fileName.substring(lastDotIndex); } else { return fileName.substring(0, 17) + '...'; } } return fileName; })()}</span>
                        {file.fileSize && <span style={localStyles.fileMeta}>{formatFileSize(file.fileSize)}</span>}
                        {file.uploadedBy && (
                          <span style={localStyles.fileUploader}>{file.uploadedBy.name}</span>
                        )}
                        {file.uploadedAt && <span style={localStyles.fileMeta}>Updated at: {formatDate(file.uploadedAt)}</span>}
                      </div>
                      <div style={localStyles.fileActions}>
                        <button style={styles.fileCardDownloadButton} onClick={() => handleDownloadSprintDeliverable(selectedSprint._id, file.fileId, file.fileName)}>
                          <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download icon" style={{ width: '16px', height: '16px' }} />
                        </button>
                        {canManageSprint && (
                          <button style={{ ...styles.fileCardDownloadButton, backgroundColor: '#ffebee' }} onClick={() => handleDeleteSprintDeliverable(file.fileId, file.fileName)}>
                            <img src="https://img.icons8.com/material-outlined/16/000000/trash--v1.png" alt="delete icon" style={{ width: '16px', height: '16px' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p style={localStyles.noInfoText}>Chưa có tài liệu nào được tải lên.</p>}

              {canManageSprint && (
                <div style={{ marginTop: '20px' }}>
                  <label htmlFor="sprint-file-upload" style={styles.uploadDocumentButton}>+ Upload/Cập nhật tài liệu</label>
                  <input id="sprint-file-upload" type="file" multiple onChange={handleUploadFileChange} style={{ display: 'none' }} />
                  
                  {uploadFiles.length > 0 && (
                    <div style={localStyles.uploadPreviewContainer}>
                      <div style={localStyles.uploadFileList}>
                        {uploadFiles.map((file, index) => (
                          <div key={index} style={localStyles.uploadFileItem}>
                            <span style={localStyles.uploadFileItemName} title={file.name}>{file.name}</span>
                            <button onClick={() => handleRemoveUploadFile(file)} style={localStyles.uploadFileRemoveBtn} title="Bỏ chọn">
                              <img src="https://img.icons8.com/ios-filled/16/F44336/delete-sign.png" alt="remove"/>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div style={localStyles.uploadActions}>
                        <button onClick={handleUploadDocument} style={styles.uploadConfirmButton}>Tải lên {uploadFiles.length} tệp</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {activeSprintSubTab === 'tasks' && (
        <div>
          <div style={responsiveControlsContainerStyle}>
            <div style={responsiveFiltersWrapperStyle}>
              <div style={newStyles.searchInputWrapper}>
                <img
                  src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
                  alt="search icon"
                  style={newStyles.searchIcon}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo ID hoặc tên task..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={responsiveNewSearchInputStyle}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={responsiveNewFilterDropdownStyle}
              >
                <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                <option value="Chưa làm">Chưa làm</option>
                <option value="Đang làm">Đang làm</option>
                <option value="Đã xong">Đã xong</option>
              </select>
              <select
                value={filterReviewResult}
                onChange={(e) => setFilterReviewResult(e.target.value)}
                style={responsiveNewFilterDropdownStyle}
              >
                <option value="Tất cả kết quả">Tất cả kết quả</option>
                <option value="Đạt">Đạt</option>
                <option value="Không đạt">Không đạt</option>
                <option value="Chưa duyệt">Chưa duyệt</option>
              </select>
            </div>
            {canManageSprint && (
              <button onClick={handleOpenNewTaskPopup} style={responsiveAddTaskButtonStyle}>+ Thêm Task</button>
            )}
          </div>
          {isMobile ? (() => {
            const mobileTaskStyles = {
              listContainer: { padding: '10px 0' },
              card: { background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '16px' },
              cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
              taskId: { fontWeight: '700', color: '#333', fontSize: '1.1em' },
              taskName: { fontWeight: '600', color: '#2d3a4a', marginBottom: '14px', fontSize: '1.15em', lineHeight: '1.4' },
              taskDetailsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '0.95em' },
              detailItem: { background: '#f7f8fa', padding: '8px 10px', borderRadius: '8px' },
              detailLabel: { display: 'block', color: '#667', fontSize: '0.85em', marginBottom: '4px', fontWeight: '500' },
              detailValue: { color: '#222', flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
              actionsContainer: { marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #eee' },
            };
            
            const filteredTasks = selectedSprint.tasks?.filter(task => {
                const matchesSearchTerm = searchTerm === '' ||
                  task.taskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  task.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = filterStatus === 'Tất cả trạng thái' || task.status === filterStatus;
                const matchesReviewResult = filterReviewResult === 'Tất cả kết quả' || task.reviewResult === filterReviewResult;
                return matchesSearchTerm && matchesStatus && matchesReviewResult;
              }) || [];

            if (filteredTasks.length === 0) {
              return (
                <div style={{ textAlign: 'center', padding: '20px', color: '#777' }}>
                  Không tìm thấy task.
                </div>
              );
            }

            return (
              <div style={mobileTaskStyles.listContainer}>
                {filteredTasks.map(task => {
                   const statusStyle = getTaskStatusStyle(task.status);
                   const reviewStyle = getReviewResultStyle(task.reviewResult);
                   return (
                    <div key={task._id} style={{ ...mobileTaskStyles.card, borderLeft: `5px solid ${statusStyle.backgroundColor || '#1976d2'}` }}>
                      <div style={mobileTaskStyles.cardHeader}>
                        <span style={mobileTaskStyles.taskId}>{task.taskId}</span>
                        <span style={{...statusStyle, padding: '4px 10px', borderRadius: '12px', fontSize: '0.9em' }}>{task.status}</span>
                      </div>
                      <p style={mobileTaskStyles.taskName}>{task.name}</p>
                      <div style={mobileTaskStyles.taskDetailsGrid}>
                          <div style={mobileTaskStyles.detailItem}><span style={mobileTaskStyles.detailLabel}>Người giao</span><span style={mobileTaskStyles.detailValue}>{task.assigner?.name || '-'}</span></div>
                          <div style={mobileTaskStyles.detailItem}><span style={mobileTaskStyles.detailLabel}>Người xử lý</span><span style={mobileTaskStyles.detailValue}>{task.assignee?.name || '-'}</span></div>
                          <div style={mobileTaskStyles.detailItem}><span style={mobileTaskStyles.detailLabel}>Người review</span><span style={mobileTaskStyles.detailValue}>{task.reviewer?.name || '-'}</span></div>
                          <div style={mobileTaskStyles.detailItem}><span style={mobileTaskStyles.detailLabel}>Kết quả</span><span style={{...reviewStyle, ...mobileTaskStyles.detailValue}}>{task.reviewResult}</span></div>
                      </div>
                      <div style={mobileTaskStyles.actionsContainer}>
                        {renderActionButtons(task)}
                      </div>
                    </div>
                   )
                })}
              </div>
            );
          })() : (
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
                          <td colSpan="9" style={{ textAlign: 'center', padding: '20px', color: '#777' }}>
                          Không tìm thấy task dự án.
                          <br />
                          Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc.
                        </td>
                      </tr>
                    );
                  }

                  return filteredTasks.map((task, index) => (
                    <tr key={task._id || `${task.taskId}-${index}`} style={styles.taskTableRow}>
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
          )}
        </div>
      )}
      {activeSprintSubTab === 'members' && (
        <div>
          <div style={responsiveControlsContainerStyle}>
            <div style={responsiveFiltersWrapperStyle}>
              <div style={newStyles.searchInputWrapper}>
                <img
                  src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
                  alt="search icon"
                  style={newStyles.searchIcon}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo UserID hoặc Email..."
                  value={memberSearchTerm}
                  onChange={e => setMemberSearchTerm(e.target.value)}
                  style={{ ...responsiveNewSearchInputStyle, minWidth: 0, width: isMobile ? '100%' : 500 }}
                />
              </div>
              <select
                value={memberRoleFilter}
                onChange={e => setMemberRoleFilter(e.target.value)}
                style={responsiveNewFilterDropdownStyle}
              >
                <option value="Tất cả vai trò">Tất cả vai trò</option>
                {Array.from(new Set(sprintMembers.map(m => m.role))).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>
          {isMobile ? (() => {
             const mobileMemberStyles = {
                listContainer: { padding: '10px 0' },
                card: { background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: '16px', marginBottom: '16px', borderLeft: `5px solid #5a6a85`},
                detailRow: { marginBottom: '10px', display: 'flex', alignItems: 'center' },
                detailLabel: { fontWeight: '600', color: '#5a6a85', width: '80px', flexShrink: 0},
                detailValue: { color: '#222', flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
                name: { fontWeight: '700', fontSize: '1.2em', marginBottom: '12px', color: '#2d3a4a' },
             };
            const filteredMembers = sprintMembers.filter(member => {
              const matchSearch = memberSearchTerm === '' || member.userID.toLowerCase().includes(memberSearchTerm.toLowerCase()) || member.email.toLowerCase().includes(memberSearchTerm.toLowerCase());
              const matchRole = memberRoleFilter === 'Tất cả vai trò' || member.role === memberRoleFilter;
              return matchSearch && matchRole;
            });
            if (filteredMembers.length === 0) return <p style={{ textAlign: 'center', padding: '20px', color: '#777' }}>Không có nhân sự nào.</p>;

            return (
              <div style={mobileMemberStyles.listContainer}>
                {filteredMembers.map((member, index) => (
                    <div key={member.userID || index} style={mobileMemberStyles.card}>
                        <p style={mobileMemberStyles.name}>{member.name}</p>
                        <div style={mobileMemberStyles.detailRow}><span style={mobileMemberStyles.detailLabel}>UserID:</span><span style={mobileMemberStyles.detailValue}>{member.userID}</span></div>
                        <div style={mobileMemberStyles.detailRow}><span style={mobileMemberStyles.detailLabel}>Email:</span><span style={mobileMemberStyles.detailValue}>{member.email}</span></div>
                        <div style={mobileMemberStyles.detailRow}><span style={mobileMemberStyles.detailLabel}>SĐT:</span><span style={mobileMemberStyles.detailValue}>{member.phoneNumber}</span></div>
                        <div style={mobileMemberStyles.detailRow}><span style={mobileMemberStyles.detailLabel}>Vai trò:</span><span style={mobileMemberStyles.detailValue}>{member.role}</span></div>
                        <div style={mobileMemberStyles.detailRow}><span style={mobileMemberStyles.detailLabel}>Nguồn lực:</span><span style={mobileMemberStyles.detailValue}>{member.resource}</span></div>
                    </div>
                ))}
              </div>
            );
          })() : sprintMembers.length > 0 ? (
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
                  {sprintMembers.filter(member => {
                    const matchSearch =
                      memberSearchTerm === '' ||
                      member.userID.toLowerCase().includes(memberSearchTerm.toLowerCase()) ||
                      member.email.toLowerCase().includes(memberSearchTerm.toLowerCase());
                    const matchRole =
                      memberRoleFilter === 'Tất cả vai trò' || member.role === memberRoleFilter;
                    return matchSearch && matchRole;
                  }).map((member, index) => (
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
        <div style={{ ...styles.notesSection, maxWidth: 600, margin: '0 auto' }}>
          <h3 style={{ ...styles.subSectionTitle, marginBottom: 18 }}>Thêm ghi chú/lời nhắn:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            <textarea
              style={{
                ...styles.noteInput,
                borderRadius: 12,
                border: '1.5px solid #e3e9f7',
                padding: '14px 18px',
                fontSize: '1.08em',
                minHeight: 70,
                boxShadow: '0 2px 8px rgba(44,62,80,0.04)',
                outline: 'none',
                transition: 'border 0.2s',
                resize: 'vertical',
              }}
              placeholder="Nhập ghi chú hoặc lời nhắn mới..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              rows={4}
              onFocus={e => e.target.style.border = '1.5px solid #1976d2'}
              onBlur={e => e.target.style.border = '1.5px solid #e3e9f7'}
            />
            <button
              onClick={handleSaveNote}
              style={{
                ...styles.saveNoteButton,
                background: '#1976d2',
                color: '#fff',
                borderRadius: 8,
                padding: '10px 28px',
                fontWeight: 600,
                fontSize: '1.08em',
                border: 'none',
                alignSelf: 'flex-end',
                boxShadow: '0 2px 8px rgba(44,62,80,0.08)',
                cursor: 'pointer',
                transition: 'background 0.18s',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#1565c0'}
              onMouseOut={e => e.currentTarget.style.background = '#1976d2'}
            >Lưu Ghi Chú</button>
          </div>
          {selectedSprint.notes && selectedSprint.notes.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <h3 style={{ ...styles.subSectionTitle, marginBottom: 0 }}>Các ghi chú hiện có:</h3>
              {[...selectedSprint.notes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((note, index) => (
                <div key={note._id || index} style={{
                  background: '#fff',
                  borderRadius: 14,
                  boxShadow: '0 2px 12px rgba(44,62,80,0.07)',
                  padding: '18px 22px',
                  marginBottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  <p style={{ fontSize: '1.09em', color: '#222', margin: 0, fontWeight: 500 }}>{note.content}</p>
                  <p style={{ fontSize: '0.97em', color: '#888', margin: 0, fontWeight: 400 }}>
                    Được tạo bởi {note.createdBy?.name || 'Người dùng ẩn danh'} vào lúc {formatDateTime(note.createdAt)}
                  </p>
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
            if (!selectedSprint.history && (!selectedSprint.tasks || selectedSprint.tasks.every(task => !task.history || task.history.length === 0))) {
              return <p style={styles.noHistoryMessage}>Chưa có lịch sử cập nhật nào cho sprint này.</p>;
            }

            let combinedHistory = [];

            // Gộp lịch sử của sprint
            if (selectedSprint.history) {
              combinedHistory = combinedHistory.concat(selectedSprint.history.map(item => ({ ...item, type: 'sprint' })));
            }

            // Gộp lịch sử của từng task
            if (selectedSprint.tasks) {
              selectedSprint.tasks.forEach(task => {
                if (task.history) {
                  combinedHistory = combinedHistory.concat(task.history.map(item => ({ ...item, type: 'task', taskId: task.taskId, taskName: task.name })));
                }
              });
            }

            // Sắp xếp theo thời gian mới nhất
            combinedHistory.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

            return (
              <div style={styles.historyListContainer}>
                {combinedHistory.map((item, index) => {
                  let actionText = item.action;

                  if (item.type === 'sprint') {
                    if (item.action === 'Tạo sprint mới') {
                      actionText = `đã tạo ${selectedSprint.name}`;
                    } else if (item.action === 'Tạo task') {
                      actionText = `đã tạo Task: ${item.newValue?.name || ''}`;
                    } else if (item.action === 'Tải lên tài liệu') {
                      actionText = `đã tải lên (${item.newValue?.fileName || 'tài liệu'})`;
                    } else if (item.action === 'Xóa tài liệu') {
                      actionText = `đã xóa tài liệu (${item.newValue?.fileName || 'không rõ'})`;
                    } else if (item.action === 'Cập nhật trạng thái sprint') {
                      actionText = `đã cập nhật trạng thái sprint thành "${item.newValue}"`;
                    } else if (item.action === 'Cập nhật nghiệm thu') {
                      actionText = `đã cập nhật nghiệm thu thành "${item.newValue}"`;
                    } else if (item.action === 'Thêm ghi chú') {
                      actionText = 'đã thêm ghi chú Sprint';
                    }
                  } else if (item.type === 'task') {
                    if (item.action === 'Cập nhật trạng thái') {
                      actionText = `đã cập nhật trạng thái "${item.newValue}" cho task ${item.taskId}`;
                    } else if (item.action === 'Cập nhật kết quả review') {
                      actionText = `đã cập nhật kết quả review "${item.newValue}" cho task ${item.taskId}`;
                    }
                  }

                  // Format timestamp
                  const formatTime = (dateString) => {
                    const date = new Date(dateString);
                    const hours = date.getHours().toString().padStart(2, '0');
                    const minutes = date.getMinutes().toString().padStart(2, '0');
                    const day = date.getDate().toString().padStart(2, '0');
                    const month = (date.getMonth() + 1).toString().padStart(2, '0');
                    const year = date.getFullYear();
                    return `${hours}:${minutes} ${day}/${month}/${year}`;
                  };

                  return (
                    <div key={index} style={styles.historyItem}>
                      <div style={styles.historyContent}>
                        <span style={styles.historyTimestamp}>
                          {formatTime(item.updatedAt)}
                        </span>
                        <span style={styles.historyUser}>
                          {' '}{item.updatedBy?.name || 'Người dùng ẩn danh'}
                        </span>
                        <span style={styles.historyAction}>
                          {' '}{actionText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      <NewTaskPopup 
        isOpen={isNewTaskPopupOpen} 
        onClose={handleCloseNewTaskPopup} 
        sprintId={selectedSprint?._id} 
        onTaskAdded={() => {}}
        styles={styles}
      />
    </div>
  );
};

export default SprintDetailSection; 