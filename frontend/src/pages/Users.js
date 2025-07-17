import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Chip,
  Button,
} from '@mui/material';
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
      active: { label: 'Hoạt động', color: 'success' },
      locked: { label: 'Đã khóa', color: 'error' },
    };
    const config = statusConfig[status] || { label: status, color: 'default' };
    return <Chip label={config.label} color={config.color} size="small" />;
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
      <div style={{ minHeight: '100vh', position: 'relative' }}>
        <LoadingOverlay text="Đang tải danh sách người dùng..." />
      </div>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <div style={styles.filterContainer}>
        <div style={styles.searchBox}>
          <img
            src="https://img.icons8.com/ios-filled/20/000000/search--v1.png"
            alt="search icon"
            style={styles.searchIcon}
          />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, ID hoặc email"
            style={styles.searchInput}
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        <div style={styles.filterGroup}>
          <select
            style={styles.select}
            value={statusFilter}
            onChange={handleStatusFilterChange}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="locked">Đã khóa</option>
          </select>
          <select
            style={styles.select}
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

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Họ và tên</TableCell>
              <TableCell>Vai trò</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Số điện thoại</TableCell>
              <TableCell>Công ty</TableCell>
              <TableCell>Trạng thái</TableCell>
              <TableCell>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Không tìm thấy người dùng nào
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>{user.userID}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{getRoleLabel(user.role)}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.phoneNumber}</TableCell>
                  <TableCell>{user.companyName || 'N/A'}</TableCell>
                  <TableCell>{user.status ? getStatusChip(user.status) : 'N/A'}</TableCell>
                  <TableCell>
                    <Button variant="contained" size="small" onClick={() => handleViewDetails(user)} style={{ backgroundColor: '#EA3252', color: '#ffffff' }}>
                      Chi tiết
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedUser && (
        <UserDetailDialog
          open={openDetailDialog}
          handleClose={handleCloseDetailDialog}
          user={selectedUser}
          onUserUpdate={refreshUsers}
        />
      )}
    </Box>
  );
};

const styles = {
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
};

export default Users; 