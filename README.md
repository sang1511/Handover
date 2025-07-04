# Handover System

## 1. Tính năng chính

- Đăng ký, đăng nhập, xác thực 2 lớp (2FA) qua email.
- Quản lý người dùng, phân quyền (Admin, PM, BA, ...).
- Quản lý dự án, tạo/sửa dự án.
- Quản lý sprint, tạo/sửa sprint, upload tài liệu sprint, nghiệm thu sprint.
- Quản lý, tạo task trong sprint: giao việc, thực hiện việc, review.
- Quản lý nhân sự tham gia sprint thông qua nhân sự task.
- Ghi chú, lịch sử hoạt động, nhật ký thay đổi.
- Thông báo realtime (notification) khi có sự kiện liên quan.
- Tính năng realtime cho mọi thay đổi sprint/task/ghi chú/tài liệu/nhân sự.

---

## 2. Công nghệ sử dụng

### Backend:
- **Node.js**, **Express.js**: Xây dựng RESTful API.
- **MongoDB** + **Mongoose**: Lưu trữ dữ liệu.
- **Socket.IO**: Realtime communication.
- **JWT**: Xác thực người dùng.
- **Multer, GridFS**: Upload & lưu trữ file.
- **SendGrid**: Gửi email xác thực/OTP.
- **Các thư viện khác**: bcryptjs, dotenv, cors, morgan, archiver, ...

### Frontend:
- **ReactJS** (CRA)
- **Material UI (MUI)**: Giao diện.
- **React Router**: Điều hướng SPA.
- **Axios**: Giao tiếp API.
- **Socket.IO Client**: Nhận realtime event.
- **React Context**: Quản lý state toàn cục.
- **React Toastify**: Thông báo popup.
- **Dayjs, date-fns**: Xử lý ngày giờ.

---

## 3. Cấu trúc dự án

```
Project/
│
├── backend/
│   ├── src/
│   │   ├── controllers/      # Xử lý logic API (auth, user, project, sprint, notification)
│   │   ├── models/           # Định nghĩa schema MongoDB (User, Project, Sprint, Notification)
│   │   ├── routes/           # Định nghĩa các endpoint API
│   │   ├── services/         # Xử lý nghiệp vụ (service layer)
│   │   ├── middleware/       # Middleware (auth, upload, ...)
│   │   ├── utils/            # Tiện ích (email, error, gridfs, ...)
│   │   ├── socket.js         # Socket.IO server
│   │   ├── app.js, index.js  # Khởi tạo app
│   ├── package.json
│   ├── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Component giao diện (Sprint, Project, User, Popup, ...)
│   │   ├── pages/            # Các trang chính (Dashboard, Login, Register, Projects, ...)
│   │   ├── api/              # Gọi API backend
│   │   ├── contexts/         # React Context (Auth, Notification, ...)
│   │   ├── utils/            # Tiện ích (socket, ...)
│   │   ├── asset/            # Ảnh, icon
│   │   ├── App.js, index.js  # Khởi tạo app
│   ├── public/
│   ├── package.json
│   ├── Dockerfile
│
├── docker-compose.yml        # Chạy cả frontend & backend bằng Docker
├── README.md
```

---

## 4. Hướng dẫn cài đặt & chạy

### Yêu cầu:
- Node.js >= 16
- MongoDB >= 4.x
- (Tùy chọn) Docker

### Cài đặt thủ công

#### Backend
```bash
cd backend
npm install
cp .env.example .env   # Tạo file .env và cấu hình biến môi trường
npm run dev            # hoặc npm start
```

#### Frontend
```bash
cd frontend
npm install
npm start
```
- Truy cập: http://localhost:3000

#### MongoDB
- Cài đặt và chạy MongoDB local hoặc cloud (MongoDB Atlas).
- Cấu hình URI trong file `.env` backend.

### Chạy bằng Docker (khuyên dùng)
```bash
docker-compose up
```
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

---

## 5. Một số thư mục/file quan trọng

- **backend/src/controllers/**: authController.js, projectController.js, sprintController.js, ...
- **backend/src/models/**: User.js, Project.js, Sprint.js, Notification.js
- **backend/src/routes/**: authRoutes.js, projectRoutes.js, sprintRoutes.js, ...
- **frontend/src/components/**: SprintDetailSection.js, ProjectOverview.js, NewTaskPopup.js, ...
- **frontend/src/pages/**: Login.js, Register.js, Projects.js, ProjectDetail.js, Users.js, Dashboard.js

---

## 6. Ghi chú

- Hệ thống hỗ trợ realtime cho mọi thay đổi liên quan sprint, task, notes, file, nhân sự.
- Notification realtime, UX tối ưu cho teamwork.
- Có thể mở nhiều tab/trình duyệt để test realtime.
- Dễ dàng mở rộng thêm module mới.

---