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
import UserDetailDialog from '../popups/UserDetailDialog';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import axiosInstance from '../../api/axios';
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
      if (
        (notification.type === 'project' || notification.type === 'project_confirmed')
        && notification.refId) {
        navigate(`/projects/${notification.refId}`);
      } else if ((notification.type === 'sprint' || notification.type === 'task') && notification.refId) {
        // Gọi API để lấy thông tin navigation
        const token = localStorage.getItem('token');
        const response = await axiosInstance.get(`/sprints/project-info?type=${notification.type}&refId=${notification.refId}`, {
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
      if (error.response?.status === 401) {
        // Không hiện lỗi ra UI, chỉ log hoặc bỏ qua
        return;
      }
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
      elevation={0}
      sx={{
        width: { lg: `calc(100% - ${drawerWidth}px)` },
        ml: { lg: `${drawerWidth}px` },
        background: 'rgba(255,255,255,0.98)',
        color: '#222',
        boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.07)',
        borderBottomLeftRadius: { lg: 18 },
        borderBottomRightRadius: { lg: 18 },
        zIndex: 1201,
        backdropFilter: 'blur(8px)',
        border: 'none',
      }}
    >
      <Toolbar sx={{ minHeight: 64, px: { xs: 2, sm: 3, md: 4 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { lg: 'none' }, borderRadius: 2, p: 1.2, '&:hover': { background: 'rgba(220,53,69,0.07)' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, color: '#222', fontWeight: 700, letterSpacing: 0.5 }}>
          {getPageTitle()}
        </Typography>
        <Typography variant="body1" sx={{ mr: 2, color: '#444', fontWeight: 600, letterSpacing: 0.2 }}>
          {user?.name}
        </Typography>
        <IconButton color="inherit" onClick={handleNotificationMenu} sx={{ mr: 1, borderRadius: 2, p: 1.2, '&:hover': { background: 'rgba(25,118,210,0.07)' } }}>
          <Badge badgeContent={unreadCount} color="error" sx={{ '& .MuiBadge-badge': { fontSize: 12, minWidth: 18, height: 18, px: 0.5, boxShadow: '0 1px 4px #dc354522' } }}>
            <NotificationsIcon sx={{ color: '#1976d2' }} />
          </Badge>
        </IconButton>
        <IconButton
          aria-label="account of current user"
          aria-controls="menu-appbar"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
          sx={{ borderRadius: 2, p: 1.2, ml: 0.5, '&:hover': { background: 'rgba(220,53,69,0.07)' } }}
        >
          <Avatar sx={{ width: 34, height: 34, boxShadow: '0 2px 8px #6366f122' }} src={user?.avatar || userAvatar} alt={user?.name} />
        </IconButton>
        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          keepMounted
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            sx: {
              mt: 0.5,
              boxShadow: '0px 4px 24px rgba(31, 38, 135, 0.10)',
              minWidth: '220px',
              borderRadius: 2,
              p: 0.5,
            },
          }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700, color: '#222' }}>
              {user?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {user?.email}
            </Typography>
          </Box>
          <Divider key="divider-user-info" />
          <MenuItem key="profile" onClick={handleProfile} sx={{ borderRadius: 1, my: 0.5 }}>
            <ListItemIcon>
              <AccountCircleIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Trang cá nhân</ListItemText>
          </MenuItem>
          <Divider key="divider-profile-logout" />
          <MenuItem key="logout" onClick={handleLogout} sx={{ borderRadius: 1, my: 0.5 }}>
            <ListItemIcon>
              <LogoutIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Đăng xuất</ListItemText>
          </MenuItem>
        </Menu>
        <Menu
          id="menu-notification"
          anchorEl={notificationAnchorEl}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          keepMounted
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          open={Boolean(notificationAnchorEl)}
          onClose={handleNotificationClose}
          PaperProps={{
            sx: {
              mt: 0.5,
              boxShadow: '0px 4px 24px rgba(31, 38, 135, 0.10)',
              maxHeight: 400,
              width: '350px',
              borderRadius: 2,
              p: 0.5,
              WebkitScrollbar: { display: 'none' },
              WebkitScrollbarTrack: { display: 'none' },
              WebkitScrollbarThumb: { display: 'none' },
            },
          }}
        >
          <Box 
            sx={{ 
              p: 2, 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(0, 0, 0, 0.07)',
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 1,
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1976d2' }}>Thông báo</Typography>
            {unreadCount > 0 && (
              <Typography 
                variant="caption" 
                sx={{ 
                  color: '#1976d2',
                  cursor: 'pointer',
                  fontWeight: 600,
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
                  borderRadius: 1.2,
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
                      fontWeight: notification.isRead ? 400 : 700,
                      color: notification.isRead ? '#222' : '#1976d2',
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
        {user && (
          <UserDetailDialog
            open={isUserDetailOpen}
            handleClose={handleUserDetailClose}
            user={user}
            onUserUpdate={handleUserUpdate}
          />
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header; 