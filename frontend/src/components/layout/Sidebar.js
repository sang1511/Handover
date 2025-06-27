import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  ExitToApp as LogoutIcon,
} from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';

import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import logo from '../../asset/logo.png';

const drawerWidth = 240;

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const theme = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Quản lý dự án', icon: <AssignmentIcon />, path: '/projects' },
    { text: 'Tạo bàn giao', icon: <AddIcon />, path: '/projects/new'},
    ...(user?.role === 'admin'
      ? [{ text: 'Quản lý người dùng', icon: <PeopleIcon />, path: '/users' }]
      : []),
  ];

  const drawer = (
    <div>
      <Toolbar sx={{ justifyContent: 'flex-start', py: 2, px: 3 }}>
        <Box
          component="img"
          src={logo}
          alt="Logo"
          sx={{
            height: 75,
            width: 'auto',
            objectFit: 'contain',
            display: 'block',
            mx: 'auto',
          }}
        />
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => navigate(item.path)}
            selected={location.pathname === item.path}
            sx={{
              padding: '12px 16px',
              borderRadius: '8px',
              margin: '0 10px',
              width: `calc(100% - 20px)`,
              boxSizing: 'border-box',
              '&.Mui-selected': {
                backgroundColor: theme.palette.menuSelected.main,
                color: '#ffffff',
                '& .MuiListItemIcon-root': {
                  color: '#ffffff',
                  minWidth: '15px',
                },
                '& .MuiListItemText-primary': {
                  color: '#ffffff',
                },
                '&:hover': {
                  backgroundColor: theme.palette.menuSelected.main,
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              },
              '& .MuiListItemIcon-root': {
                marginRight: '8px',
                minWidth: '15px',
              },
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem
          button
          onClick={handleLogout}
          sx={{
            padding: '12px 16px',
            borderRadius: '8px',
            margin: '0 10px',
            width: `calc(100% - 20px)`,
            boxSizing: 'border-box',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
            '& .MuiListItemIcon-root': {
              marginRight: '8px',
              minWidth: '15px',
            },
          }}
        >
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { lg: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
      >
        {drawer}
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', lg: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
          },
        }}
        open
      >
        {drawer}
      </Drawer>
    </Box>
  );
};

export default Sidebar; 