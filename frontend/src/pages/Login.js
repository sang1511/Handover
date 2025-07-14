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
import LoadingOverlay from '../components/common/LoadingOverlay';

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
  const [pageLoading, setPageLoading] = useState(false);

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
        background: `url(${require('../asset/nền.jpg')}) center/cover no-repeat fixed`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(220, 53, 69, 0.03) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(220, 53, 69, 0.02) 0%, transparent 50%)',
          pointerEvents: 'none',
        },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 5 },
          width: '100%',
          maxWidth: 410,
          borderRadius: 4,
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(220, 53, 69, 0.1)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: 'linear-gradient(90deg, #dc3545 0%, #e74c3c 50%, #dc3545 100%)',
            borderRadius: '4px 4px 0 0',
            opacity: 0.8,
          },
        }}
      >
        <Box mb={3}>
          <img src={require('../asset/logo.png')} alt="Logo" style={{ height: 52, filter: 'drop-shadow(0 1px 3px rgba(220, 53, 69, 0.3))' }} />
        </Box>
        <Typography
          variant="h4"
          align="center"
          fontWeight={600}
          gutterBottom
          sx={{
            letterSpacing: 1.5,
            fontFamily: 'Montserrat, sans-serif',
            color: '#dc3545',
            mb: 1.5,
            textShadow: '0 2px 8px rgba(220,53,69,0.10)',
          }}
        >
          Đăng nhập
        </Typography>
        <Typography
          variant="body1"
          align="center"
          sx={{
            mb: 3,
            fontWeight: 200,
            fontFamily: 'Montserrat, sans-serif',
            color: '#6c757d',
            fontSize: 18,
            letterSpacing: 0.5,
          }}
        >
          Chào mừng bạn quay lại!
        </Typography>
        {error && (
          <Alert severity="error" sx={{ 
            mb: 3, 
            width: '100%', 
            bgcolor: 'rgba(220, 53, 69, 0.08)', 
            color: '#721c24', 
            border: '1px solid rgba(220, 53, 69, 0.2)',
            borderRadius: 2,
            '& .MuiAlert-icon': {
              color: '#dc3545'
            }
          }}>
            {error}
          </Alert>
        )}
        {info && (
          <Alert severity="info" sx={{ 
            mb: 3, 
            width: '100%', 
            bgcolor: 'rgba(13, 110, 253, 0.08)', 
            color: '#0c5460', 
            border: '1px solid rgba(13, 110, 253, 0.2)',
            borderRadius: 2,
            '& .MuiAlert-icon': {
              color: '#0d6efd'
            }
          }}>
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
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.95)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e9ecef',
                  borderWidth: 1.5,
                  borderRadius: 2,
                  transition: 'border-color 0.2s',
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#dc3545',
                  boxShadow: '0 0 0 2px rgba(220,53,69,0.08)',
                },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(220,53,69,0.5)',
                },
                '& .MuiInputLabel-root': {
                  color: '#6c757d',
                  '&.Mui-focused': {
                    color: '#dc3545',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#2c3e50',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email sx={{ color: 'rgba(220, 53, 69, 0.7)', fontSize: 20 }} />
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
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.95)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e9ecef',
                  borderWidth: 1.5,
                  borderRadius: 2,
                  transition: 'border-color 0.2s',
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#dc3545',
                  boxShadow: '0 0 0 2px rgba(220,53,69,0.08)',
                },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(220,53,69,0.5)',
                },
                '& .MuiInputLabel-root': {
                  color: '#6c757d',
                  '&.Mui-focused': {
                    color: '#dc3545',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#2c3e50',
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock sx={{ color: 'rgba(220, 53, 69, 0.7)', fontSize: 20 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((show) => !show)}
                      edge="end"
                      disabled={isLoading}
                      tabIndex={-1}
                      sx={{ 
                        color: 'rgba(220, 53, 69, 0.6)',
                        '&:hover': {
                          color: '#dc3545',
                          background: 'rgba(220, 53, 69, 0.08)',
                        }
                      }}
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
              sx={{ 
                mb: 3, 
                borderRadius: 2, 
                fontWeight: 600, 
                fontSize: 16, 
                textTransform: 'none', 
                background: 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)', 
                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  background: 'linear-gradient(135deg, #c82333 0%, #dc3545 100%)', 
                  boxShadow: '0 6px 20px rgba(220, 53, 69, 0.4)',
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&:disabled': {
                  background: '#6c757d',
                  color: '#ffffff',
                  boxShadow: 'none',
                  transform: 'none',
                },
              }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : null}
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
            </Button>
            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => {
                  setPageLoading(true);
                  setTimeout(() => navigate('/register'), 600);
                }}
                disabled={isLoading}
                sx={{ 
                  color: 'rgba(220, 53, 69, 0.8)', 
                  fontWeight: 500, 
                  textDecoration: 'none',
                  transition: 'all 0.2s ease',
                  '&:hover': { 
                    color: '#dc3545',
                    textDecoration: 'underline',
                  },
                  '&:disabled': {
                    color: '#6c757d',
                  }
                }}
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
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.95)',
                },
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#e9ecef',
                  borderWidth: 1.5,
                  borderRadius: 2,
                  transition: 'border-color 0.2s',
                },
                '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#dc3545',
                  boxShadow: '0 0 0 2px rgba(220,53,69,0.08)',
                },
                '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(220,53,69,0.5)',
                },
                '& .MuiInputLabel-root': {
                  color: '#6c757d',
                  '&.Mui-focused': {
                    color: '#dc3545',
                  },
                },
                '& .MuiInputBase-input': {
                  color: '#2c3e50',
                },
              }}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ 
                mb: 2, 
                borderRadius: 2, 
                fontWeight: 600, 
                fontSize: 16, 
                textTransform: 'none', 
                background: 'linear-gradient(135deg, #dc3545 0%, #e74c3c 100%)', 
                boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  background: 'linear-gradient(135deg, #c82333 0%, #dc3545 100%)', 
                  boxShadow: '0 6px 20px rgba(220, 53, 69, 0.4)',
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&:disabled': {
                  background: '#6c757d',
                  color: '#ffffff',
                  boxShadow: 'none',
                  transform: 'none',
                },
              }}
              disabled={isLoading}
              startIcon={isLoading ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : null}
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
              sx={{ 
                borderRadius: 2, 
                fontWeight: 500, 
                textTransform: 'none', 
                color: 'rgba(220, 53, 69, 0.8)', 
                borderColor: 'rgba(220, 53, 69, 0.3)', 
                transition: 'all 0.3s ease', 
                '&:hover': { 
                  borderColor: '#dc3545', 
                  color: '#dc3545', 
                  background: 'rgba(220, 53, 69, 0.05)',
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '&:disabled': {
                  borderColor: '#6c757d',
                  color: '#6c757d',
                  transform: 'none',
                },
              }}
              disabled={isLoading}
            >
              Quay lại đăng nhập
            </Button>
          </form>
        )}
      </Paper>
      {pageLoading && <LoadingOverlay />}
    </Box>
  );
};

export default Login; 