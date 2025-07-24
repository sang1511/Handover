import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import LoadingOverlay from '../components/common/LoadingOverlay';
import styles from './Modules.module.css';

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
    <div className={styles.container}>
      {loading && <LoadingOverlay text="Đang tải danh sách module..." className={styles.loadingOverlay} />}
      {!loading && (
        <>
          {error && <div className={styles.errorMessage}>{error}</div>}
          <div className={styles.filterContainer}>
            <div className={styles.searchBox}>
              <img
                src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
                alt="search icon"
                className={styles.searchIcon}
              />
              <input
                type="text"
                placeholder="Tìm kiếm theo ID, tên module hoặc tên dự án..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>
            <div className={styles.filterGroup}>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className={styles.select}
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
              </select>
            </div>
          </div>
          <div className={styles.tableContainer}>
            {filteredModules.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHeader}>ID</th>
                    <th className={styles.tableHeader}>Tên module</th>
                    <th className={styles.tableHeader}>Tên dự án</th>
                    <th className={styles.tableHeader}>Ngày bắt đầu - kết thúc</th>
                    <th className={styles.tableHeader}>Người phụ trách</th>
                    <th className={styles.tableHeader}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredModules.map(module => (
                    <tr key={module._id} className={styles.tableRow}>
                      <td className={styles.tableCell}>{module.moduleId}</td>
                      <td className={styles.tableCell}>{module.name}</td>
                      <td className={styles.tableCell}>{module.project?.name || '-'}</td>
                      <td className={styles.tableCell}>{module.startDate ? new Date(module.startDate).toLocaleDateString('vi-VN') : '-'} - {module.endDate ? new Date(module.endDate).toLocaleDateString('vi-VN') : '-'}</td>
                      <td className={styles.tableCell}>{module.owner?.name || '-'}</td>
                      <td className={styles.tableCell}>
                        <button
                          className={styles.detailBtn}
                          onClick={() => handleDetail(module._id)}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.noResults}>
                <div className={styles.noResultsIcon}>🔍</div>
                <h3 className={styles.noResultsTitle}>Không tìm thấy module</h3>
                <p className={styles.noResultsText}>
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



export default Modules; 