import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SprintDetailSection from './SprintDetailSection';
import { useLocation, useNavigate } from 'react-router-dom';

const SprintSection = ({
  projectId,
  handleOpenNewSprintPopup,
  refreshKey,
  styles,
  handleCopy,
  copyFeedback,
  getFileIcon,
  formatFileSize,
  handleDownloadSprintDeliverable,
  formatDate,
  getSprintStatusStyle,
  formatDateTime,
  onProjectStatusChange,
}) => {
  const [sprints, setSprints] = useState([]);
  const [loadingSprints, setLoadingSprints] = useState(true);
  const [errorSprints, setErrorSprints] = useState(null);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [activeSprintSubTab, setActiveSprintSubTab] = useState('info');
  const [currentUser, setCurrentUser] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Lấy thông tin người dùng từ localStorage
    const userData = localStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setCurrentUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const canManageProject = currentUser && (currentUser.role === 'admin' || currentUser.role === 'pm');

  // Hàm cập nhật URL với tab parameter
  const updateURLWithTab = (sprintId) => {
    const url = new URL(window.location);
    if (sprintId) {
      url.searchParams.set('tab', sprintId);
    } else {
      url.searchParams.delete('tab');
    }
    navigate(url.pathname + url.search, { replace: true });
  };

  // Hàm đọc tab từ URL
  const getTabFromURL = () => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('tab');
  };

  const refreshSprints = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found.');
        return;
      }

      const response = await axios.get(`http://localhost:5000/api/sprints?projectId=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSprints(response.data);
      
      // Kiểm tra tab từ URL trước
      const tabFromURL = getTabFromURL();
      if (tabFromURL && response.data.some(sprint => sprint._id === tabFromURL)) {
        setSelectedSprintId(tabFromURL);
      } else if (response.data.length > 0 && !selectedSprintId) {
        // Nếu không có tab trong URL hoặc tab không hợp lệ, chọn sprint đầu tiên
        setSelectedSprintId(response.data[0]._id);
        updateURLWithTab(response.data[0]._id);
      } else if (response.data.length === 0) {
        setSelectedSprintId(null);
        updateURLWithTab(null);
      }
    } catch (error) {
      console.error('Error refreshing sprints:', error);
      setErrorSprints('Có lỗi xảy ra khi tải danh sách sprint');
    } finally {
      setLoadingSprints(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      refreshSprints();
    }
  }, [projectId, refreshKey]);

  // Xử lý khi chọn sprint
  const handleSprintSelect = (sprintId) => {
    setSelectedSprintId(sprintId);
    updateURLWithTab(sprintId);
  };

  const selectedSprint = sprints.find(sprint => sprint._id === selectedSprintId);

  return (
    <div style={styles.sprintSection}>
      <h2 style={{ ...styles.sectionTitle, paddingLeft: '40px' }}>Quản lý Sprint:</h2>
      {loadingSprints ? (
        <div style={styles.loadingContainer}>
          <div style={styles.loadingSpinner}></div>
          <p>Đang tải danh sách sprint...</p>
        </div>
      ) : errorSprints ? (
        <div style={styles.errorContainer}>
          <p style={styles.errorMessage}>{errorSprints}</p>
        </div>
      ) : sprints.length > 0 ? (
        <div>
          <div style={{ ...styles.sprintTabs, paddingLeft: '50px', paddingRight: '50px' }}>
            {sprints.map((sprint) => (
              <button
                key={sprint._id}
                style={{
                  ...styles.sprintTabButton,
                  color: selectedSprintId === sprint._id ? '#007BFF' : styles.sprintTabButton.color,
                  borderBottom: selectedSprintId === sprint._id ? '2px solid #007BFF' : '2px solid transparent',
                }}
                onClick={() => handleSprintSelect(sprint._id)}
              >
                {sprint.name}
              </button>
            ))}
            {canManageProject && (
              <button style={styles.addSprintButton} onClick={handleOpenNewSprintPopup}>+ Thêm sprint</button>
            )}
          </div>

          <SprintDetailSection
            selectedSprint={selectedSprint}
            getSprintStatusStyle={getSprintStatusStyle}
            formatDate={formatDate}
            handleCopy={handleCopy}
            copyFeedback={copyFeedback}
            getFileIcon={getFileIcon}
            formatFileSize={formatFileSize}
            handleDownloadSprintDeliverable={handleDownloadSprintDeliverable}
            styles={styles}
            activeSprintSubTab={activeSprintSubTab}
            setActiveSprintSubTab={setActiveSprintSubTab}
            onRefreshSprintSection={refreshSprints}
            currentUser={currentUser}
            formatDateTime={formatDateTime}
            onProjectStatusChange={onProjectStatusChange}
          />
        </div>
      ) : (
        canManageProject && <button style={styles.createSprintButton} onClick={handleOpenNewSprintPopup}>Tạo Sprint Mới</button>
      )}
    </div>
  );
};

export default SprintSection;
