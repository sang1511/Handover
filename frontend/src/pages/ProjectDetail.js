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

function formatFileName(fileName) {
  if (!fileName) return '';
  if (fileName.length <= 30) return fileName;
  
  // Tìm phần mở rộng của file
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) {
    // Không có phần mở rộng
    return fileName.substring(0, 27) + '...';
  }
  
  const name = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  
  if (name.length <= 27) {
    return fileName;
  }
  
  return name.substring(0, 27) + '...' + extension;
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => n < 10 ? '0' + n : n;
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Hook lấy window width
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
}

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState({ show: false, message: '' });
  const [openModulePopup, setOpenModulePopup] = useState(false);
  const [tabActive, setTabActive] = useState(0); // 0: Module, 1: Nhân sự, 2: Lịch sử
  const [currentUser, setCurrentUser] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModuleToast, setShowModuleToast] = useState(false);
  const [moduleToastMsg, setModuleToastMsg] = useState('');
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [hoverDeleteMany, setHoverDeleteMany] = useState(false);
  const [hoverDeleteSingle, setHoverDeleteSingle] = useState({});
  // Hover states for buttons
  const [hoverEdit, setHoverEdit] = useState(false);
  const [hoverConfirm, setHoverConfirm] = useState(false);
  const [hoverTab, setHoverTab] = useState([false, false, false]);
  const [hoverAddMember, setHoverAddMember] = useState(false);

  const windowWidth = useWindowWidth();
  const isMobile = windowWidth < 768;

  const fetchProjectData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      // Fetch project details
      const projectResponse = await axiosInstance.get(`/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setProject(projectResponse.data);
      // Fetch modules
      const modulesData = await ModuleService.getAllModules(id);
      setModules(modulesData);
      setError(null);
    } catch (error) {
      setError('Có lỗi xảy ra khi tải thông tin dự án hoặc module');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Lấy thông tin user hiện tại
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (error) {
        console.error('Lỗi khi parse user data:', error);
      }
    }
  }, []);

  // Realtime cập nhật project
  useEffect(() => {
    const socket = socketManager.socket;
    if (socket) {
      const handleProjectUpdate = (data) => {
        if (data.project && data.project._id === id) {
          setProject(prevProject => ({ ...prevProject, ...data.project }));
        }
      };
      socket.on('project_updated', handleProjectUpdate);
      return () => {
        socket.off('project_updated', handleProjectUpdate);
      };
    }
  }, [id]);

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axiosInstance.get(`/projects/${id}/files/${fileId}/download`, {
        responseType: 'blob',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      alert('Không thể tải file.');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Chờ xác nhận':
        return { background: '#f1f3f5', color: '#6c757d' };
      case 'Khởi tạo':
        return { background: '#fff3cd', color: '#b8860b' };
      case 'Đang triển khai':
        return { background: '#e3f2fd', color: '#1976d2' };
      case 'Hoàn thành':
        return { background: '#e6f4ea', color: '#28a745' };
      case 'Đã bàn giao':
        return { background: '#f3e5f5', color: '#7b1fa2' };
      default:
        return { background: '#f1f3f5', color: '#6c757d' };
    }
  };

  // Hàm xác nhận dự án
  const handleConfirmProject = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      alert('Bạn không có quyền xác nhận dự án này.');
      return;
    }

    if (confirming) return;
    setConfirming(true);

    try {
      const token = localStorage.getItem('token');
      await axiosInstance.patch(`/projects/${id}/confirm`, {
        status: 'Khởi tạo'
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Cập nhật trạng thái dự án
      setProject(prevProject => ({
        ...prevProject,
        status: 'Khởi tạo'
      }));

      // Hiển thị thông báo thành công
      setCopyFeedback({ show: true, message: 'Đã xác nhận dự án thành công!' });
      setTimeout(() => setCopyFeedback({ show: false, message: '' }), 3000);

    } catch (error) {
      console.error('Lỗi khi xác nhận dự án:', error);
      alert('Có lỗi xảy ra khi xác nhận dự án. Vui lòng thử lại.');
    } finally {
      setConfirming(false);
    }
  };

  // Logic chọn/bỏ chọn từng người
  const handleSelectMember = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Logic chọn tất cả
  const handleSelectAllMembers = (members) => {
    if (selectedMembers.length === members.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(members.map(m => m.user?._id).filter(Boolean));
    }
  };

  // Xóa nhiều nhân sự
  const handleDeleteSelectedMembers = async () => {
    if (selectedMembers.length === 0) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa các nhân sự đã chọn khỏi dự án?')) return;
    try {
      const remainMembers = project.members.filter(m => !selectedMembers.includes(m.user?._id)).map(m => ({ user: m.user._id }));
      const token = localStorage.getItem('token');
      await axiosInstance.put(`/projects/${id}`, { members: remainMembers }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSelectedMembers([]);
      await fetchProjectData();
    } catch (err) {
      alert('Có lỗi khi xóa nhân sự!');
    }
  };

  // Xóa từng nhân sự
  const handleDeleteSingleMember = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân sự này khỏi dự án?')) return;
    try {
      const remainMembers = project.members.filter(m => m.user?._id !== userId).map(m => ({ user: m.user._id }));
      const token = localStorage.getItem('token');
      await axiosInstance.put(`/projects/${id}`, { members: remainMembers }, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSelectedMembers(prev => prev.filter(id => id !== userId));
      await fetchProjectData();
    } catch (err) {
      alert('Có lỗi khi xóa nhân sự!');
    }
  };


  const canEdit = !!currentUser && !!project && (
    currentUser.role === 'admin' ||
    (project.createdBy && currentUser._id === project.createdBy._id)
  );

  const canConfirmProject = !!currentUser && currentUser.role === 'admin';


  const isMember = !!currentUser && !!project && project.members && project.members.some(m => m.user?._id === currentUser._id);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p style={styles.loadingText}>Đang tải thông tin dự án...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>⚠️</div>
        <p style={styles.errorMessage}>{error}</p>
        <button style={styles.backButton} onClick={() => navigate('/projects')}>
          Quay lại danh sách
        </button>
      </div>
    );
  }
  
  if (!project) {
    return (
      <div style={styles.errorContainer}>
        <div style={styles.errorIcon}>❌</div>
        <p style={styles.errorMessage}>Không tìm thấy thông tin dự án</p>
        <button style={styles.backButton} onClick={() => navigate('/projects')}>
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (project && currentUser && currentUser.role !== 'admin' && !isMember) {
    return <div style={{padding: 40, color: '#FA2B4D', textAlign: 'center', fontWeight: 600, fontSize: 20}}>Bạn không có quyền truy cập dự án này.</div>;
  }

  const statusColors = {
    'Chưa phát triển': { background: '#f1f3f5', color: '#6c757d' },
    'Đang phát triển': { background: '#e3f2fd', color: '#1976d2' },
    'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
  };

  // Responsive style helpers
  const responsiveStyles = {
    container: {
      ...styles.container,
      padding: isMobile ? '8px 2px' : styles.container.padding,
      maxWidth: isMobile ? '100vw' : styles.container.maxWidth,
      minHeight: isMobile ? 'unset' : styles.container.minHeight,
    },
    headerSection: {
      ...styles.headerSection,
      padding: isMobile ? '16px 8px' : styles.headerSection.padding,
      marginBottom: isMobile ? '12px' : styles.headerSection.marginBottom,
    },
    headerContent: {
      ...styles.headerContent,
      flexDirection: isMobile ? 'column' : styles.headerContent.flexDirection,
      gap: isMobile ? '12px' : styles.headerContent.gap,
      alignItems: isMobile ? 'stretch' : styles.headerContent.alignItems,
    },
    projectName: {
      ...styles.projectName,
      fontSize: isMobile ? '1.3rem' : styles.projectName.fontSize,
      margin: isMobile ? '0 0 6px 0' : styles.projectName.margin,
    },
    projectMeta: {
      ...styles.projectMeta,
      gap: isMobile ? '8px' : styles.projectMeta.gap,
    },
    statusAndActions: {
      ...styles.statusAndActions,
      alignItems: isMobile ? 'flex-start' : styles.statusAndActions.alignItems,
      minWidth: isMobile ? 'unset' : styles.statusAndActions.minWidth,
      gap: isMobile ? 6 : styles.statusAndActions.gap,
    },
    projectInfoSection: {
      ...styles.projectInfoSection,
      padding: isMobile ? '12px 4px' : styles.projectInfoSection.padding,
      marginBottom: isMobile ? '12px' : styles.projectInfoSection.marginBottom,
    },
    infoGrid: {
      ...styles.infoGrid,
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : styles.infoGrid.gridTemplateColumns,
      gap: isMobile ? '20px' : styles.infoGrid.gap,
      marginBottom: isMobile ? '12px' : styles.infoGrid.marginBottom,
    },
    descriptionContent: {
      ...styles.descriptionContent,
      maxHeight: isMobile ? '120px' : styles.descriptionContent.maxHeight,
      padding: isMobile ? '8px' : styles.descriptionContent.padding,
      fontSize: isMobile ? '0.9rem' : undefined,
    },
    documentsSection: {
      ...styles.documentsSection,
      marginTop: isMobile ? '12px' : styles.documentsSection.marginTop,
      paddingTop: isMobile ? '12px' : styles.documentsSection.paddingTop,
    },
    documentsGrid: {
      ...styles.documentsGrid,
      gridTemplateColumns: isMobile ? '1fr' : styles.documentsGrid.gridTemplateColumns,
      gap: isMobile ? '8px' : styles.documentsGrid.gap,
      maxHeight: isMobile ? '140px' : styles.documentsGrid.maxHeight,
    },
    modulesSection: {
      ...styles.modulesSection,
      padding: isMobile ? '10px 2px' : styles.modulesSection.padding,
    },
    tabsHeader: {
      ...styles.tabsHeader,
      padding: isMobile ? '0 2px' : styles.tabsHeader.padding,
      flexDirection: isMobile ? 'column' : 'row',
    },
    tabButton: {
      ...styles.tabButton,
      padding: isMobile ? '10px 8px 6px 8px' : styles.tabButton.padding,
      minWidth: isMobile ? 90 : undefined,
    },
    tabButtonActive: {
      ...styles.tabButtonActive,
      background: isMobile ? '#fff' : styles.tabButtonActive.background,
    },
    addModuleButton: {
      ...styles.addModuleButton,
      fontSize: isMobile ? 13 : styles.addModuleButton.fontSize,
      padding: isMobile ? '7px 12px' : styles.addModuleButton.padding,
    },
    emptyModules: {
      ...styles.emptyModules,
      padding: isMobile ? '30px 4px' : styles.emptyModules.padding,
    },
    emptyDocuments: {
      ...styles.emptyDocuments,
      padding: isMobile ? '20px 4px' : styles.emptyDocuments.padding,
    },
    errorContainer: {
      ...styles.errorContainer,
      height: isMobile ? '60vh' : styles.errorContainer.height,
      padding: isMobile ? '8px' : styles.errorContainer.padding,
    },
    loadingContainer: {
      ...styles.loadingContainer,
      height: isMobile ? '60vh' : styles.loadingContainer.height,
    },
  };

  return (
    <div style={responsiveStyles.container}>
      <CopyToast show={copyFeedback.show} message={copyFeedback.message} onClose={() => setCopyFeedback({ show: false, message: '' })} />
      
      {/* 1. Header Section */}
      <div style={responsiveStyles.headerSection}>
        <div style={responsiveStyles.headerContent}>
          <div style={styles.projectInfo}>
            <h1 style={responsiveStyles.projectName}>{project.name}</h1>
            <div style={styles.projectMeta}>
              <span style={styles.projectId}>#{project.projectId}</span>
              <span style={styles.projectVersion}>v{project.version || '1.0'}</span>
            </div>
          </div>
          <div style={responsiveStyles.statusAndActions}>
            <div style={styles.statusContainer}>
              <span style={styles.statusLabel}>Trạng thái</span>
              <div style={{
                ...styles.statusBadge,
                backgroundColor: getStatusColor(project.status).background,
                color: getStatusColor(project.status).color
              }}>
                {project.status}
              </div>
            </div>
            <div style={styles.actionButtons}>
              {canEdit && (
                <button
                  style={{
                    ...styles.editButton,
                    background: hoverEdit ? '#d81b3a' : styles.editButton.background,
                  }}
                  onClick={()=>setShowEditPopup(true)}
                  onMouseEnter={() => setHoverEdit(true)}
                  onMouseLeave={() => setHoverEdit(false)}
                >
                  ✏️ Chỉnh sửa
                </button>
              )}
              {project.status === 'Chờ xác nhận' && canConfirmProject && (
                <button
                  style={{
                    ...styles.confirmButton,
                    background: hoverConfirm ? '#d81b3a' : styles.confirmButton.background,
                  }}
                  onClick={handleConfirmProject}
                  disabled={confirming}
                  onMouseEnter={() => setHoverConfirm(true)}
                  onMouseLeave={() => setHoverConfirm(false)}
                >
                  {confirming ? 'Đang xác nhận...' : 'Xác nhận'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Project Information Section */}
      <div style={responsiveStyles.projectInfoSection}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionIcon}>📋</span>
          <h2 style={styles.sectionTitle}>Thông tin dự án</h2>
        </div>
        
        <div style={responsiveStyles.infoGrid}>
          <div style={styles.infoCard}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Người tạo dự án:</span>
              <span style={styles.infoValue}>
                {project.createdBy ? (
                  <>
                    {project.createdBy.name} 
                    {project.createdBy.email && project.createdBy.name !== project.createdBy.email && (
                      <span style={styles.creatorEmail}> ({project.createdBy.email})</span>
                    )}
                  </>
                ) : (
                  'Không xác định'
                )}
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Ngày bắt đầu:</span>
              <span style={styles.infoValue}>{formatDate(project.startDate)}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Ngày kết thúc:</span>
              <span style={styles.infoValue}>{formatDate(project.endDate)}</span>
            </div>
          </div>

          <div style={styles.descriptionCard}>
            <h3 style={styles.descriptionTitle}>Mô tả dự án</h3>
            <div style={responsiveStyles.descriptionContent}>
              {project.description ? (
                <p style={styles.descriptionText}>{project.description}</p>
              ) : (
                <p style={styles.noDescription}>Chưa có mô tả cho dự án này</p>
              )}
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div style={responsiveStyles.documentsSection}>
          <div style={styles.documentsHeader}>
            <h3 style={styles.documentsTitle}>Tài liệu tổng quan</h3>
          </div>
          {project.overviewDocs && project.overviewDocs.length > 0 ? (
            <div style={responsiveStyles.documentsGrid}>
              {project.overviewDocs.map(file => (
                <div key={file.fileId} style={styles.documentCard}>
                  <div style={styles.documentIcon}>📄</div>
                  <div style={styles.documentInfo}>
                    <span style={styles.documentName} title={file.fileName}>{formatFileName(file.fileName)}</span>
                    <span style={styles.documentSize}>{formatFileSize(file.fileSize)}</span>
                  </div>
                  <button 
                    style={styles.downloadButton} 
                    onClick={() => handleDownloadFile(file.fileId, file.fileName)}
                    title="Tải xuống"
                  >
                    <img 
                      src="https://cdn-icons-png.flaticon.com/512/0/532.png" 
                      alt="download" 
                      style={{ width: 24, height: 24, display: 'block' }} 
                    />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={responsiveStyles.emptyDocuments}>
              <span style={styles.emptyIcon}>📄</span>
              <p style={styles.emptyText}>Chưa có tài liệu tổng quan nào</p>
            </div>
          )}
        </div>
      </div>

      {/* 3. Tabs Section */}
      <div style={responsiveStyles.modulesSection}>
        {/* Tabs header */}
        <div style={responsiveStyles.tabsHeader}>
          {[0,1,2].map(idx => (
            <button
              key={idx}
              style={{
                ...responsiveStyles.tabButton,
                ...(tabActive === idx ? responsiveStyles.tabButtonActive : {}),
                color: hoverTab[idx] ? '#FA2B4D' : (tabActive === idx ? styles.tabButtonActive.color : styles.tabButton.color),
                background: hoverTab[idx] ? '#fbe9e7' : (tabActive === idx ? styles.tabButtonActive.background : styles.tabButton.background),
                borderBottom: tabActive === idx ? styles.tabButtonActive.borderBottom : styles.tabButton.borderBottom,
              }}
              onClick={() => setTabActive(idx)}
              onMouseEnter={() => setHoverTab(prev => prev.map((v, i) => i === idx ? true : v))}
              onMouseLeave={() => setHoverTab(prev => prev.map((v, i) => i === idx ? false : v))}
            >
              {idx === 0 ? 'Danh sách Module' : idx === 1 ? 'Danh sách nhân sự' : 'Lịch sử cập nhật'}
            </button>
          ))}
        </div>
        {/* Tab content */}
        <div style={{marginTop: isMobile ? 10 : 24}}>
          {tabActive === 0 && (
            <>
              {canEdit && (
                <div style={{display: 'flex', justifyContent: isMobile ? 'center' : 'flex-end', marginBottom: isMobile ? 10 : 24}}>
                  <button
                    style={responsiveStyles.addModuleButton}
                    onClick={() => setOpenModulePopup(true)}
                  >
                    <span style={styles.buttonIcon}>+</span>
                    Thêm module
                  </button>
                </div>
              )}
              {modules.length === 0 ? (
                <div style={responsiveStyles.emptyModules}>
                  <span style={styles.emptyIcon}>📦</span>
                  <p style={styles.emptyText}>Chưa có module nào</p>
                  <p style={styles.emptySubtext}>Bắt đầu bằng cách thêm module đầu tiên</p>
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
                        <span style={{
                          ...styles.moduleStatus,
                          backgroundColor: statusColors[module.status]?.background || '#f1f3f5',
                          color: statusColors[module.status]?.color || '#6c757d',
                          fontWeight: 700,
                          fontSize: 14,
                          borderRadius: 10,
                          padding: '4px 12px',
                        }}>{module.status}</span>
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
          {tabActive === 2 && (
            <div style={{padding: isMobile ? 4 : 16}}>
              <h2 style={{fontSize: '1.15rem', fontWeight: 600, marginBottom: 16}}>Lịch sử cập nhật</h2>
              {project.history && project.history.length > 0 ? (
                <div style={styles.historyContainer}>
                  <ul style={styles.historyList}>
                    {project.history
                      .slice()
                      .reverse()
                      .map((item, idx) => (
                      <li key={idx} style={styles.historyItem}>
                        <span style={styles.historyTimestamp}>
                          {item.timestamp ? formatDateTime(item.timestamp) : ''}
                        </span>
                        {' - '}
                        <span style={styles.historyUser}>
                          {item.fromUser?.name || item.fromUser?.email || item.fromUser || 'Không rõ'}
                        </span>
                        {' '}
                        <span style={styles.historyContent}>
                          {item.action} {item.comment ? ` ${item.comment}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div style={styles.noHistory}>Chưa có dữ liệu lịch sử cập nhật.</div>
              )}
            </div>
          )}
        </div>
      </div>
      <NewModulePopup
        open={openModulePopup}
        onClose={() => setOpenModulePopup(false)}
        members={project.members ? project.members.map(m => m.user) : []}
        modules={modules}
        onSubmit={async (data) => {
          try {
            setOpenModulePopup(false);
            
            // Chuẩn bị dữ liệu module
            const moduleData = {
              moduleId: data.moduleId,
              name: data.name,
              description: data.description,
              version: data.version,
              owner: data.owner,
              projectId: id, // projectId từ URL params
              status: 'Chưa phát triển',
              startDate: data.startDate,
              endDate: data.endDate
            };

            // Tạo module mới
            let newModule;
            if (data.files && data.files.length > 0) {
              // Nếu có files, sử dụng FormData
              const formData = new FormData();
              formData.append('moduleId', data.moduleId);
              formData.append('name', data.name);
              formData.append('description', data.description);
              formData.append('version', data.version);
              formData.append('owner', data.owner);
              formData.append('projectId', id);
              formData.append('status', 'Chưa phát triển');
              formData.append('startDate', data.startDate);
              formData.append('endDate', data.endDate);
              
              // Thêm tất cả files vào FormData
              data.files.forEach((file, index) => {
                formData.append('docs', file);
              });
              
              newModule = await ModuleService.createModule(formData);
            } else {
              // Nếu không có file, gửi JSON
              newModule = await ModuleService.createModule(moduleData);
            }
            
            // Cập nhật danh sách modules
            setModules(prevModules => [...prevModules, newModule]);
            
            // Refresh project data
            await fetchProjectData();
            
            setModuleToastMsg('Tạo module thành công!');
            setShowModuleToast(true);
            setTimeout(() => setShowModuleToast(false), 1800);
          } catch (error) {
            console.error('Lỗi khi tạo module:', error);
            alert('Có lỗi xảy ra khi tạo module. Vui lòng thử lại.');
          }
        }}
      />
      {showModuleToast && (
        <div style={{
          position: 'fixed',
          top: 30,
          right: 30,
          background: '#28a745',
          color: '#fff',
          padding: '16px 32px',
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 16,
          zIndex: 9999,
          boxShadow: '0 2px 8px rgba(0,0,0,0.12)'
        }}>{moduleToastMsg}</div>
      )}
      <AddMemToProjectPopup
        open={showAddMember}
        onClose={() => setShowAddMember(false)}
        loading={addingMember}
        existingUserIds={project.members ? project.members.map(m => m.user?._id) : []}
        onAdd={async (userIds) => {
          setAddingMember(true);
          try {
            // Gọi API cập nhật members
            const newMembers = [
              ...project.members.map(m => ({ user: m.user._id })),
              ...userIds.map(uid => ({ user: uid }))
            ];
            const token = localStorage.getItem('token');
            await axiosInstance.put(`/projects/${id}`, { members: newMembers }, {
              headers: { 'Authorization': `Bearer ${token}` }
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
        onSubmit={async (formData) => {
          try {
            setShowEditPopup(false);
            const token = localStorage.getItem('token');
            
            await axiosInstance.put(`/projects/${id}`, formData, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            await fetchProjectData();
            setCopyFeedback({ show: true, message: 'Cập nhật dự án thành công!' });
            setTimeout(() => setCopyFeedback({ show: false, message: '' }), 2000);
          } catch (err) {
            alert('Có lỗi khi cập nhật dự án!');
          }
        }}
      />
      {/* Download button hover for documents */}
      <style>{`
        @media (max-width: 767px) {
          table, thead, tbody, th, td, tr { display: block !important; width: 100% !important; }
          thead { display: none !important; }
          tr { margin-bottom: 10px !important; border: 1px solid #eee !important; border-radius: 8px !important; background: #fff !important; }
          td { padding: 10px 8px !important; text-align: left !important; border: none !important; font-size: 13px !important; }
          td:before { font-weight: bold; display: inline-block; min-width: 90px; color: #888; }
          td:nth-child(2):before { content: 'UserID: '; }
          td:nth-child(3):before { content: 'Tên: '; }
          td:nth-child(4):before { content: 'Email: '; }
          td:nth-child(5):before { content: 'Số điện thoại: '; }
          td:nth-child(6):before { content: 'Vai trò: '; }
          td:last-child { text-align: right !important; }
          .download-btn { width: 36px !important; height: 36px !important; }
        }
        @media (max-width: 480px) {
          .download-btn img { width: 20px !important; height: 20px !important; }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  
  // 1. Header Section
  headerSection: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '32px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '24px',
  },
  projectInfo: {
    flex: '1',
  },
  projectName: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#FA2B4D',
    margin: '0 0 12px 0',
    lineHeight: '1.2',
  },
  projectMeta: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  projectId: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  projectVersion: {
    backgroundColor: '#f3e5f5',
    color: '#7b1fa2',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  statusAndActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 12,
    minWidth: 180,
  },
  statusContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '8px',
  },
  statusLabel: {
    fontSize: '0.9rem',
    color: '#666',
    fontWeight: '500',
  },
  statusBadge: {
    display: 'inline-block',
    borderRadius: 20,
    padding: '6px 12px',
    fontWeight: 600,
    fontSize: '0.95rem',
    minWidth: 60,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginRight: 4,
  },
  actionButtons: {
    display: 'flex',
    gap: 12,
    marginTop: 8,
  },
  editButton: {
    background: '#FA2B4D',
    color: '#fff',
    border: 'none',
    padding: '8px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    minWidth: 120,
    justifyContent: 'center',
  },
  confirmButton: {
    background: '#FA2B4D',
    color: '#fff',
    border: 'none',
    padding: '8px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95rem',
    fontWeight: '600',
    transition: 'all 0.2s',
    minWidth: 120,
    justifyContent: 'center',
  },

  // 2. Project Information Section
  projectInfoSection: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
  },
  sectionIcon: {
    fontSize: '1.5rem',
    marginRight: '12px',
  },
  sectionTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#FA2B4D',
    margin: '0',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    marginBottom: '24px',
  },
  infoCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
    '&:last-child': {
      borderBottom: 'none',
    },
  },
  infoLabel: {
    fontWeight: '600',
    color: '#555',
    fontSize: '0.95rem',
  },
  infoValue: {
    color: '#333',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  creatorEmail: {
    color: '#666',
    fontSize: '0.85rem',
    fontStyle: 'italic',
  },
  descriptionCard: {
    display: 'flex',
    flexDirection: 'column',
  },
  descriptionTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#FA2B4D',
    margin: '0 0 12px 0',
  },
  descriptionContent: {
    maxHeight: '200px',
    overflowY: 'auto',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
  },
  descriptionText: {
    margin: '0',
    lineHeight: '1.6',
    color: '#333',
    fontSize: '0.95rem',
  },
  noDescription: {
    margin: '0',
    color: '#888',
    fontStyle: 'italic',
    fontSize: '0.95rem',
  },

  // Documents Section
  documentsSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e9ecef',
  },
  documentsHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '20px',
  },
  documentsIcon: {
    fontSize: '1.25rem',
    marginRight: '8px',
  },
  documentsTitle: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#1a1a1a',
    margin: '0',
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
    maxHeight: '250px',
    overflowY: 'auto',
  },
  documentCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#f8f9fa',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#e9ecef',
      transform: 'translateY(-2px)',
    },
  },
  documentIcon: {
    fontSize: '1.5rem',
    marginRight: '12px',
  },
  documentInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    gap: '4px',
  },
  documentName: {
    fontWeight: '600',
    color: '#1a1a1a',
    fontSize: '0.95rem',
  },
  documentSize: {
    fontSize: '0.8rem',
    color: '#666',
  },
  downloadButton: {
    background: 'none',
    padding: 0,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.1s',
    '&:hover': {
      transform: 'scale(1.1)',
      background: 'none',
    },
  },
  emptyDocuments: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
    opacity: '0.5',
  },
  emptyText: {
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#666',
    margin: '0',
  },

  // 3. Modules Section
  modulesSection: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
  },
  addModuleButton: {
    background: '#FA2B4D',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '10px 28px',
    fontWeight: 700,
    fontSize: 15,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(250,43,77,0.08)',
    transition: 'background 0.2s',
  },
  buttonIcon: {
    fontSize: '1.1rem',
    fontWeight: 'bold',
  },
  tabsHeader: {
    display: 'flex',
    gap: 0,
    borderBottom: '2px solid #f5f5f5',
    background: '#fff',
    padding: '0 32px',
  },
  tabButton: {
    background: 'none',
    border: 'none',
    outline: 'none',
    fontWeight: 700,
    fontSize: 16,
    color: '#888',
    padding: '18px 36px 12px 36px',
    cursor: 'pointer',
    borderBottom: '2.5px solid transparent',
    transition: 'color 0.2s, border-bottom 0.2s, background 0.2s',
  },
  tabButtonActive: {
    color: '#FA2B4D',
    borderBottom: '2.5px solid #FA2B4D',
    background: '#f8f9fa',
  },
  tabContent: {
    padding: '24px 32px 32px 32px',
    background: '#fff',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  historyContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    borderRadius: '8px',
    border: '1px solid #f0f0f0',
    background: '#fafbfc',
    padding: '8px 0',
  },
  historyList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  historyItem: {
    marginBottom: 8,
    color: '#333',
    background: '#f8f9fa',
    borderRadius: 8,
    padding: '10px 16px',
    fontSize: 15,
    fontWeight: 500,
    boxShadow: '0 1px 4px rgba(250,43,77,0.03)',
    lineHeight: 1.5,
  },
  historyTimestamp: {
    fontWeight: 600,
    color: '#555',
    fontSize: '14px',
  },
  historyUser: {
    color: '#FA2B4D',
    fontSize: '14px',
    fontWeight: 600,
  },
  historyContent: {
    color: '#333',
    fontSize: '15px',
  },
  noHistory: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: 15,
    marginTop: 8,
  },
  emptyModules: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '60px 20px',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: '0.9rem',
    color: '#999',
    margin: '8px 0 0 0',
  },

  // Loading & Error States
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    gap: '16px',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #007bff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    fontSize: '1.1rem',
    color: '#666',
    margin: '0',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    padding: '20px',
    textAlign: 'center',
    gap: '16px',
  },
  errorIcon: {
    fontSize: '3rem',
    marginBottom: '16px',
  },
  errorMessage: {
    color: '#dc3545',
    fontSize: '1.2rem',
    margin: '0',
    fontWeight: '500',
  },
  backButton: {
    backgroundColor: '#007bff',
    color: '#fff',
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    '&:hover': {
      backgroundColor: '#0056b3',
      transform: 'translateY(-1px)',
    },
  },
};

export default ProjectDetail; 