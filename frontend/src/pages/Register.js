import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { register, verifyOtp, resendOtp } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'other', // Default role for new registrations
    phoneNumber: '',
    gender: '',
    companyName: '', // Add companyName
  });
  const [error, setError] = useState('');
  const [step, setStep] = useState('register'); // 'register' | 'otp'
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await register(formData);
      if (res?.mfa) {
        setUserId(res.userId);
        setInfo(res.message || 'Vui lòng kiểm tra email để lấy mã OTP xác thực.');
        setStep('otp');
      } else {
        setInfo('Đăng ký thành công! Chuyển đến trang đăng nhập...');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to register';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsOtpLoading(true);
    setError('');
    setInfo('');
    try {
      await verifyOtp(userId, otp);
      setInfo('Xác thực thành công! Đang chuyển đến Dashboard...');
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      setError('OTP chưa đúng hoặc đã hết hạn. Vui lòng thử lại.');
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setInfo('');
    setResendLoading(true);
    try {
      await resendOtp(formData.email);
      setInfo('Mã OTP đã được gửi lại. Vui lòng kiểm tra email.');
    } catch (err) {
      setError('Gửi lại OTP thất bại, vui lòng thử lại sau.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
        }}
      >
        <Typography variant="h4" align="center" gutterBottom>
          {step === 'register' ? 'Đăng ký' : 'Xác thực tài khoản'}
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}
        {step === 'register' ? (
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Họ và tên"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Mật khẩu"
              type="password"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Xác nhận mật khẩu"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Số điện thoại"
              value={formData.phoneNumber || ''}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Giới tính</InputLabel>
              <Select
                value={formData.gender || ''}
                label="Giới tính"
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
              >
                <MenuItem value="male">Nam</MenuItem>
                <MenuItem value="female">Nữ</MenuItem>
                <MenuItem value="other">Khác</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={formData.role}
                label="Vai trò"
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <MenuItem value="pm">PM</MenuItem>
                <MenuItem value="ba">BA</MenuItem>
                <MenuItem value="developer">Developer</MenuItem>
                <MenuItem value="tester">Tester</MenuItem>
                <MenuItem value="other">Khác</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Tên công ty"
              value={formData.companyName || ''}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              margin="normal"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/login')}
              >
                Đã có tài khoản? Đăng nhập
              </Link>
            </Box>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <TextField
              fullWidth
              label="Mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              margin="normal"
              required
            />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, mb: 2 }}>
              <Button 
                onClick={handleResendOtp}
                disabled={resendLoading || isOtpLoading}
                variant="outlined"
              >
                {resendLoading ? 'Đang gửi...' : 'Gửi lại OTP'}
              </Button>
              <Button type="submit" variant="contained" disabled={isOtpLoading || resendLoading}>
                {isOtpLoading ? 'Đang xác nhận...' : 'Xác nhận'}
              </Button>
            </Box>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default Register; 