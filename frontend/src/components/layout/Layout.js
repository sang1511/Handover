import React, { useState} from 'react';
import { Box, CssBaseline } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import { baseMenuItems, adminMenuItem } from '../../constants/menuItems';

const drawerWidth = 240;

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    ...baseMenuItems,
    ...(user?.role === 'admin' ? [adminMenuItem] : []),
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Header handleDrawerToggle={handleDrawerToggle} menuItems={menuItems} mobileOpen={mobileOpen} />
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { lg: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 