import React, { useState, useEffect } from 'react';
import styles from './Users.module.css';
import UserService from '../api/services/user.service';
import UserDetailDialog from '../components/popups/UserDetailDialog';
import LoadingOverlay from '../components/common/LoadingOverlay';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await UserService.getAllUsers(); 
        setUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        if (err.response?.status === 401) {
          return;
        }
        setError('Không thể tải danh sách người dùng');
        console.error('Lỗi khi tải danh sách người dùng:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const refreshUsers = async () => {
    try {
      const data = await UserService.getAllUsers();
      setUsers(data);
      setFilteredUsers(data);
      // Nếu đang mở popup, cập nhật selectedUser với bản mới nhất từ backend
      if (openDetailDialog && selectedUser) {
        const updated = data.find(u => u._id === selectedUser._id);
        if (updated) setSelectedUser(updated);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        return;
      }
      setError('Không thể tải lại danh sách người dùng');
      console.error('Lỗi khi tải lại danh sách người dùng:', err);
    }
  };


  useEffect(() => {

    let result = [...users];

    if (statusFilter) {
      result = result.filter(user => user.status === statusFilter);
    }
    if (roleFilter) {
      result = result.filter(user => user.role === roleFilter);
    }
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.name?.toLowerCase().includes(searchLower) ||
        user.email?.toLowerCase().includes(searchLower) ||
        user.userID?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredUsers(result);
  }, [users, statusFilter, roleFilter, searchTerm]);

  const getStatusChip = (status) => {
  const statusConfig = {
    active: { label: 'Hoạt động', className: styles.status + ' ' + styles.active },
    locked: { label: 'Đã khóa', className: styles.status + ' ' + styles.locked },
  };
  const config = statusConfig[status] || { label: status, className: styles.status };
  return <span className={config.className}>{config.label}</span>;
};

  const getRoleLabel = (role) => {
    const roleConfig = {
      admin: 'Admin',
      pm: 'PM',
      ba: 'BA',
      developer: 'Developer',
      tester: 'Tester',
      other: 'Khác',
    };
    return roleConfig[role] || role;
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilterChange = (event) => {
    setStatusFilter(event.target.value);
  };

  const handleRoleFilterChange = (event) => {
    setRoleFilter(event.target.value);
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setOpenDetailDialog(true);
  };

  const handleCloseDetailDialog = () => {
    setOpenDetailDialog(false);
    setSelectedUser(null);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <LoadingOverlay text="Đang tải danh sách người dùng..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {error && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ background: '#ffebee', color: '#c62828', padding: '12px 18px', borderRadius: 8, fontWeight: 500 }}>
            {error}
          </div>
        </div>
      )}

      <div className={styles.filterContainer}>
        <div className={styles.searchBox}>
          <img
            src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
            alt="search icon"
            className={styles.searchIcon}
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, ID hoặc email"
            className={styles.searchInput}
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div className={styles.filterGroup}>
          <select
            className={styles.select}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
          <select
            className={styles.select}
            value={roleFilter}
            onChange={handleRoleFilterChange}
          >
            <option value="">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="pm">PM</option>
            <option value="ba">BA</option>
            <option value="developer">Developer</option>
            <option value="tester">Tester</option>
            <option value="other">Khác</option>
          </select>
        </div>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead className={styles.thead}>
            <tr>
              <th>ID</th>
              <th>Họ và tên</th>
              <th>Vai trò</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Công ty</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody className={styles.tbody}>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>
                  Không tìm thấy người dùng nào
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id}>
                  <td>{user.userID}</td>
                  <td>{user.name}</td>
                  <td>{getRoleLabel(user.role)}</td>
                  <td>{user.email}</td>
                  <td>{user.phoneNumber}</td>
                  <td>{user.companyName || 'N/A'}</td>
                  <td>{user.status ? getStatusChip(user.status) : 'N/A'}</td>
                  <td>
                    <button className={styles.actionBtn} onClick={() => handleViewDetails(user)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <UserDetailDialog
          open={openDetailDialog}
          handleClose={handleCloseDetailDialog}
          user={selectedUser}
          onUserUpdate={refreshUsers}
        />
      )}
    </div>
  );
};



export default Users; 