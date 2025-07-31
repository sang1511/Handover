import React, { useEffect, useRef } from 'react';

const toastStyle = {
  position: 'fixed',
  top: 32,
  right: 32,
  minWidth: 340,
  maxWidth: 420,
  background: '#fffbe6',
  color: '#222',
  padding: '18px 28px',
  borderRadius: 10,
  fontWeight: 400,
  fontSize: 15,
  zIndex: 9999,
  boxShadow: '0 4px 24px rgba(251,191,36,0.08)',
  borderLeft: '4px solid #facc15',
  display: 'flex',
  alignItems: 'flex-start',
  gap: 16,
  opacity: 1,
  transition: 'opacity 0.4s cubic-bezier(.4,0,.2,1)',
  pointerEvents: 'none',
};

const iconStyle = {
  flexShrink: 0,
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: '#facc15',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 2,
};

const WarningToast = ({ show, message, onClose, duration = 1800 }) => {
  const toastRef = useRef();
  useEffect(() => {
    if (show) {
      toastRef.current && (toastRef.current.style.opacity = 1);
      const timer = setTimeout(() => {
        if (toastRef.current) toastRef.current.style.opacity = 0;
        setTimeout(() => onClose && onClose(), 400);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, onClose, duration]);
  if (!show) return null;
  if (!show) return null;
  return (
    <div
      ref={toastRef}
      style={{
        ...toastStyle,
        opacity: show ? 1 : 0,
        pointerEvents: 'none',
      }}
    >
      <span style={iconStyle}>
        {/* Warning triangle icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <polygon points="12,3 22,20 2,20" fill="#facc15" stroke="#fff" strokeWidth="2" />
          <rect x="11" y="9" width="2" height="5.5" rx="1" fill="#fff" />
          <rect x="11" y="16" width="2" height="2" rx="1" fill="#fff" />
        </svg>
      </span>
      <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}>
        <div style={{fontWeight: 700, color: '#b45309', fontSize: 17, marginBottom: 2}}>Warning</div>
        <div style={{fontSize: 15, color: '#222'}}>{message || 'Cảnh báo!'}</div>
      </div>
    </div>
  );
};

export default WarningToast;
