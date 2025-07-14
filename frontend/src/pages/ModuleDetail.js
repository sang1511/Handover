import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import EditModulePopup from '../components/popups/EditModulePopup';
import UserService from '../api/services/user.service';
import ModuleService from '../api/services/module.service';
import NewReleasePopup from '../components/popups/NewReleasePopup';
import ReleaseService from '../api/services/release.service';
import { useAuth } from '../contexts/AuthContext';

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
  const [updating, setUpdating] = useState(false);
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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axiosInstance.get(`/modules/${moduleId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setModule(res.data);
        setError(null);
        try {
          const rel = await axiosInstance.get(`/releases?moduleId=${moduleId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
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
    };
    fetchData();
  }, [moduleId, updating]);

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
    setUpdating(true);
    try {
      await ModuleService.updateModule(moduleId, formData);
      setEditOpen(false);
    } catch (e) {
      alert('Cập nhật module thất bại!');
    } finally {
      setUpdating(false);
    }
  };

  // Thêm hàm tải file
  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axiosInstance.get(`/modules/${moduleId}/files/${fileId}/download`, {
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

  if (loading) return <div style={{padding: 40, textAlign: 'center'}}>Đang tải...</div>;
  if (error) return <div style={{padding: 40, color: '#FA2B4D', textAlign: 'center'}}>{error}</div>;
  if (!module) return null;

  return (
    <div style={styles.container}>
      {/* Improved Header Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '24px 32px 0 32px',
        gap: 24,
      }}>
        {/* Back to Project Button + Edit Button (2 hàng bên trái) */}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, minWidth: 140}}>
          {module.project && module.project._id ? (
            <button
              style={{
                background: '#f5f6fa',
                color: '#1976d2',
                border: '1.5px solid #90caf9',
                borderRadius: 24,
                padding: '7px 18px',
                fontWeight: 600,
                fontSize: 15,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                minWidth: 140,
                transition: 'background 0.18s, border 0.18s',
              }}
              onClick={() => navigate(`/projects/${module.project._id}`)}
              onMouseOver={e => {
                e.currentTarget.style.background = '#e3f2fd';
                e.currentTarget.style.border = '1.5px solid #42a5f5';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#f5f6fa';
                e.currentTarget.style.border = '1.5px solid #90caf9';
              }}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 20 20" style={{marginRight: 4}}><path d="M12.5 15l-5-5 5-5" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Quay lại dự án
            </button>
          ) : <div style={{minWidth: 140}}></div>}
          {canEdit && (
            <button
              style={{
                marginTop: 4,
                background: '#FA2B4D',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 18px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'background 0.18s',
              }}
              onClick={handleOpenEdit}
              onMouseOver={e => e.currentTarget.style.background = '#d81b3a'}
              onMouseOut={e => e.currentTarget.style.background = '#FA2B4D'}
            >
              ✏️ Chỉnh sửa
            </button>
          )}
        </div>
        {/* Module Title & Meta */}
        <div style={{flex: 1, textAlign: 'center'}}>
          <h1 style={{...styles.moduleName, margin: 0}}>{module.name}</h1>
          <div style={{...styles.moduleMeta, justifyContent: 'center', marginTop: 8}}>
            <span style={styles.moduleId}>#{module.moduleId}</span>
            <span style={styles.moduleVersion}>v{module.version || '-'}</span>
          </div>
        </div>
        {/* Status */}
        <div style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, minWidth: 180}}>
          <span style={styles.statusLabel}>Trạng thái</span>
          <div style={{
            ...styles.statusBadge,
            backgroundColor: statusColors[module.status]?.background,
            color: statusColors[module.status]?.color
          }}>{module.status}</div>
        </div>
      </div>
      {/* Info Section */}
      <div style={styles.infoSection}>
        <div style={styles.infoGrid2Col}>
          {/* Cột trái */}
          <div style={styles.infoColLeft}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Thuộc dự án:</span>
              <span style={styles.infoValue}>{module.project?.name || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Người phụ trách:</span>
              <span style={styles.infoValue}>{module.owner?.name || '-'}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Thời gian dự kiến:</span>
              <span style={styles.infoValue}>
                {module.startDate ? new Date(module.startDate).toLocaleDateString('vi-VN') : '-'}
                {' - '}
                {module.endDate ? new Date(module.endDate).toLocaleDateString('vi-VN') : '-'}
              </span>
            </div>
          </div>
          {/* Cột phải */}
          <div style={styles.infoColRight}>
            <div style={styles.infoLabel}>Mô tả:</div>
            <div style={styles.descriptionBox}>
              {module.description ? (
                <span style={styles.descriptionText}>{module.description}</span>
              ) : (
                <span style={styles.noDescription}>Chưa có mô tả</span>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* Documents Section */}
      <div style={styles.documentsSection}>
        <div style={styles.documentsHeader}>
          <h3 style={styles.documentsTitle}>Tài liệu nghiệp vụ</h3>
        </div>
        {module.docs && module.docs.length > 0 ? (
          <div style={styles.documentsGrid}>
            {module.docs.map((doc, idx) => (
              <div key={idx} style={styles.documentCard}>
                <div style={styles.documentIcon}>📄</div>
                <div style={styles.documentInfo}>
                  <span style={styles.documentName} title={doc.fileName}>{doc.fileName && doc.fileName.length > 30 ? doc.fileName.slice(0, 27) + '...' + doc.fileName.slice(doc.fileName.lastIndexOf('.')) : doc.fileName}</span>
                  <span style={styles.documentSize}>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                  <span style={styles.documentUploadTime}>{doc.uploadedAt ? `,   ${new Date(doc.uploadedAt).toLocaleDateString('vi-VN')}` : ''}</span>
                </div>
                <button
                  style={{
                    ...styles.downloadButton,
                    transition: 'background 0.18s',
                  }}
                  title="Tải xuống"
                  onClick={() => handleDownloadFile(doc.fileId, doc.fileName)}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#e3f2fd';
                    if (e.currentTarget.firstChild) e.currentTarget.firstChild.style.transform = 'scale(1.18)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'none';
                    if (e.currentTarget.firstChild) e.currentTarget.firstChild.style.transform = 'scale(1)';
                  }}
                >
                  <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download" style={{ width: 24, height: 24, display: 'block', transition: 'transform 0.18s' }} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={styles.emptyDocuments}>
            <span style={styles.emptyIcon}>📄</span>
            <p style={styles.emptyText}>Chưa có tài liệu nghiệp vụ nào</p>
          </div>
        )}
      </div>
      {/* Tabs */}
      <div style={styles.tabsHeader}>
        <button
          style={{
            ...styles.tabButton,
            ...(tab === TABS.RELEASES ? styles.tabButtonActive : {})
          }}
          onClick={() => setTab(TABS.RELEASES)}
        >
          {TABS.RELEASES}
        </button>
        <button
          style={{
            ...styles.tabButton,
            ...(tab === TABS.HISTORY ? styles.tabButtonActive : {})
          }}
          onClick={() => setTab(TABS.HISTORY)}
        >
          {TABS.HISTORY}
        </button>
      </div>
      <div style={styles.tabContent}>
        {tab === TABS.RELEASES && (
          <div>
            <div style={{display:'flex', justifyContent:'flex-end', marginBottom:16}}>
              <button
                style={{
                  ...styles.createReleaseBtn,
                  transition: 'background 0.18s',
                }}
                onClick={() => setReleaseOpen(true)}
                onMouseOver={e => e.currentTarget.style.background = '#d81b3a'}
                onMouseOut={e => e.currentTarget.style.background = '#FA2B4D'}
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
              <div style={styles.emptyReleaseBox}>
                <div style={styles.emptyReleaseText}>Chưa có release nào cho module này</div>
              </div>
            )}
          </div>
        )}
        {tab === TABS.HISTORY && (
          <div>
            {module.history && module.history.length > 0 ? (
              <div style={styles.historyContainer}>
                <ul style={styles.historyList}>
                  {module.history
                    .slice()
                    .reverse()
                    .map((h, idx) => (
                    <li key={idx} style={styles.historyItem}>
                      <span style={styles.historyTimestamp}>
                        {h.timestamp ? new Date(h.timestamp).toLocaleString('vi-VN') : ''}
                      </span>
                      {' - '}
                      {h.fromUser && (
                        <span style={styles.historyUser}>
                          {h.fromUser.name || h.fromUser}
                        </span>
                      )}
                      {' '}
                      <span style={styles.historyContent}>
                        {h.action} {h.comment ? ` ${h.comment}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : <div style={styles.noHistory}>Chưa có lịch sử cập nhật</div>}
          </div>
        )}
      </div>
      <EditModulePopup open={editOpen} onClose={() => setEditOpen(false)} module={module} onSubmit={handleEditSubmit} usersList={usersList} />
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
            setUpdating(u => !u);
            setReleaseToastMsg('Tạo release thành công!');
            setShowReleaseToast(true);
            setTimeout(() => setShowReleaseToast(false), 1800);
          } catch (e) {
            alert('Tạo release thất bại!');
          }
        }}
      />
      {showReleaseToast && (
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
        }}>{releaseToastMsg}</div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: 900,
    margin: '40px auto',
    background: '#fff',
    borderRadius: 16,
    padding: 0,
    boxShadow: '0 2px 12px rgba(250,43,77,0.08)',
    fontFamily: 'Segoe UI, Arial, sans-serif',
  },
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
  headerLeft: {
    flex: '1',
  },
  moduleName: {
    fontSize: '2.5rem',
    fontWeight: '700',
    color: '#FA2B4D',
    margin: '0 0 12px 0',
    lineHeight: '1.2',
  },
  moduleMeta: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
  },
  moduleId: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '600',
  },
  moduleVersion: {
    backgroundColor: '#f3e5f5',
    color: '#7b1fa2',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '0.9rem',
    fontWeight: '600',
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
  infoSection: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
  },
  infoGrid2Col: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '60px',
    alignItems: 'stretch',
  },
  infoColLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    justifyContent: 'stretch',
  },
  infoColRight: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'stretch',
    height: '100%',
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
    fontWeight: '700',
    color: '#111',
    fontSize: '1.08rem',
  },
  infoValue: {
    color: '#333',
    fontSize: '0.95rem',
    fontWeight: '500',
  },
  fileName: {
    color: '#1976d2',
    fontWeight: 600,
    fontSize: 14,
    marginRight: 6,
  },
  fileSize: {
    color: '#888',
    fontSize: 13,
    marginLeft: 4,
  },
  downloadBtn: {
    background: '#FA2B4D',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '6px 14px',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    marginLeft: 8,
    transition: 'background 0.2s',
  },
  noDoc: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: 14,
    marginTop: 4,
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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: 8,
    background: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(250,43,77,0.04)',
  },
  tableRow: {
    transition: 'background 0.15s',
    cursor: 'pointer',
    ':hover': {
      background: '#f8f9fa',
    },
  },
  emptyReleaseBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 0',
    background: '#fff',
    borderRadius: 12,
    border: '1.5px dashed #FA2B4D',
    marginTop: 12,
    marginBottom: 12,
  },
  emptyReleaseText: {
    color: '#888',
    fontSize: 16,
    marginBottom: 16,
    fontWeight: 600,
  },
  createReleaseBtn: {
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
  descriptionBox: {
    background: '#f8f9fa',
    borderRadius: 10,
    padding: '18px 16px',
    minHeight: 80,
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    overflow: 'auto',
    maxHeight: 180,
  },
  descriptionText: {
    color: '#333',
    fontSize: 15,
    lineHeight: 1.6,
  },
  noDescription: {
    color: '#888',
    fontStyle: 'italic',
    fontSize: 15,
  },
  documentsSection: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
  },
  documentsHeader: {
    marginBottom: 20,
  },
  documentsTitle: {
    fontSize: '1.3rem',
    fontWeight: '600',
    color: '#333',
    margin: '0 0 20px 0',
  },
  documentsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '16px',
    alignItems: 'stretch',
    maxHeight: '180px',
    overflowY: 'auto',
    paddingRight: 4,
  },
  documentCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 16px',
    background: '#f8f9fa',
    borderRadius: 8,
    border: '1px solid #e9ecef',
  },
  documentIcon: {
    fontSize: '1.5rem',
    marginRight: 20,
    color: '#1976d2',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  documentSize: {
    color: '#888',
    fontSize: 13,
  },
  downloadButton: {
    background: 'none',
    border: 'none',
    outline: 'none',
    cursor: 'pointer',
    padding: 0,
  },
  emptyDocuments: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 0',
    background: '#f8f9fa',
    borderRadius: '8px',
    border: '1.5px dashed #FA2B4D',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    color: '#888',
    fontSize: 15,
  },
  documentUploadTime: {
    fontSize: '0.8rem',
    color: '#888',
    marginTop: 2,
  },
};

export default ModuleDetail; 