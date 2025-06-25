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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
} from '@mui/material';
import {
  Search as SearchIcon,
} from '@mui/icons-material';
import UserService from '../api/services/user.service';
import UserDetailDialog from '../components/UserDetailDialog';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await UserService.getAllUsers(); 
        setUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        setError('Không thể tải danh sách người dùng');
        console.error('Lỗi khi tải danh sách người dùng:', err);
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

  return (
    <Box sx={{ p: 3 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <TextField
          label="Tìm kiếm theo tên, ID hoặc email"
          variant="outlined"
          size="small"
          sx={{ flexGrow: 1, maxWidth: 300 }}
          InputProps={{
            startAdornment: (
              <SearchIcon sx={{ mr: 1 }} />
            ),
          }}
          value={searchTerm}
          onChange={handleSearchChange}
        />
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Trạng thái</InputLabel>
            <Select
              value={statusFilter}
              label="Trạng thái"
              onChange={handleStatusFilterChange}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="active">Hoạt động</MenuItem>
              <MenuItem value="locked">Đã khóa</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Vai trò</InputLabel>
            <Select
              value={roleFilter}
              label="Vai trò"
              onChange={handleRoleFilterChange}
            >
              <MenuItem value="">Tất cả</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="pm">PM</MenuItem>
              <MenuItem value="ba">BA</MenuItem>
              <MenuItem value="developer">Developer</MenuItem>
              <MenuItem value="tester">Tester</MenuItem>
              <MenuItem value="other">Khác</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

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

export default Users; 