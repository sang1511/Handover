import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Box,
  Avatar,
  Grid,
  Divider,
  Tooltip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Wc as GenderIcon,
  Badge as RoleIcon,
  VerifiedUser as StatusIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Close as CloseEditIcon,
} from '@mui/icons-material';
import userPlaceholder from '../asset/user.png';
import UserService from '../api/services/user.service';

const UserDetailDialog = ({ open, handleClose, user, onUserUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);

  useEffect(() => {
    setEditedUser(user);
    setIsEditing(false);
  }, [user]);

  if (!user) return null;

  const getRoleLabel = (role) => {
    const roleConfig = {
      admin: 'Admin',
      pm: 'Project Manager',
      ba: 'Business Analyst',
      developer: 'Developer',
      tester: 'Tester',
      other: 'Khác',
    };
    return roleConfig[role] || role;
  };

  const getStatusDisplay = (status, isEditMode = false) => {
    if (isEditMode) {
      return (
        <FormControl fullWidth size="small">
          <Select
            value={status}
            label="Trạng thái"
            onChange={(e) => setEditedUser({ ...editedUser, status: e.target.value })}
          >
            <MenuItem value="active">Hoạt động</MenuItem>
            <MenuItem value="locked">Đã khóa</MenuItem>
          </Select>
        </FormControl>
      );
    }
    if (status === 'active') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
          <CheckCircleIcon sx={{ mr: 1 }} />
          <Typography variant="body2">Đang hoạt động</Typography>
        </Box>
      );
    } else if (status === 'locked') {
      return (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
          <CancelIcon sx={{ mr: 1 }} />
          <Typography variant="body2">Đã khóa</Typography>
        </Box>
      );
    }
    return <Typography variant="body2">{status}</Typography>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const labelGender = (gender, isEditMode = false) => {
    if (isEditMode) {
      return (
        <FormControl fullWidth size="small">
          <Select
            value={gender}
            label="Giới tính"
            onChange={(e) => setEditedUser({ ...editedUser, gender: e.target.value })}
          >
            <MenuItem value="male">Nam</MenuItem>
            <MenuItem value="female">Nữ</MenuItem>
            <MenuItem value="other">Khác</MenuItem>
          </Select>
        </FormControl>
      );
    }
    if (gender === 'male') return 'Nam';
    if (gender === 'female') return 'Nữ';
    if (gender === 'other') return 'Khác';
    return 'N/A';
  };

  const InfoItem = ({ icon: Icon, label, value, editComponent }) => (
    <Grid item xs={12} sm={6}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
        {Icon && <Icon sx={{ mr: 1, color: 'text.secondary' }} />}
        <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
          {label}
        </Typography>
      </Box>
      {isEditing ? (
        editComponent
      ) : (
        <Typography variant="body2" sx={{ pl: Icon ? 4 : 0 }}>{value || 'N/A'}</Typography>
      )}
    </Grid>
  );

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedUser(user);
  };

  const handleSaveClick = async () => {
    try {
      // Assuming you have an update user service method
      await UserService.updateUser(editedUser._id, editedUser);
      onUserUpdate(); // Notify parent to refresh user list
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating user:', error);
      // TODO: Show error message to user
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ p: 2 }}>
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 16,
            top: 16,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0, pb: 0 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <Avatar
            alt={editedUser.name}
            src={editedUser.avatarUrl || userPlaceholder}
            sx={{
              width: 100,
              height: 100,
              mb: 1,
              border: '3px solid #EA3252',
            }}
          />
          {isEditing ? (
            <TextField
              variant="outlined"
              size="small"
              value={editedUser.name || ''}
              onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
              sx={{ mb: 0.5 }}
            />
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              {editedUser.name}
            </Typography>
          )}

          {isEditing ? (
            <FormControl fullWidth size="small" sx={{ mt: 0.5, maxWidth: 200 }}>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={editedUser.role || ''}
                label="Vai trò"
                onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value })}
              >
                <MenuItem value="admin">Admin</MenuItem>
                <MenuItem value="pm">Project Manager</MenuItem>
                <MenuItem value="ba">Business Analyst</MenuItem>
                <MenuItem value="developer">Developer</MenuItem>
                <MenuItem value="tester">Tester</MenuItem>
                <MenuItem value="other">Khác</MenuItem>
              </Select>
            </FormControl>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <RoleIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {getRoleLabel(editedUser.role)}
              </Typography>
            </Box>
          )}
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Grid container spacing={2}>
          <InfoItem
            icon={GenderIcon}
            label="Giới tính"
            value={labelGender(editedUser.gender)}
            editComponent={labelGender(editedUser.gender, true)}
          />
          <InfoItem
            icon={EmailIcon}
            label="Email"
            value={editedUser.email}
            editComponent={
              <TextField
                variant="outlined"
                size="small"
                value={editedUser.email || ''}
                onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                fullWidth
              />
            }
          />
          <InfoItem
            icon={PhoneIcon}
            label="Số điện thoại"
            value={editedUser.phoneNumber}
            editComponent={
              <TextField
                variant="outlined"
                size="small"
                value={editedUser.phoneNumber || ''}
                onChange={(e) => setEditedUser({ ...editedUser, phoneNumber: e.target.value })}
                fullWidth
              />
            }
          />
          <InfoItem
            icon={BusinessIcon}
            label="Công ty"
            value={editedUser.companyName}
            editComponent={
              <TextField
                variant="outlined"
                size="small"
                value={editedUser.companyName || ''}
                onChange={(e) => setEditedUser({ ...editedUser, companyName: e.target.value })}
                fullWidth
              />
            }
          />
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <StatusIcon sx={{ mr: 1, color: 'text.secondary' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                Trạng thái
              </Typography>
            </Box>
            <Box sx={{ pl: 4 }}>
              {getStatusDisplay(editedUser.status, isEditing)}
            </Box>
          </Grid>
          <InfoItem
            icon={CalendarIcon}
            label="Ngày tạo tài khoản"
            value={formatDate(editedUser.createdAt)}
            editComponent={<Typography variant="body2" sx={{ pl: 4 }}>{formatDate(editedUser.createdAt)}</Typography>}
          />
        </Grid>
      </DialogContent>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {isEditing ? (
          <>
            <Button variant="outlined" startIcon={<CloseEditIcon />} onClick={handleCancelClick}>
              Hủy
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveClick}>
              Lưu
            </Button>
          </>
        ) : (
          <Button variant="contained" startIcon={<EditIcon />} onClick={handleEditClick}>
            Chỉnh sửa
          </Button>
        )}
      </Box>
    </Dialog>
  );
};

export default UserDetailDialog;
