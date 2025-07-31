import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import CopyToast from '../components/common/CopyToast';
import socketManager from '../utils/socket';
import ModuleService from '../api/services/module.service';
import NewModulePopup from '../components/popups/NewModulePopup';
import AddMemToProjectPopup from '../components/popups/AddMemToProjectPopup';
import EditProjectPopup from '../components/popups/EditProjectPopup';
import deleteWhiteIcon from '../asset/delete_white.png';
import deleteRedIcon from '../asset/delete_red.png';
import styles from './ProjectDetail.module.css';
import ProjectService from '../api/services/project.service';
import LoadingOverlay from '../components/common/LoadingOverlay';
import SuccessToast from '../components/common/SuccessToast';
import HistoryList from '../components/common/HistoryList';

function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN');
}

function formatFileSize(size) {
  if (!size) return '0 B';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

// Status badge màu cho Project
const statusColors = {
  'Chờ xác nhận': { background: '#f1f3f5', color: '#6c757d' },
  'Khởi tạo': { background: '#fff3cd', color: '#b8860b' },
  'Đang triển khai': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};
// Status badge màu cho Module (đồng bộ với ModuleDetail.js)
const moduleStatusColors = {
  'Chưa phát triển': { background: '#f1f3f5', color: '#6c757d' },
  'Đang phát triển': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState({ show: false, message: '' });
  const [openModulePopup, setOpenModulePopup] = useState(false);
  const [tabActive, setTabActive] = useState(0); 
  const [currentUser, setCurrentUser] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModuleToast, setShowModuleToast] = useState(false);
  const [moduleToastMsg, setModuleToastMsg] = useState('');
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [editProjectLoading, setEditProjectLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [hoverDeleteMany, setHoverDeleteMany] = useState(false);
  const [hoverDeleteSingle, setHoverDeleteSingle] = useState({});
  const [hoverTab, setHoverTab] = useState([false, false, false]);
  const [hoverAddMember, setHoverAddMember] = useState(false);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 900;

  const fetchProjectData = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      if (!accessToken) {
        navigate('/login');
        return;
      }
      const projectResponse = await axiosInstance.get(`/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setProject(projectResponse.data);
      // lấy module theo projectId
      const modulesData = await ModuleService.getModulesByProject(id);
      setModules(modulesData);
      setError(null);
    } catch (error) {
      setError('Có lỗi xảy ra khi tải thông tin dự án hoặc module');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchProjectData(); }, [fetchProjectData]);
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch (error) { console.error('Lỗi khi parse user data:', error); }
    }
  }, []);
  useEffect(() => {
    const socket = socketManager.socket;
    if (socket) {
      const handleProjectUpdate = (data) => {
        if (data.project && data.project._id === id) {
          setProject(prevProject => ({ ...prevProject, ...data.project }));
        }
      };
      socket.on('project_updated', handleProjectUpdate);
      return () => { socket.off('project_updated', handleProjectUpdate); };
    }
  }, [id]);

  // Thay thế hàm download file cũ bằng gọi service
  const handleDownloadFile = (file) => {
    ProjectService.downloadFile(project._id, file);
  };

  const canEdit = !!currentUser && !!project && (
    currentUser.role === 'admin' || (project.createdBy && currentUser._id === project.createdBy._id)
  );
  const canConfirmProject = !!currentUser && currentUser.role === 'admin';
  const isMember = !!currentUser && !!project && project.members && project.members.some(m => m.user?._id === currentUser._id);

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingOverlay text="Đang tải thông tin dự án..." style={{zIndex: 10}} />
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⚠️</div>
          <div className={styles.errorMessage}>{error}</div>
          <button className={styles.backButton} onClick={() => navigate('/projects')}>
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }
  if (!project) {
    return (
      <div className={styles['projectDetail-errorContainer']}>
        <div className={styles['projectDetail-errorIcon']}>❌</div>
        <p className={styles['projectDetail-errorMessage']}>Không tìm thấy thông tin dự án</p>
        <button className={styles['projectDetail-backButton']} onClick={() => navigate('/projects')}>
          Quay lại danh sách
        </button>
      </div>
    );
  }
  if (project && currentUser && currentUser.role !== 'admin' && !isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⛔</div>
          <div className={styles.errorMessage}>Bạn không có quyền truy cập dự án này.</div>
        </div>
      </div>
    );
  }

  const handleConfirmProject = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Bạn không có quyền xác nhận dự án này.');
      return;
    }
    if (confirming) return;
    setConfirming(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      await axiosInstance.patch(`/projects/${id}/confirm`, {
        status: 'Khởi tạo'
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setProject(prevProject => ({
        ...prevProject,
        status: 'Khởi tạo'
      }));
      setCopyFeedback({ show: true, message: 'Đã xác nhận dự án thành công!' });
      setTimeout(() => setCopyFeedback({ show: false, message: '' }), 3000);
    } catch (error) {
      alert('Có lỗi xảy ra khi xác nhận dự án. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  const handleSelectMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllMembers = (members) => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(m => m.user?._id).filter(Boolean));
    }
  };

  const handleDeleteSelectedMembers = async () => {
    if (selectedMembers.length === 0) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa các nhân sự đã chọn khỏi dự án?')) return;
    try {
      const remainMembers = project.members.filter(m => !selectedMembers.includes(m.user?._id)).map(m => ({ user: m.user._id }));
      const accessToken = localStorage.getItem('accessToken');
      await axiosInstance.put(`/projects/${id}`, { members: remainMembers }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setSelectedMembers([]);
      await fetchProjectData();
    } catch (err) {
      alert('Có lỗi khi xóa nhân sự!');
    }
  };

  const handleDeleteSingleMember = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân sự này khỏi dự án?')) return;
    try {
      const remainMembers = project.members.filter(m => m.user?._id !== userId).map(m => ({ user: m.user._id }));
      const accessToken = localStorage.getItem('accessToken');
      await axiosInstance.put(`/projects/${id}`, { members: remainMembers }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setSelectedMembers(prev => prev.filter(id => id !== userId));
      await fetchProjectData();
    } catch (err) {
      alert('Có lỗi khi xóa nhân sự!');
    }
  };

  return (
    <div className={styles.container}>
      <CopyToast show={copyFeedback.show} message={copyFeedback.message} onClose={() => setCopyFeedback({ show: false, message: '' })} />
      {/* Header */}
      <div className={styles.headerSection}>
        {!isMobile && (
          <div className={styles.headerLeft}>
            {canEdit && (
              <button
                className={styles.editButton}
                onClick={()=>setShowEditPopup(true)}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={styles.iconMarginRight}>
                  <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span>Chỉnh sửa</span>
              </button>
            )}
            {project.status === 'Chờ xác nhận' && canConfirmProject && (
              <button
                className={styles.confirmButton}
                onClick={handleConfirmProject}
                disabled={confirming}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className={styles.iconMarginRight}>
                  <path d="M5 13l4 4L19 7" stroke="#28a745" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>{confirming ? 'Đang xác nhận...' : 'Xác nhận'}</span>
              </button>
            )}
          </div>
        )}
        <div className={styles.headerCenter}>
          <h1 className={styles.projectName}>{project.name}</h1>
          {!isMobile ? (
            <div className={styles.projectMeta}>
              <span className={styles.projectId}>#{project.projectId}</span>
              <span className={styles.projectVersion}>v{project.version || '1.0'}</span>
            </div>
          ) : (
            <div className={styles.headerContentRow}>
              <span className={styles.projectId}>#{project.projectId}</span>
              <span className={styles.projectVersion}>v{project.version || '1.0'}</span>
              <div
                className={styles.statusBadge}
                style={{
                  backgroundColor: statusColors[project.status]?.background,
                  color: statusColors[project.status]?.color
                }}
              >
                {project.status}
              </div>
            </div>
          )}
        </div>
        {!isMobile && (
          <div className={styles.headerRight}>
            <span className={styles.statusLabel}>Trạng thái</span>
            <div
              className={styles.statusBadge}
              style={{
                backgroundColor: statusColors[project.status]?.background,
                color: statusColors[project.status]?.color
              }}
            >
              {project.status}
            </div>
          </div>
        )}
        {/* Mobile: Edit button top right */}
        {isMobile && canEdit && (
          <button
            className={styles.editButton + ' ' + styles.editButtonMobile}
            onClick={()=>setShowEditPopup(true)}
            title="Chỉnh sửa dự án"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
        )}
        {/* Mobile: Confirm button top left */}
        {isMobile && project.status === 'Chờ xác nhận' && canConfirmProject && (
          <button
            className={styles.confirmButton + ' ' + styles.confirmButtonMobile}
            onClick={handleConfirmProject}
            disabled={confirming}
            title="Xác nhận dự án"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L19 7" stroke="#28a745" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
      {/* Info Section */}
      <div className={styles.infoSection}>
        <div className={styles.infoGrid}>
          <div className={styles.infoCard}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Người tạo dự án:</span>
              <span className={styles.infoValue}>
                {project.createdBy?.name || 'Không xác định'}
              </span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Ngày bắt đầu:</span>
              <span className={styles.infoValue}>{formatDate(project.startDate)}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Ngày kết thúc:</span>
              <span className={styles.infoValue}>{formatDate(project.endDate)}</span>
            </div>
          </div>
          <div className={styles.infoCardDescription}>
            <div className={styles.infoLabel}>Mô tả dự án</div>
            <div className={styles.descriptionBox}>
              {project.description ? (
                <span className={styles.descriptionText}>{project.description}</span>
              ) : (
                <span className={styles.noDescription}>Chưa có mô tả cho dự án này</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Documents Section */}
      <div className={styles.documentsSection}>
        <div className={styles.documentsHeader}>
          <h3 className={styles.documentsTitle}>Tài liệu tổng quan</h3>
        </div>
        {project.overviewDocs && project.overviewDocs.length > 0 ? (
          <div className={styles.documentsGrid}>
            {project.overviewDocs.map((file, index) => {
              const name = file.fileName || '';
              const dotIdx = name.lastIndexOf('.'); 
              const base = dotIdx !== -1 ? name.slice(0, dotIdx).replace(/\s+$/, '') : name.replace(/\s+$/, '');
              const ext = dotIdx !== -1 ? name.slice(dotIdx) : '';
              return (
                <div key={file.fileId || file.fileName || index} className={styles.documentCard}>
                  <div className={styles.documentIcon}>📄</div>
                  <div className={styles.documentInfo}>
                    <span className={styles.documentName} title={file.fileName}>
                      <span className={styles.fileBase}>{base}</span>
                      <span className={styles.fileExt}>{ext}</span>
                    </span>
                    <span className={styles.documentSize}>{formatFileSize(file.fileSize)}</span>
                  </div>
                  <button 
                    className={styles.downloadButton}
                    onClick={() => handleDownloadFile(file)}
                    title="Tải xuống"
                  >
                    <img 
                      src="https://cdn-icons-png.flaticon.com/512/0/532.png" 
                      alt="download" 
                      className={styles.downloadIcon}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className={styles.emptyDocuments}>
            <span className={styles.emptyIcon}>📄</span>
            <p className={styles.emptyText}>Chưa có tài liệu tổng quan nào</p>
          </div>
        )}
      </div>
      {/* Tabs Section */}
      <div className={styles.tabsHeader}>
        {[0,1,2].map(idx => (
          <button
            key={idx}
            className={
              styles.tabButton +
              (tabActive === idx ? ' ' + styles.tabButtonActive : '') +
              (hoverTab[idx] ? ' ' + styles.tabButtonHover : '')
            }
            onClick={() => setTabActive(idx)}
            onMouseEnter={() => setHoverTab(prev => prev.map((v, i) => i === idx ? true : v))}
            onMouseLeave={() => setHoverTab(prev => prev.map((v, i) => i === idx ? false : v))}
          >
            {idx === 0 ? 'Danh sách Module' : idx === 1 ? 'Danh sách nhân sự' : 'Lịch sử cập nhật'}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {/* Tab 0: Danh sách Module */}
        {tabActive === 0 && (
          <>
            {canEdit && project.status !== 'Chờ xác nhận' && (
              <div className={isMobile ? styles.addModuleContainerMobile : styles.addModuleContainerDesktop}>
                <button
                  className={styles.addModuleButton}
                  onClick={() => setOpenModulePopup(true)}
                >
                  <span className={styles.addModulePlus}>+</span>
                  Thêm module
                </button>
              </div>
            )}
            {modules.length === 0 ? (
              <div className={styles.emptyModules}>
                <span className={styles.emptyIcon}>📦</span>
                <p className={styles.emptyText}>Chưa có module nào</p>
                <p className={styles.emptySubtext}>
                  {project.status === 'Chờ xác nhận' 
                    ? 'Dự án cần được admin xác nhận trước khi có thể thêm module'
                    : 'Bắt đầu bằng cách thêm module đầu tiên'
                  }
                </p>
              </div>
            ) : (
              <div className={isMobile ? styles.moduleGridMobile : styles.moduleGridDesktop}>
                {modules.map(module => (
                  <div key={module._id} className={styles.moduleCard}>
                    <div className={styles.moduleCardHeader}>
                      <span className={styles.moduleId}>#{module.moduleId || module._id}</span>
                      <span
                        className={styles.statusBadge}
                        style={{
                          backgroundColor: moduleStatusColors[module.status]?.background || '#f1f3f5',
                          color: moduleStatusColors[module.status]?.color || '#6c757d'
                        }}
                      >
                        {module.status}
                      </span>
                    </div>
                    <div className={styles.moduleName}>{module.name}</div>
                    <div className={styles.moduleOwner}>Người phụ trách: <span className={styles.moduleOwnerName}>{module.owner?.name || '-'}</span></div>
                    <div className={styles.moduleTime}>Thời gian dự kiến: {module.startDate ? formatDate(module.startDate) : '-'}{module.endDate ? ` - ${formatDate(module.endDate)}` : ''}</div>
                    <div className={styles.moduleCardSpacer}></div>
                    <div className={styles.moduleCardFooter}>
                      <button
                        className={styles.moduleDetailButton}
                        onClick={() => navigate(`/modules/${module._id}`)}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {/* Tab 1: Danh sách nhân sự */}
        {tabActive === 1 && (
          <div className={isMobile ? styles.tab1ContainerMobile : styles.tab1ContainerDesktop}>
            <div className={isMobile ? styles.tab1HeaderMobile : styles.tab1HeaderDesktop}>
              {/* Filter group */}
              <div className={isMobile ? styles.tab1FilterGroupMobile : styles.tab1FilterGroupDesktop}>
                <div className={styles.tab1SearchBox}>
                  <img
                    src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
                    alt="search icon"
                    className={styles.tab1SearchIcon}
                  />
                  <input
                    type="text"
                    placeholder="Tìm theo ID, tên hoặc email..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    className={styles.tab1SearchInput}
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className={isMobile ? styles.tab1RoleSelectMobile : styles.tab1RoleSelectDesktop}
                >
                  <option value="all">Tất cả vai trò</option>
                  <option value="admin">Admin</option>
                  <option value="pm">PM</option>
                  <option value="ba">BA</option>
                  <option value="developer">Developer</option>
                  <option value="tester">Tester</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {/* Action buttons group */}
              <div className={isMobile ? styles.tab1ActionGroupMobile : styles.tab1ActionGroupDesktop}>
                {canEdit && (
                  <button
                    className={
                      styles.tab1DeleteManyBtn +
                      (selectedMembers.length > 0 ?
                        (hoverDeleteMany ? ' ' + styles.tab1DeleteManyBtnHover : ' ' + styles.tab1DeleteManyBtnActive)
                        : ' ' + styles.tab1DeleteManyBtnDisabled)
                    }
                    disabled={selectedMembers.length === 0}
                    onClick={handleDeleteSelectedMembers}
                    onMouseEnter={() => setHoverDeleteMany(true)}
                    onMouseLeave={() => setHoverDeleteMany(false)}
                  >
                    <img src={selectedMembers.length > 0 ? deleteWhiteIcon : deleteRedIcon} alt="delete" className={styles.tab1DeleteIcon + (hoverDeleteMany && selectedMembers.length > 0 ? ' ' + styles.tab1DeleteIconHover : '')} />
                    Xóa nhiều
                  </button>
                )}
                {canEdit && (
                  <button
                    className={
                      styles.tab1AddMemberBtn +
                      (hoverAddMember ? ' ' + styles.tab1AddMemberBtnHover : '')
                    }
                    onClick={() => setShowAddMember(true)}
                    onMouseEnter={() => setHoverAddMember(true)}
                    onMouseLeave={() => setHoverAddMember(false)}
                  >
                    + Thêm nhân sự
                  </button>
                )}
              </div>
            </div>
            <div className={isMobile ? styles.tab1TableScrollMobile : styles.tab1TableScrollDesktop}>
              {project.members && project.members.length > 0 ? (
                (() => {
                  const filteredMembers = project.members.filter(m => {
                    const s = memberSearch.trim().toLowerCase();
                    const match =
                      !s ||
                      (m.user?.userID && m.user.userID.toLowerCase().includes(s)) ||
                      (m.user?.name && m.user.name.toLowerCase().includes(s)) ||
                      (m.user?.email && m.user.email.toLowerCase().includes(s));
                    const roleMatch = roleFilter === 'all' || (m.user?.role === roleFilter);
                    return match && roleMatch;
                  });
                  if (isMobile) {
                    // MOBILE: Render member cards (đồng bộ SprintDetailSection)
                    if (filteredMembers.length === 0) return <p className={styles.noDataMessage}>Không có nhân sự nào.</p>;
                    return (
                      <div className={styles.mobileMemberListContainer}>
                        {filteredMembers.map((m, idx) => (
                          <div key={m.user?._id || m.user?.userID || idx} className={styles.mobileMemberCard}>
                            {canEdit && (
                              <>
                                <button
                                  className={styles.mobileDeleteMemberButton + ' ' + styles.mobileDeleteMemberButtonTopRight}
                                  title="Xóa nhân sự"
                                  onClick={() => handleDeleteSingleMember(m.user?._id)}
                                >
                                  <img src={deleteRedIcon} alt="delete" style={{ width: 22, height: 22, objectFit: 'contain', display: 'block' }} />
                                </button>
                                <input
                                  type="checkbox"
                                  checked={selectedMembers.includes(m.user?._id)}
                                  onChange={() => handleSelectMember(m.user?._id)}
                                  className={styles.mobileMemberCheckbox + ' ' + styles.mobileMemberCheckboxTopLeft}
                                />
                              </>
                            )}
                            <p className={styles.mobileMemberName}>{m.user?.name}</p>
                            <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>UserID:</span><span className={styles.mobileMemberDetailValue}>{m.user?.userID}</span></div>
                            <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>Email:</span><span className={styles.mobileMemberDetailValue}>{m.user?.email}</span></div>
                            <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>SĐT:</span><span className={styles.mobileMemberDetailValue}>{m.user?.phoneNumber}</span></div>
                            <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>Vai trò:</span><span className={styles.mobileMemberDetailValue}>{m.user?.role}</span></div>
                            {m.user?.companyName && (
                              <div className={styles.mobileMemberDetailRow}><span className={styles.mobileMemberDetailLabel}>Công ty:</span><span className={styles.mobileMemberDetailValue}>{m.user?.companyName}</span></div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  }
                  // DESKTOP: Table view
                  return (
                    <table style={{width: '100%', borderCollapse: 'collapse', background: '#f8f9fa', borderRadius: 8, overflow: 'hidden'}}>
                      <thead>
                        <tr style={{background: '#e3f2fd'}}>
                          {canEdit && (
                            <th style={{padding: 10}}>
                              <input
                                type="checkbox"
                                checked={filteredMembers.length > 0 && filteredMembers.every(m => selectedMembers.includes(m.user?._id))}
                                onChange={() => handleSelectAllMembers(filteredMembers)}
                              />
                            </th>
                          )}
                          <th style={{padding: 10, textAlign: 'left'}}>UserID</th>
                          <th style={{padding: 10, textAlign: 'left'}}>Tên</th>
                          <th style={{padding: 10, textAlign: 'left'}}>Email</th>
                          <th style={{padding: 10, textAlign: 'left'}}>Số điện thoại</th>
                          <th style={{padding: 10, textAlign: 'left'}}>Vai trò</th>
                          {canEdit && <th style={{padding: 10, textAlign: 'center'}}>Hành động</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.length > 0 ? filteredMembers.map((m, idx) => {
                          return (
                            <tr key={m.user?._id || m.user?.userID || idx} style={{borderBottom: '1px solid #e9ecef'}}>
                              {canEdit ? (
                                <td style={{padding: 10, textAlign: 'center'}}>
                                  <input
                                    type="checkbox"
                                    checked={selectedMembers.includes(m.user?._id)}
                                    onChange={() => handleSelectMember(m.user?._id)}
                                  />
                                </td>
                              ) : null}
                              <td style={{padding: 10}}>{m.user?.userID || '-'}</td>
                              <td style={{padding: 10}}>{m.user?.name || '-'}</td>
                              <td style={{padding: 10}}>{m.user?.email || '-'}</td>
                              <td style={{padding: 10}}>{m.user?.phoneNumber || '-'}</td>
                              <td style={{padding: 10}}>{m.user?.role || '-'}</td>
                              {canEdit ? (
                                <td style={{padding: 10, textAlign: 'center', verticalAlign: 'middle'}}>
                                  <button
                                    style={{
                                      background: hoverDeleteSingle[m.user?._id] ? '#fbe9e7' : 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      width: 32,
                                      height: 32,
                                      margin: '0 auto',
                                      borderRadius: 8,
                                      transition: 'background 0.15s, filter 0.15s',
                                    }}
                                    title="Xóa nhân sự"
                                    onClick={() => handleDeleteSingleMember(m.user?._id)}
                                    onMouseEnter={() => setHoverDeleteSingle(prev => ({...prev, [m.user?._id]: true}))}
                                    onMouseLeave={() => setHoverDeleteSingle(prev => ({...prev, [m.user?._id]: false}))}
                                  >
                                    <img src={deleteRedIcon} alt="delete" style={{width: 22, height: 22, objectFit: 'contain', display: 'block', filter: hoverDeleteSingle[m.user?._id] ? 'brightness(0.8) scale(1.08)' : undefined, transition: 'filter 0.15s'}} />
                                  </button>
                                </td>
                              ) : null}
                            </tr>
                          );
                        }) : (
                          <tr><td colSpan={canEdit ? 7 : 6} style={{textAlign:'center', color:'#888', fontStyle:'italic', padding: 18}}>Không tìm thấy nhân sự phù hợp.</td></tr>
                        )}
                      </tbody>
                    </table>
                  );
                })()
              ) : (
                <div className={styles.tab1NoMember}>Chưa có thành viên nào trong dự án này.</div>
              )}
            </div>
          </div>
        )}
        {/* Tab 2: Lịch sử cập nhật */}
        {tabActive === 2 && (
          project.history && project.history.length > 0 ? (
            <HistoryList history={project.history} />
          ) : (
            <div className={styles.noHistory}>Chưa có dữ liệu lịch sử cập nhật.</div>
          )
        )}
      </div>
      <NewModulePopup
        open={openModulePopup}
        onClose={() => setOpenModulePopup(false)}
        members={project.members ? project.members.map(m => m.user) : []}
        modules={modules}
        onSubmit={async (formData) => {
          try {
            formData.append('projectId', id);
            formData.append('status', 'Chưa phát triển');
            const newModule = await ModuleService.createModule(formData);
            setModules(prevModules => [...prevModules, newModule]);
            await fetchProjectData();
            setOpenModulePopup(false);
            setModuleToastMsg('Tạo module thành công!');
            setShowModuleToast(true);
            setTimeout(() => setShowModuleToast(false), 1800);
          } catch (error) {
            alert('Có lỗi xảy ra khi tạo module. Vui lòng thử lại.');
          }
        }}
      />
      <SuccessToast show={showModuleToast} message={moduleToastMsg} onClose={() => setShowModuleToast(false)} />
      <AddMemToProjectPopup
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        loading={addingMember}
        existingUserIds={project.members ? project.members.map(m => m.user?._id) : []}
        onAdd={async (userIds) => {
          setAddingMember(true);
          try {
            const newMembers = [
              ...project.members.map(m => ({ user: m.user._id })),
              ...userIds.map(uid => ({ user: uid }))
            ];
            const accessToken = localStorage.getItem('accessToken');
            await axiosInstance.put(`/projects/${id}`, { members: newMembers }, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            setShowAddMember(false);
            await fetchProjectData();
          } catch (err) {
            alert('Có lỗi khi thêm nhân sự');
          } finally {
            setAddingMember(false);
          }
        }}
      />
      <EditProjectPopup
        open={showEditPopup}
        onClose={()=>setShowEditPopup(false)}
        project={project}
        membersList={project.members ? project.members.map(m=>m.user) : []}
        loading={editProjectLoading}
        onSubmit={async (formData) => {
          setEditProjectLoading(true);
          try {
            const accessToken = localStorage.getItem('accessToken');
            await axiosInstance.put(`/projects/${id}`, formData, {
              headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            await fetchProjectData();
            setShowEditPopup(false);
            setCopyFeedback({ show: true, message: 'Cập nhật dự án thành công!' });
            setTimeout(() => setCopyFeedback({ show: false, message: '' }), 2000);
          } catch (err) {
            alert('Có lỗi khi cập nhật dự án!');
          } finally {
            setEditProjectLoading(false);
          }
        }}
      />
    </div>
  );
};

export default ProjectDetail; 