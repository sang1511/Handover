import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import socketManager from '../utils/socket';
import LoadingOverlay from '../components/common/LoadingOverlay';
import styles from './Projects.module.css';

const statusColors = {
  'Chờ xác nhận': { background: '#f1f3f5', color: '#6c757d' },
  'Khởi tạo': { background: '#fff3cd', color: '#b8860b' },
  'Đang triển khai': { background: '#e3f2fd', color: '#1976d2' },
  'Hoàn thành': { background: '#e6f4ea', color: '#28a745' },
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        const accessToken = localStorage.getItem('accessToken');
        
        if (!accessToken) {
          navigate('/login');
          return;
        }

        const response = await axiosInstance.get('/projects', {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        });
        setProjects(response.data);
        setFilteredProjects(response.data);
        setError(null);
      } catch (error) {
        if (error.response?.status === 401) {
          return;
        } else {
          setError('Có lỗi xảy ra khi tải danh sách dự án');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();

    // Lắng nghe sự kiện cập nhật dự án từ WebSocket
    const socket = socketManager.socket;
    const handleProjectListUpdate = (data) => {
      const updatedProject = data.project;
      if (updatedProject) {
        setProjects(prevProjects =>
          prevProjects.map(p =>
            p._id === updatedProject._id ? updatedProject : p
          )
        );
      }
    };

    if (socket) {
      socket.on('project_list_updated', handleProjectListUpdate);
    }

    // Dọn dẹp listener khi component unmount
    return () => {
      if (socket) {
        socket.off('project_list_updated', handleProjectListUpdate);
      }
    };
  }, [navigate]);

  useEffect(() => {
    let result = [...projects];

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(project => 
        project.projectId.toLowerCase().includes(searchLower) ||
        project.name.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter(project => project.status === statusFilter);
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        break;
      case 'deadline-soonest':
        result.sort((a, b) => new Date(a.endDate) - new Date(b.endDate));
        break;
      case 'deadline-latest':
        result.sort((a, b) => new Date(b.endDate) - new Date(a.endDate));
        break;
      default:
        break;
    }

    setFilteredProjects(result);
  }, [projects, searchTerm, statusFilter, sortBy]);

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) setCurrentUser(JSON.parse(userStr));
  }, []);

  const handleViewDetails = (projectId) => {
    navigate(`/projects/${projectId}`);
  };



  const visibleProjects = currentUser ? (
    currentUser.role === 'admin'
      ? filteredProjects
      : filteredProjects.filter(project =>
          project.members && project.members.some(m => m.user?._id === currentUser._id)
        )
  ) : [];

  return (
    <div className={styles.container}>
      {loading && <LoadingOverlay text="Đang tải danh sách dự án..." style={{zIndex: 10}} />}
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
                placeholder="Tìm kiếm theo ID hoặc tên dự án..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
              />
            </div>

            <div className={styles.filterGroup}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={styles.select}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="Chờ xác nhận">Chờ xác nhận</option>
                <option value="Khởi tạo">Khởi tạo</option>
                <option value="Đang triển khai">Đang triển khai</option>
                <option value="Hoàn thành">Hoàn thành</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={styles.select}
              >
                <option value="newest">Mới nhất</option>
                <option value="oldest">Cũ nhất</option>
                <option value="deadline-soonest">Hạn chót gần nhất</option>
                <option value="deadline-latest">Hạn chót muộn nhất</option>
              </select>

              <button 
                onClick={() => navigate('/projects/new')}
                className={styles.createButton}
              >
                <span className={styles.createButtonIcon}>+</span>
                
                Tạo dự án
              </button>
            </div>
          </div>

          <div className={styles.tableContainer}>
            {currentUser && visibleProjects.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHeader}>ID</th>
                    <th className={styles.tableHeader}>Tên dự án</th>
                    <th className={styles.tableHeader}>Ngày bắt đầu</th>
                    <th className={styles.tableHeader}>Ngày kết thúc</th>
                    <th className={styles.tableHeader}>Trạng thái</th>
                    <th className={styles.tableHeader}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleProjects.map((project) => (
                    <tr key={project._id} className={styles.tableRow}>
                      <td className={styles.tableCell}>{project.projectId}</td>
                      <td className={styles.tableCell}>{project.name}</td>
                      <td className={styles.tableCell}>{new Date(project.startDate).toLocaleDateString('vi-VN')}</td>
                      <td className={styles.tableCell}>{new Date(project.endDate).toLocaleDateString('vi-VN')}</td>
                      <td className={styles.tableCell}>
                        <span 
                          className={styles.statusBadge}
                          style={statusColors[project.status] || statusColors['Chờ xác nhận']}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className={styles.tableCell}>
                        <button className={styles.detailsButton} onClick={() => handleViewDetails(project._id)}>
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
                <h3 className={styles.noResultsTitle}>Không tìm thấy dự án</h3>
                <p className={styles.noResultsText}>
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc'
                    : 'Chưa có dự án nào được tạo hoặc bạn chưa là thành viên của dự án nào'}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Projects;
