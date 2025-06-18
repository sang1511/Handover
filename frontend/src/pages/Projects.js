import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');
        
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/projects', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setProjects(response.data);
        setFilteredProjects(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching projects:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Có lỗi xảy ra khi tải danh sách dự án');
        }
      }
    };

    fetchProjects();
  }, [navigate]);

  // Xử lý tìm kiếm và lọc
  useEffect(() => {
    let result = [...projects];

    // Tìm kiếm theo ID hoặc tên dự án
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(project => 
        project.projectId.toLowerCase().includes(searchLower) ||
        project.name.toLowerCase().includes(searchLower)
      );
    }

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      result = result.filter(project => project.status === statusFilter);
    }

    // Sắp xếp
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'deadline-soonest':
        result.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        break;
      case 'deadline-latest':
        result.sort((a, b) => new Date(b.deadline) - new Date(a.deadline));
        break;
      default:
        break;
    }

    setFilteredProjects(result);
  }, [projects, searchTerm, statusFilter, sortBy]);

  const handleViewDetails = (projectId) => {
    navigate(`/projects/${projectId}`);
  };

  const getStatusStyle = (status) => {
    const statusStyles = {
      'Khởi tạo': { ...styles.statusBadge, ...styles.statusPending },
      'Đang thực hiện': { ...styles.statusBadge, ...styles.statusInProgress },
      'Hoàn thành': { ...styles.statusBadge, ...styles.statusCompleted },
      'Hủy': { ...styles.statusBadge, ...styles.statusCancelled },
    };
    return statusStyles[status] || styles.statusBadge;
  };

  const renderUserInfo = (user) => {
    if (!user) return 'N/A';
    if (typeof user === 'object') {
      return user.name || user.email || 'N/A';
    }
    return user;
  };

  return (
    <div style={styles.container}>
      {error && <div style={styles.errorMessage}>{error}</div>}
      
      {/* Thanh tìm kiếm và bộ lọc */}
      <div style={styles.filterContainer}>
        <div style={styles.searchBox}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            type="text"
            placeholder="Tìm kiếm theo ID hoặc tên dự án..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
        </div>

        <div style={styles.filterGroup}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={styles.select}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Khởi tạo">Khởi tạo</option>
            <option value="Đang thực hiện">Đang thực hiện</option>
            <option value="Hoàn thành">Hoàn thành</option>
            <option value="Hủy">Hủy</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={styles.select}
          >
            <option value="newest">Mới nhất</option>
            <option value="oldest">Cũ nhất</option>
            <option value="deadline-soonest">Hạn chót gần nhất</option>
            <option value="deadline-latest">Hạn chót muộn nhất</option>
          </select>

          <button 
            onClick={() => navigate('/projects/new')}
            style={styles.createButton}
          >
            <span style={styles.createButtonIcon}>+</span>
            
            Tạo dự án
          </button>
        </div>
      </div>

      <div style={styles.tableContainer}>
        {filteredProjects.length > 0 ? (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.tableHeader}>ID</th>
                <th style={styles.tableHeader}>Tên dự án</th>
                <th style={styles.tableHeader}>Người gửi</th>
                <th style={styles.tableHeader}>Người nhận</th>
                <th style={styles.tableHeader}>Ngày tạo</th>
                <th style={styles.tableHeader}>Ngày kết thúc</th>
                <th style={styles.tableHeader}>Trạng thái</th>
                <th style={styles.tableHeader}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project._id} style={styles.tableRow}>
                  <td style={styles.tableCell}>{project.projectId}</td>
                  <td style={styles.tableCell}>{project.name}</td>
                  <td style={styles.tableCell}>
                    {renderUserInfo(project.createdBy)}
                  </td>
                  <td style={styles.tableCell}>
                    {renderUserInfo(project.handedOverTo)}
                  </td>
                  <td style={styles.tableCell}>
                    {new Date(project.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={styles.tableCell}>
                    {new Date(project.deadline).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={styles.tableCell}>
                    <span style={getStatusStyle(project.status)}>
                      {project.status}
                    </span>
                  </td>
                  <td style={styles.tableCell}>
                    <button
                      style={styles.detailsButton}
                      onClick={() => handleViewDetails(project._id)}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={styles.noResults}>
            <div style={styles.noResultsIcon}>🔍</div>
            <h3 style={styles.noResultsTitle}>Không tìm thấy dự án</h3>
            <p style={styles.noResultsText}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Hãy thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc'
                : 'Chưa có dự án nào được tạo'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto',
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
    '&:focus': {
      outline: 'none',
      borderColor: '#007bff',
      backgroundColor: '#fff',
      boxShadow: '0 0 0 3px rgba(0, 123, 255, 0.1)',
    },
  },
  searchIcon: {
    position: 'absolute',
    left: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6c757d',
    fontSize: '16px',
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
    '&:focus': {
      outline: 'none',
      borderColor: '#007bff',
      backgroundColor: '#fff',
      boxShadow: '0 0 0 3px rgba(0, 123, 255, 0.1)',
    },
    '&:hover': {
      borderColor: '#007bff',
    },
  },
  title: {
    color: '#333',
    marginBottom: '20px',
    fontSize: '24px',
  },
  tableContainer: {
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px',
  },
  tableHeader: {
    background: '#f8f9fa',
    fontWeight: '600',
    color: '#333',
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #eee',
  },
  tableCell: {
    padding: '12px 16px',
    textAlign: 'left',
    borderBottom: '1px solid #eee',
  },
  tableRow: {
    '&:hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
  statusPending: {
    backgroundColor: '#fff3cd',
    color: '#856404',
  },
  statusInProgress: {
    backgroundColor: '#cce5ff',
    color: '#004085',
  },
  statusCompleted: {
    backgroundColor: '#d4edda',
    color: '#155724',
  },
  statusCancelled: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
  },
  detailsButton: {
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
  createButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    backgroundColor: '#EA3252',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#218838',
      transform: 'translateY(-1px)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    },
    '&:active': {
      transform: 'translateY(0)',
    },
  },
  createButtonIcon: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
};

export default Projects;
