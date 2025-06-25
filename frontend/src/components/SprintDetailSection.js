import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NewTaskPopup from './NewTaskPopup';
import CopyToast from './common/CopyToast';

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

  const canManageSprint = currentUser && (currentUser.role === 'admin' || currentUser.role === 'pm');

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
      }).filter(Boolean); // Filter out null members if any user is not populated
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
                </div>
                <div className="tooltip-container">
                  <button
                    onClick={() => handleUpdateReviewResult(task._id, 'Không đạt')}
                    style={getReviewButtonStyle('Không đạt')}
                  >
                    <span style={{ color: '#F44336', fontSize: '16px' }}>✕</span>
                  </button>
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
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={styles.sprintContent}>
      <CopyToast show={copyFeedback.show} message={copyFeedback.message} onClose={() => onRefreshSprintSection ? setTimeout(() => {}, 0) : null} />
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
        };

        // Helper for badge color
        const getBadgeStyle = (status) => {
          if (status === 'Đã kết thúc' || status === 'Đã nghiệm thu') return { ...localStyles.badge, ...localStyles.badgeDone };
          if (status === 'Đang chạy') return { ...localStyles.badge, ...localStyles.badgeProgress };
          if (status === 'Chưa bắt đầu' || status === 'Chưa nghiệm thu') return { ...localStyles.badge, ...localStyles.badgePending };
          if (status === 'Không đạt') return { ...localStyles.badge, ...localStyles.badgeRejected };
          return localStyles.badge;
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
                    <div style={styles.pullRequestContainer}>
                      <a href={selectedSprint.pullRequest} target="_blank" rel="noopener noreferrer" style={styles.link}>
                        {selectedSprint.pullRequest.length > 40 ? selectedSprint.pullRequest.substring(0, 27) + '...' : selectedSprint.pullRequest}
                      </a>
                      <button onClick={() => handleCopy(selectedSprint.pullRequest)} style={{...styles.copyButton, marginLeft: '8px'}}>
                        <img src="https://img.icons8.com/ios-filled/15/1976d2/copy.png" alt="copy icon" />
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
                <div style={localStyles.fileList}>
                  {selectedSprint.deliverables.map((file, index) => (
                    <div key={file._id || index} style={localStyles.fileCard} onMouseOver={e => e.currentTarget.style.background = '#e3e9f7'} onMouseOut={e => e.currentTarget.style.background = '#f8fafc'}>
                      <img src={getFileIcon(file.fileUrl.split('/').pop()).props.src} alt="file" style={localStyles.fileIcon} />
                      <div style={localStyles.fileText}>
                        <span style={localStyles.fileName}>{(() => { const fileName = file.fileName || file.fileUrl.split('/').pop(); if (fileName.length > 20) { const lastDotIndex = fileName.lastIndexOf('.'); if (lastDotIndex !== -1 && lastDotIndex > fileName.length - 8) { return fileName.substring(0, 16) + '...' + fileName.substring(lastDotIndex); } else { return fileName.substring(0, 17) + '...'; } } return fileName; })()}</span>
                        {file.size && <span style={localStyles.fileMeta}>{formatFileSize(file.size)}</span>}
                        {file.uploadedBy && (
                          <span style={localStyles.fileUploader}>{file.uploadedBy.name}</span>
                        )}
                        {file.uploadedAt && <span style={localStyles.fileMeta}>Updated at: {formatDate(file.uploadedAt)}</span>}
                      </div>
                      <div style={localStyles.fileActions}>
                        <button style={styles.fileCardDownloadButton} onClick={() => handleDownloadSprintDeliverable(selectedSprint._id, file._id, file.fileName)}>
                          <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download icon" style={{ width: '16px', height: '16px' }} />
                        </button>
                        {canManageSprint && (
                          <button style={{ ...styles.fileCardDownloadButton, backgroundColor: '#ffebee' }} onClick={() => handleDeleteSprintDeliverable(file._id, file.fileName)}>
                            <img src="https://img.icons8.com/material-outlined/16/000000/trash--v1.png" alt="delete icon" style={{ width: '16px', height: '16px' }} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p style={localStyles.noInfoText}>Chưa có tài liệu nào được tải lên.</p>}

              {canManageSprint && (
                <div style={{ ...styles.fileUploadControl, marginTop: '20px' }}>
                  <label htmlFor="sprint-file-upload" style={styles.uploadDocumentButton}>+ Upload/Cập nhật tài liệu</label>
                  <input id="sprint-file-upload" type="file" multiple onChange={handleUploadFileChange} style={{ display: 'none' }} />
                  {uploadFiles.length > 0 && <span style={styles.uploadFileNameDisplay}>{uploadFiles.map(file => file.name).join(', ')}</span>}
                  {uploadFiles.length > 0 && <button onClick={handleUploadDocument} style={styles.uploadConfirmButton}>Tải lên</button>}
                </div>
              )}
            </div>
          </div>
        );
      })()}

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
            {canManageSprint && (
              <button onClick={handleOpenNewTaskPopup} style={styles.addTaskButton}>+ Thêm Task</button>
            )}
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
                  placeholder="Tìm kiếm theo UserID hoặc Email..."
                  value={memberSearchTerm}
                  onChange={e => setMemberSearchTerm(e.target.value)}
                  style={{ ...styles.searchInputField, minWidth: 0, width: 500 }}
                />
              </div>
              <select
                value={memberRoleFilter}
                onChange={e => setMemberRoleFilter(e.target.value)}
                style={styles.filterDropdownStyle}
              >
                <option value="Tất cả vai trò">Tất cả vai trò</option>
                {Array.from(new Set(sprintMembers.map(m => m.role))).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
          </div>
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
        onTaskAdded={onRefreshSprintSection} 
        styles={styles} // Pass styles from parent for consistency
      />
    </div>
  );
};

export default SprintDetailSection; 