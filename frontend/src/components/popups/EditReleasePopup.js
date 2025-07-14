import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import styles from './EditReleasePopup.module.css';

function formatDateInput(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10);
}

function formatFileName(fileName) {
  if (!fileName) return '';
  if (fileName.length <= 20) return fileName;
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return fileName.substring(0, 17) + '...';
  const name = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  if (name.length <= 17) return fileName;
  return name.substring(0, 17) + '...' + extension;
}

const EditReleasePopup = ({ open, onClose, release, onSubmit, usersList }) => {
  const renderCount = useRef(0);
  renderCount.current++;
  // console.log('[EditReleasePopup] Render count:', renderCount.current);
  const [version, setVersion] = useState(release?.version || '');
  const [fromUser, setFromUser] = useState(release?.fromUser?._id || '');
  const [toUser, setToUser] = useState(release?.toUser?._id || '');
  // Search state for fromUser
  const [fromUserSearch, setFromUserSearch] = useState(release?.fromUser?.name || '');
  const [showFromUserDropdown, setShowFromUserDropdown] = useState(false);
  const [filteredFromUsers, setFilteredFromUsers] = useState([]);
  // Search state for toUser
  const [toUserSearch, setToUserSearch] = useState(release?.toUser?.name || '');
  const [showToUserDropdown, setShowToUserDropdown] = useState(false);
  const [filteredToUsers, setFilteredToUsers] = useState([]);
  const [startDate, setStartDate] = useState(formatDateInput(release?.startDate));
  const [endDate, setEndDate] = useState(formatDateInput(release?.endDate));
  const [repoLink, setRepoLink] = useState(release?.repoLink || '');
  const [gitBranch, setGitBranch] = useState(release?.gitBranch || '');
  const [files, setFiles] = useState([]); // new files
  const [keepFiles, setKeepFiles] = useState(release?.docs?.map(f => f.fileId) || []);
  const fileInputRef = useRef();
  const fromUserBlurTimeout = useRef();
  const toUserBlurTimeout = useRef();
  const [errors, setErrors] = useState({});
  
  // Memo hóa requiredMark để tránh tạo mới mỗi lần render
  const requiredMark = useMemo(() => (
    <span className={styles.requiredMark}>*</span>
  ), []);

  // Memo hóa các callbacks
  const handleFromUserSearch = useCallback((searchTerm) => {
    setFromUserSearch(searchTerm);
    setFromUser(''); // reset khi gõ tay
    if (!searchTerm.trim()) {
      setFilteredFromUsers([]);
      setShowFromUserDropdown(false);
      return;
    }
    const filtered = usersList.filter(user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userID?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredFromUsers(filtered);
    setShowFromUserDropdown(filtered.length > 0);
  }, [usersList]);

  const handleSelectFromUser = useCallback((user) => {
    setFromUser(user._id);
    setFromUserSearch(user.name);
    setShowFromUserDropdown(false);
  }, []);

  const handleToUserSearch = useCallback((searchTerm) => {
    setToUserSearch(searchTerm);
    setToUser(''); // reset khi gõ tay
    if (!searchTerm.trim()) {
      setFilteredToUsers([]);
      setShowToUserDropdown(false);
      return;
    }
    const filtered = usersList.filter(user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userID?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredToUsers(filtered);
    setShowToUserDropdown(filtered.length > 0);
  }, [usersList]);

  const handleSelectToUser = useCallback((user) => {
    setToUser(user._id);
    setToUserSearch(user.name);
    setShowToUserDropdown(false);
  }, []);

  const handleFromUserBlur = useCallback(() => {
    fromUserBlurTimeout.current = setTimeout(() => setShowFromUserDropdown(false), 120);
  }, []);

  const handleFromUserFocus = useCallback(() => {
    if (fromUserBlurTimeout.current) clearTimeout(fromUserBlurTimeout.current);
    setShowFromUserDropdown(true);
  }, []);

  const handleToUserBlur = useCallback(() => {
    toUserBlurTimeout.current = setTimeout(() => setShowToUserDropdown(false), 120);
  }, []);

  const handleToUserFocus = useCallback(() => {
    if (toUserBlurTimeout.current) clearTimeout(toUserBlurTimeout.current);
    setShowToUserDropdown(true);
  }, []);

  const handleFileChange = useCallback((e) => {
    setFiles([...files, ...Array.from(e.target.files)]);
    e.target.value = '';
  }, [files]);

  const handleRemoveOldFile = useCallback((fileId) => {
    setKeepFiles(keepFiles.filter(id => id !== fileId));
  }, [keepFiles]);

  const handleRemoveNewFile = useCallback((idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  }, [files]);

  const handleCancel = useCallback(() => {
    setErrors({});
    onClose();
  }, [onClose]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current && fileInputRef.current.click();
  }, []);

  const handleVersionChange = useCallback((e) => {
    setVersion(e.target.value);
  }, []);

  const handleStartDateChange = useCallback((e) => {
    setStartDate(e.target.value);
  }, []);

  const handleEndDateChange = useCallback((e) => {
    setEndDate(e.target.value);
  }, []);

  const handleRepoLinkChange = useCallback((e) => {
    setRepoLink(e.target.value);
  }, []);

  const handleGitBranchChange = useCallback((e) => {
    setGitBranch(e.target.value);
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    const newErrors = {};
    if (!version.trim()) newErrors.version = 'Vui lòng nhập phiên bản';
    if (!fromUser || !usersList.find(u => u._id === fromUser)) newErrors.fromUser = 'Vui lòng chọn người bàn giao hợp lệ';
    if (!toUser || !usersList.find(u => u._id === toUser)) newErrors.toUser = 'Vui lòng chọn người nhận bàn giao hợp lệ';
    if (!startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!endDate) newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    const formData = new FormData();
    formData.append('version', version);
    formData.append('fromUser', fromUser);
    formData.append('toUser', toUser);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('repoLink', repoLink);
    formData.append('gitBranch', gitBranch);
    formData.append('keepFiles', JSON.stringify(keepFiles));
    files.forEach(f => {
      formData.append('docs', f);
    });
    onSubmit(formData);
  }, [version, fromUser, toUser, startDate, endDate, repoLink, gitBranch, keepFiles, files, usersList, onSubmit]);

  const handleFromUserChange = useCallback((e) => {
    handleFromUserSearch(e.target.value);
  }, [handleFromUserSearch]);

  const handleToUserChange = useCallback((e) => {
    handleToUserSearch(e.target.value);
  }, [handleToUserSearch]);

  const handleDropdownItemMouseEnter = useCallback((e) => {
    e.target.style.background = '#f8f9fa';
  }, []);

  const handleDropdownItemMouseLeave = useCallback((e) => {
    e.target.style.background = '#fff';
  }, []);

  const handleSelectFromUserClick = useCallback((user) => {
    handleSelectFromUser(user);
  }, [handleSelectFromUser]);

  const handleSelectToUserClick = useCallback((user) => {
    handleSelectToUser(user);
  }, [handleSelectToUser]);

  const handleRemoveOldFileClick = useCallback((fileId) => {
    handleRemoveOldFile(fileId);
  }, [handleRemoveOldFile]);

  const handleRemoveNewFileClick = useCallback((idx) => {
    handleRemoveNewFile(idx);
  }, [handleRemoveNewFile]);

  useEffect(() => {
    if (open) {
      setVersion(release?.version || '');
      setFromUser(release?.fromUser?._id || '');
      setToUser(release?.toUser?._id || '');
      setFromUserSearch(release?.fromUser?.name || '');
      setToUserSearch(release?.toUser?.name || '');
      setStartDate(formatDateInput(release?.startDate));
      setEndDate(formatDateInput(release?.endDate));
      setRepoLink(release?.repoLink || '');
      setGitBranch(release?.gitBranch || '');
      setFiles([]);
      setKeepFiles((release?.docs || []).map(f => f.fileId));
      setErrors({});
    }
  }, [open, release]);

  if (!open) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.headerSection}>
        <h2 className={styles.title}>Chỉnh sửa release</h2>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.infoGrid}>
            {/* Cột trái */}
            <div className={styles.infoColLeft}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Phiên bản {requiredMark}</label>
                <input 
                  className={`${styles.input} ${errors.version ? styles.error : ''}`}
                  value={version} 
                  onChange={handleVersionChange} 
                />
                {errors.version && <div className={styles.errorTextInline}>{errors.version}</div>}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Ngày bắt đầu {requiredMark}</label>
                <input 
                  className={`${styles.input} ${errors.startDate ? styles.error : ''}`}
                  type="date" 
                  value={startDate} 
                  onChange={handleStartDateChange} 
                />
                {errors.startDate && <div className={styles.errorTextInline}>{errors.startDate}</div>}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Ngày kết thúc dự kiến {requiredMark}</label>
                <input 
                  className={`${styles.input} ${errors.endDate ? styles.error : ''}`}
                  type="date" 
                  value={endDate} 
                  onChange={handleEndDateChange} 
                />
                {errors.endDate && <div className={styles.errorTextInline}>{errors.endDate}</div>}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Người bàn giao {requiredMark}</label>
                <div style={{position: 'relative'}}>
                  <input
                    className={`${styles.input} ${errors.fromUser ? styles.error : ''}`}
                    style={{width: '100%'}}
                    value={fromUserSearch}
                    onChange={handleFromUserChange}
                    onFocus={handleFromUserFocus}
                    onBlur={handleFromUserBlur}
                    placeholder="Tìm theo tên, email hoặc userID..."
                  />
                  {errors.fromUser && <div className={styles.errorTextInline}>{errors.fromUser}</div>}
                  {showFromUserDropdown && (
                    <div className={styles.dropdownContainer}>
                      {filteredFromUsers.length > 0 ? filteredFromUsers.map(user => (
                        <div
                          key={user._id}
                          className={styles.dropdownItem}
                          onMouseEnter={handleDropdownItemMouseEnter}
                          onMouseLeave={handleDropdownItemMouseLeave}
                          onClick={() => handleSelectFromUserClick(user)}
                        >
                          <div className={styles.dropdownItemText}>{user.name}</div>
                          <div className={styles.dropdownItemSubText}>{user.email} • {user.userID}</div>
                        </div>
                      )) : (
                        <div className={styles.noUserFound}>
                          Không tìm thấy người dùng
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Người nhận bàn giao {requiredMark}</label>
                <div style={{position: 'relative'}}>
                  <input
                    className={`${styles.input} ${errors.toUser ? styles.error : ''}`}
                    style={{width: '100%'}}
                    value={toUserSearch}
                    onChange={handleToUserChange}
                    onFocus={handleToUserFocus}
                    onBlur={handleToUserBlur}
                    placeholder="Tìm theo tên, email hoặc userID..."
                  />
                  {errors.toUser && <div className={styles.errorTextInline}>{errors.toUser}</div>}
                  {showToUserDropdown && (
                    <div className={styles.dropdownContainer}>
                      {filteredToUsers.length > 0 ? filteredToUsers.map(user => (
                        <div
                          key={user._id}
                          className={styles.dropdownItem}
                          onMouseEnter={handleDropdownItemMouseEnter}
                          onMouseLeave={handleDropdownItemMouseLeave}
                          onClick={() => handleSelectToUserClick(user)}
                        >
                          <div className={styles.dropdownItemText}>{user.name}</div>
                          <div className={styles.dropdownItemSubText}>{user.email} • {user.userID}</div>
                        </div>
                      )) : (
                        <div className={styles.noUserFound}>
                          Không tìm thấy người dùng
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Cột phải */}
            <div className={styles.infoColRight}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Git repo</label>
                <input className={styles.input} value={repoLink} onChange={handleRepoLinkChange} />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Branch</label>
                <input className={styles.input} value={gitBranch} onChange={handleGitBranchChange} />
              </div>
              <div className={styles.fieldGroup}>
                <div style={{display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6}}>
                  <label className={styles.label}>Tài liệu bàn giao</label>
                  <button
                    type="button"
                    className={styles.uploadIconBtn}
                    onClick={handleUploadClick}
                    title="Tải lên tài liệu"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 14V4M10 4L6 8M10 4L14 8" stroke="#1976d2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="4" y="15" width="12" height="2" rx="1" fill="#1976d2"/>
                    </svg>
                  </button>
            </div>
                <input
                  type="file"
                  style={{ display: 'none' }}
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <div className={styles.fileListLimited}>
              {(release?.docs || []).filter(f => keepFiles.includes(f.fileId)).map(f => (
                    <div key={f.fileId} className={styles.fileItem}>
                  <span className={styles.fileIcon}>📄</span>
                  <span className={styles.fileName} title={f.fileName}>{formatFileName(f.fileName)}</span>
                      <button
                        type="button"
                        className={styles.removeFileBtn}
                        onClick={() => handleRemoveOldFileClick(f.fileId)}
                        title="Xóa file"
                      >
                        ×
                      </button>
                </div>
              ))}
              {files.map((f, idx) => (
                    <div key={idx} className={styles.fileItem}>
                  <span className={styles.fileIcon}>🆕</span>
                  <span className={styles.fileName} title={f.name}>{formatFileName(f.name)}</span>
                      <button
                        type="button"
                        className={styles.removeFileBtn}
                        onClick={() => handleRemoveNewFileClick(idx)}
                        title="Xóa file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {(release?.docs || []).filter(f => keepFiles.includes(f.fileId)).length === 0 && files.length === 0 && (
                    <div className={styles.noFileText}>Chưa chọn file nào</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleCancel}>
              Hủy
            </button>
            <button type="submit" className={styles.submitBtn}>
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditReleasePopup; 