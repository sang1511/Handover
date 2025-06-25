import React, { useEffect, useRef } from 'react';

const toastBaseStyle = {
  position: 'fixed',
  top: '32px',
  right: '32px',
  zIndex: 9999,
  minWidth: '220px',
  background: '#a8e063',
  color: '#fff',
  padding: '18px 36px 18px 22px',
  borderRadius: '14px',
  fontWeight: 700,
  fontSize: '1.18em',
  boxShadow: '0 8px 32px rgba(40,167,69,0.18)',
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  pointerEvents: 'none',
  opacity: 1,
  transition: 'opacity 0.4s cubic-bezier(.4,0,.2,1)',
};

const iconStyle = {
  width: '28px',
  height: '28px',
  flexShrink: 0,
  filter: 'drop-shadow(0 2px 6px rgba(40,167,69,0.18))',
};

export default function CopyToast({ show, message, onClose }) {
  const toastRef = useRef();

  useEffect(() => {
    if (show) {
      toastRef.current && (toastRef.current.style.opacity = 1);
      const timer = setTimeout(() => {
        if (toastRef.current) toastRef.current.style.opacity = 0;
        setTimeout(() => onClose && onClose(), 400);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;
  return (
    <div ref={toastRef} style={toastBaseStyle}>
      <img src="https://img.icons8.com/color/48/000000/ok--v1.png" alt="ok" style={iconStyle} />
      {message || 'Đã sao chép!'}
    </div>
  );
} 