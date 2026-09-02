import React, { useEffect } from 'react';

// A centered, professional alert dialog for hard stops the customer needs to
// read and acknowledge - a blocked transfer, a restricted account at sign-in,
// etc. Deliberately not a toast: these messages must not disappear on their own.
//
//   variant: 'error' (default) | 'warning' | 'success' | 'info'
//   title:   short heading, e.g. "Transfer Error"
//   message: the exact reason, usually straight from the API response
//   onClose: called when the button / backdrop / Esc dismisses the dialog

const VARIANTS = {
  error: { icon: 'fa-xmark', color: '#D94352', ring: 'rgba(217,67,82,0.12)' },
  warning: { icon: 'fa-triangle-exclamation', color: '#E8A838', ring: 'rgba(232,168,56,0.14)' },
  success: { icon: 'fa-check', color: '#2D9B4E', ring: 'rgba(45,155,78,0.14)' },
  info: { icon: 'fa-info', color: '#C9A84C', ring: 'rgba(201,168,76,0.16)' },
};

const AlertDialog = ({
  open,
  variant = 'error',
  title,
  message,
  buttonLabel = 'OK',
  onClose,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const v = VARIANTS[variant] || VARIANTS.error;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        background: 'rgba(11,11,11,0.55)', backdropFilter: 'blur(6px)',
        fontFamily: "'Inter', 'Montserrat', system-ui, sans-serif",
      }}
    >
      <style>{`@keyframes alertDialogIn{from{opacity:0;transform:scale(.94) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
      <div
        style={{
          background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400,
          padding: '34px 30px 26px', textAlign: 'center',
          boxShadow: '0 30px 80px rgba(0,0,0,0.28)',
          animation: 'alertDialogIn .28s cubic-bezier(.16,1,.3,1)',
        }}
      >
        <div
          style={{
            width: 66, height: 66, borderRadius: '50%', margin: '0 auto',
            background: v.ring, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <i className={`fas ${v.icon}`} style={{ fontSize: 28, color: v.color }} />
        </div>

        <h3 style={{ fontSize: 19, fontWeight: 700, color: '#0B0B0B', margin: '18px 0 0' }}>
          {title}
        </h3>

        <p style={{ fontSize: 13.5, lineHeight: 1.6, color: '#8a2b36', margin: '10px 0 0' }}>
          {message}
        </p>

        <button
          type="button"
          onClick={onClose}
          autoFocus
          style={{
            marginTop: 24, width: '100%', padding: '12px 16px', borderRadius: 10,
            border: 'none', background: '#0B0B0B', color: '#fff',
            fontSize: 13, fontWeight: 700, letterSpacing: 0.3, cursor: 'pointer',
            transition: 'background .2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#1f1f1f'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = '#0B0B0B'; }}
        >
          {buttonLabel}
        </button>
      </div>
    </div>
  );
};

export default AlertDialog;
