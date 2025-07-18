import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import LoadingOverlay from '../components/common/LoadingOverlay';

const Modules = () => {
  const [modules, setModules] = useState([]);
  const [filteredModules, setFilteredModules] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchModules = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem('accessToken');
        if (!accessToken) {
          navigate('/login');
          return;
        }
        // Lấy user từ localStorage
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        // Lấy tất cả module, populate project, owner
        const res = await axiosInstance.get('/modules', {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        let modulesData = res.data;
        // Lọc theo quyền
        if (user && user.role !== 'admin') {
          modulesData = modulesData.filter(m => {
            // project.members là m.project.members: [{ user: ... }]
            if (!m.project || !Array.isArray(m.project.members)) return false;
            return m.project.members.some(mem => {
              // mem.user có thể là object hoặc id
              if (typeof mem.user === 'object') {
                return mem.user._id === user._id;
              }
              return mem.user === user._id;
            });
          });
        }
        setModules(modulesData);
        setFilteredModules(modulesData);
        setError(null);
      } catch (err) {
        setError('Có lỗi khi tải danh sách module');
      } finally {
        setLoading(false);
      }
    };
    fetchModules();
  }, [navigate]);

  useEffect(() => {
    let result = [...modules];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(m =>
        (m.moduleId && m.moduleId.toLowerCase().includes(s)) ||
        (m.name && m.name.toLowerCase().includes(s)) ||
        (m.project?.name && m.project.name.toLowerCase().includes(s))
      );
    }
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      default:
        break;
    }
    setFilteredModules(result);
  }, [modules, searchTerm, sortBy]);

  const handleDetail = (id) => {
    navigate(`/modules/${id}`);
  };

  return (
    <div style={styles.container}>
      {loading && <LoadingOverlay text="Đang tải danh sách module..." style={{zIndex: 10}} />}
      {!loading && (
        <>
          {error && <div style={styles.errorMessage}>{error}</div>}
          <div style={styles.filterContainer}>
            <div style={styles.searchBox}>
              <img
                src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
                alt="search icon"
                style={styles.searchIcon}
              />
              <input
                type="text"
                placeholder="Tìm kiếm theo ID, tên module hoặc tên dự án..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={styles.searchInput}
              />
            </div>
            <div style={styles.filterGroup}>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                style={styles.select}
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
              </select>
            </div>
          </div>
          <div style={styles.tableContainer}>
            {filteredModules.length > 0 ? (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.tableHeader}>ID</th>
                    <th style={styles.tableHeader}>Tên module</th>
                    <th style={styles.tableHeader}>Tên dự án</th>
                    <th style={styles.tableHeader}>Ngày bắt đầu - kết thúc</th>
                    <th style={styles.tableHeader}>Người phụ trách</th>
                    <th style={styles.tableHeader}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModules.map(module => (
                    <tr key={module._id} style={styles.tableRow}>
                      <td style={styles.tableCell}>{module.moduleId}</td>
                      <td style={styles.tableCell}>{module.name}</td>
                      <td style={styles.tableCell}>{module.project?.name || '-'}</td>
                      <td style={styles.tableCell}>{module.startDate ? new Date(module.startDate).toLocaleDateString('vi-VN') : '-'} - {module.endDate ? new Date(module.endDate).toLocaleDateString('vi-VN') : '-'}</td>
                      <td style={styles.tableCell}>{module.owner?.name || '-'}</td>
                      <td style={styles.tableCell}>
                        <button
                          style={styles.detailBtn}
                          onClick={() => handleDetail(module._id)}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={styles.noResults}>
                <div style={styles.noResultsIcon}>🔍</div>
                <h3 style={styles.noResultsTitle}>Không tìm thấy module</h3>
                <p style={styles.noResultsText}>
                  {searchTerm ? 'Hãy thử tìm kiếm với từ khóa khác' : 'Chưa có module nào được tạo'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
    minHeight: '100vh',
    position: 'relative',
  },
  filterContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '25px',
    gap: '20px',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
  },
  searchBox: {
    flex: '1',
    minWidth: '300px',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    padding: '12px 20px 12px 45px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '14px',
    backgroundColor: '#f8f9fa',
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
  filterGroup: {
    display: 'flex',
    gap: '15px',
    alignItems: 'center',
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
  tableContainer: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    overflowX: 'auto',
    width: '100%',
    minWidth: 0,
    WebkitOverflowScrolling: 'touch',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px',
    tableLayout: 'auto',
  },
  tableHeader: {
    background: '#f8f9fa',
    fontWeight: '600',
    color: '#333',
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
  },
  tableCell: {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #eee',
    whiteSpace: 'nowrap',
    maxWidth: 180,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tableRow: {
    '&:hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  detailBtn: {
    padding: '6px 12px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'background-color 0.2s',
    '&:hover': {
      backgroundColor: '#0056b3',
    },
  },
  errorMessage: {
    color: '#dc3545',
    padding: '10px',
    marginBottom: '20px',
    backgroundColor: '#f8d7da',
    borderRadius: '4px',
    border: '1px solid #f5c6cb',
  },
  noResults: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    textAlign: 'center',
  },
  noResultsIcon: {
    fontSize: '48px',
    color: '#6c757d',
    marginBottom: '16px',
  },
  noResultsTitle: {
    fontSize: '20px',
    color: '#343a40',
    marginBottom: '8px',
    fontWeight: '600',
  },
  noResultsText: {
    fontSize: '14px',
    color: '#6c757d',
    maxWidth: '400px',
    lineHeight: '1.5',
  },
};

export default Modules; 