import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import NewSprintPopup from '../components/NewSprintPopup';
import ProjectOverview from '../components/ProjectOverview';
import SprintSection from '../components/SprintSection';
import CopyToast from '../components/common/CopyToast';
import socketManager from '../utils/socket';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isNewSprintPopupOpen, setIsNewSprintPopupOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState({ show: false, message: '' });
  const [sprintRefreshKey, setSprintRefreshKey] = useState(0);

  useEffect(() => {
    const fetchProjectDetail = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await axios.get(`http://localhost:5000/api/projects/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setProject(response.data);
        setError(null);
      } catch (error) {
        console.error('Error fetching project details:', error);
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          setError('Có lỗi xảy ra khi tải thông tin dự án');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetail();
  }, [id, navigate]);

  useEffect(() => {
    // Listener for real-time project updates
    const handleProjectUpdate = (data) => {
        if (data.type === 'project_updated' && data.payload?._id === id) {
            setProject(data.payload);
        }
    };

    socketManager.on('notification', handleProjectUpdate);

    return () => {
      socketManager.off('notification', handleProjectUpdate);
    };
  }, [id]); // Re-subscribe if project ID changes

  // Hàm mới: refreshProject để gọi lại API lấy project
  const refreshProject = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await axios.get(`http://localhost:5000/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProject(response.data);
    } catch (error) {
      // Không alert, chỉ log
      console.error('Error refreshing project:', error);
    }
  };

  const getStatusStyle = (status) => {
    const statusStyles = {
      'Khởi tạo': { backgroundColor: '#FFC107', color: '#fff' }, // Yellow
      'Đang thực hiện': { backgroundColor: '#007BFF', color: '#fff' }, // Blue
      'Hoàn thành': { backgroundColor: '#28A745', color: '#fff' }, // Green
      'Hủy': { backgroundColor: '#DC3545', color: '#fff' }, // Red
    };
    return {
      padding: '6px 12px',
      borderRadius: '20px',
      fontWeight: 'bold',
      fontSize: '0.95em',
      ...statusStyles[status],
    };
  };

  const getSprintStatusStyle = (status) => {
    const statusStyles = {
      'Chưa bắt đầu': { backgroundColor: '#FFC107', color: '#fff' }, // Yellow
      'Đang chạy': { backgroundColor: '#007BFF', color: '#fff' }, // Blue
      'Đã kết thúc': { backgroundColor: '#28A745', color: '#fff' }, // Green
    };
    return {
      padding: '6px 12px',
      borderRadius: '20px',
      fontWeight: 'bold',
      fontSize: '0.95em',
      ...statusStyles[status],
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) + ' ' + 
           date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
      case 'zip':
        return <img src="https://img.icons8.com/ios-filled/24/000000/zip.png" alt="zip icon" style={styles.fileCardIcon}/>;
      case 'pdf':
        return <img src="https://img.icons8.com/ios-filled/24/000000/pdf.png" alt="pdf icon" style={styles.fileCardIcon}/>;
      case 'doc':
      case 'docx':
        return <img src="https://img.icons8.com/ios-filled/24/000000/microsoft-word-2019.png" alt="word icon" style={styles.fileCardIcon}/>;
      case 'xls':
      case 'xlsx':
        return <img src="https://img.icons8.com/ios-filled/24/000000/microsoft-excel-2019.png" alt="excel icon" style={styles.fileCardIcon}/>;
      case 'ppt':
      case 'pptx':
        return <img src="https://img.icons8.com/ios-filled/24/000000/microsoft-powerpoint-2019.png" alt="powerpoint icon" style={styles.fileCardIcon}/>;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <img src="https://img.icons8.com/ios-filled/24/000000/image.png" alt="image icon" style={styles.fileCardIcon}/>;
      default:
        return <img src="https://img.icons8.com/ios-filled/24/000000/document.png" alt="document icon" style={styles.fileCardIcon}/>;
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/projects/${id}/download?fileId=${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Có lỗi xảy ra khi tải xuống file');
    }
  };

  const handleDownloadSprintDeliverable = async (sprintId, fileId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:5000/api/sprints/${sprintId}/download-deliverable?fileId=${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading sprint deliverable:', error);
      alert('Có lỗi xảy ra khi tải xuống tài liệu sprint');
    }
  };

  const handleOpenNewSprintPopup = () => {
    setIsNewSprintPopupOpen(true);
  };

  const handleCloseNewSprintPopup = () => {
    setIsNewSprintPopupOpen(false);
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopyFeedback({ show: true, message: 'Đã sao chép!' });
        setTimeout(() => setCopyFeedback({ show: false, message: '' }), 2000);
      })
      .catch(err => {
        console.error('Không thể sao chép: ', err);
        setCopyFeedback({ show: true, message: 'Không thể sao chép.' });
        setTimeout(() => setCopyFeedback({ show: false, message: '' }), 2000);
      });
  };

  const triggerSprintSectionRefresh = () => {
    setSprintRefreshKey(prevKey => prevKey + 1);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}></div>
        <p>Đang tải thông tin dự án...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorMessage}>{error}</p>
        <button
          style={styles.backButton}
          onClick={() => navigate('/projects')}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={styles.errorContainer}>
        <p style={styles.errorMessage}>Không tìm thấy thông tin dự án</p>
        <button
          style={styles.backButton}
          onClick={() => navigate('/projects')}
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <CopyToast show={copyFeedback.show} message={copyFeedback.message} onClose={() => setCopyFeedback({ show: false, message: '' })} />
      <ProjectOverview 
        project={project} 
        getStatusStyle={getStatusStyle} 
        formatDate={formatDate} 
        styles={styles} 
        handleCopy={handleCopy}
        copyFeedback={copyFeedback}
        files={project.files}
        getFileIcon={getFileIcon}
        formatFileSize={formatFileSize}
        handleDownloadFile={handleDownloadFile}
      />

      <SprintSection
        projectId={id}
        handleOpenNewSprintPopup={handleOpenNewSprintPopup}
        refreshKey={sprintRefreshKey}
        styles={styles}
        handleCopy={handleCopy}
        copyFeedback={copyFeedback}
        getFileIcon={getFileIcon}
        formatFileSize={formatFileSize}
        handleDownloadSprintDeliverable={handleDownloadSprintDeliverable}
        formatDate={formatDate}
        getSprintStatusStyle={getSprintStatusStyle}
        formatDateTime={formatDateTime}
        onProjectStatusChange={refreshProject}
      />

      <NewSprintPopup 
        isOpen={isNewSprintPopupOpen} 
        onClose={handleCloseNewSprintPopup} 
        projectId={id} 
        onSprintCreated={triggerSprintSectionRefresh}
      />
    </div>
  );
};

