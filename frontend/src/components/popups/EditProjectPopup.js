import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import styles from './EditProjectPopup.module.css';

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

const EditProjectPopup = ({ open, onClose, project, onSubmit, membersList, errorMessage, loading }) => {
  const [name, setName] = useState(project?.name || '');
  const [version, setVersion] = useState(project?.version || '');
  const [startDate, setStartDate] = useState(formatDateInput(project?.startDate));
  const [endDate, setEndDate] = useState(formatDateInput(project?.endDate));
  const [description, setDescription] = useState(project?.description || '');
  const [members] = useState(project?.members?.map(m => m.user?._id) || []);
  const [files, setFiles] = useState([]); // new files
  const [newFiles, setNewFiles] = useState([]);
  const [keepFiles, setKeepFiles] = useState(project?.overviewDocs?.map(f => f.publicId) || []);
  const [errors, setErrors] = useState({});
  const fileInputRef = useRef();
  const requiredMark = <span className={styles.requiredMark}>*</span>;

  useEffect(() => {
    if (open) {
      setName(project?.name || '');
      setVersion(project?.version || '');
      setStartDate(formatDateInput(project?.startDate));
      setEndDate(formatDateInput(project?.endDate));
      setDescription(project?.description || '');
      setFiles([]);
      setNewFiles([]);
      setKeepFiles(project?.overviewDocs?.map(f => f.publicId) || []);
      setErrors({});
      // Nếu có setMembers thì reset lại members ở đây
    }
  }, [open, project]);

  if (!open) return null;

  const handleFileChange = (e) => {
    setNewFiles([...newFiles, ...Array.from(e.target.files)]);
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
    if (!name.trim()) newErrors.name = 'Vui lòng nhập tên dự án';
    if (!version.trim()) newErrors.version = 'Vui lòng nhập phiên bản';
    if (!startDate) newErrors.startDate = 'Vui lòng chọn ngày bắt đầu';
    if (!endDate) newErrors.endDate = 'Vui lòng chọn ngày kết thúc';
    // Kiểm tra không thay đổi gì
    const isUnchanged =
      name === project?.name &&
      version === project?.version &&
      startDate === formatDateInput(project?.startDate) &&
      endDate === formatDateInput(project?.endDate) &&
      description === (project?.description || '') &&
      JSON.stringify(keepFiles) === JSON.stringify(project?.overviewDocs?.map(f => f.publicId) || []) &&
      files.length === 0;
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    if (isUnchanged) {
      toast.warning('Bạn chưa thay đổi thông tin nào!');
      return;
    }
    const formData = new FormData();
    formData.append('name', name);
    formData.append('version', version);
    formData.append('startDate', startDate);
    formData.append('endDate', endDate);
    formData.append('description', description);
    formData.append('keepFiles', JSON.stringify(keepFiles));
    members.forEach((m, idx) => {
      formData.append(`members[${idx}][user]`, m);
    });
    files.forEach(f => {
      formData.append('overviewDocs', f);
    });
    onSubmit(formData);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.headerSection}>
          <h2 className={styles.title}>Chỉnh sửa dự án</h2>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Phần trên: Thông tin cơ bản */}
          <div className={styles.infoGrid}>
            {/* Cột trái */}
            <div className={styles.infoColLeft}>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tên dự án {requiredMark}</label>
                <input
  className={errors.name ? `${styles.input} ${styles.inputError}` : styles.input}
  value={name}
  onChange={e => {
    setName(e.target.value);
    if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
  }}
/>
                {errors.name && <div className={styles.errorTextInline}>{errors.name}</div>}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Phiên bản {requiredMark}</label>
                <input 
                  className={errors.version ? `${styles.input} ${styles.inputError}` : styles.input}
                  value={version} 
                  onChange={e => {
                    setVersion(e.target.value);
                    if (errors.version) setErrors(prev => ({ ...prev, version: '' }));
                  }}
                />
                {errors.version && <div className={styles.errorTextInline}>{errors.version}</div>}
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Ngày bắt đầu {requiredMark}</label>
                <input 
                  className={errors.startDate ? `${styles.input} ${styles.inputError}` : styles.input}
                  type="date" 
                  value={startDate} 
                  onChange={e => {
                    setStartDate(e.target.value);
                    if (errors.startDate) setErrors(prev => ({ ...prev, startDate: '' }));
                  }}
                />
                {errors.startDate && <div className={styles.errorTextInline}>{errors.startDate}</div>}
              </div>
              <div className={styles.fieldGroup} style={{position: 'relative'}}>
                <label className={styles.label}>Ngày kết thúc {requiredMark}</label>
                <input 
                  className={errors.endDate ? `${styles.input} ${styles.inputError}` : styles.input}
                  type="date" 
                  value={endDate} 
                  onChange={e => {
                    setEndDate(e.target.value);
                    if (errors.endDate) setErrors(prev => ({ ...prev, endDate: '' }));
                  }}
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
                <div className={styles.fileUploadLabelRow}>
                  <label className={styles.label}>Tài liệu tổng quan</label>
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
                </div>
                <input
                  type="file"
                  style={{ display: 'none' }}
                  multiple
                  ref={fileInputRef}
                  onChange={handleFileChange}
                />
                <div className={styles.fileListLimited}>
                  {project?.overviewDocs?.filter(f => keepFiles.includes(f.publicId)).map(f => (
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
                  {project?.overviewDocs?.filter(f => keepFiles.includes(f.publicId)).length === 0 && files.length === 0 && (
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
  <button
    type="button"
    className={styles.cancelBtn}
    onClick={() => { setErrors({}); onClose(); }}
    disabled={loading}
  >
    Hủy
  </button>
  <button
    type="submit"
    className={styles.submitBtn}
    disabled={loading}
  >
    {loading ? 'Đang lưu...' : 'Lưu'}
  </button>
</div>
        </form>
        {errorMessage && <div style={{color:'#d32f2f', fontWeight:500, marginTop:2}}>{errorMessage}</div>}
      </div>
    </div>
  );
};

export default EditProjectPopup; 