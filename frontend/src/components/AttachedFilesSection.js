import React from 'react';

const AttachedFilesSection = ({ files, getFileIcon, formatFileSize, handleDownloadFile, styles }) => {
  if (!files || files.length === 0) {
    return null;
  }

  return (
    <div style={{ ...styles.attachedFilesSection, paddingLeft: '80px', paddingRight: '80px'}}>
      <h2 style={styles.attachedFilesTitle}>Tài liệu chung:</h2>
      <div style={styles.fileListContainer}>
        {files.map((file, index) => (
          <div key={file._id || index} style={styles.fileItemCard}>
            <div style={styles.fileContentLeft}>
              {getFileIcon(file.fileName)}
              <div style={styles.fileTextDetails}>
                <span style={styles.fileCardName}>{
                  (() => {
                    const fileName = file.fileName;
                    if (fileName.length > 20) {
                      const lastDotIndex = fileName.lastIndexOf('.');
                      if (lastDotIndex !== -1 && lastDotIndex > fileName.length - 8) { // Preserve up to 7 chars for extension
                        return fileName.substring(0, 16) + '...' + fileName.substring(lastDotIndex);
                      } else {
                        return fileName.substring(0, 17) + '...';
                      }
                    }
                    return fileName;
                  })()
                }</span>
                {file.size && <span style={styles.fileCardSize}>{formatFileSize(file.size)}</span>}
              </div>
            </div>
            <button
              style={styles.fileCardDownloadButton}
              onClick={() => handleDownloadFile(file._id, file.fileName)}
            >
              <img src="https://cdn-icons-png.flaticon.com/512/0/532.png" alt="download icon" style={{ width: '16px', height: '16px' }}/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AttachedFilesSection; 