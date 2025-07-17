import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosInstance from '../../api/axios';
import SprintDetailSection from './SprintDetailSection';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './SprintSection.module.css';

const SprintSection = ({
  releaseId,
  sprints,
  setSprints,
  handleOpenNewSprintPopup,
  refreshKey,
  handleCopy,
  copyFeedback,
  getFileIcon,
  formatFileSize,
  handleDownloadSprintDeliverable,
  formatDate,
  getSprintStatusStyle,
  formatDateTime,
  onProjectStatusChange,
  projectMembers,
  onSprintEditSuccess,
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
        const Epsilon = 1;
        setScrollState({
            canScrollLeft: scrollLeft > Epsilon,
            canScrollRight: scrollLeft < scrollWidth - clientWidth - Epsilon,
        });
    };
    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
        container.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
    };
  }, [sprints]);

  useEffect(() => {
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

  // Fetch sprints theo releaseId nếu sprints chưa được truyền vào
  useEffect(() => {
    if (!releaseId) return;
    if (sprints && sprints.length > 0) {
      setLoadingSprints(false);
      return;
    }
    setLoadingSprints(true);
    axiosInstance.get(`/sprints?releaseId=${releaseId}`)
      .then(res => {
        setSprints(res.data);
        setLoadingSprints(false);
      })
      .catch(() => {
        setErrorSprints('Có lỗi xảy ra khi tải danh sách sprint');
        setLoadingSprints(false);
      });
  }, [releaseId, setSprints, sprints]);

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
    <div className={styles.sprintSection}>
      {loadingSprints ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>Đang tải danh sách sprint...</p>
        </div>
      ) : errorSprints ? (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{errorSprints}</p>
        </div>
      ) : sprints.length > 0 ? (
        <div>
          <div className={styles.sprintTabs}>
            <div className={styles.tabContainer}>
              {scrollState.canScrollLeft && (
                <div className={`${styles.scrollFade} ${styles.scrollFadeLeft}`}></div>
              )}
              <div ref={scrollContainerRef} className={styles.scrollableTabContainer}>
                {sprints.map((sprint) => (
                  <button
                    key={sprint._id}
                    className={`${styles.sprintTabButton} ${selectedSprintId === sprint._id ? styles.active : ''}`}
                    onClick={() => handleSprintSelect(sprint._id)}
                  >
                    {sprint.name}
                  </button>
                ))}
              </div>
              {scrollState.canScrollRight && (
                <div className={`${styles.scrollFade} ${styles.scrollFadeRight}`}></div>
              )}
            </div>
            {canManageProject && (
              <button className={styles.addSprintButton} onClick={handleOpenNewSprintPopup}>+ Thêm sprint</button>
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
            activeSprintSubTab={activeSprintSubTab}
            setActiveSprintSubTab={setActiveSprintSubTab}
            onRefreshSprintSection={() => {
              // Refresh toàn bộ danh sách sprint
              if (releaseId) {
                axiosInstance.get(`/sprints/by-release/${releaseId}`)
                  .then(res => setSprints(res.data || []))
                  .catch(() => setSprints([]));
              }
            }}
            currentUser={currentUser}
            formatDateTime={formatDateTime}
            onProjectStatusChange={onProjectStatusChange}
            projectMembers={projectMembers}
            onSprintEditSuccess={onSprintEditSuccess}
          />
        </div>
      ) : (
        canManageProject && <button className={styles.createSprintButton} onClick={handleOpenNewSprintPopup}>Tạo Sprint Mới</button>
      )}
    </div>
  );
};

export default SprintSection;
