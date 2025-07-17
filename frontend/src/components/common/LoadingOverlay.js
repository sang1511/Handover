import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const LoadingOverlay = ({ text = 'Đang tải...' }) => (
  <Box
    sx={{
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 2000,
      background: 'rgba(255,255,255,0.7)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.4s',
      opacity: 1,
    }}
  >
    <CircularProgress size={60} sx={{ color: '#dc3545', mb: 3 }} />
    <span style={{
      marginTop: 18,
      fontSize: 20,
      color: '#222',
      fontWeight: 600,
      textAlign: 'center',
      letterSpacing: 0.2,
      textShadow: '0 1px 8px #fff',
    }}>{text}</span>
  </Box>
);

export default LoadingOverlay; 