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
  InputAdornment,
} from '@mui/material';
import {
  Close as CloseIcon,
  Edit as EditIcon,
  PhotoCamera as PhotoCameraIcon, 
  Visibility,
  VisibilityOff,
} from '@mui/icons-material';
import userAvatar from '../../asset/user.png';
import UserService from '../../api/services/user.service';
import BadgeIcon from '@mui/icons-material/Badge';
import { useAuth } from '../../contexts/AuthContext';
import SuccessToast from '../common/SuccessToast';
import WarningToast from '../common/WarningToast';

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

// Thêm hàm kiểm tra độ mạnh mật khẩu
const validatePassword = (password) => {
  const errors = [];
  if (password.length < 8) errors.push('Mật khẩu phải có ít nhất 8 ký tự');
  if (!/[A-Z]/.test(password)) errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
  if (!/[a-z]/.test(password)) errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
  if (!/\d/.test(password)) errors.push('Mật khẩu phải có ít nhất 1 số');
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
  return errors;
};

const UserDetailDialog = ({ open, handleClose, user, onUserUpdate }) => {
  const { user: currentUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState(user);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  
  // Toast state
  const [showSuccess, setShowSuccess] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  // Helper: check if user info changed
  const isUserChanged = () => {
    if (!user) return false;
    // Compare each editable field
    const fields = ['name', 'phoneNumber', 'companyName', 'role', 'is_mfa_enabled', 'gender', 'status'];
    for (let key of fields) {
      if (user[key] !== editedUser[key]) return true;
    }
    if (selectedAvatar) return true;
    if (oldPassword || newPassword || confirmPassword) return true;
    return false;
  };

  useEffect(() => {
    setEditedUser(user);
    setIsEditing(false);
    setSaveError('');
    setSelectedAvatar(null);
    setPreviewAvatar(null);
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setFieldErrors({});
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
    setSelectedAvatar(null);
    setPreviewAvatar(null);
    setFieldErrors({}); 
    setOldPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowOldPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSaveClick = async () => {
    if (!isUserChanged()) {
      setShowWarning(true);
      return;
    }

    setIsSaving(true);
    setSaveError('');
    setFieldErrors({});
    const errors = {};
    if (!editedUser.phoneNumber) {
      errors.phoneNumber = 'Vui lòng nhập số điện thoại.';
    }
    if (!editedUser.companyName) {
      errors.companyName = 'Vui lòng nhập tên công ty.';
    }
    if (newPassword) {
      const passwordErrors = validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        errors.newPassword = passwordErrors; 
      }
    }
    if (newPassword !== confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không khớp.';
    }
    if (currentUser._id === editedUser._id && (newPassword || confirmPassword) && !oldPassword) {
      errors.oldPassword = 'Vui lòng nhập mật khẩu cũ để xác nhận đổi mật khẩu.';
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsSaving(false);
      return;
    }
    try {
      // Đổi mật khẩu nếu có nhập mật khẩu mới
      if (newPassword || confirmPassword || oldPassword) {
        if (newPassword !== confirmPassword) {
          setIsSaving(false);
          return;
        }
        // Có thể thêm kiểm tra độ mạnh mật khẩu ở đây nếu muốn
        await UserService.changePassword(editedUser._id, oldPassword, newPassword);
      }
      // Destructure to separate avatar logic
      const { is_mfa_enabled, ...otherDetails } = editedUser;
  
      const promises = [];
  
      // Handle avatar update
      if (selectedAvatar) {
        promises.push(UserService.updateAvatar(otherDetails._id, selectedAvatar));
      }
  
      // Handle user details update
      promises.push(UserService.updateUser(otherDetails._id, otherDetails));
  
      // Handle 2FA update
      if (user.is_mfa_enabled !== is_mfa_enabled) {
        if (is_mfa_enabled) {
          promises.push(UserService.enable2FA());
        } else {
          promises.push(UserService.disable2FA());
        }
      }
  
      await Promise.all(promises);
  
      // Callback after all updates are successful
      await onUserUpdate(); 
      setIsEditing(false); 
      setSelectedAvatar(null);
      setPreviewAvatar(null);
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowSuccess(true);  // Show success toast
    } catch (error) {
      if (error.response?.data?.message?.includes('Mật khẩu cũ không đúng')) {
        setFieldErrors(prev => ({ ...prev, oldPassword: 'Mật khẩu cũ không đúng.' }));
      } else {
        setSaveError(error.response?.data?.message || 'Lưu thông tin thất bại.');
      }
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

  const handleAvatarChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedAvatar(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          p: 0,
          boxShadow: '0 8px 32px rgba(31,38,135,0.12)',
          animation: 'fadeInProfilePopup 0.35s cubic-bezier(0.4,0,0.2,1)',
          minWidth: 700,
          background: '#fafdff',
        }
      }}
      TransitionProps={{
        onEnter: (node) => { node.style.opacity = 0; setTimeout(() => { node.style.opacity = 1; }, 10); },
        onExited: (node) => { node.style.opacity = 0; }
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 0, textAlign: 'center', fontWeight: 700, fontSize: 24, letterSpacing: 0.5 }}>
        Thông tin người dùng
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
          <Box sx={{ position: 'relative', width: 120, height: 120, mx: 'auto', mb: 1 }}>
            <Avatar
              alt={editedUser.name}
              src={previewAvatar || editedUser.avatarUrl || userAvatar}
              sx={{
                width: 120,
                height: 120,
                border: '4px solid #3578e5',
                boxShadow: '0 4px 24px #b6c2d1',
                background: '#fff',
                transition: 'box-shadow 0.2s',
              }}
            />
            {isEditing && (
              <>
                <input
                  accept="image/*"
                  style={{ display: 'none' }}
                  id="icon-button-file"
                  type="file"
                  onChange={handleAvatarChange}
                />
                <label htmlFor="icon-button-file">
                  <IconButton
                    component="span"
                    sx={{
                      position: 'absolute',
                      bottom: 8,
                      right: 8,
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      color: 'primary.main',
                      border: '1.5px solid #3578e5',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                        color: 'white',
                      },
                    }}
                  >
                    <PhotoCameraIcon />
                  </IconButton>
                </label>
              </>
            )}
          </Box>
          {isEditing ? (
            <TextField
              variant="outlined"
              size="small"
              value={editedUser.name || ''}
              onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
              sx={{ mb: 1, mt: 0.5, width: 260, textAlign: 'center', maxWidth: 360, mx: 'auto', fontWeight: 700 }}
              inputProps={{ style: { textAlign: 'center', fontWeight: 700, fontSize: 18 } }}
            />
          ) : (
            <Typography variant="h6" sx={{ fontWeight: 700, mt: 0.5, mb: 1, textAlign: 'center', fontSize: 22 }}>
              {editedUser.name}
            </Typography>
          )}
          {isEditing ? (
            <>
              <FormControl size="small" sx={{ mt: '5px', maxWidth: 240, width: '100%', mx: 'auto', '& .MuiInputBase-root': { height: 48 } }}>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={editedUser.role || ''}
                label="Vai trò"
                onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value })}
                disabled={currentUser.role !== 'admin'}
              >
                {currentUser.role === 'admin' && <MenuItem value="admin">Admin</MenuItem>}
                <MenuItem value="pm">Project Manager</MenuItem>
                <MenuItem value="ba">Business Analyst</MenuItem>
                <MenuItem value="developer">Developer</MenuItem>
                <MenuItem value="tester">Tester</MenuItem>
                <MenuItem value="other">Khác</MenuItem>
              </Select>
            </FormControl>
              <div style={{ height: 18, marginTop: 2, marginBottom: 8, width: '100%', maxWidth: 240 }}></div>
            </>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <BadgeIcon sx={{ mr: 0.5, fontSize: 18, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {getRoleLabel(editedUser.role)}
              </Typography>
            </Box>
          )}
        </Box>
        <Grid container spacing={2.5} sx={{ mb: 1, mt: 1 }}>
          {/* Các trường thông tin cá nhân */}
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} style={{ paddingTop: 10 }}>
            <TextField
            label="UserID"
              value={editedUser.userID || ''}
              variant="outlined"
              size="small"
              fullWidth
              disabled
              InputProps={{ style: { color: '#888', background: '#f5f6fa', fontWeight: 500, height: 48 } }}
              sx={{ mb: 0.5, maxWidth: 360, mx: 'auto', '& .MuiInputBase-root': { height: 48 } }}
            />
            <div style={{ height: 18, marginTop: 2, marginBottom: 8, width: '100%', maxWidth: 360 }}></div>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} style={{ paddingTop: 10 }}>
            <TextField
              label="Email"
              value={editedUser.email || ''}
              variant="outlined"
              size="small"
              fullWidth
              disabled
              InputProps={{ style: { color: '#888', background: '#f5f6fa', fontWeight: 500, height: 48 } }}
              sx={{ mb: 0.5, maxWidth: 360, mx: 'auto', '& .MuiInputBase-root': { height: 48 } }}
            />
            <div style={{ height: 18, marginTop: 2, marginBottom: 8, width: '100%', maxWidth: 360 }}></div>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} style={{ paddingTop: 10 }}>
            <FormControl fullWidth size="small" sx={{ mb: 0.5, maxWidth: 360, mx: 'auto', '& .MuiInputBase-root': { height: 48 } }}>
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
            <div style={{ height: 18, marginTop: 2, marginBottom: 8, width: '100%', maxWidth: 360 }}></div>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} style={{ paddingTop: 10 }}>
            <TextField
            label="Số điện thoại"
              value={editedUser.phoneNumber || ''}
                variant="outlined"
                size="small"
                fullWidth
              onChange={isEditing ? (e) => setEditedUser({ ...editedUser, phoneNumber: e.target.value }) : undefined}
              disabled={!isEditing}
              sx={{ mb: 0.5, maxWidth: 360, mx: 'auto', '& .MuiInputBase-root': { height: 48 } }}
              InputProps={{ style: { height: 48 } }}
          />
            <div style={{ color: '#dc3545', fontSize: 12, marginTop: 2, marginBottom: 8, width: '100%', textAlign: 'left', maxWidth: 360, height: 18, overflowY: 'auto', paddingRight: 2, boxSizing: 'border-box', transition: 'height 0.2s' }}>
              {fieldErrors.phoneNumber || ''}
            </div>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} style={{ paddingTop: 10 }}>
            <TextField
              label="Công ty"
              value={editedUser.companyName || ''}
                variant="outlined"
                size="small"
                fullWidth
              onChange={isEditing ? (e) => setEditedUser({ ...editedUser, companyName: e.target.value }) : undefined}
              disabled={!isEditing}
              sx={{ mb: 0.5, maxWidth: 360, mx: 'auto', '& .MuiInputBase-root': { height: 48 } }}
              InputProps={{ style: { height: 48 } }}
              />
            <div style={{ color: '#dc3545', fontSize: 12, marginTop: 2, marginBottom: 8, width: '100%', textAlign: 'left', maxWidth: 360, height: 18, overflowY: 'auto', paddingRight: 2, boxSizing: 'border-box', transition: 'height 0.2s' }}>
              {fieldErrors.companyName || ''}
            </div>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} style={{ paddingTop: 10 }}>
            <FormControl fullWidth size="small" sx={{ mb: 0.5, maxWidth: 360, mx: 'auto', '& .MuiInputBase-root': { height: 48 } }}>
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
            <div style={{ height: 18, marginTop: 2, marginBottom: 8, width: '100%', maxWidth: 360 }}></div>
          </Grid>
          <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }} style={{ paddingTop: 10 }}>
            <TextField
            label="Ngày tạo tài khoản"
            value={formatDate(editedUser.createdAt)}
              variant="outlined"
              size="small"
              fullWidth
              disabled
              InputProps={{ style: { color: '#888', background: '#f5f6fa', fontWeight: 500, height: 48 } }}
              sx={{ mb: 0.5, maxWidth: 360, mx: 'auto', '& .MuiInputBase-root': { height: 48 } }}
          />
            <div style={{ height: 18, marginTop: 2, marginBottom: 8, width: '100%', maxWidth: 360 }}></div>
          </Grid>
          {isEditing && (
            <>
              <Grid item xs={12} style={{ paddingTop: 0, marginTop: 0 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 2, mb: 1, borderTop: '1.5px solid #e3e8ef', pt: 2, textAlign: 'center', fontSize: 18, letterSpacing: 0.2 }}>
                  Đổi mật khẩu
                </Typography>
              </Grid>
              {currentUser._id === editedUser._id ? (
                // Trường hợp có ô Mật khẩu cũ (user tự đổi hoặc admin đổi cho chính mình)
                <>
                  <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
                    <Box sx={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      {/* Mật khẩu cũ */}
                      <Box>
                        <TextField
                          label="Mật khẩu cũ"
                          type={showOldPassword ? 'text' : 'password'}
                          value={oldPassword}
                          onChange={e => setOldPassword(e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ mb: 0.5, '& .MuiInputBase-root': { height: 48 } }}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle password visibility"
                                  onClick={() => setShowOldPassword(!showOldPassword)}
                                  edge="end"
                                >
                                  {showOldPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                            style: { height: 48 }
                          }}
                        />
                        <div style={{ color: '#dc3545', fontSize: 12, marginTop: 2, marginBottom: 8, width: '100%', textAlign: 'left', height: 18, overflowY: 'auto', paddingRight: 2, boxSizing: 'border-box', transition: 'height 0.2s' }}>
                          {fieldErrors.oldPassword || ''}
                        </div>
                      </Box>
                      {/* Nhập lại mật khẩu mới */}
                      <Box sx={{ mt: 1 }}>
                        <TextField
                          label="Nhập lại mật khẩu mới"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          fullWidth
                          size="small"
                          sx={{ mb: 0.5, '& .MuiInputBase-root': { height: 48 } }}
                          InputProps={{
                            endAdornment: (
                              <InputAdornment position="end">
                                <IconButton
                                  aria-label="toggle password visibility"
                                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                  edge="end"
                                >
                                  {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                              </InputAdornment>
                            ),
                            style: { height: 48 }
                          }}
                        />
                        <div style={{ color: '#dc3545', fontSize: 12, marginTop: 2, marginBottom: 8, width: '100%', textAlign: 'left', height: 18, overflowY: 'auto', paddingRight: 2, boxSizing: 'border-box', transition: 'height 0.2s' }}>
                          {fieldErrors.confirmPassword || ''}
                        </div>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
                    <Box sx={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'flex-start' }}>
                      <TextField
                        label="Mật khẩu mới"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        fullWidth
                        size="small"
                        sx={{ mb: 0.5, '& .MuiInputBase-root': { height: 48 } }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle password visibility"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                edge="end"
                              >
                                {showNewPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                          style: { height: 48 }
                        }}
                      />
                      <div style={{ color: '#dc3545', fontSize: 12, marginTop: 2, marginBottom: 8, width: '100%', textAlign: 'left', height: 96, overflowY: 'auto', paddingRight: 2, boxSizing: 'border-box', transition: 'height 0.2s' }}>
                        {Array.isArray(fieldErrors.newPassword) && fieldErrors.newPassword.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc', fontSize: 12 }}>
                            {fieldErrors.newPassword.map((err, idx) => (
                              <li key={idx} style={{ marginBottom: 2 }}>{err}</li>
                            ))}
                          </ul>
                        ) : ''}
                      </div>
                    </Box>
                  </Grid>
                </>
              ) : (
                // Trường hợp admin đổi mật khẩu cho user khác (không có ô Mật khẩu cũ)
                <>
                  <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
                    <Box sx={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <TextField
                        label="Mật khẩu mới"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        fullWidth
                        size="small"
                        sx={{ mb: 0.5, '& .MuiInputBase-root': { height: 48 } }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle password visibility"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                edge="end"
                              >
                                {showNewPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                          style: { height: 48 }
                        }}
                      />
                      <div style={{ color: '#dc3545', fontSize: 12, marginTop: 2, marginBottom: 8, width: '100%', textAlign: 'left', minHeight: 18, paddingRight: 2, boxSizing: 'border-box', transition: 'height 0.2s' }}>
                        {Array.isArray(fieldErrors.newPassword) && fieldErrors.newPassword.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: 18, listStyle: 'disc', fontSize: 12 }}>
                            {fieldErrors.newPassword.map((err, idx) => (
                              <li key={idx} style={{ marginBottom: 2 }}>{err}</li>
                            ))}
                          </ul>
                        ) : ''}
                      </div>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 1 }}>
                    <Box sx={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 0 }}>
                      <TextField
                        label="Nhập lại mật khẩu mới"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        fullWidth
                        size="small"
                        sx={{ mb: 0.5, '& .MuiInputBase-root': { height: 48 } }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle password visibility"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                edge="end"
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                          style: { height: 48 }
                        }}
                      />
                      <div style={{ color: '#dc3545', fontSize: 12, marginTop: 2, marginBottom: 8, width: '100%', textAlign: 'left', height: 18, overflowY: 'auto', paddingRight: 2, boxSizing: 'border-box', transition: 'height 0.2s' }}>
                        {fieldErrors.confirmPassword || ''}
                      </div>
                    </Box>
                  </Grid>
                </>
              )}
            </>
          )}
        </Grid>
        <Box sx={{ mt: 2, mb: 2, textAlign: 'center' }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 700, fontSize: 18 }}>
              Xác minh 2 lớp (2FA):{' '}
              {editedUser.is_mfa_enabled ? (
              <span style={{ color: '#2e7d32', fontWeight: 700 }}>Đã bật</span>
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
                fontWeight: 700,
                borderRadius: 2,
                boxShadow: '0 2px 8px #e0e7ef',
                mr: 1,
                fontSize: 16,
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
          <Typography color="error" sx={{ mb: 2, textAlign: 'center', fontWeight: 600 }}>{saveError}</Typography>
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
                  fontWeight: 700,
                  borderRadius: 2,
                  background: '#f5f6fa',
                  color: '#888',
                  boxShadow: '0 2px 8px #e0e7ef',
                  mr: 1,
                  fontSize: 16,
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
                  fontWeight: 700,
                  borderRadius: 2,
                  background: '#3578e5',
                  color: '#fff',
                  boxShadow: '0 2px 8px #e0e7ef',
                  fontSize: 16,
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
                fontWeight: 700,
                borderRadius: 2,
                background: '#3578e5',
                color: '#fff',
                boxShadow: '0 2px 8px #e0e7ef',
                fontSize: 16,
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
    {/* Toasts */}
    <SuccessToast show={showSuccess} message="Lưu thông tin thành công!" onClose={() => setShowSuccess(false)} />
    <WarningToast show={showWarning} message="Không có thay đổi nào để lưu." onClose={() => setShowWarning(false)} />
    </Dialog>
  );
};

export default UserDetailDialog;
