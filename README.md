# Project Management System

A comprehensive project management system with real-time updates for sprints and tasks.

## Real-Time Features

### ✅ Currently Supported Real-Time Updates:

1. **Task Status Updates** - When a task status is changed (Chưa làm → Đang làm → Đã xong)
2. **Task Review Results** - When a task review result is updated (Đạt/Không đạt/Chưa duyệt)
3. **New Sprint Creation** - When a new sprint is created
4. **New Task Addition** - When new tasks are added to existing sprints
5. **Bulk Task Addition** - When multiple tasks are added at once

### 🔧 How Real-Time Updates Work:

- **Backend**: Uses Socket.IO to broadcast events to project rooms
- **Frontend**: Listens for specific events and updates UI automatically
- **Events**: 
  - `taskUpdated` - For task status and review changes
  - `sprintCreated` - For new sprint creation
  - `taskAdded` - For single task addition
  - `tasksBulkAdded` - For bulk task addition

### 📱 User Experience:

- No page refresh required
- Instant UI updates across all connected users
- Real-time notifications for relevant users
- Automatic project status updates

## Installation and Setup

Tạo tài khoản, quản lý tài khoản (admin), tạo dự án, xem danh sách dự án 
