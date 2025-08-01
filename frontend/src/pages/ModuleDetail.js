import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import EditModulePopup from '../components/popups/EditModulePopup';
import UserService from '../api/services/user.service';
import ModuleService from '../api/services/module.service';
import NewReleasePopup from '../components/popups/NewReleasePopup';
import ReleaseService from '../api/services/release.service';
import { useAuth } from '../contexts/AuthContext';
import styles from './ModuleDetail.module.css';
import LoadingOverlay from '../components/common/LoadingOverlay';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import HistoryList from '../components/common/HistoryList';

const TABS = {
  RELEASES: 'Danh sách release',
  HISTORY: 'Lịch sử cập nhật',
};

const statusColors = {
  'Chưa phát triển': { background: '#f1f3f5', color: '#6c757d' },
  'Đang phát triển': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};
// Badge màu cho trạng thái release
const releaseStatusColors = {
  'Chưa bắt đầu': { background: '#f1f3f5', color: '#6c757d' },
  'Đang chuẩn bị': { background: '#ffe082', color: '#b8860b' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};
// Badge màu cho trạng thái nghiệm thu
const acceptanceStatusColors = {
  'Chưa': { background: '#f1f3f5', color: '#6c757d' },
  'Đạt': { background: '#e6f4ea', color: '#28a745' },
  'Không đạt': { background: '#ffebee', color: '#d32f2f' },
};

const useWindowWidth = () => {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  return width;
};

const ModuleDetail = () => {
  const { moduleId } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [releases, setReleases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(TABS.RELEASES);
  const [editOpen, setEditOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [editModuleLoading, setEditModuleLoading] = useState(false);
  // Thêm state cho popup tạo release
  const [releaseOpen, setReleaseOpen] = useState(false);
  // Sử dụng react-toastify cho thông báo
  const { user } = useAuth();
  // Thêm biến kiểm tra quyền chỉnh sửa
  const canEdit = user && (
    user.role === 'admin' ||
    user._id === module?.createdBy ||
    user._id === module?.owner?._id
  );
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= 900;

  const fetchModuleData = useCallback(async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await axiosInstance.get(`/modules/${moduleId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setModule(res.data);
      setError(null);
      try {
        const rel = await ReleaseService.getReleasesByModule(moduleId);
        setReleases(rel);
      } catch (e) {
        setReleases([]);
      }
    } catch (err) {
      setError('Không thể tải thông tin module');
    } finally {
      setLoading(false);
    }
  }, [moduleId]);

  const refreshModuleData = useCallback(async () => {
    try {
      const accessToken = localStorage.getItem('accessToken');
      const res = await axiosInstance.get(`/modules/${moduleId}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      setModule(res.data);
      setError(null);
      try {
        const rel = await ReleaseService.getReleasesByModule(moduleId);
        setReleases(rel);
      } catch (e) {
        setReleases([]);
      }
    } catch (err) {
      console.error('Lỗi khi refresh dữ liệu module:', err);
    }
  }, [moduleId]);

  useEffect(() => {
    fetchModuleData();
  }, [fetchModuleData]);

  // Lấy danh sách user khi mở popup
  const handleOpenEdit = async () => {
    setEditOpen(true);
    try {
      const users = await UserService.getAllUsers();
      setUsersList(users);
    } catch {
      setUsersList([]);
    }
  };

  const handleEditSubmit = async (formData) => {
    setEditModuleLoading(true);
    try {
      await ModuleService.updateModule(moduleId, formData);
      setEditOpen(false);
      await refreshModuleData();
      toast.success('Cập nhật module thành công!');
    } catch (e) {
      alert('Cập nhật module thất bại!');
    } finally {
      setEditModuleLoading(false);
    }
  };

  // Thay thế hàm download file cũ bằng gọi service
  const handleDownloadFile = (doc) => {
    ModuleService.downloadFile(moduleId, doc);
  };

  if (error) return (
    <div className={styles.container}>
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <div className={styles.errorMessage}>{error}</div>
        <button className={styles.backButton} onClick={() => navigate('/modules')}>
          Quay lại danh sách
        </button>
      </div>
    </div>
  );
  if (!module) return null;

  // Kiểm tra quyền truy cập
  let userData = user;
  if (!userData) {
    // fallback nếu chưa có user từ context
    const userStr = localStorage.getItem('user');
    userData = userStr ? JSON.parse(userStr) : null;
  }
  let isMember = false;
  if (userData && module.project && Array.isArray(module.project.members)) {
    isMember = module.project.members.some(mem => {
      if (typeof mem.user === 'object') {
        return mem.user._id === userData._id;
      }
      return mem.user === userData._id;
    });
  }
  const isAdmin = userData && userData.role === 'admin';
  if (!isAdmin && !isMember) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>⛔</div>
          <div className={styles.errorMessage}>Bạn không có quyền truy cập Module này.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {loading && <LoadingOverlay text="Đang tải thông tin module..." />}
      {/* Improved Header Row */}
      <div className={styles.headerSection}>
        {/* Responsive buttons */}
        {!isMobile && (
          <div className={styles.headerActions}>
            {module.project && module.project._id ? (
              <button
                className={styles.backButton}
                onClick={() => navigate(`/projects/${module.project._id}`)}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M12.5 15l-5-5 5-5" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Quay lại dự án
              </button>
            ) : <div className={styles.headerActionsPlaceholder}></div>}
            {canEdit && (
              <button
                className={styles.editButton}
                onClick={handleOpenEdit}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
                <span>Chỉnh sửa</span>
              </button>
            )}
          </div>
        )}
        {isMobile && (
          <>
            {module.project && module.project._id && (
              <button
                className={`${styles.backButton} ${styles.mobileButton} ${styles.mobileBackButton}`}
                onClick={() => navigate(`/projects/${module.project._id}`)}
                title="Quay lại dự án"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M12.5 15l-5-5 5-5" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            {canEdit && (
              <button
                className={`${styles.editButton} ${styles.mobileButton} ${styles.mobileEditButton}`}
                onClick={handleOpenEdit}
                title="Chỉnh sửa"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                </svg>
              </button>
            )}
          </>
        )}
        {/* Module Title & Meta */}
        <div className={styles.moduleTitleWrapper}>
          <h1 className={`${styles.moduleName} ${styles.moduleNameCentered}`}>{module.name}</h1>
          {!isMobile ? (
            <div className={`${styles.moduleMeta} ${styles.moduleMetaCentered}`}>
              <span className={styles.moduleId}>#{module.moduleId}</span>
              <span className={styles.moduleVersion}>v{module.version || '-'}</span>
            </div>
          ) : (
            <div className={styles.headerContentRow}>
              <div className={styles.moduleMeta}>
                <span className={styles.moduleId}>#{module.moduleId}</span>
                <span className={styles.moduleVersion}>v{module.version || '-'}</span>
              </div>
              <div className={styles.statusContainer}>
                <div
                  className={styles.statusBadge}
                  style={{backgroundColor: statusColors[module.status]?.background, color: statusColors[module.status]?.color}}
                >{module.status}</div>
              </div>
            </div>
          )}
        </div>
        {/* Status */}
        {!isMobile && (
          <div className={styles.statusContainer}>
            <span className={styles.statusLabel}>Trạng thái</span>
            <div
              className={styles.statusBadge}
              style={{backgroundColor: statusColors[module.status]?.background, color: statusColors[module.status]?.color}}
            >{module.status}</div>
          </div>
        )}
      </div>
      {/* Info Section */}
      <div className={styles.infoSection}>
        <div className={styles.infoGrid2Col}>
          {/* Cột trái */}
          <div className={styles.infoColLeft}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Thuộc dự án:</span>
              <span className={styles.infoValue}>{module.project?.name || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Người phụ trách:</span>
              <span className={styles.infoValue}>{module.owner?.name || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Thời gian dự kiến:</span>
              <span className={styles.infoValue}>
                {module.startDate ? new Date(module.startDate).toLocaleDateString('vi-VN') : '-'}
                {' - '}
                {module.endDate ? new Date(module.endDate).toLocaleDateString('vi-VN') : '-'}
              </span>
            </div>
          </div>
          {/* Cột phải */}
          <div className={styles.infoColRight}>
            <div className={styles.infoLabel}>Mô tả:</div>
            <div className={styles.descriptionBox}>
              {module.description ? (
                <span className={styles.descriptionText}>{module.description}</span>
              ) : (
                <span className={styles.noDescription}>Chưa có mô tả</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Documents Section */}
      <div className={styles.documentsSection}>
        <div className={styles.documentsHeader}>
          <h3 className={styles.documentsTitle}>Tài liệu nghiệp vụ</h3>
        </div>
        {module.docs && module.docs.length > 0 ? (
          <div className={styles.documentsGrid}>
            {module.docs.map((doc, idx) => (
              <div key={idx} className={styles.documentCard}>
                <div className={styles.documentIcon}>📄</div>
                <div className={styles.documentInfo}>
                  <span className={styles.documentName} title={doc.fileName}>
                    {(() => {
                      const name = doc.fileName || '';
                      const dotIdx = name.lastIndexOf('.');
                      const base = dotIdx !== -1 ? name.slice(0, dotIdx).replace(/\s+$/, '') : name.replace(/\s+$/, '');
                      const ext = dotIdx !== -1 ? name.slice(dotIdx) : '';
                      return (
                        <>
                          <span className={styles.fileBase}>{base}</span>
                          <span className={styles.fileExt}>{ext}</span>
                        </>
                      );
                    })()}
                  </span>
                  <div className={styles.documentMeta}>
                    <span className={styles.documentSize}>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                    <span className={styles.documentUploadTime}>{doc.uploadedAt ? `, ${new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}` : ''}</span>
                  </div>
                </div>
                <button
                  className={styles.downloadButton}
                  onClick={() => handleDownloadFile(doc)}
                  title="Tải xuống"
                >
                  <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.emptyDocuments}>
            <span className={styles.emptyIcon}>📄</span>
            <p className={styles.emptyText}>Chưa có tài liệu nghiệp vụ nào</p>
          </div>
        )}
      </div>
      {/* Tabs */}
      <div className={styles.tabsHeader}>
        <button
          className={`${styles.tabButton} ${tab === TABS.RELEASES ? styles.tabButtonActive : ''}`}
          onClick={() => setTab(TABS.RELEASES)}
        >
          {TABS.RELEASES}
        </button>
        <button
          className={`${styles.tabButton} ${tab === TABS.HISTORY ? styles.tabButtonActive : ''}`}
          onClick={() => setTab(TABS.HISTORY)}
        >
          {TABS.HISTORY}
        </button>
      </div>
      <div className={styles.tabContent}>
        {tab === TABS.RELEASES && (
          <div>
            <div className={styles.createReleaseWrapper}>
              <button
                className={styles.createReleaseBtn}
                onClick={() => setReleaseOpen(true)}
              >
                + Tạo release
              </button>
            </div>
            {releases.length > 0 ? (
              <div className={styles.releasesGrid}>
                {releases.map(r => (
                  <div key={r._id} className={styles.releaseCard}>
                    <div className={styles.releaseCardHeader}>
                      <span className={styles.releaseIdBadge}>#{r.releaseId}</span>
                      <span 
                        className={styles.releaseStatusBadge}
                        style={releaseStatusColors[r.status]}
                      >
                        {r.status}
                      </span>
                    </div>
                    <div className={styles.releaseVersion}>{r.version}</div>
                    <div className={styles.releaseInfoRow}>
                      Trạng thái nghiệm thu: 
                      <span 
                        className={styles.acceptanceBadge}
                        style={acceptanceStatusColors[r.acceptanceStatus]}
                      >
                        {r.acceptanceStatus || 'Chưa'}
                      </span>
                    </div>
                    <div className={styles.releaseDetailRow}>
                      Thời gian: {r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '-'}
                      {r.endDate ? ` - ${new Date(r.endDate).toLocaleDateString('vi-VN')}` : ''}
                    </div>
                    <div className={styles.releaseDetailRow}>
                      Người bàn giao: <span>{r.fromUser?.name || '-'}</span>
                    </div>
                    <div className={styles.releaseDetailRow}>
                      Người nhận bàn giao: <span>{r.toUser?.name || '-'}</span>
                    </div>
                    <div className={styles.releaseDetailRow}>
                      Người nghiệm thu: <span>{r.approver?.name || '-'}</span>
                    </div>
                    <div className={styles.releaseSpacer}></div>
                    <div className={styles.releaseFooter}>
                      <button
                        className={styles.releaseDetailButton}
                        onClick={() => navigate(`/releases/${r._id}`)}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyReleaseBox}>
                <div className={styles.emptyReleaseText}>Chưa có release nào cho module này</div>
              </div>
            )}
          </div>
        )}
        {tab === TABS.HISTORY && (
          <div>
            {module.history && module.history.length > 0 ? (
              <HistoryList history={module.history} />
            ) : <div className={styles.noHistory}>Chưa có lịch sử cập nhật</div>}
          </div>
        )}
      </div>
      <EditModulePopup 
        open={editOpen} 
        onClose={() => setEditOpen(false)} 
        module={module} 
        onSubmit={handleEditSubmit} 
        usersList={usersList}
        loading={editModuleLoading}
      />
      {/* Popup tạo release */}
      <NewReleasePopup
        open={releaseOpen}
        onClose={() => setReleaseOpen(false)}
        users={module && module.project && Array.isArray(module.project.members) ? module.project.members.map(m => m.user) : []}
        onSubmit={async data => {
          try {
            const formData = new FormData();
            // Sinh releaseId ngẫu nhiên
            const releaseId = Math.floor(100000 + Math.random() * 900000).toString();
            formData.append('releaseId', releaseId);
            formData.append('version', data.version);
            formData.append('startDate', data.startDate);
            formData.append('endDate', data.endDate);
            formData.append('fromUser', data.fromUser);
            formData.append('toUser', data.toUser);
            formData.append('approver', data.approver);
            formData.append('repoLink', data.gitRepo);
            formData.append('gitBranch', data.branch);
            formData.append('moduleId', module._id); // Đúng key là moduleId
            if (data.files && data.files.length > 0) {
              for (const file of data.files) {
                formData.append('docs', file);
              }
            }
            await ReleaseService.createRelease(formData);
            setReleaseOpen(false);
            await refreshModuleData();
            toast.success('Tạo release thành công!');
          } catch (e) {
            alert('Tạo release thất bại!');
          }
        }}
      />
      {/* SuccessToast đã được thay thế bằng react-toastify */}
    </div>
  );
};

export default ModuleDetail; 