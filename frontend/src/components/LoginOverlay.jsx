import { useState, useRef } from 'react';
import {
  Box, Paper, Stack, TextField, Button, IconButton, Avatar,
  Typography, InputAdornment, Divider, Tooltip, ClickAwayListener,
  CircularProgress, Alert, Tabs, Tab,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import PersonIcon from '@mui/icons-material/Person';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

import { login, register, logout, isAuthenticated, getStoredUser } from '../api/auth';

const emptyFieldErrors = () => ({
  userName: '',
  password: '',
  passwordConfirm: '',
  displayName: '',
});

export default function LoginOverlay({ onAuthChange }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState(emptyFieldErrors);
  const [loggedIn, setLoggedIn] = useState(isAuthenticated);
  const [user, setUser] = useState(getStoredUser);
  const anchorRef = useRef(null);

  const resetForm = () => {
    setUserName('');
    setPassword('');
    setPasswordConfirm('');
    setDisplayName('');
    setError('');
    setErrorCode('');
    setFieldErrors(emptyFieldErrors());
  };

  const togglePanel = () => {
    setOpen((p) => !p);
    setError('');
    setErrorCode('');
    setFieldErrors(emptyFieldErrors());
  };

  const applyApiError = (err, fallback) => {
    const fields = err?.fieldErrors ?? {};
    setFieldErrors({ ...emptyFieldErrors(), ...fields });
    setError(err?.message ?? fallback);
    setErrorCode(err?.code ?? '');
  };

  const clearFieldError = (field) => {
    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    if (field === 'userName') setErrorCode('');
    setError('');
  };

  const closePanel = () => setOpen(false);

  const validateLogin = () => {
    const next = emptyFieldErrors();
    let ok = true;
    if (!userName.trim()) {
      next.userName = 'Kullanıcı adı zorunludur.';
      ok = false;
    }
    if (!password) {
      next.password = 'Şifre zorunludur.';
      ok = false;
    }
    setFieldErrors(next);
    if (!ok) setError('Lütfen zorunlu alanları doldurun.');
    return ok;
  };

  const validateRegister = () => {
    const next = emptyFieldErrors();
    let ok = true;
    if (!userName.trim()) {
      next.userName = 'Kullanıcı adı zorunludur.';
      ok = false;
    } else if (userName.trim().length > 100) {
      next.userName = 'Kullanıcı adı en fazla 100 karakter olabilir.';
      ok = false;
    }
    if (!password) {
      next.password = 'Şifre zorunludur.';
      ok = false;
    } else if (password.length < 6) {
      next.password = 'Şifre en az 6 karakter olmalıdır.';
      ok = false;
    }
    if (!passwordConfirm) {
      next.passwordConfirm = 'Şifre tekrarı zorunludur.';
      ok = false;
    } else if (password !== passwordConfirm) {
      next.passwordConfirm = 'Şifreler eşleşmiyor.';
      ok = false;
    }
    if (displayName.trim().length > 200) {
      next.displayName = 'Görünen ad en fazla 200 karakter olabilir.';
      ok = false;
    }
    setFieldErrors(next);
    if (!ok) setError('Lütfen işaretli alanları düzeltin.');
    return ok;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setErrorCode('');
    if (!validateLogin()) return;

    setLoading(true);
    try {
      await login(userName.trim(), password);
      setLoggedIn(true);
      setUser(getStoredUser());
      setOpen(false);
      resetForm();
      onAuthChange?.();
    } catch (err) {
      applyApiError(err, 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setErrorCode('');
    if (!validateRegister()) return;

    setLoading(true);
    try {
      await register(userName.trim(), password, displayName.trim() || undefined);
      setLoggedIn(true);
      setUser(getStoredUser());
      setOpen(false);
      resetForm();
      onAuthChange?.();
    } catch (err) {
      applyApiError(err, 'Kayıt başarısız.');
    } finally {
      setLoading(false);
    }
  };

  const isUsernameConflict = errorCode === 'CONFLICT' && tab === 1;

  const handleLogout = () => {
    logout();
    setLoggedIn(false);
    setUser(null);
    setOpen(false);
    onAuthChange?.();
  };

  const isAdmin = user?.roles?.includes('Admin');

  const passwordField = (value, onChange, show, setShow, label, fieldKey) => (
    <TextField
      label={label}
      type={show ? 'text' : 'password'}
      value={value}
      onChange={(e) => {
        onChange(e);
        clearFieldError(fieldKey);
      }}
      size="small"
      fullWidth
      disabled={loading}
      error={Boolean(fieldErrors[fieldKey])}
      helperText={fieldErrors[fieldKey] || undefined}
      InputProps={{
        endAdornment: (
          <InputAdornment position="end">
            <IconButton size="small" onClick={() => setShow((p) => !p)} edge="end">
              {show ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );

  const showFormAlert = error && !Object.values(fieldErrors).some(Boolean);

  return (
    <ClickAwayListener onClickAway={closePanel}>
      <Box sx={{ position: 'relative' }}>
        <Tooltip title={loggedIn ? user?.userName ?? 'Profil' : 'Giriş / Kayıt'} placement="bottom">
          <IconButton
            ref={anchorRef}
            onClick={togglePanel}
            sx={{
              width: 48,
              height: 48,
              backgroundColor: open ? '#424242' : '#616161',
              color: '#fff',
              '&:hover': { backgroundColor: '#424242' },
            }}
          >
            {loggedIn ? (
              <Avatar sx={{ width: 32, height: 32, bgcolor: isAdmin ? '#1565c0' : '#2e7d32', fontSize: 14 }}>
                {user?.userName?.[0]?.toUpperCase() ?? 'U'}
              </Avatar>
            ) : (
              <LoginIcon />
            )}
          </IconButton>
        </Tooltip>

        {open && (
          <Paper
            elevation={8}
            sx={{
              position: 'absolute',
              top: 56,
              right: 0,
              width: 320,
              borderRadius: 2,
              overflow: 'hidden',
              zIndex: 1200,
            }}
          >
            {loggedIn ? (
              <Stack spacing={0}>
                <Box sx={{ bgcolor: '#424242', px: 2.5, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ bgcolor: isAdmin ? '#1565c0' : '#2e7d32', width: 40, height: 40 }}>
                    {user?.userName?.[0]?.toUpperCase() ?? 'U'}
                  </Avatar>
                  <Box>
                    <Typography sx={{ color: '#fff', fontWeight: 600, lineHeight: 1.3 }}>
                      {user?.displayName || user?.userName}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#bdbdbd' }}>
                      {isAdmin ? 'Yönetici (Admin)' : 'Kullanıcı (User)'}
                    </Typography>
                  </Box>
                  {isAdmin && <AdminPanelSettingsIcon sx={{ color: '#90caf9', ml: 'auto' }} />}
                </Box>
                <Divider />
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">Kullanıcı adı:</Typography>
                    <Typography variant="body2" fontWeight={600}>{user?.userName}</Typography>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <AdminPanelSettingsIcon fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">Rol:</Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {user?.roles?.join(', ') ?? '-'}
                    </Typography>
                  </Stack>
                </Box>
                <Divider />
                <Box sx={{ p: 1.5 }}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    size="small"
                  >
                    Çıkış Yap
                  </Button>
                </Box>
              </Stack>
            ) : (
              <>
                <Tabs
                  value={tab}
                  onChange={(_, v) => {
                    setTab(v);
                    setError('');
                    setErrorCode('');
                    setFieldErrors(emptyFieldErrors());
                  }}
                  variant="fullWidth"
                  sx={{
                    bgcolor: '#424242',
                    minHeight: 44,
                    '& .MuiTab-root': { color: '#bdbdbd', minHeight: 44 },
                    '& .Mui-selected': { color: '#fff' },
                    '& .MuiTabs-indicator': { bgcolor: '#fff' },
                  }}
                >
                  <Tab icon={<LoginIcon fontSize="small" />} iconPosition="start" label="Giriş Yap" />
                  <Tab icon={<PersonAddIcon fontSize="small" />} iconPosition="start" label="Kayıt Ol" />
                </Tabs>

                {tab === 0 ? (
                  <Box component="form" onSubmit={handleLogin}>
                    <Stack spacing={2} sx={{ p: 2.5 }}>
                      {showFormAlert && (
                        <Alert severity="error" sx={{ py: 0.5 }}>{error}</Alert>
                      )}
                      <TextField
                        label="Kullanıcı Adı"
                        value={userName}
                        onChange={(e) => {
                          setUserName(e.target.value);
                          clearFieldError('userName');
                        }}
                        size="small"
                        fullWidth
                        autoFocus
                        disabled={loading}
                        error={Boolean(fieldErrors.userName)}
                        helperText={fieldErrors.userName || undefined}
                      />
                      {passwordField(
                        password,
                        (e) => setPassword(e.target.value),
                        showPass,
                        setShowPass,
                        'Şifre',
                        'password',
                      )}
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading}
                        sx={{ bgcolor: '#424242', '&:hover': { bgcolor: '#212121' }, py: 1 }}
                      >
                        {loading ? <CircularProgress size={20} color="inherit" /> : 'GİRİŞ YAP'}
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Box component="form" onSubmit={handleRegister}>
                    <Stack spacing={2} sx={{ p: 2.5 }}>
                      {(showFormAlert || isUsernameConflict) && (
                        <Alert severity={isUsernameConflict ? 'warning' : 'error'} sx={{ py: 0.5 }}>
                          {error}
                        </Alert>
                      )}
                      <TextField
                        label="Kullanıcı Adı"
                        value={userName}
                        onChange={(e) => {
                          setUserName(e.target.value);
                          clearFieldError('userName');
                        }}
                        size="small"
                        fullWidth
                        autoFocus
                        disabled={loading}
                        error={Boolean(fieldErrors.userName) || isUsernameConflict}
                        helperText={
                          fieldErrors.userName
                          || (isUsernameConflict ? error : undefined)
                        }
                      />
                      <TextField
                        label="Görünen Ad (isteğe bağlı)"
                        value={displayName}
                        onChange={(e) => {
                          setDisplayName(e.target.value);
                          clearFieldError('displayName');
                        }}
                        size="small"
                        fullWidth
                        disabled={loading}
                        error={Boolean(fieldErrors.displayName)}
                        helperText={fieldErrors.displayName || undefined}
                      />
                      {passwordField(
                        password,
                        (e) => setPassword(e.target.value),
                        showPass,
                        setShowPass,
                        'Şifre (en az 6 karakter)',
                        'password',
                      )}
                      {passwordField(
                        passwordConfirm,
                        (e) => setPasswordConfirm(e.target.value),
                        showPass2,
                        setShowPass2,
                        'Şifre Tekrar',
                        'passwordConfirm',
                      )}
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading}
                        sx={{ bgcolor: '#424242', '&:hover': { bgcolor: '#212121' }, py: 1 }}
                      >
                        {loading ? <CircularProgress size={20} color="inherit" /> : 'KAYIT OL'}
                      </Button>
                    </Stack>
                  </Box>
                )}
              </>
            )}
          </Paper>
        )}
      </Box>
    </ClickAwayListener>
  );
}
