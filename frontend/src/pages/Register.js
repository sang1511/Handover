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
  Grid,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Phone,
  Business,
  Wc,
  Work,
} from '@mui/icons-material';
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
        background: `url(${require('../asset/nền.jpg')}) center/cover no-repeat fixed`,
        position: 'relative',
      }}
    >
      <Paper
        elevation={3}
        sx={{
          p: { xs: 2, sm: 4 },
          width: '100%',
          maxWidth: 700,
          borderRadius: 5,
          boxShadow: '0 8px 32px rgba(220,53,69,0.10)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.98)',
          border: '1.5px solid #ffeaea',
          position: 'relative',
        }}
      >
          <Box mb={2} mt={1}>
            <img src={require('../asset/logo.png')} alt="Logo" style={{ height: 56, filter: 'drop-shadow(0 2px 6px rgba(220, 53, 69, 0.18))' }} />
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
            Đăng ký
          </Typography>
          <Typography
            variant="body1"
            align="center"
            sx={{
              mb: 3,
              fontWeight: 400,
              fontFamily: 'Montserrat, sans-serif',
              color: '#6c757d',
              fontSize: 18,
              letterSpacing: 0.5,
            }}
          >
            Tạo tài khoản mới để bắt đầu sử dụng.
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 3, width: '100%', bgcolor: 'rgba(220, 53, 69, 0.08)', color: '#721c24', border: '1px solid rgba(220, 53, 69, 0.2)', borderRadius: 2, '& .MuiAlert-icon': { color: '#dc3545' } }}>{error}</Alert>
          )}
          {info && (
            <Alert severity="info" sx={{ mb: 3, width: '100%', bgcolor: 'rgba(13, 110, 253, 0.08)', color: '#0c5460', border: '1px solid rgba(13, 110, 253, 0.2)', borderRadius: 2, '& .MuiAlert-icon': { color: '#0d6efd' } }}>{info}</Alert>
          )}
          {step === 'register' ? (
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Họ và tên"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    margin="normal"
                    required
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person sx={{ color: '#dc3545', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: '#dc3545',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                          color: '#dc3545',
                        },
                      },
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: '#dc3545', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: '#dc3545',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                          color: '#dc3545',
                        },
                      },
                    }}
                  />
                  <FormControl fullWidth margin="normal" error={getPasswordErrors().length > 0}>
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
                            <Lock sx={{ color: '#dc3545', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                              disabled={isLoading}
                              tabIndex={-1}
                              sx={{ color: '#dc3545', '&:hover': { color: '#fff', background: '#dc3545' } }}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#dc3545',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          '&.Mui-focused': {
                            color: '#dc3545',
                          },
                        },
                      }}
                    />
                    {getPasswordErrors().length > 0 && (
                      <FormHelperText sx={{ color: '#dc3545', fontSize: '0.8rem', mt: 0.5 }}>
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {getPasswordErrors().map((error, index) => (
                            <li key={index} style={{ fontSize: '0.8rem' }}>{error}</li>
                          ))}
                        </Box>
                      </FormHelperText>
                    )}
                  </FormControl>
                  <FormControl fullWidth margin="normal" error={!!getConfirmPasswordErrors().length}>
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
                            <Lock sx={{ color: '#dc3545', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              edge="end"
                              disabled={isLoading}
                              tabIndex={-1}
                              sx={{ color: '#dc3545', '&:hover': { color: '#fff', background: '#dc3545' } }}
                            >
                              {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '&.Mui-focused fieldset': {
                            borderColor: '#dc3545',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          '&.Mui-focused': {
                            color: '#dc3545',
                          },
                        },
                      }}
                    />
                    {getConfirmPasswordErrors().length > 0 && (
                      <FormHelperText sx={{ color: '#dc3545', fontSize: '0.8rem', mt: 0.5 }}>
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {getConfirmPasswordErrors().map((error, index) => (
                            <li key={index} style={{ fontSize: '0.8rem' }}>{error}</li>
                          ))}
                        </Box>
                      </FormHelperText>
                    )}
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Số điện thoại"
                    value={formData.phoneNumber || ''}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    margin="normal"
                    disabled={isLoading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone sx={{ color: '#dc3545', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: '#dc3545',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                          color: '#dc3545',
                        },
                      },
                    }}
                  />
                  <FormControl
                    fullWidth
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#dc3545',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                          color: '#dc3545',
                        },
                      },
                    }}
                  >
                    <InputLabel sx={{ color: '#6c757d', '&.Mui-focused': { color: '#dc3545' } }}>Giới tính</InputLabel>
                    <Select
                      value={formData.gender || ''}
                      label="Giới tính"
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      disabled={isLoading}
                      sx={{ borderRadius: 2, background: 'rgba(255,255,255,0.95)' }}
                      startAdornment={<Wc sx={{ color: '#dc3545', mr: 1, fontSize: 20 }} />}
                    >
                      <MenuItem value="male">Nam</MenuItem>
                      <MenuItem value="female">Nữ</MenuItem>
                      <MenuItem value="other">Khác</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl
                    fullWidth
                    margin="normal"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#dc3545',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                          color: '#dc3545',
                        },
                      },
                    }}
                  >
                    <InputLabel sx={{ color: '#6c757d', '&.Mui-focused': { color: '#dc3545' } }}>Vai trò</InputLabel>
                    <Select
                      value={formData.role}
                      label="Vai trò"
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      disabled={isLoading}
                      sx={{ borderRadius: 2, background: 'rgba(255,255,255,0.95)' }}
                      startAdornment={<Work sx={{ color: '#dc3545', mr: 1, fontSize: 20 }} />}
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
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Business sx={{ color: '#dc3545', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        '&.Mui-focused fieldset': {
                          borderColor: '#dc3545',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        '&.Mui-focused': {
                          color: '#dc3545',
                        },
                      },
                    }}
                  />
                </Grid>
              </Grid>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{
                  mt: 4,
                  mb: 2,
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: 17,
                  textTransform: 'none',
                  background: 'linear-gradient(90deg, #dc3545 0%, #e74c3c 100%)',
                  boxShadow: '0 4px 16px rgba(220, 53, 69, 0.18)',
                  transition: 'all 0.3s',
                  letterSpacing: 1,
                  '&:hover': {
                    background: 'linear-gradient(90deg, #c82333 0%, #dc3545 100%)',
                    boxShadow: '0 6px 24px rgba(220, 53, 69, 0.22)',
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
                {isLoading ? 'Đang xử lý...' : 'Đăng ký'}
              </Button>
              <Box sx={{ textAlign: 'center' }}>
                <Link
                  component="button"
                  variant="body2"
                  onClick={() => navigate('/login')}
                  disabled={isLoading}
                  sx={{
                    color: '#dc3545',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    '&:hover': {
                      color: '#e74c3c',
                      textDecoration: 'underline',
                    },
                    '&:disabled': {
                      color: '#6c757d',
                    },
                  }}
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
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, mb: 2 }}>
                <Button 
                  onClick={handleResendOtp}
                  disabled={resendLoading || isOtpLoading}
                  variant="outlined"
                  startIcon={resendLoading ? <CircularProgress size={18} sx={{ color: 'rgba(220, 53, 69, 0.8)' }} /> : null}
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
                >
                  {resendLoading ? 'Đang gửi...' : 'Gửi lại OTP'}
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  disabled={isOtpLoading || resendLoading}
                  startIcon={isOtpLoading ? <CircularProgress size={18} sx={{ color: '#ffffff' }} /> : null}
                  sx={{ 
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