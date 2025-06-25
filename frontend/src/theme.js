import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
    menuSelected: {
      main: '#EA3252',
    },
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          color: '#555555',
          '& .MuiListItemIcon-root': {
            color: '#555555',
          },
          '& .MuiListItemText-root': {
            color: '#555555',
          },
          '& .MuiDivider-root': {
            backgroundColor: 'rgba(0, 0, 0, 0.12)',
          },
        },
      },
    },
  },
});

export default theme; 