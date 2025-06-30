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
  CircularProgress,
  InputAdornment,
  IconButton,
  FormHelperText,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock, Person, Phone, Business, Wc, Work } from '@mui/icons-material';
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
    role: 'other', 
    phoneNumber: '',
    gender: '',
    companyName: '', 
  });
  const [error, setError] = useState('');
  const [step, setStep] = useState('register'); 
  const [userId, setUserId] = useState(null);
  const [otp, setOtp] = useState('');
  const [info, setInfo] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  
  // Password visibility states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Validation states - chỉ hiện lỗi khi field bị blur hoặc submit
  const [touched, setTouched] = useState({
    password: false,
    confirmPassword: false,
  });
  const [showValidation, setShowValidation] = useState(false);

  // Validation functions
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push('Mật khẩu phải có ít nhất 8 ký tự');
    if (!/[A-Z]/.test(password)) errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
    if (!/[a-z]/.test(password)) errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
    if (!/\d/.test(password)) errors.push('Mật khẩu phải có ít nhất 1 số');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Mật khẩu phải có ít nhất 1 ký tự đặc biệt');
    return errors;
  };

  const validateConfirmPassword = (confirmPassword) => {
    if (confirmPassword && formData.password !== confirmPassword) {
      return ['Mật khẩu xác nhận không khớp'];
    }
    return [];
  };

  const getPasswordErrors = () => {
    if (!touched.password && !showValidation) return [];
    return validatePassword(formData.password);
  };

  const getConfirmPasswordErrors = () => {
    if (!touched.confirmPassword && !showValidation) return [];
    return validateConfirmPassword(formData.confirmPassword);
  };

  const handleFieldBlur = (fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Kiểm tra validation khi submit
    setShowValidation(true);
    
    const passwordErrors = validatePassword(formData.password);
    const confirmPasswordErrors = validateConfirmPassword(formData.confirmPassword);
    
    if (passwordErrors.length > 0 || confirmPasswordErrors.length > 0) {
      setError('Vui lòng kiểm tra lại thông tin mật khẩu');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setInfo('');
    try {
      const res = await register(formData);
      // Tất cả user đều có MFA enabled, nên luôn chuyển sang form OTP
      setUserId(res.userId);
      setInfo(res.message || 'Vui lòng kiểm tra email để lấy mã OTP xác thực.');
      setStep('otp');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Đăng ký thất bại';
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
          maxWidth: 480,
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
          {step === 'register' ? 'Đăng ký' : 'Xác thực tài khoản'}
        </Typography>
        <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ mb: 2, fontWeight: 500, fontFamily: 'Montserrat, sans-serif' }}>
          {step === 'register' ? 'Tạo tài khoản mới để bắt đầu sử dụng.' : 'Nhập mã OTP được gửi đến email của bạn.'}
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
        {step === 'register' ? (
          <form onSubmit={handleSubmit} style={{ width: '100%' }}>
            <TextField
              fullWidth
              label="Họ và tên"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                    <Person sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
            />
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
            <FormControl fullWidth margin="normal" error={getPasswordErrors().length > 0} sx={{ mb: 2 }}>
              <TextField
                label="Mật khẩu"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                disabled={isLoading}
                onBlur={() => handleFieldBlur('password')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#6366f1' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={isLoading}
                        tabIndex={-1}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ borderRadius: 3, background: 'rgba(255,255,255,0.7)',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    '&:hover': { boxShadow: '0 2px 8px #6366f122', transform: 'scale(1.02)' },
                  },
                }}
              />
              {getPasswordErrors().length > 0 && (
                <FormHelperText>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {getPasswordErrors().map((error, index) => (
                      <li key={index} style={{ fontSize: '0.75rem' }}>
                        {error}
                      </li>
                    ))}
                  </Box>
                </FormHelperText>
              )}
            </FormControl>
            <FormControl fullWidth margin="normal" error={!!getConfirmPasswordErrors().length} sx={{ mb: 2 }}>
              <TextField
                label="Xác nhận mật khẩu"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                disabled={isLoading}
                onBlur={() => handleFieldBlur('confirmPassword')}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock sx={{ color: '#6366f1' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        disabled={isLoading}
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ borderRadius: 3, background: 'rgba(255,255,255,0.7)',
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    '&:hover': { boxShadow: '0 2px 8px #6366f122', transform: 'scale(1.02)' },
                  },
                }}
              />
              {getConfirmPasswordErrors().length > 0 && (
                <FormHelperText>
                  <Box component="ul" sx={{ m: 0, pl: 2 }}>
                    {getConfirmPasswordErrors().map((error, index) => (
                      <li key={index} style={{ fontSize: '0.75rem' }}>
                        {error}
                      </li>
                    ))}
                  </Box>
                </FormHelperText>
              )}
            </FormControl>
            <TextField
              fullWidth
              label="Số điện thoại"
              value={formData.phoneNumber || ''}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              margin="normal"
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
                    <Phone sx={{ color: '#6366f1' }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
              <InputLabel>Giới tính</InputLabel>
              <Select
                value={formData.gender || ''}
                label="Giới tính"
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                disabled={isLoading}
                sx={{ borderRadius: 3, background: 'rgba(255,255,255,0.7)',
                  '&:hover': { boxShadow: '0 2px 8px #6366f122', transform: 'scale(1.02)' },
                }}
                startAdornment={<Wc sx={{ color: '#6366f1', mr: 1 }} />}
              >
                <MenuItem value="male">Nam</MenuItem>
                <MenuItem value="female">Nữ</MenuItem>
                <MenuItem value="other">Khác</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal" sx={{ mb: 2 }}>
              <InputLabel>Vai trò</InputLabel>
              <Select
                value={formData.role}
                label="Vai trò"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                disabled={isLoading}
                sx={{ borderRadius: 3, background: 'rgba(255,255,255,0.7)',
                  '&:hover': { boxShadow: '0 2px 8px #6366f122', transform: 'scale(1.02)' },
                }}
                startAdornment={<Work sx={{ color: '#6366f1', mr: 1 }} />}
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
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              margin="normal"
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
                    <Business sx={{ color: '#6366f1' }} />
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
              disabled={isLoading || getPasswordErrors().length > 0 || getConfirmPasswordErrors().length > 0}
              startIcon={isLoading ? <CircularProgress size={20} /> : null}
            >
              {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
            </Button>
            <Box sx={{ textAlign: 'center', mt: 1 }}>
              <Link
                component="button"
                variant="body2"
                onClick={() => navigate('/login')}
                disabled={isLoading}
                sx={{ color: '#6366f1', fontWeight: 600, letterSpacing: 0.5, '&:hover': { textDecoration: 'underline', color: '#3730a3' } }}
              >
                Đã có tài khoản? Đăng nhập
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
              disabled={isOtpLoading || resendLoading}
              sx={{ mb: 2, borderRadius: 3, background: 'rgba(255,255,255,0.7)',
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                  '&:hover': { boxShadow: '0 2px 8px #6366f122', transform: 'scale(1.02)' },
                },
              }}
            />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 2 }}>
              <Button 
                onClick={handleResendOtp}
                disabled={resendLoading || isOtpLoading}
                variant="outlined"
                startIcon={resendLoading ? <CircularProgress size={20} /> : null}
                sx={{ borderRadius: 4, fontWeight: 600, textTransform: 'none', color: '#6366f1', borderColor: '#6366f1', transition: '0.2s', '&:hover': { borderColor: '#3730a3', color: '#3730a3', background: '#f1f5f9' }, }}
              >
                {resendLoading ? 'Đang gửi...' : 'Gửi lại OTP'}
              </Button>
              <Button 
                type="submit" 
                variant="contained" 
                disabled={isOtpLoading || resendLoading}
                startIcon={isOtpLoading ? <CircularProgress size={20} /> : null}
                sx={{ borderRadius: 4, fontWeight: 700, fontSize: 17, boxShadow: '0 2px 12px #6366f144', textTransform: 'none', background: 'linear-gradient(90deg, #6366f1 0%, #60a5fa 100%)', transition: '0.2s', '&:hover': { background: 'linear-gradient(90deg, #60a5fa 0%, #6366f1 100%)', transform: 'scale(1.03)' }, }}
              >
                {isOtpLoading ? 'Đang xác nhận...' : 'Xác nhận'}
              </Button>
              <Button
                type="button"
                variant="outlined"
                onClick={() => {
                  setStep('register');
                  setOtp('');
                  setError('');
                  setInfo('');
                }}
                disabled={isOtpLoading || resendLoading}
                sx={{ borderRadius: 4, fontWeight: 600, textTransform: 'none', color: '#6366f1', borderColor: '#6366f1', transition: '0.2s', '&:hover': { borderColor: '#3730a3', color: '#3730a3', background: '#f1f5f9' }, }}
              >
                Quay lại đăng ký
              </Button>
            </Box>
          </form>
        )}
      </Paper>
    </Box>
  );
};

export default Register; 