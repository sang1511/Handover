import React, { useEffect, useRef } from 'react';

const toastStyle = {
  position: 'fixed',
  top: 32,
  right: 32,
  minWidth: 340,
  maxWidth: 420,
  background: '#f0f9eb',
  color: '#222',
  padding: '18px 28px',
  borderRadius: 10,
  fontWeight: 400,
  fontSize: 15,
  zIndex: 9999,
  boxShadow: '0 4px 24px rgba(34,197,94,0.08)',
  borderLeft: '4px solid #22c55e',
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
  background: '#22c55e',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginTop: 2,
};

const SuccessToast = ({ show, message, onClose, duration = 1800 }) => {
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
  return (
    <div ref={toastRef} style={toastStyle}>
      <span style={iconStyle}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="10" fill="#22c55e"/>
          <path d="M6 10.5l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <div style={{display:'flex', flexDirection:'column', alignItems:'flex-start'}}>
        <div style={{fontWeight: 700, color: '#166534', fontSize: 17, marginBottom: 2}}>Success</div>
        <div style={{fontSize: 15, color: '#222'}}>{message || 'Thành công!'}</div>
      </div>
    </div>
  );
};

export default SuccessToast; 