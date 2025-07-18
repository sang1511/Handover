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
import SuccessToast from '../components/common/SuccessToast';

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
  const [showReleaseToast, setShowReleaseToast] = useState(false);
  const [releaseToastMsg, setReleaseToastMsg] = useState('');
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
        const rel = await axiosInstance.get(`/releases?moduleId=${moduleId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setReleases(rel.data);
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
        const rel = await axiosInstance.get(`/releases?moduleId=${moduleId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        setReleases(rel.data);
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
      setReleaseToastMsg('Cập nhật module thành công!');
      setShowReleaseToast(true);
      setTimeout(() => setShowReleaseToast(false), 1800);
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
      {loading && <LoadingOverlay text="Đang tải thông tin module..." style={{zIndex: 10}} />}
      {/* Improved Header Row */}
      <div className={styles.headerSection}>
        {/* Responsive buttons */}
        {!isMobile && (
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, minWidth: 140}}>
            {module.project && module.project._id ? (
              <button
                className={styles.backButton}
                onClick={() => navigate(`/projects/${module.project._id}`)}
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20" style={{marginRight: 4}}><path d="M12.5 15l-5-5 5-5" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Quay lại dự án
              </button>
            ) : <div style={{minWidth: 140}}></div>}
            {canEdit && (
              <button
                className={styles.editButton}
                onClick={handleOpenEdit}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{marginRight: 8, display: 'block'}}>
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
                className={styles.backButton}
                style={{position: 'absolute', left: 8, top: 8, minWidth: 36, width: 36, height: 36, padding: 0, borderRadius: '50%', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2}}
                onClick={() => navigate(`/projects/${module.project._id}`)}
                title="Quay lại dự án"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M12.5 15l-5-5 5-5" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            )}
            {canEdit && (
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
            )}
          </>
        )}
        {/* Module Title & Meta */}
        <div style={{flex: 1, textAlign: 'center'}}>
          <h1 className={styles.moduleName} style={{margin: 0}}>{module.name}</h1>
          {!isMobile ? (
            <div className={styles.moduleMeta} style={{justifyContent: 'center', marginTop: 8}}>
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
                  <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download" style={{ width: 24, height: 24, display: 'block', transition: 'transform 0.18s' }} />
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
            <div style={{display:'flex', justifyContent:'flex-end', marginBottom:16}}>
              <button
                className={styles.createReleaseBtn}
                onClick={() => setReleaseOpen(true)}
              >
                + Tạo release
              </button>
            </div>
            {releases.length > 0 ? (
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(340px, 1fr))', gap:20}}>
                {releases.map(r => (
                  <div key={r._id} style={{
                    background:'#fff',
                    borderRadius:14,
                    boxShadow:'0 2px 12px rgba(44,62,80,0.08)',
                    padding:'24px 22px 18px 22px',
                    display:'flex',
                    flexDirection:'column',
                    gap:12,
                    minHeight:180,
                    position:'relative',
                  }}>
                    <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:10}}>
                      <span style={{background:'#e3f2fd', color:'#1976d2', borderRadius:10, fontWeight:700, fontSize:15, padding:'4px 12px', letterSpacing:0.5}}>#{r.releaseId}</span>
                      <span style={{
                        background: releaseStatusColors[r.status]?.background || '#f1f3f5',
                        color: releaseStatusColors[r.status]?.color || '#6c757d',
                        borderRadius:10,
                        fontWeight:700,
                        fontSize:14,
                        padding:'4px 12px',
                      }}>{r.status}</span>
                    </div>
                    <div style={{fontWeight:700, fontSize:18, color:'#222', margin:'6px 0 2px 0', lineHeight:1.2}}>{r.version}</div>
                    <div style={{color:'#666', fontSize:15, marginBottom:2}}>
                      Trạng thái nghiệm thu: <span style={{
                        fontWeight:600,
                        borderRadius:8,
                        padding:'2px 10px',
                        background: acceptanceStatusColors[r.acceptanceStatus]?.background || '#f1f3f5',
                        color: acceptanceStatusColors[r.acceptanceStatus]?.color || '#6c757d',
                        marginLeft:6,
                      }}>{r.acceptanceStatus || 'Chưa'}</span>
                    </div>
                    <div style={{color:'#888', fontSize:14, marginBottom:2}}>
                      Thời gian: {r.startDate ? new Date(r.startDate).toLocaleDateString('vi-VN') : '-'}
                      {r.endDate ? ` - ${new Date(r.endDate).toLocaleDateString('vi-VN')}` : ''}
                    </div>
                    <div style={{color:'#888', fontSize:14, marginBottom:2}}>
                      Người bàn giao: <span style={{fontWeight:600, color:'#1976d2'}}>{r.fromUser?.name || '-'}</span>
                    </div>
                    <div style={{color:'#888', fontSize:14, marginBottom:2}}>
                      Người nhận bàn giao: <span style={{fontWeight:600, color:'#1976d2'}}>{r.toUser?.name || '-'}</span>
                    </div>
                    <div style={{color:'#888', fontSize:14, marginBottom:2}}>
                      Người nghiệm thu: <span style={{fontWeight:600, color:'#1976d2'}}>{r.approver?.name || '-'}</span>
                    </div>
                    <div style={{flex:1}}></div>
                    <div style={{display:'flex', justifyContent:'flex-end'}}>
                      <button
                        style={{
                          background:'#1976d2',
                          color:'#fff',
                          border:'none',
                          borderRadius:8,
                          padding:'8px 18px',
                          fontWeight:600,
                          fontSize:15,
                          cursor:'pointer',
                          transition:'background 0.18s',
                        }}
                        onClick={() => window.location.href = `/releases/${r._id}`}
                        onMouseOver={e => e.currentTarget.style.background = '#115293'}
                        onMouseOut={e => e.currentTarget.style.background = '#1976d2'}
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
              <div className={styles.historyContainer}>
                <ul className={styles.historyList}>
                  {module.history
                    .slice()
                    .reverse()
                    .map((h, idx) => (
                    <li key={idx} className={styles.historyItem}>
                      <span className={styles.historyTimestamp}>
                        {h.timestamp ? new Date(h.timestamp).toLocaleString('vi-VN') : ''}
                      </span>
                      {' - '}
                      {h.fromUser && (
                        <span className={styles.historyUser}>
                          {h.fromUser.name || h.fromUser}
                        </span>
                      )}
                      {' '}
                      <span className={styles.historyContent}>
                        {h.action} {h.comment ? ` ${h.comment}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
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
            setReleaseToastMsg('Tạo release thành công!');
            setShowReleaseToast(true);
            setTimeout(() => setShowReleaseToast(false), 1800);
          } catch (e) {
            alert('Tạo release thất bại!');
          }
        }}
      />
      <SuccessToast show={showReleaseToast} message={releaseToastMsg} onClose={() => setShowReleaseToast(false)} />
    </div>
  );
};

export default ModuleDetail; 