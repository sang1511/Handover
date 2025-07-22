import React, { useState, useEffect } from 'react';
import axiosInstance from '../../api/axios';
import TaskService from '../../api/services/task.service';
import NewTaskPopup from '../popups/NewTaskPopup';
import CopyToast from '../common/CopyToast';
import socketManager from '../../utils/socket';
import styles from './SprintDetailSection.module.css';
import EditSprintPopup from '../popups/EditSprintPopup';
import AddMemberToSprintPopup from '../popups/AddMemberToSprintPopup';
import deleteRedIcon from '../../asset/delete_red.png';
import deleteWhiteIcon from '../../asset/delete_white.png';
import SprintService from '../../api/services/sprint.service';
import HistoryList from '../common/HistoryList';
import { Typography } from '@mui/material';

// Popup nhập comment review
function ReviewCommentDialog({ open, onClose, onSubmit, reviewStatus, taskName }) {
  const [comment, setComment] = useState('');
  useEffect(() => {
    if (open) setComment('');
  }, [open]);
  if (!open) return null;
  let statusColor = '#888';
  if (reviewStatus === 'Đạt') statusColor = '#219653';
  else if (reviewStatus === 'Không đạt') statusColor = '#d32f2f';
  return (
    <div className={styles.reviewDialogOverlay}>
      <div className={styles.reviewDialogBox}>
        <div className={styles.reviewDialogTitle}>Nhận xét, đánh giá task '{taskName}'</div>
        <div className={styles.reviewDialogStatus} style={{ color: statusColor }}>
          ({reviewStatus})
        </div>
        <div className={styles.reviewDialogDesc}>
          Bạn có thể để lại nhận xét về chất lượng, kết quả hoặc vấn đề của task này. Nếu không có nhận xét, hãy bấm <b>Bỏ qua</b>.
        </div>
        <textarea
          className={styles.reviewDialogTextarea}
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Nhập nhận xét..."
          rows={6}
        />
        <div className={styles.reviewDialogActions}>
          <button
            className={styles.reviewDialogButton}
            onClick={() => onSubmit(comment)}
            disabled={!comment.trim()}
          >Xác nhận</button>
          <button
            className={styles.reviewDialogButtonSkip}
            onClick={() => onSubmit('')}
          >Bỏ qua</button>
          <button
            className={styles.reviewDialogButtonCancel}
            onClick={onClose}
          >Hủy</button>
        </div>
      </div>
    </div>
  );
}

