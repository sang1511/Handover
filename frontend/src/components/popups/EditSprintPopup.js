import React, { useState, useRef } from 'react';
import WarningToast from '../common/WarningToast';
import axiosInstance from '../../api/axios';
import styles from './EditSprintPopup.module.css';

function formatFileName(fileName) {
  if (!fileName) return '';
  if (fileName.length <= 30) return fileName;
  const lastDotIndex = fileName.lastIndexOf('.');
  if (lastDotIndex === -1) return fileName.substring(0, 27) + '...';
  const name = fileName.substring(0, lastDotIndex);
  const extension = fileName.substring(lastDotIndex);
  if (name.length <= 27) return fileName;
  return name.substring(0, 27) + '...' + extension;
}

export default function EditSprintPopup({ open, sprint, onClose, onUpdated, errorMessage }) {
  const [form, setForm] = useState({
    name: sprint?.name || '',
    startDate: sprint?.startDate ? sprint.startDate.slice(0,10) : '',
    endDate: sprint?.endDate ? sprint.endDate.slice(0,10) : '',
    goal: sprint?.goal || '',
    repoLink: sprint?.repoLink || '',
    gitBranch: sprint?.gitBranch || '',
  });
  const [existingFiles, setExistingFiles] = useState(sprint?.docs?.map(f => ({ ...f, publicId: f.publicId })) || []);
  const [newFiles, setNewFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const fileInputRef = useRef();

  // ...existing code...
  const [removeHoverIdx, setRemoveHoverIdx] = useState(-1);
  
  // Reset form khi popup thực sự mở lần đầu
  const wasOpen = useRef(false);
  React.useEffect(() => {
    if (open && !wasOpen.current) {
      setForm({
        name: sprint?.name || '',
        startDate: sprint?.startDate ? sprint.startDate.slice(0,10) : '',
        endDate: sprint?.endDate ? sprint.endDate.slice(0,10) : '',
        goal: sprint?.goal || '',
        repoLink: sprint?.repoLink || '',
        gitBranch: sprint?.gitBranch || '',
      });
      setExistingFiles((sprint?.docs || []).map(f => ({ ...f, publicId: f.publicId })));
      setNewFiles([]);
      setErrors({});
      wasOpen.current = true;
    }
    if (!open) {
      wasOpen.current = false;
    }
  }, [open, sprint?.name, sprint?.startDate, sprint?.endDate, sprint?.goal, sprint?.repoLink, sprint?.gitBranch, sprint?.docs]);
  
  if (!open) return null;

  const handleChange = e => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
    setErrors(errs => ({ ...errs, [e.target.name]: undefined }));
  };
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setNewFiles([...newFiles, ...files]);
    e.target.value = '';
  };

  const handleRemoveFile = (idx) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };
  const handleRemoveExistingFile = (publicId) => {
    setExistingFiles(prev => prev.filter(f => f.publicId !== publicId));
  };
  const handleSubmit = async e => {
    e.preventDefault();
    let newErrors = {};
    if (!form.name.trim()) newErrors.name = 'Vui lòng nhập tên sprint';
    if (!form.startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!form.endDate) newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    if (form.startDate && form.endDate && form.endDate < form.startDate) newErrors.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    // Kiểm tra nếu không thay đổi gì so với dữ liệu gốc
    const isUnchanged =
      form.name === (sprint?.name || '') &&
      form.startDate === (sprint?.startDate ? sprint.startDate.slice(0,10) : '') &&
      form.endDate === (sprint?.endDate ? sprint.endDate.slice(0,10) : '') &&
      form.goal === (sprint?.goal || '') &&
      form.repoLink === (sprint?.repoLink || '') &&
      form.gitBranch === (sprint?.gitBranch || '') &&
      JSON.stringify(existingFiles.map(f => f.publicId)) === JSON.stringify((sprint?.docs || []).map(f => f.publicId)) &&
      newFiles.length === 0;
    if (isUnchanged) {
      setShowWarning(true);
      return;
    } else {
      setSubmitError('');
    }
    setLoading(true);
    try {
      // Create FormData with all data
      const formData = new FormData();
      formData.append('name', form.name);
      formData.append('goal', form.goal);
      formData.append('startDate', form.startDate);
      formData.append('endDate', form.endDate);
      formData.append('repoLink', form.repoLink);
      formData.append('gitBranch', form.gitBranch);
      
      // Add keepFiles (existing files to keep)
      const keepFileIds = existingFiles.map(f => f.publicId);
      formData.append('keepFiles', JSON.stringify(keepFileIds));
      
      // Add new files
      newFiles.forEach(f => formData.append('docs', f));
      
      // Update sprint with all data in one request
      await axiosInstance.put(`/sprints/${sprint._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      onUpdated && onUpdated();
    } catch (e) {
      setErrors({ submit: e?.response?.data?.message || 'Có lỗi xảy ra!' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className={styles.overlay}>
      <form className={styles.popup} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className={styles.headerSection}>
          <WarningToast
            show={showWarning}
            message="Bạn chưa thay đổi thông tin nào!"
            onClose={() => setShowWarning(false)}
          />
          <h2 className={styles.title}>Chỉnh sửa Sprint</h2>
        </div>
        <div className={styles.form}>
          <div className={styles.infoGrid}>
            {/* Cột trái */}
            <div className={styles.infoColLeft}>
              <div className={styles.fieldGroup + ' ' + styles.relative}>
                <label className={styles.label}>Tên Sprint <span className={styles.requiredMark}>*</span></label>
                <input
                  type="text"
                  className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                  placeholder="VD: Sprint 1 - Tích hợp thanh toán"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  autoFocus
                />
                {errors.name && <div className={styles.inputErrorMsg}>{errors.name}</div>}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Link Repository</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="URL của Repository"
                  name="repoLink"
                  value={form.repoLink}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Git Branch</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="VD: feature/sprint-1-payment"
                  name="gitBranch"
                  value={form.gitBranch}
                  onChange={handleChange}
                />
              </div>
              <div className={styles.dateRow}>
                <div className={styles.dateCol + ' ' + styles.relative}>
                  <label className={styles.label}>Ngày bắt đầu <span className={styles.requiredMark}>*</span></label>
                  <input
                    type="date"
                    className={`${styles.input} ${errors.startDate ? styles.inputError : ''}`}
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                  />
                  {errors.startDate && <div className={styles.error}>{errors.startDate}</div>}
                </div>
                <div className={styles.dateCol + ' ' + styles.relative}>
                  <label className={styles.label}>Ngày kết thúc <span className={styles.requiredMark}>*</span></label>
                  <input
                    type="date"
                    className={`${styles.input} ${errors.endDate ? styles.inputError : ''}`}
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                  />
                  {errors.endDate && <div className={styles.error}>{errors.endDate}</div>}
                </div>
              </div>
            </div>
            {/* Cột phải */}
            <div className={styles.infoColRight}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Mục tiêu sprint</label>
                <textarea
                  className={styles.textarea}
                  placeholder="Mô tả ngắn gọn mục tiêu cần đạt được trong Sprint này"
                  name="goal"
                  value={form.goal}
                  onChange={handleChange}
                  rows={8}
                ></textarea>
              </div>
              <div className={styles.gridItemFiles}>
                <div className={styles.flexRowFiles}>
                  <label className={styles.label}>Tài liệu sprint</label>
                  <button
                    type="button"
                    className={styles.uploadIconBtn}
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    title="Tải lên tài liệu"
                  >
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 14V4M10 4L6 8M10 4L14 8" stroke="#1976d2" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="4" y="15" width="12" height="2" rx="1" fill="#1976d2"/>
                    </svg>
                  </button>
                  <input
                    type="file"
                    className={styles.hiddenFileInput}
                    multiple
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                </div>
                <div className={styles.fileListLimited}>
                  {/* Hiện file cũ */}
                  {existingFiles.length > 0 && existingFiles.map((file, idx) => (
                    <div key={file.publicId || idx} className={styles.fileItem}>
                      <span className={styles.fileIcon}>📄</span>
                      <span className={styles.fileName} title={file.fileName}>{formatFileName(file.fileName)}</span>
                      <button
                        type="button"
                        className={styles.removeFileBtn + (removeHoverIdx === idx ? ' ' + styles.removeFileBtnHover : '')}
                        onMouseEnter={() => setRemoveHoverIdx(idx)}
                        onMouseLeave={() => setRemoveHoverIdx(-1)}
                        onClick={() => handleRemoveExistingFile(file)}
                        title="Xóa file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {/* Hiện file mới */}
                  {newFiles.length > 0 && newFiles.map((file, idx) => (
                    <div key={idx} className={styles.fileItem}>
                      <span className={styles.fileIcon}>🆕</span>
                      <span className={styles.fileName} title={file.name}>{formatFileName(file.name)}</span>
                      <button
                        type="button"
                        className={styles.removeFileBtn + (removeHoverIdx === idx + existingFiles.length ? ' ' + styles.removeFileBtnHover : '')}
                        onMouseEnter={() => setRemoveHoverIdx(idx + existingFiles.length)}
                        onMouseLeave={() => setRemoveHoverIdx(-1)}
                        onClick={() => handleRemoveFile(idx)}
                        title="Xóa file"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {existingFiles.length === 0 && newFiles.length === 0 && (
                    <div className={styles.noFileText}>Chưa có tài liệu nào</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {errors.submit && <div className={styles.inputErrorMsg}>{errors.submit}</div>}
          {errorMessage && <div className={styles.inputErrorMsg}>{errorMessage}</div>}
          {submitError && (
            <div className={styles.inputErrorMsg}>
              {submitError}
            </div>
          )}
          <div className={styles.actions}>
            <button type="button"
              className={styles.cancelBtn}
              onClick={() => { setErrors({}); setSubmitError(''); onClose(); }}
              disabled={loading}>
              Hủy
            </button>
            <button type="submit"
              className={styles.submitBtn}
              disabled={loading}
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
} 