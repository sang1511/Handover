import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Link,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { Email, Lock, Visibility, VisibilityOff } from '@mui/icons-material';
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
  const [showPassword, setShowPassword] = useState(false);

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
      setError(err.response?.data?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra email và mật khẩu.');
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
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#f3f4f6',
        background: '#f3f4f6',
      }}
    >
      <Paper
        elevation={2}
        sx={{
          p: { xs: 3, sm: 5 },
          width: '100%',
          maxWidth: 410,
          borderRadius: 6,
          boxShadow: '0 4px 24px 0 rgba(31, 38, 135, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: '#fff',
          border: '1.5px solid #e5e7eb',
        }}
      >
        <Box mb={2}>
          <img src={require('../asset/logo.png')} alt="Logo" style={{ height: 56, filter: 'drop-shadow(0 2px 8px #6366f1aa)' }} />
        </Box>
        <Typography variant="h3" align="center" fontWeight={800} gutterBottom sx={{ letterSpacing: 2, fontFamily: 'Montserrat, sans-serif', color: '#3730a3', textShadow: '0 2px 8px #6366f133' }}>
          Đăng nhập
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 2, fontWeight: 500, fontFamily: 'Montserrat, sans-serif' }}>
          Chào mừng bạn quay lại!
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ mb: 2, width: '100%' }}>
            {info}
          </Alert>
        )}
        {step === 'login' ? (
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              required
              disabled={isLoading}
              sx={{ mb: 2, borderRadius: 3, background: 'rgba(255,255,255,0.7)',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  '&:hover': { boxShadow: '0 2px 8px #6366f122', transform: 'scale(1.02)' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              fullWidth
              label="Mật khẩu"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
              required
              disabled={isLoading}
              sx={{ mb: 2, borderRadius: 3, background: 'rgba(255,255,255,0.7)',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  '&:hover': { boxShadow: '0 2px 8px #6366f122', transform: 'scale(1.02)' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((show) => !show)}
                      edge="end"
                      disabled={isLoading}
                      tabIndex={-1}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 1, mb: 2, borderRadius: 4, fontWeight: 700, fontSize: 17, boxShadow: '0 2px 12px #6366f144', textTransform: 'none', background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)', transition: '0.2s',
                '&:hover': { background: 'linear-gradient(90deg, #60a5fa 0%, #6366f1 100%)', transform: 'scale(1.03)' },
              }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </Button>
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/register')}
                disabled={isLoading}
                sx={{ color: '#6366f1', fontWeight: 600, letterSpacing: 0.5, '&:hover': { textDecoration: 'underline', color: '#3730a3' } }}
              >
                Chưa có tài khoản? Đăng ký
              </Link>
            </Box>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} style={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Mã OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              margin="normal"
              required
              disabled={isLoading}
              sx={{ mb: 2, borderRadius: 3, background: 'rgba(255,255,255,0.7)',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  '&:hover': { boxShadow: '0 2px 8px #6366f122', transform: 'scale(1.02)' },
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 1, mb: 2, borderRadius: 4, fontWeight: 700, fontSize: 17, boxShadow: '0 2px 12px #6366f144', textTransform: 'none', background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)', transition: '0.2s',
                '&:hover': { background: 'linear-gradient(90deg, #60a5fa 0%, #6366f1 100%)', transform: 'scale(1.03)' },
              }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Đang xác thực...' : 'Xác thực OTP'}
            </Button>
            <Button
              type="button"
              fullWidth
              variant="outlined"
              onClick={() => {
                setStep('login');
                setOtp('');
                setError('');
                setInfo('');
              }}
              sx={{ mb: 2, borderRadius: 4, fontWeight: 600, textTransform: 'none', color: '#6366f1', borderColor: '#6366f1', transition: '0.2s', '&:hover': { borderColor: '#3730a3', color: '#3730a3', background: '#f1f5f9' }, }}
              disabled={isLoading}
            >
              Quay lại đăng nhập
            </Button>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default Login; 