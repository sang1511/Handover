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
  Fingerprint,
} from '@mui/icons-material';
import userPlaceholder from '../asset/user.png';
import UserService from '../api/services/user.service';
import { useAuth } from '../contexts/AuthContext';

// Helper component moved outside to prevent re-creation on render
const InfoItem = ({ icon: Icon, label, value, isEditing, editComponent }) => (
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

// Helper function moved outside
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

const UserDetailDialog = ({ open, handleClose, user, onUserUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const { user: currentUser } = useAuth();

  useEffect(() => {
    setEditedUser(user);
    setIsEditing(false);
    setSaveError('');
  }, [user]);

  if (!user) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  const handleEditClick = () => {
    setIsEditing(true);
    setSaveError('');
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setEditedUser(user);
    setSaveError('');
  };

  const handleSaveClick = async () => {
    setIsSaving(true);
    setSaveError('');
    try {
      const { is_mfa_enabled, ...otherDetails } = editedUser;

      const promises = [];
      promises.push(UserService.updateUser(otherDetails._id, otherDetails));

      if (user.is_mfa_enabled !== is_mfa_enabled) {
        if (is_mfa_enabled) {
          promises.push(UserService.enable2FA());
        } else {
          promises.push(UserService.disable2FA());
        }
      }

      await Promise.all(promises);

      await onUserUpdate(); 
      setIsEditing(false); 
    } catch (error) {
      console.error('Error updating user:', error);
      setSaveError(error.response?.data?.message || 'Lưu thông tin thất bại.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleToggleMfa = () => {
    setEditedUser(prev => ({
      ...prev,
      is_mfa_enabled: !prev.is_mfa_enabled,
    }));
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
            icon={Fingerprint}
            label="UserID"
            isEditing={isEditing}
            value={
              editedUser.userID !== undefined && editedUser.userID !== null && editedUser.userID !== ''
                ? editedUser.userID
                : (user.userID || 'N/A')
            }
            editComponent={
              <Typography variant="body2" sx={{ pl: 4 }}>
                {editedUser.userID !== undefined && editedUser.userID !== null && editedUser.userID !== ''
                  ? editedUser.userID
                  : (user.userID || 'N/A')}
              </Typography>
            }
          />
          <InfoItem
            icon={GenderIcon}
            label="Giới tính"
            isEditing={isEditing}
            value={
              editedUser.gender === 'male' ? 'Nam' :
              editedUser.gender === 'female' ? 'Nữ' :
              editedUser.gender === 'other' ? 'Khác' : 'N/A'
            }
            editComponent={
              <FormControl fullWidth size="small">
                <Select
                  value={editedUser.gender || 'other'}
                  onChange={(e) => setEditedUser({ ...editedUser, gender: e.target.value })}
                >
                  <MenuItem value="male">Nam</MenuItem>
                  <MenuItem value="female">Nữ</MenuItem>
                  <MenuItem value="other">Khác</MenuItem>
                </Select>
              </FormControl>
            }
          />
          <InfoItem
            icon={EmailIcon}
            label="Email"
            isEditing={isEditing}
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
            isEditing={isEditing}
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
            isEditing={isEditing}
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
              {isEditing ? (
                <FormControl fullWidth size="small">
                  <Select
                    value={editedUser.status}
                    onChange={(e) => setEditedUser({ ...editedUser, status: e.target.value })}
                  >
                    <MenuItem value="active">Hoạt động</MenuItem>
                    <MenuItem value="locked">Đã khóa</MenuItem>
                  </Select>
                </FormControl>
              ) : editedUser.status === 'active' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                    <CheckCircleIcon sx={{ mr: 1 }} />
                    <Typography variant="body2">Đang hoạt động</Typography>
                  </Box>
              ) : editedUser.status === 'locked' ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                    <CancelIcon sx={{ mr: 1 }} />
                    <Typography variant="body2">Đã khóa</Typography>
                  </Box>
              ) : (
                <Typography variant="body2">{editedUser.status}</Typography>
              )}
            </Box>
          </Grid>
          <InfoItem
            icon={CalendarIcon}
            label="Ngày tạo tài khoản"
            isEditing={isEditing}
            value={formatDate(editedUser.createdAt)}
            editComponent={<Typography variant="body2" sx={{ pl: 4 }}>{formatDate(editedUser.createdAt)}</Typography>}
          />
        </Grid>

        {currentUser && user && currentUser._id === user._id && (
          <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              Xác minh 2 lớp (2FA):{' '}
              {editedUser.is_mfa_enabled ? (
                <span style={{ color: '#2e7d32', fontWeight: 500 }}>Đã bật</span>
              ) : (
                <span style={{ color: '#d32f2f', fontWeight: 500 }}>Chưa bật</span>
              )}
            </Typography>
            {isEditing && (
              <>
                {editedUser.is_mfa_enabled ? (
              <Button
                variant="outlined"
                color="error"
                    onClick={handleToggleMfa}
              >
                Tắt 2FA
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                    onClick={handleToggleMfa}
              >
                Bật 2FA
              </Button>
                )}
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        {saveError && <Typography color="error" sx={{ flexGrow: 1, textAlign: 'left' }}>{saveError}</Typography>}
        {isEditing ? (
          <>
            <Button variant="outlined" startIcon={<CloseEditIcon />} onClick={handleCancelClick}>
              Hủy
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveClick} disabled={isSaving}>
              {isSaving ? 'Đang lưu...' : 'Lưu'}
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
