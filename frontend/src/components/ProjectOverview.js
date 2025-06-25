import React, { useState, useEffect } from 'react';
import CopyToast from './common/CopyToast';

const infoRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '18px',
  marginBottom: '22px',
  fontSize: '1.13rem',
  minHeight: '38px',
};
const infoLabelStyle = {
  fontWeight: 500,
  color: '#7b8ca6',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  minWidth: 120,
};
const infoValueStyle = {
  color: '#222',
  textAlign: 'left',
  fontWeight: 600,
  fontSize: '1.09em',
  wordBreak: 'break-all',
};
const badgeStyle = {
  display: 'inline-block',
  padding: '6px 18px',
  borderRadius: '16px',
  fontWeight: 700,
  fontSize: '1.08em',
  background: '#e3e9f7',
  color: '#2d3a4a',
  marginLeft: '8px',
  letterSpacing: 0.5,
};
const badgeActive = { background: '#e0f7e9', color: '#219653' };
const badgePending = { background: '#fff8e1', color: '#bfa100' };
const badgeClosed = { background: '#ffebee', color: '#d32f2f' };
const linkStyle = {
  color: '#007BFF',
  textDecoration: 'none',
  fontWeight: 600,
  transition: 'text-decoration 0.2s',
  maxWidth: 220,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  display: 'inline-block',
  verticalAlign: 'middle',
};
const linkHoverStyle = { textDecoration: 'underline' };
const copyBtnStyle = {
  marginLeft: 8,
  background: '#e3e9f7',
  borderRadius: '50%',
  border: 'none',
  padding: 8,
  cursor: 'pointer',
  transition: 'background 0.2s, transform 0.1s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const ProjectOverview = ({ project, sprints, getStatusStyle, formatDate, styles, files, getFileIcon, formatFileSize, handleDownloadFile, handleCopy }) => {
  const [linkHover, setLinkHover] = useState(false);

  useEffect(() => {
    // console.log('ProjectOverview: received new project props:', project);
  }, [project]);

  // Find the current sprint
  const findCurrentSprint = () => {
    if (!sprints || sprints.length === 0) {
      return null;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const currentSprint = sprints.find(sprint => {
      const startDate = new Date(sprint.startDate);
      const endDate = new Date(sprint.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      return today >= startDate && today <= endDate;
    });

    return currentSprint;
  };

  const currentSprint = findCurrentSprint();

  // Badge màu theo trạng thái
  const getBadge = (status) => {
    if (status === 'Đang thực hiện' || status === 'Đang chạy') return { ...badgeStyle, ...badgeActive };
    if (status === 'Chưa bắt đầu') return { ...badgeStyle, ...badgePending };
    if (status === 'Đã kết thúc' || status === 'Đã đóng') return { ...badgeStyle, ...badgeClosed };
    return badgeStyle;
  };

  const fileListContainerStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
    gap: 24,
  };

  if (files && files.length > 6) {
    fileListContainerStyle.maxHeight = '200px';
    fileListContainerStyle.overflowY = 'auto';
    fileListContainerStyle.paddingRight = '12px';
  }

  return (
    <div style={{ padding: '0 0 32px 0', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(44,62,80,0.10)',
        padding: '38px 38px 32px 38px',
        margin: '32px 0',
        maxWidth: 1100,
        marginLeft: 'auto',
        marginRight: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 32,
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <h1 style={{ fontSize: '2.3em', fontWeight: 800, color: '#DC3545', margin: 0, flex: 1, minWidth: 220, fontFamily: 'Segoe UI, Arial, Helvetica, sans-serif', letterSpacing: 0.5 }}>{project.name}</h1>
          <span style={getBadge(project.status)}>{project.status}</span>
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 32,
          marginTop: 8,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Người giao:</span>
              <span style={infoValueStyle}>{project.createdBy?.name || 'N/A'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Người nhận:</span>
              <span style={infoValueStyle}>{project.handedOverTo?.name || 'N/A'}</span>
            </div>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}>Sprint hiện tại:</span>
              <span style={infoValueStyle}>{currentSprint ? currentSprint.name : 'Không có'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div style={infoRowStyle}>
              <span style={infoLabelStyle}><img src="https://img.icons8.com/ios-filled/22/FFA726/calendar--v1.png" alt="calendar" style={{marginRight: 8}}/>Thời gian:</span>
              <span style={infoValueStyle}>{`${formatDate(project.createdAt)} - ${formatDate(project.deadline)}`}</span>
            </div>
            {project.pullRequest && (
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}><img src="https://img.icons8.com/ios-filled/22/00ACC1/pull-request.png" alt="pr" style={{marginRight: 8}}/>Pull Request:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <a
                    href={project.pullRequest}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkHover ? { ...linkStyle, ...linkHoverStyle } : linkStyle}
                    onMouseEnter={() => setLinkHover(true)}
                    onMouseLeave={() => setLinkHover(false)}
                  >
                    {project.pullRequest.length > 40 ?
                      project.pullRequest.substring(0, 37) + '...' :
                      project.pullRequest
                    }
                  </a>
                  <button
                    onClick={() => handleCopy(project.pullRequest)}
                    style={copyBtnStyle}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <img src="https://img.icons8.com/ios-filled/18/00ACC1/copy.png" alt="copy icon" />
                  </button>
                </div>
              </div>
            )}
            {project.gitBranch && (
              <div style={infoRowStyle}>
                <span style={infoLabelStyle}><img src="https://img.icons8.com/ios-filled/22/8E24AA/code-fork.png" alt="branch" style={{marginRight: 8}}/>Branch:</span>
                <span style={infoValueStyle}>{project.gitBranch}</span>
              </div>
            )}
          </div>
        </div>
        {project.description && (
          <div>
            <h2 style={{ fontSize: '1.3em', fontWeight: 700, color: '#1976d2', marginBottom: 12, marginTop: 0}}>Mô tả</h2>
            <p style={{ 
              fontSize: '1em', 
              color: '#495057', 
              lineHeight: 1.6, 
              whiteSpace: 'pre-wrap', 
              margin: 0,
              padding: '16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              maxHeight: '150px',
              overflowY: 'auto',
            }}>{project.description}</p>
          </div>
        )}
        {files && files.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: '1.3em', fontWeight: 700, color: '#1976d2', marginBottom: 18 }}>Tài liệu chung:</h2>
            <div style={fileListContainerStyle}>
              {files.map((file, index) => (
                <div
                  key={file._id || index}
                  style={{
                    background: '#fff',
                    borderRadius: '16px',
                    boxShadow: '0 4px 16px rgba(44,62,80,0.08)',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    minWidth: 0,
                    maxWidth: '100%',
                    transition: 'all 0.22s cubic-bezier(.4,0,.2,1)',
                    cursor: 'pointer',
                    fontSize: '1.01em',
                    border: '2px solid transparent',
                    position: 'relative',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#e3e9f7';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(44,62,80,0.13)';
                    e.currentTarget.style.border = '2px solid #1976d2';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#fff';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(44,62,80,0.08)';
                    e.currentTarget.style.border = '2px solid transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 44, minHeight: 44 }}>
                    {getFileIcon(file.fileName)}
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', marginLeft: 18, minWidth: 0 }}>
                    <span
                      style={{
                        fontWeight: 700,
                        color: '#2d3a4a',
                        fontSize: '1em',
                        marginBottom: 2,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      title={file.fileName}
                    >
                      {file.fileName}
                    </span>
                    {file.size && <span style={{ fontSize: '0.97em', color: '#888' }}>{formatFileSize(file.size)}</span>}
                  </div>
                  <button
                    style={{
                      background: '#e3e9f7',
                      border: 'none',
                      borderRadius: '50%',
                      padding: 10,
                      marginLeft: 16,
                      cursor: 'pointer',
                      transition: 'background 0.18s, transform 0.1s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onClick={() => handleDownloadFile(file._id, file.fileName)}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.93)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                    title="Tải xuống"
                  >
                    <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download icon" style={{ width: '22px', height: '22px' }}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectOverview; 