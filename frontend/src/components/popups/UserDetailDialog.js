import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './UserDetailDialog.module.css';
import userAvatar from '../../asset/user.png';
import UserService from '../../api/services/user.service';
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
  
  if (!open) return null;

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

  if (!open || !user) return null;
  return ReactDOM.createPortal(
    <div className={styles.dialogOverlay} onClick={handleClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogTitle}>
          Thông tin người dùng
          <button className={styles.closeButton} onClick={handleClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className={styles.dialogContent}>
          <div className={styles.avatarSection}>
            <div className={styles.avatarContainer}>
              <img
                className={styles.avatar}
                src={previewAvatar || editedUser.avatarUrl || userAvatar}
                alt={editedUser.name}
              />
              {isEditing && (
                <>
                  <input
                    type="file"
                    id="avatar-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarChange}
                  />
                  <label htmlFor="avatar-input" className={styles.cameraButton}>
                    <i className="fas fa-camera"></i>
                  </label>
                </>
              )}
            </div>

            {isEditing ? (
              <input
                type="text"
                className={styles.userNameInput}
                value={editedUser.name || ''}
                onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
              />
            ) : (
              <h2 className={styles.userName}>{editedUser.name}</h2>
            )}

            {isEditing ? (
              <select
                className={styles.select}
                value={editedUser.role || ''}
                onChange={(e) => setEditedUser({ ...editedUser, role: e.target.value })}
                disabled={currentUser.role !== 'admin'}
                style={{ maxWidth: '240px', marginBottom: '8px' }}
              >
                {currentUser.role === 'admin' && <option value="admin">Admin</option>}
                <option value="pm">Project Manager</option>
                <option value="ba">Business Analyst</option>
                <option value="developer">Developer</option>
                <option value="tester">Tester</option>
                <option value="other">Khác</option>
              </select>
            ) : (
              <div className={styles.roleContainer}>
                <i className="fas fa-id-badge"></i>
                <span className={styles.roleText}>{getRoleLabel(editedUser.role)}</span>
              </div>
            )}
          </div>

          <div className={styles.formGrid}>
            {/* UserID Field */}
            <div className={styles.formItem}>
              <div className={styles.inputField}>
                <label htmlFor="userId" className={styles.inputLabel}>Mã người dùng</label>
                <input
                  id="userId"
                  type="text"
                  className={`${styles.input} ${styles.disabledInput}`}
                  value={editedUser.userID || ''}
                  disabled
                  placeholder="UserID"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className={styles.formItem}>
              <div className={styles.inputField}>
                <label htmlFor="email" className={styles.inputLabel}>Email</label>
                <input
                  id="email"
                  type="email"
                  className={`${styles.input} ${styles.disabledInput}`}
                  value={editedUser.email || ''}
                  disabled
                  placeholder="Email"
                />
              </div>
            </div>

            {/* Gender Field */}
            <div className={styles.formItem}>
              <div className={styles.inputField}>
                <label htmlFor="gender" className={styles.inputLabel}>Giới tính</label>
                <select
                  id="gender"
                  className={styles.select}
                  value={editedUser.gender || 'other'}
                  onChange={(e) => setEditedUser({ ...editedUser, gender: e.target.value })}
                  disabled={!isEditing}
                >
                  <option value="male">Nam</option>
                  <option value="female">Nữ</option>
                  <option value="other">Khác</option>
                </select>
              </div>
            </div>

            {/* Phone Number Field */}
            <div className={styles.formItem}>
              <div className={styles.inputField}>
                <label htmlFor="phoneNumber" className={styles.inputLabel}>Số điện thoại</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  className={styles.input}
                  value={editedUser.phoneNumber || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, phoneNumber: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Số điện thoại"
                />
                {fieldErrors.phoneNumber && (
                  <div className={styles.errorText}>{fieldErrors.phoneNumber}</div>
                )}
              </div>
            </div>

            {/* Company Name Field */}
            <div className={styles.formItem}>
              <div className={styles.inputField}>
                <label htmlFor="companyName" className={styles.inputLabel}>Công ty</label>
                <input
                  id="companyName"
                  type="text"
                  className={styles.input}
                  value={editedUser.companyName || ''}
                  onChange={(e) => setEditedUser({ ...editedUser, companyName: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Công ty"
                />
                {fieldErrors.companyName && (
                  <div className={styles.errorText}>{fieldErrors.companyName}</div>
                )}
              </div>
            </div>

            {/* Status Field */}
            <div className={styles.formItem}>
              <div className={styles.inputField}>
                <label htmlFor="status" className={styles.inputLabel}>Trạng thái</label>
                <select
                  id="status"
                  className={styles.select}
                  value={editedUser.status || 'active'}
                  onChange={(e) => setEditedUser({ ...editedUser, status: e.target.value })}
                  disabled={!isEditing || currentUser.role !== 'admin'}
                >
                  <option value="active">Hoạt động</option>
                  <option value="locked">Đã khóa</option>
                </select>
              </div>
            </div>

            {/* Created Date Field */}
            <div className={styles.formItem}>
              <div className={styles.inputField}>
                <label htmlFor="createdDate" className={styles.inputLabel}>Ngày tạo tài khoản</label>
                <input
                  id="createdDate"
                  type="text"
                  className={`${styles.input} ${styles.disabledInput}`}
                  value={formatDate(editedUser.createdAt)}
                  disabled
                  placeholder="Ngày tạo tài khoản"
                />
              </div>
            </div>
          </div>

          {isEditing && (
            <div className={styles.passwordSection}>
              <h3 className={styles.passwordTitle}>Đổi mật khẩu</h3>
              <div className={styles.passwordGrid}>
                {currentUser._id === editedUser._id ? (
                  <>
                    <div className={styles.formItem}>
                      <div className={styles.inputField}>
                        <div style={{ position: 'relative' }}>
                          <label htmlFor="oldPassword" className={styles.inputLabel}>Mật khẩu cũ</label>
                          <input
                            id="oldPassword"
                            type={showOldPassword ? 'text' : 'password'}
                            className={styles.input}
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            placeholder="Mật khẩu cũ"
                          />
                          <button
                            type="button"
                            className={styles.togglePasswordButton}
                            onClick={() => setShowOldPassword(!showOldPassword)}
                          >
                            <i className={`fas ${showOldPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                        {fieldErrors.oldPassword && (
                          <div className={styles.errorText}>{fieldErrors.oldPassword}</div>
                        )}
                      </div>
                    </div>

                    <div className={styles.formItem}>
                      <div className={styles.inputField}>
                        <div style={{ position: 'relative' }}>
                          <label htmlFor="newPassword" className={styles.inputLabel}>Mật khẩu mới</label>
                          <input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            className={styles.input}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mật khẩu mới"
                          />
                          <button
                            type="button"
                            className={styles.togglePasswordButton}
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                        {Array.isArray(fieldErrors.newPassword) && fieldErrors.newPassword.length > 0 && (
                          <ul className={styles.errorText}>
                            {fieldErrors.newPassword.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className={styles.formItem}>
                      <div className={styles.inputField}>
                        <div style={{ position: 'relative' }}>
                          <label htmlFor="confirmPassword" className={styles.inputLabel}>Nhập lại mật khẩu mới</label>
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            className={styles.input}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới"
                          />
                          <button
                            type="button"
                            className={styles.togglePasswordButton}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                          <div className={styles.errorText}>{fieldErrors.confirmPassword}</div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.formItem}>
                      <div className={styles.inputField}>
                        <div style={{ position: 'relative' }}>
                          <label htmlFor="newPassword" className={styles.inputLabel}>Mật khẩu mới</label>
                          <input
                            id="newPassword"
                            type={showNewPassword ? 'text' : 'password'}
                            className={styles.input}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mật khẩu mới"
                          />
                          <button
                            type="button"
                            className={styles.togglePasswordButton}
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                        {Array.isArray(fieldErrors.newPassword) && fieldErrors.newPassword.length > 0 && (
                          <ul className={styles.errorText}>
                            {fieldErrors.newPassword.map((err, idx) => (
                              <li key={idx}>{err}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className={styles.formItem}>
                      <div className={styles.inputField}>
                        <div style={{ position: 'relative' }}>
                          <label htmlFor="confirmPassword" className={styles.inputLabel}>Nhập lại mật khẩu mới</label>
                          <input
                            id="confirmPassword"
                            type={showConfirmPassword ? 'text' : 'password'}
                            className={styles.input}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới"
                          />
                          <button
                            type="button"
                            className={styles.togglePasswordButton}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                        {fieldErrors.confirmPassword && (
                          <div className={styles.errorText}>{fieldErrors.confirmPassword}</div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div className={styles.twoFASection}>
            <h3 className={styles.twoFATitle}>
              Xác minh 2 lớp (2FA):{' '}
              <span className={editedUser.is_mfa_enabled ? styles.enabledStatus : styles.disabledStatus}>
                {editedUser.is_mfa_enabled ? 'Đã bật' : 'Chưa bật'}
              </span>
            </h3>
            {isEditing && (
              <button
                className={`${styles.button} ${editedUser.is_mfa_enabled ? styles.secondaryButton : styles.primaryButton}`}
                onClick={handleToggleMfa}
              >
                {editedUser.is_mfa_enabled ? 'Tắt 2FA' : 'Bật 2FA'}
              </button>
            )}
          </div>

          {saveError && (
            <div className={styles.errorText} style={{ textAlign: 'center', marginBottom: '16px' }}>
              {saveError}
            </div>
          )}

          <div className={styles.buttonContainer}>
            {isEditing ? (
              <>
                <button
                  className={`${styles.button} ${styles.secondaryButton}`}
                  onClick={handleCancelClick}
                  disabled={isSaving}
                >
                  Hủy
                </button>
                <button
                  className={`${styles.button} ${styles.primaryButton}`}
                  onClick={handleSaveClick}
                  disabled={isSaving}
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
              </>
            ) : (
              <button
                className={`${styles.button} ${styles.primaryButton}`}
                onClick={handleEditClick}
              >
                <i className="fas fa-edit" style={{ marginRight: '8px' }}></i>
                Chỉnh sửa
              </button>
            )}
          </div>
        </div>
        {/* Toasts */}
        <SuccessToast show={showSuccess} message="Lưu thông tin thành công!" onClose={() => setShowSuccess(false)} />
        <WarningToast show={showWarning} message="Không có thay đổi nào để lưu." onClose={() => setShowWarning(false)} />
      </div>
    </div>,
    document.body
  );
};

export default UserDetailDialog;
