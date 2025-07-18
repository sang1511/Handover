import {
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import ChatIcon from '@mui/icons-material/Chat';
import ExtensionIcon from '@mui/icons-material/Extension';

export const baseMenuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Danh sách dự án', icon: <AssignmentIcon />, path: '/projects' },
  { text: 'Danh sách Module', icon: <ExtensionIcon />, path: '/modules' },
  { text: 'Tạo dự án mới', icon: <AddIcon />, path: '/projects/new' },
  { text: 'Chats', icon: <ChatIcon />, path: '/chats' },
];

export const adminMenuItem = { text: 'Quản lý người dùng', icon: <PeopleIcon />, path: '/users' }; 