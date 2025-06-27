import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import SprintDetailSection from './SprintDetailSection';
import { useLocation, useNavigate } from 'react-router-dom';

const SprintSection = ({
  projectId,
  sprints,
  setSprints,
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
  const [loadingSprints, setLoadingSprints] = useState(true);
  const [errorSprints, setErrorSprints] = useState(null);
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [activeSprintSubTab, setActiveSprintSubTab] = useState('info');
  const [currentUser, setCurrentUser] = useState(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const scrollContainerRef = useRef(null);
  
  const location = useLocation();
  const navigate = useNavigate();

  const updateURLWithTab = useCallback((sprintId) => {
    const url = new URL(window.location);
    if (sprintId) {
      url.searchParams.set('tab', sprintId);
    } else {
      url.searchParams.delete('tab');
    }
    navigate(url.pathname + url.search, { replace: true });
  }, [navigate]);

  const getTabFromURL = useCallback(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get('tab');
  }, [location.search]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
        const { scrollLeft, scrollWidth, clientWidth } = container;
        const Epsilon = 1; // Thêm một sai số nhỏ để xử lý lỗi làm tròn của trình duyệt
        setScrollState({
            canScrollLeft: scrollLeft > Epsilon,
            canScrollRight: scrollLeft < scrollWidth - clientWidth - Epsilon,
        });
    };
    
    // Ban đầu và khi sprints thay đổi
    checkScroll();

    // Lắng nghe sự kiện scroll và resize
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
    };
  }, [sprints]);

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

  const refreshSprints = async () => {
    try {
      setLoadingSprints(true);
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
    } catch (error) {
      console.error('Error refreshing sprints:', error);
      setErrorSprints('Có lỗi xảy ra khi tải danh sách sprint');
    } finally {
      setLoadingSprints(false);
    }
  };

  useEffect(() => {
    setLoadingSprints(true);
    const tabFromURL = getTabFromURL();

    if (tabFromURL && sprints.some(sprint => sprint._id === tabFromURL)) {
      setSelectedSprintId(tabFromURL);
    } else if (sprints.length > 0) {
      const today = new Date();
      const currentSprint = sprints.find(sprint => {
        if (!sprint.startDate || !sprint.endDate) return false;
        const startDate = new Date(sprint.startDate);
        const endDate = new Date(sprint.endDate);
        endDate.setHours(23, 59, 59, 999);
        return today >= startDate && today <= endDate;
      });

      if (currentSprint) {
        setSelectedSprintId(currentSprint._id);
        updateURLWithTab(currentSprint._id);
      } else {
        setSelectedSprintId(sprints[0]._id);
        updateURLWithTab(sprints[0]._id);
      }
    } else if (sprints.length === 0) {
      setSelectedSprintId(null);
      updateURLWithTab(null);
    }
    setLoadingSprints(false);
  }, [sprints, location.search, getTabFromURL, updateURLWithTab]);

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
          <div style={styles.sprintTabs}>
            <div style={{ position: 'relative', flex: '1 1 auto', minWidth: 0 }}>
              {scrollState.canScrollLeft && (
                <div style={{...styles.scrollFade, left: 0, background: 'linear-gradient(to right, rgba(255, 255, 255, 1) 20%, rgba(255, 255, 255, 0))'}}></div>
              )}
              <div ref={scrollContainerRef} style={styles.scrollableTabContainer}>
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
              </div>
              {scrollState.canScrollRight && (
                <div style={{...styles.scrollFade, right: 0, background: 'linear-gradient(to left, rgba(255, 255, 255, 1) 20%, rgba(255, 255, 255, 0))'}}></div>
              )}
            </div>
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
