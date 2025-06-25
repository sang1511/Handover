import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const { login, verifyOtp } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('login'); // 'login' | 'otp'
  const [userId, setUserId] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      const result = await login(formData.email, formData.password);
      if (result.mfa) {
        setStep('otp');
        setUserId(result.userId);
        setInfo('Vui lòng kiểm tra email để lấy mã OTP.');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      await verifyOtp(userId, otp);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Xác thực OTP thất bại');
    } finally {
      setIsLoading(false);
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
          Đăng nhập
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
        {step === 'login' ? (
          <form onSubmit={handleSubmit}>
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/register')}
              >
                Chưa có tài khoản? Đăng ký
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
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={isLoading}
            >
              {isLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default Login; 