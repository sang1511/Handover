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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import userAvatar from '../../asset/user.png';
import UserService from '../../api/services/user.service';
import BadgeIcon from '@mui/icons-material/Badge';
import { useAuth } from '../../contexts/AuthContext';

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
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 0,
          boxShadow: '0 8px 32px rgba(31,38,135,0.12)',
          animation: 'fadeInProfilePopup 0.35s cubic-bezier(0.4,0,0.2,1)'
        }
      }}
      TransitionProps={{
        onEnter: (node) => { node.style.opacity = 0; setTimeout(() => { node.style.opacity = 1; }, 10); },
        onExited: (node) => { node.style.opacity = 0; }
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 0 }}>
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
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2, mt: 1 }}>
          <Avatar
            alt={editedUser.name}
            src={editedUser.avatarUrl || userAvatar}
            sx={{
              width: 108,
              height: 108,
              mb: 1,
              border: '3px solid #4f8cff',
              boxShadow: '0 2px 12px #e0e7ef',
              transition: 'box-shadow 0.2s',
            }}
          />
          {isEditing ? (
            <TextField
              variant="outlined"
              size="small"
              value={editedUser.name || ''}
              onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
              sx={{ mb: 0.5, mt: 0.5, width: 240, textAlign: 'center' }}
              inputProps={{ style: { textAlign: 'center', fontWeight: 600 } }}
            />
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 0.5, mb: 0.5, textAlign: 'center' }}>
              {editedUser.name}
            </Typography>
          )}
          {isEditing ? (
            <FormControl size="small" sx={{ mt: 0.5, maxWidth: 240, width: '100%' }}>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={editedUser.role || ''}
                label="Vai trò"
                onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value })}
                disabled={currentUser.role !== 'admin'}
              >
                {/* Chỉ admin mới thấy option admin */}
                {currentUser.role === 'admin' && <MenuItem value="admin">Admin</MenuItem>}
                <MenuItem value="pm">Project Manager</MenuItem>
                <MenuItem value="ba">Business Analyst</MenuItem>
                <MenuItem value="developer">Developer</MenuItem>
                <MenuItem value="tester">Tester</MenuItem>
                <MenuItem value="other">Khác</MenuItem>
              </Select>
            </FormControl>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <BadgeIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {getRoleLabel(editedUser.role)}
              </Typography>
            </Box>
          )}
        </Box>
        <Grid container spacing={2} sx={{ mb: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
            label="UserID"
              value={editedUser.userID || ''}
              variant="outlined"
              size="small"
              fullWidth
              disabled
              InputProps={{ style: { color: '#888', background: '#f5f6fa', fontWeight: 500 } }}
              sx={{ mb: 2 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Giới tính</InputLabel>
                <Select
                  value={editedUser.gender || 'other'}
                label="Giới tính"
                onChange={isEditing ? (e) => setEditedUser({ ...editedUser, gender: e.target.value }) : undefined}
                disabled={!isEditing}
                >
                  <MenuItem value="male">Nam</MenuItem>
                  <MenuItem value="female">Nữ</MenuItem>
                  <MenuItem value="other">Khác</MenuItem>
                </Select>
              </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
            label="Email"
              value={editedUser.email || ''}
                variant="outlined"
                size="small"
                fullWidth
              onChange={isEditing ? (e) => setEditedUser({ ...editedUser, email: e.target.value }) : undefined}
              disabled={!isEditing}
              sx={{ mb: 2 }}
          />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
            label="Số điện thoại"
              value={editedUser.phoneNumber || ''}
                variant="outlined"
                size="small"
                fullWidth
              onChange={isEditing ? (e) => setEditedUser({ ...editedUser, phoneNumber: e.target.value }) : undefined}
              disabled={!isEditing}
              sx={{ mb: 2 }}
          />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
            label="Công ty"
              value={editedUser.companyName || ''}
                variant="outlined"
                size="small"
                fullWidth
              onChange={isEditing ? (e) => setEditedUser({ ...editedUser, companyName: e.target.value }) : undefined}
              disabled={!isEditing}
              sx={{ mb: 2 }}
              />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>Trạng thái</InputLabel>
              <Select
                value={editedUser.status || 'active'}
                label="Trạng thái"
                onChange={isEditing && currentUser.role === 'admin' ? (e) => setEditedUser({ ...editedUser, status: e.target.value }) : undefined}
                disabled={!isEditing || currentUser.role !== 'admin'}
              >
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="locked">Đã khóa</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
            label="Ngày tạo tài khoản"
            value={formatDate(editedUser.createdAt)}
              variant="outlined"
              size="small"
              fullWidth
              disabled
              InputProps={{ style: { color: '#888', background: '#f5f6fa', fontWeight: 500 } }}
              sx={{ mb: 2 }}
          />
          </Grid>
        </Grid>
        <Box sx={{ mt: 1, mb: 2, textAlign: 'center' }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
              Xác minh 2 lớp (2FA):{' '}
              {editedUser.is_mfa_enabled ? (
              <span style={{ color: '#2e7d32', fontWeight: 600 }}>Đã bật</span>
              ) : (
              <span style={{ color: '#d32f2f', fontWeight: 700, fontSize: 17 }}>Chưa bật</span>
              )}
            </Typography>
            {isEditing && (
            <Button
              variant={editedUser.is_mfa_enabled ? 'outlined' : 'contained'}
              color={editedUser.is_mfa_enabled ? 'error' : 'primary'}
              onClick={handleToggleMfa}
              sx={{
                minWidth: 120,
                fontWeight: 600,
                borderRadius: 2,
                boxShadow: '0 2px 8px #e0e7ef',
                mr: 1,
                transition: 'background 0.18s, box-shadow 0.18s',
                '&:hover': {
                  background: editedUser.is_mfa_enabled ? '#ffebee' : '#3578e5',
                  color: '#fff',
                  boxShadow: '0 4px 16px #b6c2d1',
                },
              }}
            >
              {editedUser.is_mfa_enabled ? 'Tắt 2FA' : 'Bật 2FA'}
            </Button>
          )}
        </Box>
        {saveError && (
          <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>{saveError}</Typography>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 2, mb: 1 }}>
          {isEditing ? (
            <>
              <Button
                onClick={handleCancelClick}
                variant="outlined"
                color="inherit"
                sx={{
                  minWidth: 100,
                  fontWeight: 600,
                  borderRadius: 2,
                  background: '#f5f6fa',
                  color: '#888',
                  boxShadow: '0 2px 8px #e0e7ef',
                  mr: 1,
                  transition: 'background 0.18s, box-shadow 0.18s',
                  '&:hover': {
                    background: '#e0e7ef',
                    color: '#222',
                    boxShadow: '0 4px 16px #b6c2d1',
                  },
                }}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                onClick={handleSaveClick}
                variant="contained"
                color="primary"
                sx={{
                  minWidth: 100,
                  fontWeight: 600,
                  borderRadius: 2,
                  background: '#3578e5',
                  color: '#fff',
                  boxShadow: '0 2px 8px #e0e7ef',
                  transition: 'background 0.18s, box-shadow 0.18s',
                  '&:hover': {
                    background: '#2257b6',
                    color: '#fff',
                    boxShadow: '0 4px 16px #b6c2d1',
                  },
                }}
                disabled={isSaving}
              >
                {isSaving ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleEditClick}
              variant="contained"
              color="primary"
              sx={{
                minWidth: 120,
                fontWeight: 600,
                borderRadius: 2,
                background: '#3578e5',
                color: '#fff',
                boxShadow: '0 2px 8px #e0e7ef',
                transition: 'background 0.18s, box-shadow 0.18s',
                '&:hover': {
                  background: '#2257b6',
                  color: '#fff',
                  boxShadow: '0 4px 16px #b6c2d1',
                },
              }}
            >
              <EditIcon sx={{ mr: 1, fontSize: 20 }} /> Chỉnh sửa
            </Button>
            )}
          </Box>
        <style>{`
          @keyframes fadeInProfilePopup {
            from { opacity: 0; transform: translateY(32px) scale(0.98); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @media (max-width: 600px) {
            .MuiDialogContent-root .MuiGrid-container {
              flex-direction: column !important;
            }
            .MuiDialogContent-root .MuiGrid-item {
              max-width: 100% !important;
              flex-basis: 100% !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default UserDetailDialog;
