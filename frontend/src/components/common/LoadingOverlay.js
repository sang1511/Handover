import React from 'react';
import { Box, CircularProgress } from '@mui/material';

const LoadingOverlay = () => (
  <Box
    sx={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 2000,
      background: 'rgba(255,255,255,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'opacity 0.4s',
      opacity: 1,
    }}
  >
    <CircularProgress size={60} sx={{ color: '#dc3545' }} />
  </Box>
);

export default LoadingOverlay; 