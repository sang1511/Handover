import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
      }}
    >
      <Typography variant="h1" gutterBottom>
        404
      </Typography>
      <Typography variant="h4" gutterBottom>
        Page Not Found
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom>
        The page you are looking for does not exist.
      </Typography>
      <Button
        variant="contained"
        onClick={() => navigate('/')}
        sx={{ mt: 2 }}
      >
        Go to Home
      </Button>
    </Box>
  );
};

export default NotFound; 