import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Box,
  Divider,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Menu as MenuIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../contexts/NotificationContext';
import userAvatar from '../../asset/user.png';
import UserDetailDialog from '../UserDetailDialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axios from 'axios';
dayjs.extend(relativeTime);

const drawerWidth = 240;

const Header = ({ handleDrawerToggle, menuItems }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, refreshUser } = useAuth();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotification();
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null);
  const [isUserDetailOpen, setIsUserDetailOpen] = useState(false);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenu = (event) => {
    setNotificationAnchorEl(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };

  const handleProfile = () => {
    setIsUserDetailOpen(true);
    handleClose();
  };

  const handleUserDetailClose = () => {
    setIsUserDetailOpen(false);
  };
  
  const handleUserUpdate = async () => {
    await refreshUser();
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    handleNotificationClose();

    try {
      // Xử lý navigation dựa trên type và refId
      if (notification.type === 'project' && notification.refId) {
        navigate(`/projects/${notification.refId}`);
      } else if ((notification.type === 'sprint' || notification.type === 'task') && notification.refId) {
        // Gọi API để lấy thông tin navigation
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/sprints/project-info?type=${notification.type}&refId=${notification.refId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const { navigationUrl } = response.data;
        navigate(navigationUrl);
      } else {
        // Fallback: về dashboard
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Error getting navigation info:', error);
      // Fallback: về dashboard nếu có lỗi
      navigate('/dashboard');
    }
  };

  const getPageTitle = () => {
    // Check for dynamic routes
    if (location.pathname.startsWith('/projects/')) {
      if (location.pathname === '/projects/new') {
        return 'Tạo dự án mới';
      }
      return 'Chi tiết dự án';
    }

    // Find in menuItems for static routes
    const menuItem = menuItems.find((item) => item.path === location.pathname);
    return menuItem?.text || 'Handover System';
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { sm: `calc(100% - ${drawerWidth}px)` },
        ml: { sm: `${drawerWidth}px` },
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {getPageTitle()}
        </Typography>
        <Typography variant="body1" sx={{ mr: 2 }}>
          {user?.name}
        </Typography>
        <IconButton color="inherit" onClick={handleNotificationMenu} sx={{ mr: 1 }}>
          <Badge badgeContent={unreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        <Menu
          id="menu-notification"
          anchorEl={notificationAnchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(notificationAnchorEl)}
          onClose={handleNotificationClose}
          PaperProps={{
            sx: {
              mt: 0.5,
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
              maxHeight: 400,
              width: '350px',
              '&::-webkit-scrollbar': {
                width: '8px',
              },
              '&::-webkit-scrollbar-track': {
                background: '#f1f1f1',
                borderRadius: '4px',
              },
              '&::-webkit-scrollbar-thumb': {
                background: '#888',
                borderRadius: '4px',
                '&:hover': {
                  background: '#666',
                },
              },
            },
          }}
        >
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>Thông báo</Typography>
            {unreadCount > 0 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'primary.main',
                  cursor: 'pointer',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  markAllAsRead();
                }}
              >
                Đánh dấu tất cả đã đọc
              </Typography>
            )}
          </Box>
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <MenuItem
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                sx={{
                  py: 1.5,
                  px: 2,
                  whiteSpace: 'normal',
                  backgroundColor: notification.isRead ? 'inherit' : 'rgba(25, 118, 210, 0.08)',
                  borderLeft: notification.isRead ? 'none' : '3px solid #1976d2',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: notification.isRead ? 'rgba(0, 0, 0, 0.04)' : 'rgba(25, 118, 210, 0.12)',
                  },
                }}
              >
                <Box sx={{ width: '100%' }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mb: 0.5,
                      fontWeight: notification.isRead ? 400 : 600,
                      color: notification.isRead ? 'text.primary' : 'primary.main',
                      lineHeight: 1.4,
                    }}
                  >
                    {notification.message}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      color: 'text.secondary',
                      display: 'block',
                  }}
                  >
                    {dayjs(notification.createdAt).fromNow()}
                  </Typography>
                </Box>
              </MenuItem>
            ))
          ) : (
            <Box 
              sx={{ 
                py: 6, 
                px: 2, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                color: 'text.secondary',
              }}
            >
              <NotificationsIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
              <Typography variant="body2">Không có thông báo nào</Typography>
            </Box>
          )}
        </Menu>
        <IconButton
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
        >
          <Avatar sx={{ width: 32, height: 32 }} src={user?.avatar || userAvatar} alt={user?.name} />
        </IconButton>
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: {
              mt: 0.5,
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
              minWidth: '220px',
              borderRadius: 1.5,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" noWrap>
              {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
          </Box>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <MenuItem onClick={handleProfile} sx={{ my: 1, mx: 1 }}>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Hồ sơ</ListItemText>
          </MenuItem>

          <Divider sx={{ borderStyle: 'dashed' }} />

          <MenuItem onClick={handleLogout} sx={{ my: 1, mx: 1, color: 'error.main' }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Đăng xuất</ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
      {user && (
        <UserDetailDialog
          open={isUserDetailOpen}
          handleClose={handleUserDetailClose}
          user={user}
          onUserUpdate={handleUserUpdate}
        />
      )}
    </AppBar>
  );
};

export default Header; 