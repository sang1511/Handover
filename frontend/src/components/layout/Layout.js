import React, { useState, useEffect } from 'react';
import { Box, CssBaseline } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import Header from './Header';
import Sidebar from './Sidebar';

const drawerWidth = 240;

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Danh sách dự án', icon: <AssignmentIcon />, path: '/projects' },
    { text: 'Tạo bàn giao', icon: <AddIcon />, path: '/projects/new'},
    ...(user?.role === 'admin'
      ? [{ text: 'Quản lý người dùng', icon: <PeopleIcon />, path: '/users' }]
      : []),
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <Header handleDrawerToggle={handleDrawerToggle} menuItems={menuItems} />
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
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