const SprintDetailSection = ({
  selectedSprint,
  formatDate,
  activeSprintSubTab,
  setActiveSprintSubTab,
  onRefreshSprintSection,
  currentUser,
  onProjectStatusChange,
  projectMembers,
  onSprintEditSuccess,
}) => {
  const [isNewTaskPopupOpen, setIsNewTaskPopupOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Tất cả trạng thái');
  const [filterReviewStatus, setFilterReviewStatus] = useState('Tất cả kết quả');
  const [sprintMembers, setSprintMembers] = useState([]);
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [memberRoleFilter, setMemberRoleFilter] = useState('Tất cả vai trò');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 850);
  const [tasks, setTasks] = useState([]);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showAddMemberPopup, setShowAddMemberPopup] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [hoverDeleteMany, setHoverDeleteMany] = useState(false);
  const [hoverDeleteSingle, setHoverDeleteSingle] = useState({});
  const [reviewDialog, setReviewDialog] = useState({ open: false, task: null, reviewStatus: '', onSubmit: null });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 850);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const canManageSprint = currentUser && (currentUser.role === 'admin' || currentUser.role === 'pm');

  const canAddMember = currentUser && (currentUser.role === 'admin' || (selectedSprint && selectedSprint.createdBy && selectedSprint.createdBy._id === currentUser._id));

  // Đổi lấy task theo sprintId
  useEffect(() => {
    if (!selectedSprint || !selectedSprint._id) {
      setTasks([]);
      return;
    }
    TaskService.getTasksBySprint(selectedSprint._id)
      .then(data => {
        setTasks(data);
      })
      .catch(() => {
        console.error('Có lỗi khi tải danh sách task');
      });
  }, [selectedSprint, activeSprintSubTab]);

  const fetchTasks = React.useCallback(() => {
    if (!selectedSprint || !selectedSprint._id) {
      setTasks([]);
      return;
    }
    TaskService.getTasksBySprint(selectedSprint._id)
      .then(data => setTasks(data))
      .catch(() => setTasks([]));
  }, [selectedSprint]);

  // Socket listeners for realtime updates
  useEffect(() => {
    if (!selectedSprint) return;

    // Listen for note added
    const handleNoteAdded = (data) => {
      if (data.sprintId === selectedSprint._id) {
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

    // Listen for task updates (update tasks state)
    const handleTaskUpdated = (data) => {
      if (data.sprintId === selectedSprint._id) {
        setTasks(prevTasks => prevTasks.map(task => task._id === data.updatedTask._id ? data.updatedTask : task));
      }
    };

    // Listen for new tasks added
    const handleTaskAdded = (data) => {
      if (data.sprintId === selectedSprint._id) {
        setTasks(prevTasks => [...prevTasks, data.newTask]);
      }
    };

    // Listen for bulk tasks added
    const handleTasksBulkAdded = (data) => {
      if (data.sprintId === selectedSprint._id) {
        setTasks(prevTasks => [...prevTasks, ...(data.newTasks || [])]);
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
              _id: member._id,
              userID: member.userID || 'N/A',
              name: member.name || 'N/A',
              phoneNumber: member.phoneNumber || 'N/A',
              role: member.role || 'N/A',
              email: member.email || 'N/A',
              companyName: member.companyName || '',
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

  const getTaskStatusClass = (status) => {
    switch (status) {
      case 'Chưa làm': return styles.taskStatusPending;
      case 'Đang làm': return styles.taskStatusInProgress;
      case 'Đã xong': return styles.taskStatusDone;
      default: return '';
    }
  };

  const getReviewStatusClass = (status) => {
    switch (status) {
      case 'Đạt': return styles.reviewResultApproved;
      case 'Không đạt': return styles.reviewResultRejected;
      case 'Chưa': return styles.reviewResultPending;
      default: return '';
    }
  };

  const handleOpenNewTaskPopup = () => {
    setIsNewTaskPopupOpen(true);
  };

  const handleCloseNewTaskPopup = () => {
    setIsNewTaskPopupOpen(false);
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      if (!currentUser) {
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL?.endsWith('/api') 
        ? process.env.REACT_APP_API_URL 
        : `${process.env.REACT_APP_API_URL}/api`;

      await axiosInstance.put(
        `${apiUrl}/tasks/${taskId}/status`,
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

  // Hàm mở dialog nhập comment review
  const openReviewDialog = (task, reviewStatus) => {
    setReviewDialog({
      open: true,
      task,
      reviewStatus,
      onSubmit: async (comment) => {
        await handleUpdateReviewStatus(task._id, reviewStatus, comment);
        setReviewDialog({ open: false, task: null, reviewStatus: '', onSubmit: null });
      }
    });
  };

  // Sửa hàm handleUpdateReviewStatus để nhận thêm comment
  const handleUpdateReviewStatus = async (taskId, reviewStatus, comment = '') => {
    try {
      if (!currentUser) {
        return;
      }

      const apiUrl = process.env.REACT_APP_API_URL?.endsWith('/api') 
        ? process.env.REACT_APP_API_URL 
        : `${process.env.REACT_APP_API_URL}/api`;

      await axiosInstance.put(
        `${apiUrl}/tasks/${taskId}/review-status`,
        { reviewStatus, comment },
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
      backgroundColor: task.reviewStatus === result ? '#e6e6e6' : '#fff',
      color: task.reviewStatus === result ? '#333' : '#666',
      border: `1px solid ${task.reviewStatus === result ? '#999' : '#ddd'}`,
      '&:hover': {
        backgroundColor: task.reviewStatus === result ? '#e6e6e6' : '#f5f5f5',
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
            {task.reviewStatus === 'Chưa' && (
              <>
                <div className="tooltip-container">
                  <button
                    onClick={() => openReviewDialog(task, 'Đạt')}
                    style={getReviewButtonStyle('Đạt')}
                  >
                    <span style={{ color: '#4CAF50', fontSize: '16px' }}>✓</span>
                  </button>
                  <span className="tooltip">Đạt</span>
                </div>
                <div className="tooltip-container">
                  <button
                    onClick={() => openReviewDialog(task, 'Không đạt')}
                    style={getReviewButtonStyle('Không đạt')}
                  >
                    <span style={{ color: '#F44336', fontSize: '16px' }}>✕</span>
                  </button>
                  <span className="tooltip">Không đạt</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };



  // Thay thế hàm download file cũ bằng gọi service
  const handleDownloadSprintDeliverable = (sprintId, fileId, fileName, doc) => {
    SprintService.downloadFile(sprintId, doc);
  };

  const handleSelectMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };
  const handleDeleteSelectedMembers = async () => {
    if (selectedMembers.length === 0) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa các nhân sự đã chọn khỏi sprint?')) return;
    try {
      const remainMembers = sprintMembers.filter(m => !selectedMembers.includes(m._id)).map(m => ({ user: m._id }));
      await axiosInstance.put(`/sprints/${selectedSprint._id}`, { members: remainMembers });
      setSelectedMembers([]);
      onRefreshSprintSection();
    } catch (err) {
      alert('Có lỗi khi xóa nhân sự!');
    }
  };
  const handleDeleteSingleMember = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân sự này khỏi sprint?')) return;
    try {
      const remainMembers = sprintMembers.filter(m => m._id !== userId).map(m => ({ user: m._id }));
      await axiosInstance.put(`/sprints/${selectedSprint._id}`, { members: remainMembers });
      setSelectedMembers(prev => prev.filter(id => id !== userId));
      onRefreshSprintSection();
    } catch (err) {
      alert('Có lỗi khi xóa nhân sự!');
    }
  };

  return (
    <div className={styles.sprintContent}>
      <CopyToast show={showCopyToast} message="Đã copy!" onClose={() => setShowCopyToast(false)} />
      <div className={styles.sprintDetailTabsWrapper}>
        <div className={`${styles.sprintDetailTabs} ${isMobile ? styles.mobileTabs : ''}`}>
          <button
            className={`${styles.sprintDetailTabButton} ${activeSprintSubTab === 'info' ? styles.active : ''}`}
            onClick={() => setActiveSprintSubTab('info')}
          >
            Thông tin sprint
          </button>
          <button
            className={`${styles.sprintDetailTabButton} ${activeSprintSubTab === 'tasks' ? styles.active : ''}`}
            onClick={() => setActiveSprintSubTab('tasks')}
          >
            Danh sách task
          </button>
          <button
            className={`${styles.sprintDetailTabButton} ${activeSprintSubTab === 'members' ? styles.active : ''}`}
            onClick={() => setActiveSprintSubTab('members')}
          >
            Nhân sự tham gia
          </button>
          <button
            className={`${styles.sprintDetailTabButton} ${activeSprintSubTab === 'history' ? styles.active : ''}`}
            onClick={() => setActiveSprintSubTab('history')}
          >
            Lịch sử cập nhật
          </button>
        </div>
        {canManageSprint && activeSprintSubTab === 'info' && (
          <button className={styles.editSprintButton} onClick={() => setShowEditPopup(true)} title="Chỉnh sửa sprint">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M13.5 3.5l3 3-9 9H4.5v-3l9-9z" stroke="#1976d2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M12.5 4.5l3 3" stroke="#1976d2" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{marginLeft: 6}}>Chỉnh sửa</span>
          </button>
        )}
      </div>
      <EditSprintPopup
        open={showEditPopup}
        sprint={selectedSprint}
        onClose={() => setShowEditPopup(false)}
        onUpdated={() => {
          setShowEditPopup(false);
          onRefreshSprintSection();
          if (onSprintEditSuccess) onSprintEditSuccess();
        }}
      />

      {activeSprintSubTab === 'info' && (() => {
        // Helper for badge color
        const getBadgeClass = (status) => {
          if (status === 'Hoàn thành' || status === 'Đã kết thúc' || status === 'Đã nghiệm thu') return `${styles.badge} ${styles.badgeDone}`;
          if (status === 'Đang thực hiện' || status === 'Đang chạy') return `${styles.badge} ${styles.badgeProgress}`;
          if (status === 'Chưa bắt đầu' || status === 'Chưa nghiệm thu') return `${styles.badge} ${styles.badgePending}`;
          if (status === 'Không đạt') return `${styles.badge} ${styles.badgeRejected}`;
          return styles.badge;
        };
        return (
          <div className={styles.infoTabContainer}>
            <div className={styles.infoGrid}>
              {/* Card 1: Thời gian, Trạng thái, Repo, Branch */}
              <div className={styles.infoCard}>
                <h3 className={styles.cardTitle}><img src="https://img.icons8.com/ios-filled/28/1976d2/info--v1.png" alt="info"/>Thông tin sprint</h3>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><img src="https://img.icons8.com/ios-filled/20/FFA726/calendar--v1.png" alt="calendar"/>Thời gian:</span>
                  <span className={styles.infoValue}>{`${formatDate(selectedSprint.startDate)} - ${formatDate(selectedSprint.endDate)}`}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><img src="https://img.icons8.com/ios-filled/20/1976d2/flag--v1.png" alt="status"/>Trạng thái sprint:</span>
                  <span className={getBadgeClass(selectedSprint.status)}>{selectedSprint.status}</span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><img src="https://img.icons8.com/ios-filled/20/00ACC1/pull-request.png" alt="repo"/>Link Repo:</span>
                  {selectedSprint.repoLink ? (
                    <div className={styles.linkRepoContainer}>
                      <a href={selectedSprint.repoLink} target="_blank" rel="noopener noreferrer" className={styles.link}>
                        {selectedSprint.repoLink.length > 40 ? selectedSprint.repoLink.substring(0, 27) + '...' : selectedSprint.repoLink}
                      </a>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedSprint.repoLink);
                          setShowCopyToast(true);
                        }}
                        className={styles.copyButton}
                        title="Copy repo link"
                      >
                        <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="6" y="6" width="9" height="9" rx="2" stroke="#1976d2" strokeWidth="1.5"/><rect x="3" y="3" width="9" height="9" rx="2" stroke="#1976d2" strokeWidth="1.5" fill="#fff"/></svg>
                      </button>
                    </div>
                  ) : <span className={styles.noInfoText}>Không có thông tin link repo.</span>}
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoLabel}><img src="https://img.icons8.com/ios-filled/20/8E24AA/code-fork.png" alt="branch"/>Branch:</span>
                  <span className={styles.infoValue}>{selectedSprint.gitBranch || <span className={styles.noInfoText}>Không có thông tin branch.</span>}</span>
                </div>
              </div>
              {/* Card 2: Mô tả mục tiêu sprint */}
              <div className={`${styles.infoCard} ${styles.goalCard}`}>
                <h3 className={styles.cardTitle}><img src="https://img.icons8.com/ios-filled/28/FA2B4D/goal.png" alt="goal"/>Mục tiêu sprint</h3>
                <div className={styles.goalContentBox}>
                  {selectedSprint.goal && selectedSprint.goal.trim() ? (
                    <div className={styles.goalContent}>{selectedSprint.goal}</div>
                  ) : (
                    <div className={styles.noGoal}>Không có mô tả</div>
                  )}
                </div>
              </div>
            </div>
            {/* Section 3: Tài liệu sprint */}
            <div className={styles.docsSection}>
              <h3 className={styles.docsTitle}>Tài liệu sprint</h3>
              {selectedSprint.docs && selectedSprint.docs.length > 0 ? (
                <div className={`${styles.docsGrid} ${isMobile ? styles.mobileDocsGrid : ''}`}>
                  {selectedSprint.docs.map((doc, idx) => (
                    <div key={idx} className={styles.docItem}>
                      <div className={styles.docIcon}>📄</div>
                      <div className={styles.docContent}>
                        <span className={styles.docFileName} title={doc.fileName}>
                          {(() => {
                            const fileName = doc.fileName;
                            if (!fileName) return '';
                            if (fileName.length <= 20) return fileName;
                            const lastDotIndex = fileName.lastIndexOf('.');
                            if (lastDotIndex === -1) return fileName.substring(0, 17) + '...';
                            const name = fileName.substring(0, lastDotIndex);
                            const extension = fileName.substring(lastDotIndex);
                            if (name.length <= 17) return fileName;
                            return name.substring(0, 17) + '...' + extension;
                          })()}
                        </span>
                        <span className={styles.docFileSize}>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                        <span className={styles.docUploadDate}>{doc.uploadedAt ? `,   ${new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}` : ''}</span>
                      </div>
                      <button className={styles.docDownloadButton} title="Tải xuống" onClick={() => handleDownloadSprintDeliverable(selectedSprint._id, doc.fileId, doc.fileName, doc)}>
                        <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download" className={styles.downloadIcon} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyDocs}>
                  <span className={styles.emptyDocsIcon}>📄</span>
                  <p className={styles.emptyDocsText}>Chưa có tài liệu sprint nào</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {activeSprintSubTab === 'tasks' && (
        <div>
          <div className={`${styles.headerControlsContainer} ${isMobile ? styles.mobileControls : ''}`}>
            <div className={`${styles.searchAndFiltersWrapper} ${isMobile ? styles.mobileFilters : ''}`}>
              <div className={styles.searchInputWrapper}>
                <img
                  src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
                  alt="search icon"
                  className={styles.searchIcon}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo ID hoặc tên task..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${styles.searchInput} ${isMobile ? styles.mobileSearchInput : ''}`}
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`${styles.select} ${isMobile ? styles.mobileSelect : ''}`}
              >
                <option value="Tất cả trạng thái">Tất cả trạng thái</option>
                <option value="Chưa làm">Chưa làm</option>
                <option value="Đang làm">Đang làm</option>
                <option value="Đã xong">Đã xong</option>
              </select>
              <select
                value={filterReviewStatus}
                onChange={(e) => setFilterReviewStatus(e.target.value)}
                className={`${styles.select} ${isMobile ? styles.mobileSelect : ''}`}
              >
                <option value="Tất cả kết quả">Tất cả kết quả</option>
                <option value="Đạt">Đạt</option>
                <option value="Không đạt">Không đạt</option>
                <option value="Chưa">Chưa</option>
              </select>
            </div>
            {canManageSprint && (
              <button onClick={handleOpenNewTaskPopup} className={`${styles.addTaskButton} ${isMobile ? styles.mobileAddButton : ''}`}>+ Thêm Task</button>
            )}
          </div>
          {isMobile ? (() => {
            
            const filteredTasks = tasks.filter(task => {
                const matchesSearchTerm = searchTerm === '' ||
                  task.taskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  task.name.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesStatus = filterStatus === 'Tất cả trạng thái' || task.status === filterStatus;
                const matchesReviewStatus = filterReviewStatus === 'Tất cả kết quả' || task.reviewStatus === filterReviewStatus;
                return matchesSearchTerm && matchesStatus && matchesReviewStatus;
              }) || [];

            if (filteredTasks.length === 0) {
              return (
                <div className={styles.noDataMessage}>
                  Không tìm thấy task.
                </div>
              );
            }

            return (
              <div className={styles.mobileTaskListContainer}>
                {filteredTasks.map(task => {
                   return (
                    <div key={task._id} className={`${styles.mobileTaskCard} ${getTaskStatusClass(task.status)}`}>
                      <div className={styles.mobileTaskCardHeader}>
                        <span className={styles.mobileTaskId}>{task.taskId}</span>
                        <span className={`${getTaskStatusClass(task.status)} ${styles.mobileStatusBadge}`}>{task.status}</span>
                      </div>
                      <p className={styles.mobileTaskName}>{task.name}</p>
                      <div className={styles.mobileTaskDetailsGrid}>
                          <div className={styles.mobileTaskDetailItem}><span className={styles.mobileTaskDetailLabel}>Người xử lý</span><span className={styles.mobileTaskDetailValue}>{task.assignee?.name || '-'}</span></div>
                          <div className={styles.mobileTaskDetailItem}><span className={styles.mobileTaskDetailLabel}>Người review</span><span className={styles.mobileTaskDetailValue}>{task.reviewer?.name || '-'}</span></div>
                          <div className={styles.mobileTaskDetailItem}><span className={styles.mobileTaskDetailLabel}>Kết quả review</span><span className={`${getReviewStatusClass(task.reviewStatus)} ${styles.mobileTaskDetailValue}`}>{task.reviewStatus}</span></div>
                      </div>
                      <div className={styles.mobileTaskActionsContainer}>
                        {renderActionButtons(task)}
                      </div>
                    </div>
                   )
                })}
              </div>
            );
          })() : (
          <div className={styles.taskTableContainer}>
            <table className={styles.taskTable}>
              <thead>
                <tr className={styles.taskTableHeaderRow}>
                  <th className={`${styles.taskTableHeader} ${styles.taskIDColumn}`}>ID</th>
                  <th className={`${styles.taskTableHeader} ${styles.taskNameColumn}`}>Tên task</th>
                  <th className={`${styles.taskTableHeader} ${styles.taskPersonColumn}`}>Người xử lý</th>
                  <th className={`${styles.taskTableHeader} ${styles.taskStatusColumn}`}>Trạng thái</th>
                  <th className={`${styles.taskTableHeader} ${styles.taskPersonColumn}`}>Người review</th>
                  <th className={`${styles.taskTableHeader} ${styles.taskResultColumn}`}>Kết quả review</th>
                  <th className={`${styles.taskTableHeader} ${styles.taskActionColumn}`}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {tasks && (() => {
                  const filteredTasks = tasks.filter(task => {
                    const matchesSearchTerm = searchTerm === '' ||
                      task.taskId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      task.name.toLowerCase().includes(searchTerm.toLowerCase());
                    const matchesStatus = filterStatus === 'Tất cả trạng thái' || task.status === filterStatus;
                    const matchesReviewStatus = filterReviewStatus === 'Tất cả kết quả' || task.reviewStatus === filterReviewStatus;
                    return matchesSearchTerm && matchesStatus && matchesReviewStatus;
                  });

                  if (filteredTasks.length === 0) {
                    return (
                      <tr>
                          <td colSpan="9" className={styles.noDataMessage}>
                          Không tìm thấy task dự án.
                          <br />
                          Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc.
                        </td>
                      </tr>
                    );
                  }

                  return filteredTasks.map((task, index) => (
                    <tr 
                      key={task._id || `${task.taskId}-${index}`} 
                      className={`${styles.taskTableRow} ${index % 2 === 0 ? styles.evenRow : styles.oddRow}`}
                    >
                      <td style={{width: 80, minWidth: 60}} className={`${styles.taskTableCell} ${styles.taskIDColumn} ${styles.taskIDCell}`}>{task.taskId}</td>
                      <td style={{width: 220, minWidth: 120, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} className={`${styles.taskTableCell} ${styles.taskNameColumn}`}>{task.name}</td>
                      <td style={{width: 120, minWidth: 80}} className={`${styles.taskTableCell} ${styles.taskPersonColumn}`}>{task.assignee?.name || '-'}</td>
                      <td style={{width: 110, minWidth: 80}} className={`${styles.taskTableCell} ${styles.taskStatusColumn}`}>
                        <span className={getTaskStatusClass(task.status)}>{task.status || '-'}</span>
                      </td>
                      <td style={{width: 120, minWidth: 80}} className={`${styles.taskTableCell} ${styles.taskPersonColumn}`}>{task.reviewer?.name || '-'}</td>
                      <td style={{width: 120, minWidth: 80}} className={`${styles.taskTableCell} ${styles.taskResultColumn}`}>
                        <span className={getReviewStatusClass(task.reviewStatus)}>{task.reviewStatus || '-'}</span>
                      </td>
                      <td style={{width: 80, minWidth: 60}} className={`${styles.taskTableCell} ${styles.taskActionColumn}`}>
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
          <div className={`${styles.headerControlsContainer} ${isMobile ? styles.mobileControls : ''}`}>
            <div className={`${styles.searchAndFiltersWrapper} ${isMobile ? styles.mobileFilters : ''}`}>
              <div className={styles.searchInputWrapper}>
                <img
                  src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
                  alt="search icon"
                  className={styles.searchIcon}
                />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo UserID hoặc Email..."
                  value={memberSearchTerm}
                  onChange={e => setMemberSearchTerm(e.target.value)}
                  className={`${styles.searchInput} ${isMobile ? styles.mobileSearchInput : ''}`}
                  style={{ minWidth: 0, width: isMobile ? '100%' : 500 }}
                />
              </div>
              <select
                value={memberRoleFilter}
                onChange={e => setMemberRoleFilter(e.target.value)}
                className={`${styles.select} ${isMobile ? styles.mobileSelect : ''}`}
              >
                <option value="Tất cả vai trò">Tất cả vai trò</option>
                {Array.from(new Set(sprintMembers.map(m => m.role))).map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 8 : 10, marginLeft: isMobile ? 0 : 12 }}>
              {canAddMember && (
                <button
                  style={{
                    background: selectedMembers.length > 0 ? (hoverDeleteMany ? '#d81b3a' : '#FA2B4D') : '#eee',
                    color: selectedMembers.length > 0 ? '#fff' : '#888',
                    border: 'none',
                    borderRadius: 8,
                    padding: '8px 18px',
                    fontWeight: 600,
                    fontSize: 15,
                    cursor: selectedMembers.length > 0 ? 'pointer' : 'not-allowed',
                    transition: 'background 0.2s',
                  }}
                  disabled={selectedMembers.length === 0}
                  onClick={handleDeleteSelectedMembers}
                  onMouseEnter={() => setHoverDeleteMany(true)}
                  onMouseLeave={() => setHoverDeleteMany(false)}
                >
                  <img src={selectedMembers.length > 0 ? deleteWhiteIcon : deleteRedIcon} alt="delete" style={{width: 20, height: 20, objectFit: 'contain', display: 'inline-block', marginRight: 6, filter: hoverDeleteMany && selectedMembers.length > 0 ? 'brightness(0.95) drop-shadow(0 2px 4px #d81b3a33)' : undefined}} />
                  Xóa nhiều
                </button>
              )}
              {canAddMember && (
                <button className={styles.addTaskButton} style={{marginLeft: isMobile ? 0 : 0}} onClick={() => setShowAddMemberPopup(true)}>+ Thêm nhân sự</button>
              )}
            </div>
          </div>
          {isMobile ? (() => {
            const filteredMembers = sprintMembers.filter(member => {
              const matchSearch = memberSearchTerm === '' || member.userID.toLowerCase().includes(memberSearchTerm.toLowerCase()) || member.email.toLowerCase().includes(memberSearchTerm.toLowerCase());
              const matchRole = memberRoleFilter === 'Tất cả vai trò' || member.role === memberRoleFilter;
              return matchSearch && matchRole;
            });
            if (filteredMembers.length === 0) return <p className={styles.noDataMessage}>Không có nhân sự nào.</p>;

            return (
              <div className={styles.mobileMemberListContainer}>
                {filteredMembers.map((member, index) => (
                    <div key={member.userID || index} className={styles.mobileMemberCard}>
                        <p className={styles.mobileMemberName}>{member.name}</p>
                        <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>UserID:</span><span className={styles.mobileMemberDetailValue}>{member.userID}</span></div>
                        <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>Email:</span><span className={styles.mobileMemberDetailValue}>{member.email}</span></div>
                        <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>SĐT:</span><span className={styles.mobileMemberDetailValue}>{member.phoneNumber}</span></div>
                        <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>Vai trò:</span><span className={styles.mobileMemberDetailValue}>{member.role}</span></div>
                        <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>Công ty:</span><span className={styles.mobileMemberDetailValue}>{member.companyName}</span></div>
                    </div>
                ))}
              </div>
            );
          })() : sprintMembers.length > 0 ? (
            <div className={styles.taskTableContainer}>
              <table className={styles.taskTable}>
                <thead>
                  <tr className={styles.taskTableHeaderRow}>
                    {canAddMember && <th className={styles.taskTableHeader} style={{width: 36}}></th>}
                    <th className={styles.taskTableHeader}>ID</th>
                    <th className={`${styles.taskTableHeader} ${styles.memberNameColumn}`}>Tên</th>
                    <th className={`${styles.taskTableHeader} ${styles.memberPhoneColumn}`}>SĐT</th>
                    <th className={`${styles.taskTableHeader} ${styles.memberEmailColumn}`}>Email</th>
                    <th className={styles.taskTableHeader}>Vai trò</th>
                    <th className={`${styles.taskTableHeader} ${styles.memberCompanyColumn}`}>Công ty</th>
                    {canAddMember && <th className={styles.taskTableHeader} style={{width: 60, textAlign: 'center'}}>Hành động</th>}
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
                  }).map((member, index, arr) => (
                    <tr key={member.userID || index} className={`${styles.taskTableRow} ${index % 2 === 0 ? styles.evenRow : styles.oddRow}`}>
                      {canAddMember && (
                        <td className={styles.taskTableCell} style={{textAlign: 'center'}}>
                          <input
                            type="checkbox"
                            checked={selectedMembers.includes(member._id)}
                            onChange={() => handleSelectMember(member._id)}
                          />
                        </td>
                      )}
                      <td className={styles.taskTableCell}>{member.userID}</td>
                      <td className={`${styles.taskTableCell} ${styles.memberNameColumn}`}>{member.name}</td>
                      <td className={`${styles.taskTableCell} ${styles.memberPhoneColumn}`}>{member.phoneNumber}</td>
                      <td className={`${styles.taskTableCell} ${styles.memberEmailColumn}`}>{member.email}</td>
                      <td className={styles.taskTableCell}>{member.role}</td>
                      <td className={`${styles.taskTableCell} ${styles.memberCompanyColumn}`}>{member.companyName}</td>
                      {canAddMember && (
                        <td className={styles.taskTableCell} style={{textAlign: 'center'}}>
                          <button
                            style={{
                              background: hoverDeleteSingle[member._id] ? '#fbe9e7' : 'none',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: 8,
                              padding: 4,
                              width: 32,
                              height: 32,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.15s, filter 0.15s',
                            }}
                            title="Xóa nhân sự"
                            onClick={() => handleDeleteSingleMember(member._id)}
                            onMouseEnter={() => setHoverDeleteSingle(prev => ({...prev, [member._id]: true}))}
                            onMouseLeave={() => setHoverDeleteSingle(prev => ({...prev, [member._id]: false}))}
                          >
                            <img src={deleteRedIcon} alt="delete" style={{width: 22, height: 22, objectFit: 'contain', display: 'block', filter: hoverDeleteSingle[member._id] ? 'brightness(0.8) scale(1.08)' : undefined, transition: 'filter 0.15s'}} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.noDataMessage}>Không có nhân sự nào trong sprint này.</p>
          )}
        </div>
      )}
      {activeSprintSubTab === 'history' && (
        <div className={styles.historySection}>
          <Typography variant="h6" gutterBottom sx={{padding: "10px", fontWeight: "bold"}}>Lịch sử cập nhật Sprint</Typography>
          <HistoryList history={selectedSprint.history} noHistoryMessage="Chưa có lịch sử cập nhật nào cho sprint này." />
        </div>
      )}

      <NewTaskPopup 
        isOpen={isNewTaskPopupOpen} 
        onClose={handleCloseNewTaskPopup} 
        sprintId={selectedSprint?._id} 
        onTaskAdded={fetchTasks} 
        members={sprintMembers}
      />
      <AddMemberToSprintPopup
        open={showAddMemberPopup}
        onClose={() => setShowAddMemberPopup(false)}
        sprintId={selectedSprint?._id}
        existingUserIds={sprintMembers.map(m => m._id)}
        projectMembers={projectMembers}
        onAdded={() => {
          setShowAddMemberPopup(false);
          onRefreshSprintSection();
        }}
      />
      <ReviewCommentDialog
        open={reviewDialog.open}
        onClose={() => setReviewDialog({ open: false, task: null, reviewStatus: '', onSubmit: null })}
        onSubmit={comment => reviewDialog.onSubmit && reviewDialog.onSubmit(comment)}
        reviewStatus={reviewDialog.reviewStatus}
        taskName={reviewDialog.task?.name || ''}
      />
    </div>
  );
};

export default SprintDetailSection;