const styles = {
  container: {
    paddingTop: '40px',
    paddingBottom: '40px',
    maxWidth: '100%',
    margin: '0px 0px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
    fontFamily: 'Arial, sans-serif',
  },
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #eee',
    flexWrap: 'wrap',
    gap: '20px',
  },
  projectName: {
    fontSize: '2.2em',
    fontWeight: 'bold',
    color: '#D9534F',
    margin: 0,
  },
  statusDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusLabel: {
    fontSize: '1.1em',
    fontWeight: 'bold',
    color: '#333',
  },
  infoGridContainer: {
    display: 'flex',
    gap: '40px',
    marginBottom: '30px',
    flexWrap: 'wrap',
  },
  infoColumn: {
    flex: '1',
    minWidth: '350px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1.1em',
    color: '#333',
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#555',
    minWidth: '150px',
  },
  link: {
    color: '#007BFF',
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  attachedFilesSection: {
    marginTop: '30px',
    paddingTop: '20px',
    borderTop: '1px solid #eee',
  },
  attachedFilesTitle: {
    fontSize: '1.5em',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '20px',
  },
  fileListContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
  },
  fileItemCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '10px 15px',
    width: 'calc(33.33% - 13.33px)',
    boxSizing: 'border-box',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
    transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
    '&:hover': {
      transform: 'translateY(-3px)',
      boxShadow: '0 5px 15px rgba(0, 0, 0, 0.08)',
    },
  },
  fileContentLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  fileCardIcon: {
    width: '24px',
    height: '24px',
  },
  fileTextDetails: {
    display: 'flex',
    flexDirection: 'column',
    paddingLeft: '10px',
    justifyContent: 'center',
  },
  fileCardName: {
    fontWeight: 'bold',
    color: '#333',
    fontSize: '0.9em',
  },
  fileCardSize: {
    fontSize: '0.75em',
    color: '#777',
  },
  fileCardDetails: {
    fontSize: '0.75em',
    color: '#777',
  },
  fileCardDownloadButton: {
    background: 'none',
    border: '1px solid #e0e0e0',
    cursor: 'pointer',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    transition: 'background-color 0.3s ease',
    '&:hover': {
      backgroundColor: '#f0f0f0',
    },
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    fontSize: '1.2em',
    color: '#555',
  },
  loadingSpinner: {
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #3498db',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    marginBottom: '20px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '80vh',
    padding: '20px',
    textAlign: 'center',
  },
  errorMessage: {
    color: '#DC3545',
    fontSize: '1.3em',
    marginBottom: '20px',
  },
  backButton: {
    backgroundColor: '#007BFF',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
  },
  sprintSection: {
    paddingTop: '30px',
    borderTop: '1px solid #eee',
  },
  sectionTitle: {
    fontSize: '1.8em',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '25px',
  },
  subSectionTitle: {
    fontSize: '1.4em',
    fontWeight: 'bold',
    color: '#555',
    marginBottom: '15px',
    marginTop: '25px',
  },
  sprintTabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '2px solid #ddd',
    paddingBottom: '5px',
    overflowX: 'auto',
    whiteSpace: 'nowrap',
  },
  sprintTabButton: {
    padding: '10px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '1.1em',
    fontWeight: 'bold',
    color: '#555',
    borderBottom: '2px solid transparent',
    transition: 'all 0.3s ease',
    '&:hover': {
      color: '#007BFF',
    },
  },
  addSprintButton: {
    backgroundColor: '#007BFF',
    color: '#fff',
    padding: '8px 15px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95em',
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  createSprintButton: {
    backgroundColor: '#28A745',
    color: '#fff',
    padding: '15px 30px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1.2em',
    fontWeight: 'bold',
    marginTop: '20px',
    display: 'block',
    margin: '20px auto',
  },
  sprintContent: {
    backgroundColor: '#f9f9f9',
    borderRadius: '8px',
    padding: '25px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
  },
  sprintDetailTabs: {
    display: 'flex',
    gap: '15px',
    marginBottom: '20px',
    borderBottom: '1px solid #eee',
    paddingBottom: '10px',
  },
  sprintDetailTabButton: {
    padding: '8px 15px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
    color: '#777',
    borderBottom: '2px solid transparent',
    transition: 'all 0.3s ease',
    '&:hover': {
      color: '#007BFF',
    },
  },
  sprintInfoGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px',
  },
  sprintInfoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '1em',
    color: '#333',
  },
  sprintInfoLabel: {
    fontWeight: 'bold',
    color: '#555',
    minWidth: '120px',
  },
  sprintInfoValue: {
    wordBreak: 'break-all',
  },
  pullRequestContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    flexWrap: 'wrap',
  },
  copyButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
    '&:hover': {
      backgroundColor: '#e0e0e0',
    },
  },
  copyFeedback: {
    fontSize: '0.8em',
    color: '#28a745',
    marginLeft: '10px',
    whiteSpace: 'nowrap',
  },
  uploadDocumentButton: {
    backgroundColor: '#DC3545',
    color: '#fff',
    padding: '12px 25px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
    marginTop: '20px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    '&:hover': {
      backgroundColor: '#C82333',
      transform: 'translateY(-2px)',
    },
  },
  fileUploadControl: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginTop: '20px',
    flexWrap: 'wrap',
  },
  uploadFileNameDisplay: {
    flexGrow: 1,
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    color: '#555',
    backgroundColor: '#f9f9f9',
    minWidth: '150px',
  },
  uploadConfirmButton: {
    backgroundColor: '#28A745',
    color: '#fff',
    padding: '8px 15px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.95em',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    '&:hover': {
      backgroundColor: '#218838',
      transform: 'translateY(-1px)',
    },
  },
  taskTableContainer: {
    width: '100%',
    overflowX: 'auto',
    marginTop: '20px',
  },
  taskTable: {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: '#fff',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  taskTableHeader: {
    backgroundColor: '#f8f9fa',
    padding: '12px 5px',
    textAlign: 'left',
    fontWeight: 'bold',
    color: '#333',
    borderBottom: '2px solid #dee2e6',
    whiteSpace: 'nowrap',
  },
  taskTableRow: {
    borderBottom: '1px solid #dee2e6',
    '&:hover': {
      backgroundColor: '#f8f9fa',
    },
  },
  taskTableCell: {
    padding: '12px 5px',
    color: '#333',
    borderBottom: '1px solid #dee2e6',
    whiteSpace: 'normal',
  },
  taskIDColumn: { width: '60px', minWidth: '60px', textAlign: 'center' },
  taskNameColumn: {
    width: '20%',
    minWidth: '160px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  taskPersonColumn: { width: '90px', minWidth: '90px', textAlign: 'center' },
  taskStatusColumn: { width: '70px', minWidth: '70px', textAlign: 'center' },
  taskResultColumn: { width: '60px', minWidth: '60px', textAlign: 'center' },
  taskActionColumn: { width: '110px', minWidth: '110px', textAlign: 'center' },
  taskStatusPending: {
    fontWeight: 'bold',
    color: '#6C757D',
    backgroundColor: '#F0F0F0',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8em',
    display: 'inline-block',
    textAlign: 'center',
  },
  taskStatusInProgress: {
    fontWeight: 'bold',
    color: '#FFA000',
    backgroundColor: '#FFF3E0',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8em',
    display: 'inline-block',
    textAlign: 'center',
  },
  taskStatusDone: {
    fontWeight: 'bold',
    color: '#28A745',
    backgroundColor: '#E6F4EA',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8em',
    display: 'inline-block',
    textAlign: 'center',
  },
  reviewResultPending: {
    fontWeight: 'bold',
    color: '#6C757D',
    backgroundColor: '#F0F0F0',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8em',
    display: 'inline-block',
    textAlign: 'center',
  },
  reviewResultApproved: {
    fontWeight: 'bold',
    color: '#28A745',
    backgroundColor: '#E6F4EA',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8em',
    display: 'inline-block',
    textAlign: 'center',
  },
  reviewResultRejected: {
    fontWeight: 'bold',
    color: '#DC3545',
    backgroundColor: '#FCEBEB',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '0.8em',
    display: 'inline-block',
    textAlign: 'center',
  },
  headerControlsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '15px',
  },
  searchAndFiltersWrapper: {
    display: 'flex',
    gap: '10px',
    flex: '1',
    minWidth: '400px',
  },
  searchInputWrapper: {
    position: 'relative',
    flex: '1',
    minWidth: '250px',
  },
  searchInputField: {
    width: '100%',
    padding: '8px 10px 8px 35px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '0.95em',
    height: '40px',
  },
  searchIconStyle: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    width: '16px',
    height: '16px',
    opacity: '0.6',
  },
  filterDropdownStyle: {
    width: '180px',
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid #ccc',
    fontSize: '0.95em',
    height: '40px',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  addTaskButton: {
    backgroundColor: '#DC3545',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    whiteSpace: 'nowrap',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    '&:hover': {
      backgroundColor: '#C82333',
      transform: 'translateY(-2px)',
    },
  },
  notesSection: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  noteInput: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: '1em',
    boxSizing: 'border-box',
    minHeight: '100px',
    resize: 'vertical',
  },
  saveNoteButton: {
    backgroundColor: '#007BFF',
    color: '#fff',
    padding: '10px 20px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: 'bold',
    transition: 'background-color 0.3s ease, transform 0.2s ease',
    '&:hover': {
      backgroundColor: '#0056b3',
      transform: 'translateY(-2px)',
    },
  },
  noteListContainer: {
    marginTop: '30px',
    borderTop: '1px solid #eee',
    paddingTop: '20px',
  },
  noteItem: {
    backgroundColor: '#f9f9f9',
    border: '1px solid #eee',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    boxShadow: '0 1px 5px rgba(0,0,0,0.02)',
  },
  noteContent: {
    fontSize: '1em',
    color: '#333',
    marginBottom: '10px',
    lineHeight: '1.5',
  },
  noteMeta: {
    fontSize: '0.85em',
    color: '#777',
    textAlign: 'right',
    borderTop: '1px dashed #eee',
    paddingTop: '8px',
    marginTop: '8px',
  },
  noNotesMessage: {
    textAlign: 'center',
    padding: '20px',
    color: '#777',
    fontSize: '1.1em',
  },
  historySection: {
    padding: '20px',
    backgroundColor: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
  },
  historyListContainer: {
    marginTop: '20px',
  },
  historyItem: {
    marginBottom: '15px',
    padding: '12px 15px',
    backgroundColor: '#f9f9f9',
    border: '1px solid #eee',
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
  },
  historyContent: {
    fontSize: '0.95em',
    color: '#333',
    lineHeight: '1.4',
  },
  historyTimestamp: {
    fontWeight: 'bold',
    color: '#555',
    marginRight: '8px',
  },
  historyUser: {
    fontWeight: 'bold',
    color: '#007BFF',
    marginRight: '8px',
  },
  historyAction: {
    fontWeight: '600',
    color: '#333',
  },
  historyTaskInfo: {
    fontStyle: 'italic',
    color: '#666',
    marginLeft: '5px',
  },
  historyField: {
    fontWeight: '500',
    color: '#444',
  },
  historyChange: {
    fontWeight: '500',
    color: '#DC3545',
  },
  noHistoryMessage: {
    textAlign: 'center',
    padding: '20px',
    color: '#777',
    fontSize: '1.1em',
  },
};

export default ProjectDetail; 