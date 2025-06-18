import React from 'react';

const ProjectOverview = ({ project, getStatusStyle, formatDate, styles }) => {
  return (
    <div style={{ paddingLeft: '80px', paddingRight: '80px' }}>
      <div style={styles.topSection}>
        <h1 style={styles.projectName}>{project.name}</h1>
        <div style={styles.statusDisplay}>
          <span style={styles.statusLabel}>Trạng thái:</span>
          <span style={getStatusStyle(project.status)}>{project.status}</span>
        </div>
      </div>

      <div style={styles.infoGridContainer}>
        <div style={styles.infoColumn}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Người giao:</span>
            <span style={styles.infoValue}>{project.createdBy?.name || 'N/A'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Người nhận:</span>
            <span style={styles.infoValue}>{project.handedOverTo?.name || 'N/A'}</span>
          </div>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Sprint hiện tại:</span>
            <span style={styles.infoValue}></span>
          </div>
        </div>

        <div style={styles.infoColumn}>
          <div style={styles.infoRow}>
            <span style={styles.infoLabel}>Thời gian:</span>
            <span style={styles.infoValue}>{`${formatDate(project.createdAt)} - ${formatDate(project.deadline)}`}</span>
          </div>
          {project.pullRequest && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Pull Request:</span>
              <div style={styles.pullRequestContainer}>
                <a
                  href={project.pullRequest}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.link}
                >
                  {project.pullRequest.length > 40 ? 
                    project.pullRequest.substring(0, 37) + '...' : 
                    project.pullRequest
                  }
                </a>
                <button onClick={() => console.log('Copying PR: ' + project.pullRequest)} style={styles.copyButton}>
                  <img src="https://img.icons8.com/ios-filled/15/000000/copy.png" alt="copy icon" />
                </button>
                {/* Copy feedback will be handled in parent or passed down if needed */}
              </div>
            </div>
          )}
          {project.gitBranch && (
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Branch:</span>
              <span style={styles.infoValue}>{project.gitBranch}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectOverview; 