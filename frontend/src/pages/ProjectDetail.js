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

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => n < 10 ? '0' + n : n;
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
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

const statusColors = {
  'Chờ xác nhận': { background: '#f1f3f5', color: '#6c757d' },
  'Khởi tạo': { background: '#fff3cd', color: '#b8860b' },
  'Đang triển khai': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
  'Đã bàn giao': { background: '#f3e5f5', color: '#7b1fa2' },
  'Chưa phát triển': { background: '#f1f3f5', color: '#6c757d' },
  'Đang phát triển': { background: '#e3f2fd', color: '#1976d2' },
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{marginRight: 8, display: 'block'}}>
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
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{marginRight: 8, display: 'block'}}>
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
              <div className={styles.statusBadge} style={{backgroundColor: statusColors[project.status]?.background, color: statusColors[project.status]?.color}}>{project.status}</div>
            </div>
          )}
        </div>
        {!isMobile && (
          <div className={styles.headerRight}>
            <span className={styles.statusLabel}>Trạng thái</span>
            <div className={styles.statusBadge} style={{backgroundColor: statusColors[project.status]?.background, color: statusColors[project.status]?.color}}>{project.status}</div>
          </div>
        )}
        {/* Mobile: Edit button top right */}
        {isMobile && canEdit && (
          <button
            className={styles.editButton}
            onClick={()=>setShowEditPopup(true)}
            title="Chỉnh sửa dự án"
            style={{position: 'absolute', top: 8, right: 8, zIndex: 2}}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </svg>
          </button>
        )}
        {/* Mobile: Confirm button top left */}
        {isMobile && project.status === 'Chờ xác nhận' && canConfirmProject && (
          <button
            className={styles.confirmButton}
            onClick={handleConfirmProject}
            disabled={confirming}
            title="Xác nhận dự án"
            style={{position: 'absolute', top: 8, left: 8, zIndex: 2}}
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
                {project.createdBy ? (
                  <>{project.createdBy.name}{project.createdBy.email && project.createdBy.name !== project.createdBy.email && (
                    <span style={{color:'#666', fontSize:'0.85rem', fontStyle:'italic'}}> ({project.createdBy.email})</span>
                  )}</>
                ) : 'Không xác định'}
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
          <div style={{display:'flex', flexDirection:'column', justifyContent:'stretch', height:'100%'}}>
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
            {project.overviewDocs.map(file => {
              const name = file.fileName || '';
              const dotIdx = name.lastIndexOf('.');
              const base = dotIdx !== -1 ? name.slice(0, dotIdx).replace(/\s+$/, '') : name.replace(/\s+$/, '');
              const ext = dotIdx !== -1 ? name.slice(dotIdx) : '';
              return (
                <div key={file.fileId} className={styles.documentCard}>
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
                      style={{ width: 24, height: 24, display: 'block' }} 
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
              (tabActive === idx ? ' ' + styles.tabButtonActive : '')
            }
            style={{
              color: hoverTab[idx] ? '#FA2B4D' : undefined,
              background: hoverTab[idx] ? '#fbe9e7' : undefined,
            }}
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
              <div style={{display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', marginBottom: isMobile ? 10 : 24}}>
                <button
                  className={styles.addModuleButton}
                  onClick={() => setOpenModulePopup(true)}
                >
                  <span style={{fontWeight: 'bold', fontSize: '1.1rem'}}>+</span>
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
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: isMobile ? 10 : 24,
              }}>
                {modules.map(module => (
                  <div key={module._id} style={{
                    background: '#fff',
                    borderRadius: 14,
                    boxShadow: '0 2px 12px rgba(44,62,80,0.08)',
                    padding: '24px 22px 18px 22px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    minHeight: 180,
                    position: 'relative',
                  }}>
                    <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10}}>
                      <span style={{
                        background: '#e3f2fd',
                        color: '#1976d2',
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 15,
                        padding: '4px 12px',
                        letterSpacing: 0.5,
                      }}>#{module.moduleId || module._id}</span>
                      <span className={styles.statusBadge} style={{backgroundColor: statusColors[module.status]?.background || '#f1f3f5', color: statusColors[module.status]?.color || '#6c757d'}}>{module.status}</span>
                    </div>
                    <div style={{fontWeight: 700, fontSize: 18, color: '#222', margin: '6px 0 2px 0', lineHeight: 1.2}}>{module.name}</div>
                    <div style={{color: '#666', fontSize: 15, marginBottom: 2}}>
                      Người phụ trách: <span style={{fontWeight: 600, color: '#1976d2'}}>{module.owner?.name || '-'}</span>
                    </div>
                    <div style={{color: '#888', fontSize: 14, marginBottom: 2}}>
                      Thời gian dự kiến: {module.startDate ? formatDate(module.startDate) : '-'}
                      {module.endDate ? ` - ${formatDate(module.endDate)}` : ''}
                    </div>
                    <div style={{flex: 1}}></div>
                    <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                      <button
                        style={{
                          background: '#1976d2',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 18px',
                          fontWeight: 600,
                          fontSize: 15,
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
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
          <div style={{padding: isMobile ? 4 : 16}}>
            <div
              style={{
                display: 'flex',
                flexDirection: isMobile ? 'column' : 'row',
                justifyContent: 'space-between',
                alignItems: isMobile ? 'stretch' : 'center',
                marginBottom: isMobile ? 8 : 16,
                gap: isMobile ? 0 : 16,
                background: '#fff',
                padding: isMobile ? '0px 4px 10px 4px' : '0px 20px 20px 10px',
                borderRadius: '10px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                flexWrap: 'wrap',
              }}
            >
              {/* Filter group */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? 8 : 15,
                  alignItems: isMobile ? 'stretch' : 'center',
                  flex: 1,
                  minWidth: 220,
                }}
              >
                <div style={{position: 'relative', flex: 1, minWidth: 120}}>
                  <img
                    src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
                    alt="search icon"
                    style={{position: 'absolute', left: 15, top: '50%', transform: 'translateY(-50%)', color: '#6c757d', width: 20, height: 20, pointerEvents: 'none'}}
                  />
                  <input
                    type="text"
                    placeholder="Tìm theo ID, tên hoặc email..."
                    value={memberSearch}
                    onChange={e => setMemberSearch(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 20px 12px 45px',
                      borderRadius: '8px',
                      border: '1px solid #e0e0e0',
                      fontSize: '14px',
                      backgroundColor: '#f8f9fa',
                      transition: 'all 0.3s ease',
                    }}
                  />
                </div>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  style={{
                    padding: '12px 35px 12px 15px',
                    borderRadius: '8px',
                    border: '1px solid #e0e0e0',
                    fontSize: '14px',
                    backgroundColor: '#f8f9fa',
                    cursor: 'pointer',
                    minWidth: isMobile ? '100%' : '180px',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236c757d' d='M6 8.825L1.175 4 2.05 3.125 6 7.075 9.95 3.125 10.825 4z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 15px center',
                    transition: 'all 0.3s ease',
                  }}
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
              <div
                style={{
                  display: 'flex',
                  flexDirection: isMobile ? 'column' : 'row',
                  gap: isMobile ? 8 : 10,
                  marginTop: isMobile ? 12 : 0,
                  width: isMobile ? '100%' : 'auto',
                }}
              >
                {canEdit && (
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: hoverDeleteMany && selectedMembers.length > 0 ? '0 2px 8px rgba(250,43,77,0.12)' : undefined,
                      transition: 'background 0.2s',
                      width: isMobile ? '100%' : 'auto',
                    }}
                    disabled={selectedMembers.length === 0}
                    onClick={handleDeleteSelectedMembers}
                    onMouseEnter={() => setHoverDeleteMany(true)}
                    onMouseLeave={() => setHoverDeleteMany(false)}
                  >
                    <img src={selectedMembers.length > 0 ? deleteWhiteIcon : deleteRedIcon} alt="delete" style={{width: 20, height: 20, objectFit: 'contain', display: 'block', marginRight: 6, filter: hoverDeleteMany && selectedMembers.length > 0 ? 'brightness(0.95) drop-shadow(0 2px 4px #d81b3a33)' : undefined}} />
                    Xóa nhiều
                  </button>
                )}
                {canEdit && (
                  <button
                    style={{
                      background: hoverAddMember ? '#d81b3a' : '#FA2B4D',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 18px',
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      width: isMobile ? '100%' : 'auto',
                    }}
                    onClick={() => setShowAddMember(true)}
                    onMouseEnter={() => setHoverAddMember(true)}
                    onMouseLeave={() => setHoverAddMember(false)}
                  >
                    + Thêm nhân sự
                  </button>
                )}
              </div>
            </div>
            <div style={{overflowX: isMobile ? 'auto' : 'unset'}}>
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
                                    padding: 4,
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
                <div style={{color: '#888', fontStyle: 'italic'}}>Chưa có thành viên nào trong dự án này.</div>
              )}
            </div>
          </div>
        )}
        {/* Tab 2: Lịch sử cập nhật */}
        {tabActive === 2 && (
          <div>
            <h2 style={{fontSize: '1.15rem', fontWeight: 600, marginBottom: 16}}>Lịch sử cập nhật</h2>
            {project.history && project.history.length > 0 ? (
              <div className={styles.historyContainer}>
                <ul className={styles.historyList}>
                  {project.history
                    .slice()
                    .reverse()
                    .map((item, idx) => (
                    <li key={idx} className={styles.historyItem}>
                      <span className={styles.historyTimestamp}>
                        {item.timestamp ? formatDateTime(item.timestamp) : ''}
                      </span>
                      {' - '}
                      <span className={styles.historyUser}>
                        {item.fromUser?.name || item.fromUser?.email || item.fromUser || 'Không rõ'}
                      </span>
                      {' '}
                      <span className={styles.historyContent}>
                        {item.action} {item.comment ? ` ${item.comment}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className={styles.noHistory}>Chưa có dữ liệu lịch sử cập nhật.</div>
            )}
          </div>
        )}
      </div>
      {/* Popups và Toast giữ nguyên */}
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