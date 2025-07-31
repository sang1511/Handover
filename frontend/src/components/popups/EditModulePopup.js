import React, { useState, useRef, useEffect } from 'react';
import WarningToast from '../common/WarningToast';
import styles from './EditModulePopup.module.css';

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

const EditModulePopup = ({ open, onClose, module, onSubmit, usersList, errorMessage, loading }) => {
  const [name, setName] = useState(module?.name || '');
  const [version, setVersion] = useState(module?.version || '');
  const [owner, setOwner] = useState(module?.owner?._id || '');
  const [startDate, setStartDate] = useState(formatDateInput(module?.startDate));
  const [endDate, setEndDate] = useState(formatDateInput(module?.endDate));
  const [description, setDescription] = useState(module?.description || '');
  const [files, setFiles] = useState([]); // new files
  const [keepFiles, setKeepFiles] = useState(module?.docs?.map(f => f.publicId) || []);
  const fileInputRef = useRef();

  // State cho owner search
  const [ownerSearch, setOwnerSearch] = useState(module?.owner?.name || '');
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const ownerBlurTimeout = useRef();
  const [errors, setErrors] = useState({});
  const [showWarning, setShowWarning] = useState(false);
  const requiredMark = <span className={styles.requiredMark}>*</span>;

  useEffect(() => {
    if (open) {
      setName(module?.name || '');
      setVersion(module?.version || '');
      setOwner(module?.owner?._id || '');
      setOwnerSearch(module?.owner?.name || '');
      setStartDate(formatDateInput(module?.startDate));
      setEndDate(formatDateInput(module?.endDate));
      setDescription(module?.description || '');
      setFiles([]);
      setKeepFiles(module?.docs?.map(f => f.publicId) || []);
      setErrors({});
    }
  }, [open, module]);

  if (!open) return null;

  // Filter users based on search
  const handleOwnerSearch = (searchTerm) => {
    setOwnerSearch(searchTerm);
    setOwner(''); // reset owner khi gõ tay
    if (!searchTerm.trim()) {
      setFilteredUsers([]);
      setShowOwnerDropdown(false);
      return;
    }

    const filtered = usersList.filter(user =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userID?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
    setShowOwnerDropdown(filtered.length > 0);
  };

  const handleSelectOwner = (user) => {
    setOwner(user._id);
    setOwnerSearch(
      user.name +
      (user.userID ? ` (${user.userID})` : '') +
      (user.email ? ` (${user.email})` : '')
    );
    setShowOwnerDropdown(false);
  };

  const handleFileChange = (e) => {
    setFiles([...files, ...Array.from(e.target.files)]);
    e.target.value = '';
  };

  const handleRemoveOldFile = (publicId) => {
    setKeepFiles(keepFiles.filter(id => id !== publicId));
  };

  const handleRemoveNewFile = (idx) => {
    setFiles(files.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Vui lòng nhập tên module';
    if (!version.trim()) newErrors.version = 'Vui lòng nhập phiên bản';
    if (!owner || !usersList.find(u => u._id === owner)) newErrors.owner = 'Vui lòng chọn người phụ trách hợp lệ';
    if (!startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!endDate) newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const isUnchanged =
      name === module?.name &&
      version === module?.version &&
      owner === module?.owner?._id &&
      startDate === formatDateInput(module?.startDate) &&
      endDate === formatDateInput(module?.endDate) &&
      description === (module?.description || '') &&
      JSON.stringify(keepFiles) === JSON.stringify(module?.docs?.map(f => f.publicId) || []) &&
      files.length === 0;

    if (isUnchanged) {
      setShowWarning(true);
      return;
    }

    const formData = new FormData();
    formData.append('name', name);
    formData.append('version', version);
    formData.append('owner', owner);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('description', description);
    formData.append('keepFiles', JSON.stringify(keepFiles));
    files.forEach(f => {
      formData.append('docs', f);
    });
    onSubmit(formData);
  };
  const handleOwnerBlur = () => {
    ownerBlurTimeout.current = setTimeout(() => setShowOwnerDropdown(false), 120);
  };
  const handleOwnerFocus = () => {
    if (ownerBlurTimeout.current) clearTimeout(ownerBlurTimeout.current);
    setShowOwnerDropdown(true);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.headerSection}>
          <WarningToast
            show={showWarning}
            message="Bạn chưa thay đổi thông tin nào!"
            onClose={() => setShowWarning(false)}
          />
          <h2 className={styles.title}>Chỉnh sửa module</h2>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.infoGrid}>
            {/* Cột trái */}
            <div className={styles.infoColLeft}>
              <div className={styles.fieldGroup} style={{ position: 'relative' }}>
                <label className={styles.label}>Tên module {requiredMark}</label>
                <input
                  className={errors.name ? `${styles.input} ${styles.inputError}` : styles.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                {errors.name && <div className={styles.errorTextInline}>{errors.name}</div>}
              </div>
              <div className={styles.fieldGroup} style={{ position: 'relative' }}>
                <label className={styles.label}>Phiên bản {requiredMark}</label>
                <input
                  className={errors.version ? `${styles.input} ${styles.inputError}` : styles.input}
                  value={version}
                  onChange={e => setVersion(e.target.value)}
                />
                {errors.version && <div className={styles.errorTextInline}>{errors.version}</div>}
              </div>
              <div className={styles.fieldGroup} style={{ position: 'relative' }}>
                <label className={styles.label}>Người phụ trách {requiredMark}</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className={errors.owner ? `${styles.input} ${styles.inputError}` : styles.input}
                    style={{ width: '100%' }}
                    value={ownerSearch}
                    onChange={e => handleOwnerSearch(e.target.value)}
                    onFocus={handleOwnerFocus}
                    onBlur={handleOwnerBlur}
                    placeholder="Tìm theo tên, email hoặc userID..."
                    autoComplete="off"
                  />
                  {errors.owner && <div className={styles.errorTextInline}>{errors.owner}</div>}
                  {showOwnerDropdown && (
                    <div className={styles.ownerDropdown}>
                      {filteredUsers.length > 0 ? filteredUsers.map(user => (
                        <div
                          key={user._id}
                          className={styles.ownerDropdownItem}
                          onMouseDown={() => handleSelectOwner(user)}
                        >
                          <div className={styles.ownerName}>{user.name}</div>
                          <div className={styles.ownerEmail}>{user.email} • {user.userID}</div>
                        </div>
                      )) : (
                        <div className={styles.ownerDropdownEmpty}>
                          Không tìm thấy người dùng
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.fieldGroup} style={{ position: 'relative' }}>
                <label className={styles.label}>Ngày bắt đầu {requiredMark}</label>
                <input
                  className={errors.startDate ? `${styles.input} ${styles.inputError}` : styles.input}
                  type="date"
                  style={{ borderColor: errors.startDate ? '#dc3545' : '#ccc' }}
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                />
                {errors.startDate && <div className={styles.errorTextInline}>{errors.startDate}</div>}
              </div>
              <div className={styles.fieldGroup} style={{ position: 'relative' }}>
                <label className={styles.label}>Ngày kết thúc {requiredMark}</label>
                <input
                  className={errors.endDate ? `${styles.input} ${styles.inputError}` : styles.input}
                  type="date"
                  style={{ borderColor: errors.endDate ? '#dc3545' : '#ccc' }}
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                />
                {errors.endDate && <div className={styles.errorTextInline}>{errors.endDate}</div>}
              </div>
            </div>
            {/* Cột phải */}
            <div className={styles.infoColRight}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Mô tả</label>
                <textarea className={styles.textarea} value={description} onChange={e => setDescription(e.target.value)} rows={4} />
              </div>
              <div className={styles.fieldGroup}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <label className={styles.label}>Tài liệu nghiệp vụ</label>
                  <button
                    type="button"
                    className={styles.uploadIconBtn}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Tải lên tài liệu"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 14V4M10 4L6 8M10 4L14 8" stroke="#1976d2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      <rect x="4" y="15" width="12" height="2" rx="1" fill="#1976d2" />
                    </svg>
                  </button>
                </div>
                <input
                  type="file"
                  className={styles.fileInput}
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <div className={styles.fileListLimited}>
                  {module?.docs?.filter(f => keepFiles.includes(f.publicId)).map(f => (
                    <div key={f.publicId} className={styles.fileItem}>
                      <span className={styles.fileIcon}>📄</span>
                      <span className={styles.fileName} title={f.fileName}>{formatFileName(f.fileName)}</span>
                      <button
                        type="button"
                        className={styles.removeFileBtn}
                        onClick={() => handleRemoveOldFile(f.publicId)}
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
                        onClick={() => handleRemoveNewFile(idx)}
                        title="Xóa file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {module?.docs?.filter(f => keepFiles.includes(f.publicId)).length === 0 && files.length === 0 && (
                    <div className={styles.noFileText}>Chưa chọn file nào</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {errors.submit && (
            <div style={{
              color: '#d32f2f',
              fontWeight: 500,
              fontSize: 14,
              textAlign: 'center',
              padding: '12px',
              margin: '16px 0 8px 0',
              background: '#ffebee',
              borderRadius: 6,
              border: '1px solid #ffcdd2'
            }}>
              {errors.submit}
            </div>
          )}

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={() => { setErrors({}); onClose(); }}>
              Hủy
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              style={{ opacity: loading ? 0.7 : 1, pointerEvents: loading ? 'none' : 'auto' }}
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
        {errorMessage && <div style={{ color: '#d32f2f', fontWeight: 500, marginTop: 2 }}>{errorMessage}</div>}
      </div>
    </div>
  );
};


export default EditModulePopup; 