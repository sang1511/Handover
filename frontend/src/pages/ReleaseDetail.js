import React, { useState, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import SprintSection from '../components/release/SprintSection';
import NewSprintPopup from '../components/popups/NewSprintPopup';
import { useState as useReactState } from 'react';
import EditReleasePopup from '../components/popups/EditReleasePopup';
import UserService from '../api/services/user.service';
import CopyToast from '../components/common/CopyToast';
import styles from './ReleaseDetail.module.css';
import ReleaseService from '../api/services/release.service';
import LoadingOverlay from '../components/common/LoadingOverlay';
import SuccessToast from '../components/common/SuccessToast';
import HistoryList from '../components/common/HistoryList';

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
  'Chưa bắt đầu': { background: '#f1f3f5', color: '#6c757d' },
  'Đang chuẩn bị': { background: '#ffe082', color: '#b8860b' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};
const acceptanceStatusColors = {
  'Chưa': { background: '#f1f3f5', color: '#6c757d' },
  'Đạt': { background: '#e6f4ea', color: '#28a745' },
  'Không đạt': { background: '#ffebee', color: '#d32f2f' },
};
const TABS = {
  SPRINT: 'Danh sách sprint',
  HISTORY: 'Lịch sử cập nhật',
};

// Định nghĩa styles ngoài component để không tạo mới mỗi lần render
const sprintSectionStyles = {
  sprintSection: { marginTop: 0 },
  sectionTitle: { fontSize: '1.3rem', fontWeight: '600', color: '#333', margin: '0 0 20px 0' },
  loadingContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' },
  loadingSpinner: { border: '3px solid #f3f3f3', borderTop: '3px solid #FA2B4D', borderRadius: '50%', width: 30, height: 30, animation: 'spin 1s linear infinite' },
  errorContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' },
  errorMessage: { color: '#dc3545', fontSize: 16 },
  sprintTabs: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 },
  scrollableTabContainer: { display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none', '&::-webkit-scrollbar': { display: 'none' } },
  sprintTabButton: { background: 'none', border: 'none', padding: '12px 24px', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#888', borderBottom: '2px solid transparent', transition: 'color 0.2s, border-bottom 0.2s', whiteSpace: 'nowrap' },
  addSprintButton: { background: '#FA2B4D', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  createSprintButton: { background: '#FA2B4D', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontSize: 16, fontWeight: 600, cursor: 'pointer' },
  scrollFade: { position: 'absolute', top: 0, bottom: 0, width: 20, pointerEvents: 'none', zIndex: 1 },
  sprintDetailTabButton: { background: 'none', border: 'none', padding: '12px 24px', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: '#888', borderBottom: '2px solid transparent', transition: 'color 0.2s, border-bottom 0.2s', whiteSpace: 'nowrap' }
};

const ReleaseDetail = () => {
  const { releaseId } = useParams();
  const navigate = useNavigate();
  const [release, setRelease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState(TABS.SPRINT);
  const [sprints, setSprints] = useState([]);
  const [loadingSprints, setLoadingSprints] = useState(false);
  const [showNewSprint, setShowNewSprint] = useState(false);
  const [showCopyToast, setShowCopyToast] = useReactState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [editReleaseLoading, setEditReleaseLoading] = useState(false);
  const windowWidth = useWindowWidth();
  const isMobile = windowWidth <= 900;

  // Thêm hàm fetchReleaseData giống fetchProjectData ở ProjectDetail.js
  const fetchReleaseData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axiosInstance.get(`/releases/${releaseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      // Lấy thêm thông tin module và project
      let moduleData = res.data.module;
      let projectData = null;
      if (moduleData && moduleData._id) {
        const moduleRes = await axiosInstance.get(`/modules/${moduleData._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        moduleData = moduleRes.data;
        projectData = moduleRes.data.project;
      }
      setRelease({ ...res.data, module: moduleData, project: projectData });
      setError(null);
    } catch (err) {
      setError('Không thể tải thông tin release');
    } finally {
      setLoading(false);
    }
  }, [releaseId]);

  // Thêm hàm fetchReleaseHistory chỉ lấy trường history
  const fetchReleaseHistory = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axiosInstance.get(`/releases/${releaseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRelease(prev => prev ? { ...prev, history: res.data.history } : prev);
    } catch (err) {
      // handle error nếu cần
    }
  }, [releaseId]);

  // Sử dụng fetchReleaseData trong useEffect thay vì lặp lại code
  useEffect(() => {
    fetchReleaseData();
  }, [fetchReleaseData]);

  useEffect(() => {
    if (tab === TABS.SPRINT && releaseId) {
      setLoadingSprints(true);
      axiosInstance.get(`/sprints/by-release/${releaseId}`)
        .then(res => setSprints(res.data || []))
        .catch(() => setSprints([]))
        .finally(() => setLoadingSprints(false));
    }
  }, [tab, releaseId]);

  // Lấy usersList khi mở popup
  const handleOpenEdit = async () => {
    setEditOpen(true);
    try {
      const users = await UserService.getAllUsers();
      setUsersList(users);
    } catch {
      setUsersList([]);
    }
  };

  const handleCopy = useCallback((text) => {
    navigator.clipboard.writeText(text);
    setShowCopyToast(true);
  }, [setShowCopyToast]);

  const formatDate = useCallback((date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  }, []);

  const formatDateTime = useCallback((date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('vi-VN');
  }, []);

  const getSprintStatusStyle = useCallback((status) => {
    switch (status) {
      case 'Chưa bắt đầu': return { backgroundColor: '#e3f2fd', color: '#1976d2' };
      case 'Đang thực hiện': return { backgroundColor: '#fff3e0', color: '#f57c00' };
      case 'Hoàn thành': return { backgroundColor: '#e8f5e8', color: '#388e3c' };
      default: return { backgroundColor: '#f5f5f5', color: '#666' };
    }
  }, []);

  const onProjectStatusChange = useCallback(() => {}, []);

  const handleNavigateBack = useCallback(() => {
    navigate(`/modules/${release.module._id}`);
  }, [navigate, release?.module?._id]);

  const handleOpenNewSprint = useCallback(() => {
    setShowNewSprint(true);
  }, []);

  const handleCloseNewSprint = useCallback(() => {
    setShowNewSprint(false);
  }, []);

  // Trong handleSprintCreated, chỉ cần gọi fetchReleaseData sau khi tạo sprint
  const handleSprintCreated = useCallback(() => {
    setShowNewSprint(false);
    setTab(TABS.SPRINT);
    if (release?._id) {
      axiosInstance.get(`/sprints/by-release/${release._id}`)
        .then(res => setSprints(res.data || []));
    }
    fetchReleaseHistory();
    setSuccessMsg('Tạo sprint thành công!');
    setShowSuccessToast(true);
  }, [release?._id, fetchReleaseHistory]);

  const handleCloseEdit = useCallback(() => {
    setEditOpen(false);
  }, []);

  // Trong handleSubmitEdit, sau khi cập nhật thành công, gọi fetchReleaseData
  const handleSubmitEdit = useCallback(async (formData) => {
    if (!release?._id) return;
    setEditReleaseLoading(true);
    try {
      await axiosInstance.put(`/releases/${release._id}`, formData, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      // Fetch lại release nhưng KHÔNG set loading toàn trang
      const token = localStorage.getItem('token');
      const res = await axiosInstance.get(`/releases/${releaseId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRelease(prev => ({
        ...prev,
        ...res.data,
        module: prev.module,
        project: prev.project,
      }));
      setEditOpen(false);
      setSuccessMsg('Cập nhật release thành công!');
      setShowSuccessToast(true);
    } catch {
      alert('Cập nhật release thất bại!');
    } finally {
      setEditReleaseLoading(false);
    }
  }, [release?._id, releaseId]);

  const handleCloseCopyToast = useCallback(() => {
    setShowCopyToast(false);
  }, [setShowCopyToast]);

  const handleCopyRepoLink = useCallback(() => {
    if (release?.repoLink) {
      navigator.clipboard.writeText(release.repoLink);
      setShowCopyToast(true);
    }
  }, [release?.repoLink, setShowCopyToast]);

  // Thay thế hàm download file cũ bằng gọi service
  const handleDownloadFile = (doc) => {
    ReleaseService.downloadFile(release._id, doc);
  };

  const handleTabChange = useCallback((newTab) => {
    setTab(newTab);
  }, []);

  if (loading) return (
    <div className={styles.container}>
      <LoadingOverlay text="Đang tải thông tin release..." style={{zIndex: 10}} />
    </div>
  );
  if (error) return (
    <div className={styles.container}>
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <div className={styles.errorMessage}>{error}</div>
        <button className={styles.backButton} onClick={() => navigate('/releases')}>
          Quay lại danh sách
        </button>
      </div>
    </div>
  );
  if (!release) return null;

  // Kiểm tra quyền truy cập
  let userData = null;
  try {
    const userStr = localStorage.getItem('user');
    userData = userStr ? JSON.parse(userStr) : null;
  } catch {}
  let isMember = false;
  if (userData && release.project && Array.isArray(release.project.members)) {
    isMember = release.project.members.some(mem => {
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
          <div className={styles.errorMessage}>Bạn không có quyền truy cập release này.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        {/* Desktop: 2 hàng bên trái */}
        {!isMobile && (
          <div className={styles.headerLeftButtons}>
            <button
              className={styles.backButton}
              onClick={handleNavigateBack}
              title="Quay lại module"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20" style={{marginRight: 4}}><path d="M12.5 15l-5-5 5-5" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Quay lại module</span>
            </button>
            <button
              className={styles.editButton}
              onClick={handleOpenEdit}
              title="Chỉnh sửa"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{marginRight: 8, display: 'block'}}>
                <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              <span>Chỉnh sửa</span>
            </button>
          </div>
        )}
        {/* Mobile: 2 nút tách biệt, tuyệt đối */}
        {isMobile && (
          <>
            <button
              className={styles.backButton}
              style={{position: 'absolute', left: 8, top: 8, minWidth: 36, width: 36, height: 36, padding: 0, borderRadius: '50%', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2}}
              onClick={handleNavigateBack}
              title="Quay lại module"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M12.5 15l-5-5 5-5" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              className={styles.editButton}
              style={{position: 'absolute', right: 8, top: 8, minWidth: 36, width: 36, height: 36, padding: 0, borderRadius: '50%', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2}}
              onClick={handleOpenEdit}
              title="Chỉnh sửa"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{display: 'block'}}>
                <path d="M16.474 5.474a2.121 2.121 0 1 1 3 3L8.5 19.448l-4 1 1-4 11.974-11.974z" stroke="#FA2B4D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
            </button>
          </>
        )}
        {/* Release Title & Meta */}
        <div style={{flex: 1, textAlign: 'center'}}>
          <h1 className={styles.releaseName}>{release?.version || release?.releaseId || 'Loading...'}</h1>
          {!isMobile ? (
            <div className={styles.metaRow}>
              <span className={styles.releaseId}>#{release?.releaseId || '...'}</span>
            </div>
          ) : (
            <div className={styles.headerContentRow}>
              <span className={styles.releaseId}>#{release?.releaseId || '...'}</span>
              <div className={styles.badgesContainer}>
                <span className={styles.statusBadge} style={{background: statusColors[release?.status]?.background, color: statusColors[release?.status]?.color}}>{release?.status || 'Loading...'}</span>
                <span className={styles.acceptanceBadge} style={{background: acceptanceStatusColors[release?.acceptanceStatus]?.background, color: acceptanceStatusColors[release?.acceptanceStatus]?.color}}>
                  {release?.acceptanceStatus === 'Chưa' ? 'Chưa nghiệm thu' : release?.acceptanceStatus === 'Đạt' ? 'Đạt nghiệm thu' : release?.acceptanceStatus === 'Không đạt' ? 'Không đạt nghiệm thu' : (release?.acceptanceStatus || 'Chưa')}
                </span>
              </div>
            </div>
          )}
        </div>
        {/* Status */}
        {!isMobile && (
          <div className={styles.statusBlock}>
            <div className={styles.statusBadgeWrap}>
              <span className={styles.statusLabel}>Trạng thái:</span>
              <span className={styles.statusBadge} style={{background: statusColors[release?.status]?.background, color: statusColors[release?.status]?.color}}>{release?.status || 'Loading...'}</span>
            </div>
            <div className={styles.acceptanceBadgeWrap}>
              <span className={styles.acceptanceLabel}>Nghiệm thu:</span>
              <span className={styles.acceptanceBadge} style={{background: acceptanceStatusColors[release?.acceptanceStatus]?.background, color: acceptanceStatusColors[release?.acceptanceStatus]?.color}}>
                {release?.acceptanceStatus || 'Chưa'}
              </span>
            </div>
          </div>
        )}
      </div>
      {/* Info Section */}
      <div className={styles.infoSection}>
        <div className={styles.infoGrid2Col}>
          <div className={styles.infoColLeft}>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Thuộc module:</span> <span className={styles.infoValue}>{release.module?.name || '-'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Thuộc dự án:</span> <span className={styles.infoValue}>{release.project?.name || '-'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Người bàn giao:</span> <span className={styles.infoValue}>{release.fromUser?.name || '-'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Người nhận bàn giao:</span> <span className={styles.infoValue}>{release.toUser?.name || '-'}</span></div>
          </div>
          <div className={styles.infoColRight}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Người nghiệm thu:</span>
              <span className={styles.infoValue}>{release.approver?.name || '-'}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Thời gian:</span>
              <span className={styles.infoValue}>
                {release?.startDate ? new Date(release.startDate).toLocaleDateString('vi-VN') : '-'}
                {release?.endDate ? ` - ${new Date(release.endDate).toLocaleDateString('vi-VN')}` : ''}
              </span>
            </div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Git repo:</span> <span className={styles.infoValue}>{release?.repoLink ? (
              <>
                <a
                  href={release.repoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.repoLink}
                  title={release.repoLink}
                >
                  {release.repoLink}
                </a>
                <button
                  className={styles.copyButton}
                  title="Copy repo link"
                  onClick={handleCopyRepoLink}
                >
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="6" y="6" width="9" height="9" rx="2" stroke="#1976d2" strokeWidth="1.5"/><rect x="3" y="3" width="9" height="9" rx="2" stroke="#1976d2" strokeWidth="1.5" fill="#fff"/></svg>
                </button>
              </>
            ) : '-'}</span></div>
            <div className={styles.infoItem}><span className={styles.infoLabel}>Branch:</span> <span className={styles.infoValue}>{release?.gitBranch || '-'}</span></div>
          </div>
        </div>
        {/* Tài liệu bàn giao */}
        <div className={styles.documentsSection}>
          <div className={styles.documentsHeader}><h3 className={styles.documentsTitle}>Tài liệu bàn giao</h3></div>
          {release?.docs && release.docs.length > 0 ? (
            <div className={styles.documentsGrid}>
              {release.docs.map((doc, idx) => (
                <div key={idx} className={styles.documentCard}>
                  <div className={styles.documentIcon}>📄</div>
                  <div className={styles.documentInfo}>
                    {(() => {
                      const name = doc.fileName || '';
                      const dotIdx = name.lastIndexOf('.');
                      const base = dotIdx !== -1 ? name.slice(0, dotIdx).replace(/\s+$/, '') : name.replace(/\s+$/, '');
                      const ext = dotIdx !== -1 ? name.slice(dotIdx) : '';
                      return (
                        <span className={styles.documentName} title={doc.fileName}>
                          <span className={styles.fileBase}>{base}</span>
                          <span className={styles.fileExt}>{ext}</span>
                        </span>
                      );
                    })()}
                    <div className={styles.documentMeta}>
                      <span className={styles.documentSize}>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                      <span className={styles.documentUploadTime}>{doc.uploadedAt ? `, ${new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}` : ''}</span>
                    </div>
                  </div>
                  <button className={styles.downloadButton} title="Tải xuống" onClick={() => handleDownloadFile(doc)}>
                    <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download" style={{ width: 24, height: 24, display: 'block' }} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyDocuments}><span className={styles.emptyIcon}>📄</span><p className={styles.emptyText}>Chưa có tài liệu bàn giao nào</p></div>
          )}
        </div>
      </div>
      {/* Tab Section */}
      <div className={styles.tabsHeader}>
        {Object.values(TABS).map(t => (
          <button
            key={t}
            className={`${styles.tabButton} ${tab === t ? styles.tabButtonActive : ''}`}
            onClick={() => handleTabChange(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {tab === TABS.SPRINT && (
          <div>
            {loadingSprints ? (
              <div>Đang tải sprint...</div>
            ) : (
              sprints && sprints.length > 0 ? (
                <SprintSection 
                  releaseId={release?._id} 
                  sprints={sprints} 
                  setSprints={setSprints}
                  handleOpenNewSprintPopup={handleOpenNewSprint}
                  styles={sprintSectionStyles}
                  handleCopy={handleCopy}
                  copyFeedback={{ show: showCopyToast, message: 'Đã copy!' }}
                  formatDate={formatDate}
                  getSprintStatusStyle={getSprintStatusStyle}
                  formatDateTime={formatDateTime}
                  onProjectStatusChange={onProjectStatusChange}
                  projectMembers={release?.project?.members ? release.project.members.map(m => m.user) : []}
                  onSprintEditSuccess={() => {
                    setSuccessMsg('Cập nhật sprint thành công!');
                    setShowSuccessToast(true);
                  }}
                />
              ) : (
                <div className={styles.emptySprintBox}>
                  <div className={styles.emptySprintText}>Chưa có sprint nào cho release này</div>
                  <button className={styles.createSprintBtn} onClick={handleOpenNewSprint}>Tạo sprint</button>
                </div>
              )
            )}
            <NewSprintPopup isOpen={showNewSprint} onClose={handleCloseNewSprint} releaseId={release?._id} onSprintCreated={handleSprintCreated} />
          </div>
        )}
        {tab === TABS.HISTORY && (
          <div>
            {release?.history && release.history.length > 0 ? (
              <HistoryList history={release.history} />
            ) : <div className={styles.noHistory}>Chưa có lịch sử cập nhật</div>}
          </div>
        )}
      </div>
      <CopyToast show={showCopyToast} message="Đã copy!" onClose={handleCloseCopyToast} />
      <SuccessToast show={showSuccessToast} message={successMsg} onClose={() => setShowSuccessToast(false)} />
      <EditReleasePopup
        open={editOpen}
        onClose={handleCloseEdit}
        release={release}
        usersList={usersList}
        onSubmit={handleSubmitEdit}
        loading={editReleaseLoading}
      />
    </div>
  );
};

export default ReleaseDetail; 