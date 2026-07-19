import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { login } from '../api'; // <-- IMPORT THE LOGIN FUNCTION

// ----- useToast hook (unchanged) -----
function useToast() {
  const [toast, setToast] = useState(null);
  const timeoutRef = useRef(null);

  const showToast = (msg) => {
    setToast(msg);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  return { toast, showToast };
}

// ----- flagClass helper (unchanged) -----
const flagClass = (code) => {
  const map = {
    us: 'flag-icon-us',
    gb: 'flag-icon-gb',
    eu: 'flag-icon-eu',
    jp: 'flag-icon-jp',
    ca: 'flag-icon-ca',
    ch: 'flag-icon-ch',
    za: 'flag-icon-za',
    au: 'flag-icon-au',
    ng: 'flag-icon-ng',
    ke: 'flag-icon-ke',
    in: 'flag-icon-in',
    br: 'flag-icon-br',
    mx: 'flag-icon-mx',
    ae: 'flag-icon-ae',
    sg: 'flag-icon-sg',
    kr: 'flag-icon-kr',
    cn: 'flag-icon-cn',
    se: 'flag-icon-se',
    no: 'flag-icon-no',
    dk: 'flag-icon-dk',
  };
  return map[code] || '';
};

// ----- Main Component -----
export default function LandingPage() {
  // --- Expandables ---
  const [expanded, setExpanded] = useState({
    businessExpand: false,
    cardsExpand: false,
    savingsExpand: false,
    mobileApp: false,
    transparency: false,
    blog1: false,
    blog2: false,
    blog3: false,
  });

  const toggleExpand = (id) =>
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));

  // --- Mobile menu ---
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  // --- Apply modal ---
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyProduct, setApplyProduct] = useState('');
  const [applyForm, setApplyForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    product_interested_in: 'Business Account',
    message: '',
  });
  const [applying, setApplying] = useState(false);

  const openApplyModal = (product) => {
    setApplyProduct(product || '');
    setApplyForm((prev) => {
      const next = { ...prev };
      if (product) {
        next.product_interested_in = product;
      }
      return next;
    });
    setApplyOpen(true);
  };

  const closeApplyModal = () => setApplyOpen(false);

  // --- Login form ---
  const [loginForm, setLoginForm] = useState({
    identifier: '',
    password: '',
    saveUser: false,
    showPassword: false,
  });

  const { toast, showToast } = useToast();

  // --- Google translate ---
  useEffect(() => {
    const scriptId = 'google-translate-script';
    if (!document.getElementById(scriptId)) {
      const script = document.createElement('script');
      script.id = scriptId;
      script.type = 'text/javascript';
      script.async = true;
      script.src =
        'https://translate.google.com/translate_a/element.js?cb=googleTranslateInitCallback';
      document.head.appendChild(script);
    }

    window.googleTranslateInitCallback = () => {
      try {
        if (!window.google || !window.google.translate) return;
        // eslint-disable-next-line no-new
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            autoDisplay: true,
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
          },
          'google_translate_element'
        );
      } catch (e) {
        // ignore
      }
    };

    return () => {
      // no-op
    };
  }, []);

  // ---- UPDATED: use the imported `login` function ----
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const identifier = loginForm.identifier.trim();
    const password = loginForm.password;
    if (!identifier || !password) return;

    try {
      const data = await login(identifier, password);

      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      showToast('✅ Login successful');
      window.location.href = '/dashboard';
    } catch (err) {
      showToast(err.message || 'Login error. Check backend connection.');
    }
  };

  const handleTogglePassword = () =>
    setLoginForm((p) => ({ ...p, showPassword: !p.showPassword }));

  const handleApplySubmit = async (e) => {
    e.preventDefault();

    const { full_name, email, phone, product_interested_in, message } = applyForm;
    if (!full_name || !email || !phone || !product_interested_in) {
      showToast('❌ Please fill in all required fields.');
      return;
    }

    setApplying(true);
    try {
      showToast('Submitting...');

      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name,
          email,
          phone,
          product_interested_in,
          message: message || null,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        showToast(data.message || '❌ Application failed to submit.');
        return;
      }

      closeApplyModal();
      showToast("✅ Application submitted successfully! We'll contact you within 24 hours.");
    } catch (err) {
      showToast('❌ Network/server error. Check backend connection.');
    } finally {
      setApplying(false);
    }
  };

  const toastNode = useMemo(() => {
    if (!toast) return null;
    return (
      <div
        id="toast"
        style={{
          position: 'fixed',
          bottom: 30,
          right: 30,
          background: '#0B0B0B',
          color: '#fff',
          padding: '12px 24px',
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 500,
          boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          zIndex: 99999,
          borderLeft: '4px solid #C9A84C',
          opacity: 1,
          transform: 'translateY(0)',
        }}
      >
        <span>{toast}</span>
      </div>
    );
  }, [toast]);

  return (
    <>
      {/* ===== STYLES (unchanged) ===== */}
      <style>{`
        .goog-te-banner-frame{display:none!important}
        body{top:0!important}
        #google_translate_element{display:inline-block}
        #google_translate_element select.goog-te-combo{font-size:.65rem;font-weight:600;color:#1A1A1A;text-transform:uppercase;letter-spacing:.05em;background:transparent;border:1px solid #E8E2D9;border-radius:4px;padding:4px 8px;cursor:pointer;outline:none;font-family:'Inter',system-ui,sans-serif;min-width:120px}
        #google_translate_element select.goog-te-combo:hover{border-color:#C9A84C}
        .goog-te-gadget-simple{background:transparent!important;border:none!important;padding:0!important}
        .goog-te-gadget-simple .goog-te-menu-value{font-size:.65rem!important;font-weight:600!important;color:#1A1A1A!important;text-transform:uppercase!important;letter-spacing:.05em!important;background:transparent!important;border:none!important;padding:0!important}
        .goog-te-gadget-simple .goog-te-menu-value span{color:#1A1A1A!important}
        .goog-te-gadget-simple .goog-te-menu-value span:first-child{display:none!important}

        .mobile-menu{position:fixed;top:0;right:-100%;width:300px;height:100vh;background:#0B0B0B;z-index:1000;transition:right .4s cubic-bezier(.16,1,.3,1);padding:2.5rem}
        .mobile-menu.open{right:0}
        .backdrop{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);z-index:999;opacity:0;visibility:hidden;transition:.3s}
        .backdrop.visible{opacity:1;visibility:visible}
        .hero-split-bg{background-image:linear-gradient(rgba(11,11,11,0.60),rgba(11,11,11,0.85)),url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80');background-size:cover;background-position:center 30%}
        .ad-card{transition:transform .3s ease,box-shadow .3s ease}
        .ad-card:hover{transform:translateY(-4px);box-shadow:0 20px 40px rgba(0,0,0,0.1)}
        .service-card{transition:all .3s ease}
        .service-card:hover{transform:translateY(-4px);box-shadow:0 12px 30px rgba(0,0,0,0.06);border-color:#C9A84C}
        .trust-badge{transition:all .3s ease}
        .trust-badge:hover{transform:translateY(-2px)}

        .flag-icon{width:24px;height:16px;border-radius:2px;display:inline-block;vertical-align:middle;background-size:cover;background-position:center;border:1px solid rgba(0,0,0,0.06)}
        .flag-icon-us{background-image:url('https://flagcdn.com/w20/us.png')}
        .flag-icon-gb{background-image:url('https://flagcdn.com/w20/gb.png')}
        .flag-icon-eu{background-image:url('https://flagcdn.com/w20/eu.png')}
        .flag-icon-jp{background-image:url('https://flagcdn.com/w20/jp.png')}
        .flag-icon-ca{background-image:url('https://flagcdn.com/w20/ca.png')}
        .flag-icon-ch{background-image:url('https://flagcdn.com/w20/ch.png')}
        .flag-icon-za{background-image:url('https://flagcdn.com/w20/za.png')}
        .flag-icon-au{background-image:url('https://flagcdn.com/w20/au.png')}
        .flag-icon-ng{background-image:url('https://flagcdn.com/w20/ng.png')}
        .flag-icon-ke{background-image:url('https://flagcdn.com/w20/ke.png')}
        .flag-icon-in{background-image:url('https://flagcdn.com/w20/in.png')}
        .flag-icon-br{background-image:url('https://flagcdn.com/w20/br.png')}
        .flag-icon-mx{background-image:url('https://flagcdn.com/w20/mx.png')}
        .flag-icon-ae{background-image:url('https://flagcdn.com/w20/ae.png')}
        .flag-icon-sg{background-image:url('https://flagcdn.com/w20/sg.png')}
        .flag-icon-kr{background-image:url('https://flagcdn.com/w20/kr.png')}
        .flag-icon-cn{background-image:url('https://flagcdn.com/w20/cn.png')}
        .flag-icon-se{background-image:url('https://flagcdn.com/w20/se.png')}
        .flag-icon-no{background-image:url('https://flagcdn.com/w20/no.png')}
        .flag-icon-dk{background-image:url('https://flagcdn.com/w20/dk.png')}

        .no-bullets{list-style:none;padding-left:0}
        html{scroll-behavior:smooth}
        .logo-svg{height:40px;width:auto}
        .gold-gradient{background:linear-gradient(135deg,#C9A84C 0%,#D9C06E 50%,#A8893A 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
        .corporate-pattern{background-image:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A84C' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")}
        .review-avatar{width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #C9A84C}

        .modal-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);z-index:9999;align-items:center;justify-content:center;padding:20px}
        .modal-overlay.active{display:flex}
        .modal-box{background:#fff;border-radius:16px;max-width:580px;width:100%;padding:32px;box-shadow:0 30px 80px rgba(0,0,0,0.3);animation:modalIn .3s ease;max-height:90vh;overflow-y:auto}
        @keyframes modalIn{from{opacity:0;transform:scale(.95) translateY(30px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .modal-box .modal-close{float:right;background:none;border:none;font-size:28px;color:#8a8a8a;cursor:pointer;transition:color .2s;line-height:1}
        .modal-box .modal-close:hover{color:#0B0B0B}
        .modal-box h2{font-size:22px;font-weight:700;color:#0B0B0B;margin-bottom:6px}
        .modal-box p.sub{color:#5A5A5A;font-size:13px;margin-bottom:20px}
        .modal-box .form-group{margin-bottom:14px}
        .modal-box .form-group label{display:block;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#5A5A5A;margin-bottom:4px}
        .modal-box .form-group input,.modal-box .form-group select{width:100%;padding:10px 14px;border:1px solid #E8E2D9;border-radius:8px;font-size:14px;background:#faf9f7;outline:none;transition:border .2s;font-family:'Inter',system-ui,sans-serif}
        .modal-box .form-group input:focus,.modal-box .form-group select:focus{border-color:#C9A84C;box-shadow:0 0 0 3px rgba(201,168,76,.12)}
        .modal-box .btn-submit{width:100%;background:#0B0B0B;color:#fff;padding:12px;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;transition:background .2s;text-transform:uppercase;letter-spacing:.5px}
        .modal-box .btn-submit:hover{background:#1A1A1A}

        .expand-content{display:none;animation:fadeIn .3s ease}
        .expand-content.open{display:block}
        .expand-trigger{cursor:pointer;color:#C9A84C;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
        .expand-trigger:hover{color:#A8893A}

        .detail-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px}
        .detail-item{background:#faf9f7;border:1px solid #f0ede8;border-radius:8px;padding:10px 14px}
        .detail-item .label{font-size:9px;text-transform:uppercase;font-weight:600;color:#8a8a8a;letter-spacing:.3px}
        .detail-item .value{font-size:14px;font-weight:700;color:#0B0B0B}
        .detail-item .value .highlight{color:#2D9B4E}

        @media (max-width:640px){.detail-grid{grid-template-columns:1fr}.modal-box{padding:20px}}
      `}</style>

      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-brand-border shadow-sm">
        <div className="container mx-auto px-6 lg:px-12 py-4 flex items-center justify-between">
          {/* Logo – Link to home */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <svg className="logo-svg" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 30 L30 10 L50 30 L40 30 L30 18 L20 30 L10 30Z" fill="#C9A84C" />
              <path d="M70 30 L90 10 L110 30 L100 30 L90 18 L80 30 L70 30Z" fill="#C9A84C" />
              <rect x="32" y="24" width="2" height="6" fill="#C9A84C" />
              <rect x="34" y="26" width="2" height="4" fill="#C9A84C" />
              <rect x="36" y="28" width="2" height="2" fill="#C9A84C" />
              <text x="46" y="26" fontFamily="Montserrat, sans-serif" fontWeight="800" fontSize="20" fill="#0B0B0B" letterSpacing="2">
                SUMMIT
              </text>
              <text x="46" y="36" fontFamily="Inter, sans-serif" fontWeight="500" fontSize="8" fill="#5A5A5A" letterSpacing="3">
                SHARES
              </text>
              <circle cx="120" cy="20" r="4" fill="#C9A84C" opacity="0.3" />
            </svg>
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-[11px] font-bold uppercase tracking-wider text-brand-slateText">
            <Link to="/" className="text-brand-dark border-b-2 border-brand-gold pb-1">
              Home
            </Link>
            <a href="#business" className="hover:text-brand-gold transition-colors">
              Business
            </a>
            <a href="#personal" className="hover:text-brand-gold transition-colors">
              Personal
            </a>
            <a href="#credit-cards" className="hover:text-brand-gold transition-colors">
              Cards
            </a>
            <a href="#loans" className="hover:text-brand-gold transition-colors">
              Loans
            </a>
            <a href="#support" className="hover:text-brand-gold transition-colors">
              Support
            </a>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <div id="google_translate_element" />
          </div>

          <button
            id="menuToggle"
            className="lg:hidden text-brand-dark focus:outline-none p-1"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      {/* ===== MOBILE SIDENAV ===== */}
      <div
        className={`backdrop ${menuOpen ? 'visible' : ''}`}
        onClick={() => setMenuOpen(false)}
        id="menuBackdrop"
        aria-hidden={!menuOpen}
      />
      <div className={`mobile-menu flex flex-col ${menuOpen ? 'open' : ''}`} id="sideMenu" aria-hidden={!menuOpen}>
        <div className="flex justify-between items-center pb-6 border-b border-neutral-800">
          <span className="text-lg font-bold tracking-tight text-white">Summit Shares</span>
          <button id="closeMenuBtn" className="text-slate-400 hover:text-white text-2xl" onClick={() => setMenuOpen(false)}>
            &times;
          </button>
        </div>
        <nav className="flex flex-col gap-6 mt-8 text-xs font-semibold uppercase tracking-wider text-slate-300">
          <Link to="/" className="text-white font-bold" onClick={() => setMenuOpen(false)}>
            Home
          </Link>
          <a href="#business" className="hover:text-brand-gold transition-colors" onClick={() => setMenuOpen(false)}>
            Business
          </a>
          <a href="#personal" className="hover:text-brand-gold transition-colors" onClick={() => setMenuOpen(false)}>
            Personal
          </a>
          <a href="#credit-cards" className="hover:text-brand-gold transition-colors" onClick={() => setMenuOpen(false)}>
            Cards
          </a>
          <a href="#loans" className="hover:text-brand-gold transition-colors" onClick={() => setMenuOpen(false)}>
            Loans
          </a>
          <a href="#support" className="hover:text-brand-gold transition-colors" onClick={() => setMenuOpen(false)}>
            Support
          </a>
        </nav>
        <div className="mt-auto pt-6 border-t border-neutral-800 text-[11px] text-slate-500">
          <p>&copy; 2026 Summit Shares</p>
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <main className="font-sans antialiased bg-white text-slate-800 corporate-pattern">
        {/* ===== HERO ===== */}
        <section className="hero-split-bg min-h-[620px] flex items-center py-12 lg:py-20 relative" id="home">
          <div className="container mx-auto px-6 lg:px-12 grid lg:grid-cols-12 gap-12 items-center relative z-10">
            <div className="lg:col-span-7 text-white space-y-6">
              <span className="text-[10px] uppercase tracking-widest font-extrabold bg-brand-gold px-3 py-1.5 inline-block text-white">
                Global Digital Finance
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight leading-tight text-white">
                Simple. Quick. <br />
                <span className="font-bold text-white">Secured.</span>
              </h1>
              <p className="text-white/80 text-sm sm:text-base max-w-xl font-light leading-relaxed">Transfer money across the world in real time.</p>
              <p className="text-white/50 text-xs max-w-xl leading-relaxed">
                Summit Shares transformed the digital finance industry using data and technology more than ten years ago. We are now one of the largest digital finance providers, dedicated to innovating, simplifying, and humanizing finance.
              </p>

              <div className="grid grid-cols-3 gap-4 pt-6 max-w-md border-t border-white/20">
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white">18.5M+</h3>
                  <p className="text-[9px] text-white/50 uppercase tracking-widest font-bold mt-1">Active Users</p>
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white">190+</h3>
                  <p className="text-[9px] text-white/50 uppercase tracking-widest font-bold mt-1">Countries</p>
                </div>
                <div>
                  <h3 className="text-xl lg:text-2xl font-bold text-white">$2.4B</h3>
                  <p className="text-[9px] text-white/50 uppercase tracking-widest font-bold mt-1">Transactions</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <a
                  href="#products"
                  className="bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Video
                </a>
                <span className="text-white/50 text-xs flex items-center gap-2">
                  <svg className="w-4 h-4 text-brand-gold" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  Need help? Contact our digital support
                </span>
              </div>
            </div>

            {/* Sign In / Enroll Card */}
            <div className="lg:col-span-5 w-full max-w-md mx-auto bg-white/95 backdrop-blur-sm rounded-sm shadow-2xl border border-brand-border p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="text-lg font-bold text-brand-dark uppercase tracking-tight">Welcome to Summit Shares</h2>
                <div className="w-12 h-[2px] bg-brand-gold mt-2" />
                <p className="text-brand-slateText text-xs mt-2">Sign on to manage your accounts or enroll now.</p>
              </div>

              <form className="space-y-4 text-xs" onSubmit={handleLoginSubmit}>
                <div>
                  <label className="block text-brand-dark font-bold uppercase tracking-wider mb-1.5">Username or Email</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-slate-50 border border-brand-border rounded-sm p-3 text-brand-dark focus:outline-none focus:border-brand-gold text-xs transition"
                    placeholder="Enter your username"
                    value={loginForm.identifier}
                    onChange={(e) => setLoginForm((p) => ({ ...p, identifier: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-brand-dark font-bold uppercase tracking-wider">Password</label>
                    <button type="button" onClick={handleTogglePassword} className="text-brand-gold hover:underline font-bold text-xs">
                      {loginForm.showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    id="loginPassword"
                    type={loginForm.showPassword ? 'text' : 'password'}
                    required
                    className="w-full bg-slate-50 border border-brand-border rounded-sm p-3 text-brand-dark focus:outline-none focus:border-brand-gold text-xs transition"
                    placeholder="Enter your password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
                  />
                </div>

                <div className="flex items-center gap-2 py-1">
                  <input
                    type="checkbox"
                    id="saveUser"
                    checked={loginForm.saveUser}
                    onChange={(e) => setLoginForm((p) => ({ ...p, saveUser: e.target.checked }))}
                    className="w-4 h-4 text-brand-dark border-brand-border focus:ring-brand-dark cursor-pointer"
                  />
                  <label htmlFor="saveUser" className="text-brand-slateText font-medium text-xs select-none cursor-pointer">
                    Save username
                  </label>
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-brand-dark hover:bg-neutral-900 text-white font-bold py-3.5 px-6 rounded-sm text-center tracking-wider uppercase text-[11px] transition"
                  >
                    Sign In
                  </button>
                  <Link
                    to="/enroll"
                    className="flex-1 border border-brand-dark text-brand-dark hover:bg-slate-50 font-bold py-3.5 px-6 rounded-sm text-center tracking-wider uppercase text-[11px] transition"
                  >
                    Enroll
                  </Link>
                </div>
              </form>

              <div className="mt-6 pt-5 border-t border-brand-border flex flex-col gap-2.5 text-xs font-semibold text-brand-dark">
                <Link to="/forgot-password" className="hover:text-brand-gold transition-colors">
                  Forgot username or password?
                </Link>
                <a href="#" onClick={(e) => e.preventDefault()} className="hover:text-brand-gold transition-colors text-brand-slateText">
                  Privacy, Cookies, and Legal
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRUST & SECURITY BADGES (unchanged) ===== */}
        <section className="py-8 bg-white border-b border-brand-border">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 text-xs font-semibold uppercase tracking-wider text-brand-slateText">
              <span className="flex items-center gap-2 trust-badge">
                <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                FDIC Insured
              </span>
              <span className="flex items-center gap-2 trust-badge">
                <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                256-bit Encryption
              </span>
              <span className="flex items-center gap-2 trust-badge">
                <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Global 24/7 Support
              </span>
              <span className="flex items-center gap-2 trust-badge">
                <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Regulated & Compliant
              </span>
              <span className="flex items-center gap-2 trust-badge">
                <svg className="w-4 h-4 text-brand-gold" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 14a2 2 0 110-4h4a2 2 0 110 4h-4z" />
                </svg>
                Zero Hidden Fees
              </span>
            </div>
          </div>
        </section>

        {/* ===== FEATURED IN ===== */}
        <section className="py-8 bg-brand-goldPale border-b border-brand-border">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 text-xs font-medium text-brand-slateText uppercase tracking-wider">
              <span className="text-brand-dark font-bold">As featured in</span>
              <span className="text-brand-dark/40">Financial Times</span>
              <span className="text-brand-dark/40">Bloomberg</span>
              <span className="text-brand-dark/40">Reuters</span>
              <span className="text-brand-dark/40">Forbes</span>
              <span className="text-brand-dark/40">TechCrunch</span>
            </div>
          </div>
        </section>

        {/* ===== AD BANNER ===== */}
        <section className="py-10 bg-brand-dark">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-brand-charcoal border border-neutral-800 rounded-sm p-6 text-white ad-card">
                <h4 className="font-bold text-xs uppercase tracking-widest text-brand-goldLight">Business Accounts</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">Zero monthly fees for first 6 months</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => openApplyModal('Business Account')}
                    className="text-white text-[11px] font-bold uppercase tracking-wider hover:text-brand-goldLight transition-colors bg-brand-gold/20 px-4 py-1.5 rounded-sm"
                  >
                    Apply Now &rarr;
                  </button>
                  <button
                    onClick={() => toggleExpand('businessExpand')}
                    className="text-white/60 text-[11px] font-bold uppercase tracking-wider hover:text-white transition-colors"
                  >
                    Learn More
                  </button>
                </div>
                <div id="businessExpand" className={`expand-content mt-3 text-slate-400 text-xs leading-relaxed border-t border-neutral-800 pt-3 ${expanded.businessExpand ? 'open' : ''}`}>
                  <p>
                    Our Business Account includes free wire transfers, dedicated account manager, and integration with major accounting software. Minimum opening deposit: $1,000.
                  </p>
                  <div className="detail-grid mt-2">
                    <div className="detail-item">
                      <span className="label">Monthly Fee</span>
                      <div className="value">$0 (first 6 mos)</div>
                    </div>
                    <div className="detail-item">
                      <span className="label">APY</span>
                      <div className="value">2.15%</div>
                    </div>
                    <div className="detail-item">
                      <span className="label">ATM Access</span>
                      <div className="value">55,000+</div>
                    </div>
                    <div className="detail-item">
                      <span className="label">Free Transfers</span>
                      <div className="value">Unlimited</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-brand-charcoal border border-neutral-800 rounded-sm p-6 text-white ad-card">
                <h4 className="font-bold text-xs uppercase tracking-widest text-brand-goldLight">Premium Credit Cards</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">Up to 5% cashback on all purchases</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => openApplyModal('Premium Credit Card')}
                    className="text-white text-[11px] font-bold uppercase tracking-wider hover:text-brand-goldLight transition-colors bg-brand-gold/20 px-4 py-1.5 rounded-sm"
                  >
                    Apply Now &rarr;
                  </button>
                  <button
                    onClick={() => toggleExpand('cardsExpand')}
                    className="text-white/60 text-[11px] font-bold uppercase tracking-wider hover:text-white transition-colors"
                  >
                    Learn More
                  </button>
                </div>
                <div id="cardsExpand" className={`expand-content mt-3 text-slate-400 text-xs leading-relaxed border-t border-neutral-800 pt-3 ${expanded.cardsExpand ? 'open' : ''}`}>
                  <p>
                    Earn 5% cashback on groceries, 3% on dining, and 1% on all other purchases. No annual fee for the first year. 0% intro APR on balance transfers for 15 months.
                  </p>
                  <div className="detail-grid mt-2">
                    <div className="detail-item">
                      <span className="label">Cashback</span>
                      <div className="value">Up to 5%</div>
                    </div>
                    <div className="detail-item">
                      <span className="label">Annual Fee</span>
                      <div className="value">$0 (first year)</div>
                    </div>
                    <div className="detail-item">
                      <span className="label">APR</span>
                      <div className="value">17.99% – 24.99%</div>
                    </div>
                    <div className="detail-item">
                      <span className="label">Intro APR</span>
                      <div className="value">0% for 15 mos</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-brand-charcoal border border-neutral-800 rounded-sm p-6 text-white ad-card">
                <h4 className="font-bold text-xs uppercase tracking-widest text-brand-goldLight">High Yield Savings</h4>
                <p className="text-slate-400 text-xs mt-2 leading-relaxed">Earn 4.5% APY on your savings</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => openApplyModal('High Yield Savings')}
                    className="text-white text-[11px] font-bold uppercase tracking-wider hover:text-brand-goldLight transition-colors bg-brand-gold/20 px-4 py-1.5 rounded-sm"
                  >
                    Start Saving &rarr;
                  </button>
                  <button
                    onClick={() => toggleExpand('savingsExpand')}
                    className="text-white/60 text-[11px] font-bold uppercase tracking-wider hover:text-white transition-colors"
                  >
                    Learn More
                  </button>
                </div>
                <div id="savingsExpand" className={`expand-content mt-3 text-slate-400 text-xs leading-relaxed border-t border-neutral-800 pt-3 ${expanded.savingsExpand ? 'open' : ''}`}>
                  <p>
                    No monthly maintenance fees. No minimum balance required. FDIC insured up to $250,000. Compound interest paid daily.
                  </p>
                  <div className="detail-grid mt-2">
                    <div className="detail-item">
                      <span className="label">APY</span>
                      <div className="value highlight">4.50%</div>
                    </div>
                    <div className="detail-item">
                      <span className="label">Min. Balance</span>
                      <div className="value">$0</div>
                    </div>
                    <div className="detail-item">
                      <span className="label">Monthly Fee</span>
                      <div className="value">$0</div>
                    </div>
                    <div className="detail-item">
                      <span className="label">FDIC Coverage</span>
                      <div className="value">$250,000</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SERVICE QUICK ROUTING ===== */}
        <section className="py-16 bg-white border-b border-brand-border" id="business">
          <div className="container mx-auto px-6 lg:px-12 text-center max-w-5xl">
            <h2 className="text-xs font-bold uppercase tracking-widest text-brand-slateText mb-8">Choose what is right for you</h2>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <a href="#business" className="service-card bg-white border border-brand-border rounded-sm p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md">
                <svg className="w-5 h-5 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-[10px] font-bold text-brand-dark uppercase tracking-wider">Business</span>
              </a>
              <a href="#credit-cards" className="service-card bg-white border border-brand-border rounded-sm p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md">
                <svg className="w-5 h-5 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                <span className="text-[10px] font-bold text-brand-dark uppercase tracking-wider">Cards</span>
              </a>
              <a href="#personal" className="service-card bg-white border border-brand-border rounded-sm p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md">
                <svg className="w-5 h-5 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-[10px] font-bold text-brand-dark uppercase tracking-wider">Checking</span>
              </a>
              <a href="#support" className="service-card bg-white border border-brand-border rounded-sm p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md">
                <svg className="w-5 h-5 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="text-[10px] font-bold text-brand-dark uppercase tracking-wider">Travel</span>
              </a>
              <a href="#personal" className="service-card bg-white border border-brand-border rounded-sm p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md">
                <svg className="w-5 h-5 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 14a2 2 0 110-4h4a2 2 0 110 4h-4z" />
                </svg>
                <span className="text-[10px] font-bold text-brand-dark uppercase tracking-wider">Savings</span>
              </a>
              <a href="#loans" className="service-card bg-white border border-brand-border rounded-sm p-5 flex flex-col items-center justify-center gap-3 shadow-sm hover:shadow-md">
                <svg className="w-5 h-5 text-brand-dark" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span className="text-[10px] font-bold text-brand-dark uppercase tracking-wider">Home Loans</span>
              </a>
            </div>
          </div>
        </section>

        {/* ===== ABOUT US ===== */}
        <section className="py-20 bg-slate-50 border-b border-brand-border" id="personal">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-gold block mb-2">About Us</span>
              <h2 className="text-3xl font-light text-brand-dark tracking-tight">We revolutionized Digital Finance</h2>
              <div className="w-16 h-[2px] bg-brand-gold mx-auto mt-4" />
              <p className="text-brand-slateText text-xs mt-4 max-w-xl mx-auto leading-relaxed">
                We have grown to become one of the largest digital finance providers, committed to inventing, simplifying, and humanizing the financial experience.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div className="border border-brand-border rounded-sm p-8 hover:border-brand-gold shadow-sm transition bg-white">
                <div className="w-10 h-10 rounded-sm bg-slate-50 border border-brand-border flex items-center justify-center text-brand-dark mb-5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-brand-dark mb-2">Powerful Mobile and Online App</h4>
                <p className="text-brand-slateText text-xs leading-relaxed">Our mobile app service is quick and easy to use, and you can get it from your app store.</p>
                <button onClick={() => toggleExpand('mobileApp')} className="text-brand-gold text-xs font-bold uppercase tracking-wider mt-3 hover:underline">
                  Learn More
                </button>
                <div id="mobileApp" className={`expand-content mt-2 text-brand-slateText text-xs leading-relaxed border-t border-brand-border pt-2 ${expanded.mobileApp ? 'open' : ''}`}>
                  <p>
                    Available on iOS and Android. Features include mobile check deposit, real-time transaction alerts, biometric login, and a built-in budgeting tool. Rated 4.8 stars on the App Store.
                  </p>
                </div>
              </div>

              <div className="border border-brand-border rounded-sm p-8 hover:border-brand-gold shadow-sm transition bg-white">
                <div className="w-10 h-10 rounded-sm bg-slate-50 border border-brand-border flex items-center justify-center text-brand-dark mb-5">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold text-brand-dark mb-2">Brings More Transparency and Speed</h4>
                <p className="text-brand-slateText text-xs leading-relaxed">Our digital finance services are transparent and quick, and we are building a reliable network.</p>
                <button onClick={() => toggleExpand('transparency')} className="text-brand-gold text-xs font-bold uppercase tracking-wider mt-3 hover:underline">
                  Learn More
                </button>
                <div id="transparency" className={`expand-content mt-2 text-brand-slateText text-xs leading-relaxed border-t border-brand-border pt-2 ${expanded.transparency ? 'open' : ''}`}>
                  <p>
                    Our real-time transaction ledger is auditable 24/7. We publish our fee schedule openly and provide monthly breakdowns of all charges. Settlement times average under 2 seconds.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== WHY CHOOSE US ===== */}
        <section className="py-20 bg-brand-dark text-white" id="credit-cards">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-goldLight block mb-2">Why Choose Us</span>
              <h2 className="text-3xl font-light tracking-tight text-white">Innovative, Digital, and Secure</h2>
              <div className="w-16 h-[2px] bg-brand-gold mx-auto mt-4" />
              <p className="text-slate-400 text-xs mt-4 max-w-xl mx-auto leading-relaxed">
                Summit Shares transformed the credit card business using data and technology more than ten years ago. We are now one of the largest digital finance providers, dedicated to innovating, simplifying, and humanizing finance.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="border border-neutral-800 bg-neutral-900/30 p-8 rounded-sm hover:border-brand-gold transition">
                <div className="w-12 h-12 mx-auto bg-brand-gold/10 border border-brand-gold/30 rounded-sm flex items-center justify-center text-brand-goldLight mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold mb-2">Enterprise-Level Security</h4>
                <p className="text-slate-400 text-sm leading-relaxed">256-bit encryption, multi-factor authentication, and real-time fraud monitoring.</p>
              </div>

              <div className="border border-neutral-800 bg-neutral-900/30 p-8 rounded-sm hover:border-brand-gold transition">
                <div className="w-12 h-12 mx-auto bg-brand-gold/10 border border-brand-gold/30 rounded-sm flex items-center justify-center text-brand-goldLight mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold mb-2">Real-Time Transfers</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Send and receive money across 190+ countries with instant settlement and low fees.</p>
              </div>

              <div className="border border-neutral-800 bg-neutral-900/30 p-8 rounded-sm hover:border-brand-gold transition">
                <div className="w-12 h-12 mx-auto bg-brand-gold/10 border border-brand-gold/30 rounded-sm flex items-center justify-center text-brand-goldLight mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h4 className="text-lg font-bold mb-2">24/7 Global Support</h4>
                <p className="text-slate-400 text-sm leading-relaxed">Dedicated support team available around the clock in multiple languages.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SECURITY & COMPLIANCE ===== */}
        <section className="py-20 bg-white border-b border-brand-border" id="support">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-gold block mb-2">Security & Compliance</span>
              <h2 className="text-3xl font-light text-brand-dark tracking-tight">Your data is protected at every step</h2>
              <div className="w-16 h-[2px] bg-brand-gold mx-auto mt-4" />
              <p className="text-brand-slateText text-xs mt-4 max-w-xl mx-auto leading-relaxed">We adhere to the highest standards of security and regulatory compliance to keep your information safe.</p>
            </div>

            <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
              <div className="border border-brand-border rounded-sm p-6 text-center hover:border-brand-gold transition bg-white shadow-sm">
                <div className="w-12 h-12 mx-auto bg-slate-50 rounded-full flex items-center justify-center text-brand-dark mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h4 className="font-bold text-brand-dark text-sm">256-bit Encryption</h4>
                <p className="text-brand-slateText text-[10px] mt-1 leading-relaxed">Military-grade encryption for all data in transit and at rest.</p>
              </div>

              <div className="border border-brand-border rounded-sm p-6 text-center hover:border-brand-gold transition bg-white shadow-sm">
                <div className="w-12 h-12 mx-auto bg-slate-50 rounded-full flex items-center justify-center text-brand-dark mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="font-bold text-brand-dark text-sm">Multi-Factor Auth</h4>
                <p className="text-brand-slateText text-[10px] mt-1 leading-relaxed">Two-factor authentication and biometric login options.</p>
              </div>

              <div className="border border-brand-border rounded-sm p-6 text-center hover:border-brand-gold transition bg-white shadow-sm">
                <div className="w-12 h-12 mx-auto bg-slate-50 rounded-full flex items-center justify-center text-brand-dark mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h4 className="font-bold text-brand-dark text-sm">Regulatory Compliance</h4>
                <p className="text-brand-slateText text-[10px] mt-1 leading-relaxed">Fully compliant with global financial regulations and standards.</p>
              </div>

              <div className="border border-brand-border rounded-sm p-6 text-center hover:border-brand-gold transition bg-white shadow-sm">
                <div className="w-12 h-12 mx-auto bg-slate-50 rounded-full flex items-center justify-center text-brand-dark mb-4">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 110-18 9 9 0 010 18z" />
                  </svg>
                </div>
                <h4 className="font-bold text-brand-dark text-sm">Real-Time Monitoring</h4>
                <p className="text-brand-slateText text-[10px] mt-1 leading-relaxed">24/7 fraud detection and transaction monitoring systems.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== LIVE EXCHANGE RATES ===== */}
        <section className="py-20 bg-slate-50 border-b border-brand-border" id="loans">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-gold block mb-2">Live Exchange Rates</span>
              <h2 className="text-3xl font-light text-brand-dark tracking-tight">Exchange money across the world in real time with lowest fees</h2>
            </div>

            <div className="max-w-5xl mx-auto border border-brand-border rounded-sm overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-brand-border text-xs uppercase tracking-wider font-bold text-brand-slateText">
                    <tr>
                      <th className="px-6 py-4">Currency</th>
                      <th className="px-6 py-4">Buy Rate</th>
                      <th className="px-6 py-4">Sell Rate</th>
                      <th className="px-6 py-4">Change (24h)</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-900">
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('us')}`} /> US Dollar
                        </span>
                      </td>
                      <td className="px-6 py-4">1.0000</td>
                      <td className="px-6 py-4">1.0012</td>
                      <td className="px-6 py-4 text-emerald-600">+0.50%</td>
                      <td className="px-6 py-4 text-slate-300">Active</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('eu')}`} /> Euro
                        </span>
                      </td>
                      <td className="px-6 py-4">1.0842</td>
                      <td className="px-6 py-4">1.0878</td>
                      <td className="px-6 py-4 text-emerald-600">+0.24%</td>
                      <td className="px-6 py-4 text-slate-300">Active</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('gb')}`} /> British Pound
                        </span>
                      </td>
                      <td className="px-6 py-4">1.2450</td>
                      <td className="px-6 py-4">1.2498</td>
                      <td className="px-6 py-4 text-rose-600">-0.30%</td>
                      <td className="px-6 py-4 text-slate-300">Stable</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('jp')}`} /> Japanese Yen
                        </span>
                      </td>
                      <td className="px-6 py-4">0.0074</td>
                      <td className="px-6 py-4">0.0075</td>
                      <td className="px-6 py-4 text-emerald-600">+0.12%</td>
                      <td className="px-6 py-4 text-slate-300">Active</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('ca')}`} /> Canadian Dollar
                        </span>
                      </td>
                      <td className="px-6 py-4">0.7382</td>
                      <td className="px-6 py-4">0.7415</td>
                      <td className="px-6 py-4 text-rose-600">-0.76%</td>
                      <td className="px-6 py-4 text-slate-300">Stable</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('ch')}`} /> Swiss Franc
                        </span>
                      </td>
                      <td className="px-6 py-4">1.0630</td>
                      <td className="px-6 py-4">1.0672</td>
                      <td className="px-6 py-4 text-emerald-600">+0.26%</td>
                      <td className="px-6 py-4 text-slate-300">Active</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('au')}`} /> Australian Dollar
                        </span>
                      </td>
                      <td className="px-6 py-4">0.6560</td>
                      <td className="px-6 py-4">0.6592</td>
                      <td className="px-6 py-4 text-rose-600">-0.45%</td>
                      <td className="px-6 py-4 text-slate-300">Stable</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('za')}`} /> South African Rand
                        </span>
                      </td>
                      <td className="px-6 py-4">0.0551</td>
                      <td className="px-6 py-4">0.0555</td>
                      <td className="px-6 py-4 text-emerald-600">+0.90%</td>
                      <td className="px-6 py-4 text-slate-300">Active</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('se')}`} /> Swedish Krona
                        </span>
                      </td>
                      <td className="px-6 py-4">0.0954</td>
                      <td className="px-6 py-4">0.0959</td>
                      <td className="px-6 py-4 text-rose-600">-0.18%</td>
                      <td className="px-6 py-4 text-slate-300">Stable</td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2">
                          <span className={`flag-icon ${flagClass('sg')}`} /> Singapore Dollar
                        </span>
                      </td>
                      <td className="px-6 py-4">0.7438</td>
                      <td className="px-6 py-4">0.7470</td>
                      <td className="px-6 py-4 text-emerald-600">+0.34%</td>
                      <td className="px-6 py-4 text-slate-300">Active</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-50 border-t border-brand-border px-6 py-3 flex flex-wrap justify-between items-center text-xs font-semibold text-brand-slateText gap-2">
                <span>Last Updated: July 12, 2026 14:32 UTC</span>
                <button
                  onClick={() => showToast('Live rates refreshed')}
                  className="text-brand-dark hover:underline font-bold"
                >
                  Refresh Rates
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* ===== YOUR BENEFITS ===== */}
        <section className="py-20 bg-white border-b border-brand-border">
          <div className="container mx-auto px-6 lg:px-12 text-center">
            <div className="max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-gold block mb-2">Your Benefits</span>
              <h2 className="text-3xl font-light text-brand-dark tracking-tight">Your one-stop digital finance platform</h2>
              <div className="w-16 h-[2px] bg-brand-gold mx-auto mt-4" />
              <p className="text-brand-slateText text-xs mt-4 max-w-xl mx-auto leading-relaxed">Everything you need, all in one place designed for speed, security, and simplicity.</p>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto text-left">
              <div className="bg-white border border-brand-border rounded-sm p-6 hover:shadow-md transition">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-brand-dark mb-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h4 className="font-bold text-brand-dark mb-2">Global Coverage</h4>
                <p className="text-brand-slateText text-xs leading-relaxed">Send and receive money in 190+ countries.</p>
              </div>

              <div className="bg-white border border-brand-border rounded-sm p-6 hover:shadow-md transition">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-brand-dark mb-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 14a2 2 0 110-4h4a2 2 0 110 4h-4z" />
                  </svg>
                </div>
                <h4 className="font-bold text-brand-dark mb-2">Easy Transfer Method</h4>
                <p className="text-brand-slateText text-xs leading-relaxed">Intuitive workflows, minimal steps.</p>
              </div>

              <div className="bg-white border border-brand-border rounded-sm p-6 hover:shadow-md transition">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-brand-dark mb-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <h4 className="font-bold text-brand-dark mb-2">Global 24/7 Support</h4>
                <p className="text-brand-slateText text-xs leading-relaxed">Dedicated team, always available.</p>
              </div>

              <div className="bg-white border border-brand-border rounded-sm p-6 hover:shadow-md transition">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-brand-dark mb-4">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <h4 className="font-bold text-brand-dark mb-2">Institutional-Level Security</h4>
                <p className="text-brand-slateText text-xs leading-relaxed">256-bit encryption and fraud prevention.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ===== CURRENCY PROFILES ===== */}
        <section className="py-20 bg-slate-50 border-b border-brand-border">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-gold block mb-2">Currency Profile</span>
              <h2 className="text-3xl font-light text-brand-dark tracking-tight">Get these local account details just like paying locally</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
              <div className="border border-brand-border rounded-sm p-4 flex items-center gap-3 hover:border-brand-gold transition bg-white hover:shadow-sm">
                <span className={`flag-icon ${flagClass('us')} w-8 h-6`}></span>
                <div><p className="font-bold text-brand-dark text-sm">USD</p><p className="text-brand-slateText text-[10px]">US Dollar</p></div>
              </div>
              <div className="border border-brand-border rounded-sm p-4 flex items-center gap-3 hover:border-brand-gold transition bg-white hover:shadow-sm">
                <span className={`flag-icon ${flagClass('eu')} w-8 h-6`}></span>
                <div><p className="font-bold text-brand-dark text-sm">EUR</p><p className="text-brand-slateText text-[10px]">Euro</p></div>
              </div>
              <div className="border border-brand-border rounded-sm p-4 flex items-center gap-3 hover:border-brand-gold transition bg-white hover:shadow-sm">
                <span className={`flag-icon ${flagClass('gb')} w-8 h-6`}></span>
                <div><p className="font-bold text-brand-dark text-sm">GBP</p><p className="text-brand-slateText text-[10px]">British Pound</p></div>
              </div>
              <div className="border border-brand-border rounded-sm p-4 flex items-center gap-3 hover:border-brand-gold transition bg-white hover:shadow-sm">
                <span className={`flag-icon ${flagClass('ca')} w-8 h-6`}></span>
                <div><p className="font-bold text-brand-dark text-sm">CAD</p><p className="text-brand-slateText text-[10px]">Canadian Dollar</p></div>
              </div>
              <div className="border border-brand-border rounded-sm p-4 flex items-center gap-3 hover:border-brand-gold transition bg-white hover:shadow-sm">
                <span className={`flag-icon ${flagClass('kr')} w-8 h-6`}></span>
                <div><p className="font-bold text-brand-dark text-sm">KRW</p><p className="text-brand-slateText text-[10px]">South Korean Won</p></div>
              </div>
              <div className="border border-brand-border rounded-sm p-4 flex items-center gap-3 hover:border-brand-gold transition bg-white hover:shadow-sm">
                <span className={`flag-icon ${flagClass('jp')} w-8 h-6`}></span>
                <div><p className="font-bold text-brand-dark text-sm">JPY</p><p className="text-brand-slateText text-[10px]">Japanese Yen</p></div>
              </div>
              <div className="border border-brand-border rounded-sm p-4 flex items-center gap-3 hover:border-brand-gold transition bg-white hover:shadow-sm">
                <span className={`flag-icon ${flagClass('cn')} w-8 h-6`}></span>
                <div><p className="font-bold text-brand-dark text-sm">CNY</p><p className="text-brand-slateText text-[10px]">Chinese Yuan</p></div>
              </div>
              <div className="border border-brand-border rounded-sm p-4 flex items-center gap-3 hover:border-brand-gold transition bg-white hover:shadow-sm">
                <span className={`flag-icon ${flagClass('za')} w-8 h-6`}></span>
                <div><p className="font-bold text-brand-dark text-sm">ZAR</p><p className="text-brand-slateText text-[10px]">South African Rand</p></div>
              </div>
              <div className="border border-brand-border rounded-sm p-4 flex items-center gap-3 hover:border-brand-gold transition bg-white hover:shadow-sm">
                <span className={`flag-icon ${flagClass('ch')} w-8 h-6`}></span>
                <div><p className="font-bold text-brand-dark text-sm">CHF</p><p className="text-brand-slateText text-[10px]">Swiss Franc</p></div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== REVIEWS ===== */}
        <section className="py-20 bg-white border-b border-brand-border">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-gold block mb-2">Our Reviews</span>
              <h2 className="text-3xl font-light text-brand-dark tracking-tight">More than 18 million happy customers trust our services</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="bg-white border border-brand-border rounded-sm p-6 hover:border-brand-gold transition shadow-sm">
                <div className="flex text-brand-gold text-sm mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-brand-slateText text-sm leading-relaxed">"The fastest international transfers I have ever experienced. No hidden fees, and the app is a dream."</blockquote>
                <div className="mt-4 pt-4 border-t border-brand-border flex items-center gap-3">
                  <img src="https://i.pravatar.cc/150?img=11" alt="Jonathan Davies" className="review-avatar" />
                  <div><p className="font-bold text-brand-dark text-sm">Jonathan Davies</p><p className="text-brand-slateText text-[10px]">Business Owner</p></div>
                </div>
              </div>

              <div className="bg-white border border-brand-border rounded-sm p-6 hover:border-brand-gold transition shadow-sm">
                <div className="flex text-brand-gold text-sm mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-brand-slateText text-sm leading-relaxed">"I use Summit Shares for my freelance payments. The exchange rates are fair and the support team is incredible."</blockquote>
                <div className="mt-4 pt-4 border-t border-brand-border flex items-center gap-3">
                  <img src="https://i.pravatar.cc/150?img=5" alt="Sophia Martinez" className="review-avatar" />
                  <div><p className="font-bold text-brand-dark text-sm">Sophia Martinez</p><p className="text-brand-slateText text-[10px]">Freelancer</p></div>
                </div>
              </div>

              <div className="bg-white border border-brand-border rounded-sm p-6 hover:border-brand-gold transition shadow-sm">
                <div className="flex text-brand-gold text-sm mb-3">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <blockquote className="text-brand-slateText text-sm leading-relaxed">"Finally a digital finance platform that feels secure and actually cares about its customers. Highly recommended."</blockquote>
                <div className="mt-4 pt-4 border-t border-brand-border flex items-center gap-3">
                  <img src="https://i.pravatar.cc/150?img=9" alt="Aisha Khan" className="review-avatar" />
                  <div><p className="font-bold text-brand-dark text-sm">Aisha Khan</p><p className="text-brand-slateText text-[10px]">Tech Lead</p></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== BLOG ===== */}
        <section className="py-20 bg-slate-50 border-b border-brand-border">
          <div className="container mx-auto px-6 lg:px-12">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-brand-gold block mb-2">Our Blog</span>
              <h2 className="text-3xl font-light text-brand-dark tracking-tight">Keep up to date with global content from our trusted team</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="border border-brand-border rounded-sm overflow-hidden hover:border-brand-gold transition shadow-sm bg-white">
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80')" }}>
                  <div className="h-full bg-gradient-to-t from-black/40 to-transparent flex items-end">
                    <span className="bg-brand-gold text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 m-3">Corporate</span>
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-brand-dark text-sm mb-1">5 Things You Need To Know Before Starting Business</h4>
                  <p className="text-brand-slateText text-xs mb-2">From choosing the right business structure to understanding your tax obligations, we cover the essentials every entrepreneur should know.</p>
                  <div className="flex gap-4 text-[10px] text-brand-slateText">
                    <span>
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      May 22, 2026
                    </span>
                    <span>
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      12 Comments
                    </span>
                  </div>
                  <button onClick={() => toggleExpand('blog1')} className="text-brand-gold text-[10px] font-bold uppercase tracking-wider mt-2 hover:underline">
                    Read More
                  </button>
                  <div id="blog1" className={`expand-content mt-2 text-brand-slateText text-xs leading-relaxed border-t border-brand-border pt-2 ${expanded.blog1 ? 'open' : ''}`}>
                    <p>Key takeaways: 1) Choose between LLC, Corporation, or Sole Proprietorship. 2) Register for an EIN. 3) Open a dedicated business account. 4) Set up accounting software. 5) Plan your tax strategy with a professional.</p>
                  </div>
                </div>
              </div>

              <div className="border border-brand-border rounded-sm overflow-hidden hover:border-brand-gold transition shadow-sm bg-white">
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80')" }}>
                  <div className="h-full bg-gradient-to-t from-black/40 to-transparent flex items-end">
                    <span className="bg-brand-gold text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 m-3">Consumer</span>
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-brand-dark text-sm mb-1">Effect Of Inflation On Our Daily Expenditure</h4>
                  <p className="text-brand-slateText text-xs mb-2">Understand how rising prices impact your grocery bill, housing costs, and savings – and what you can do to protect your purchasing power.</p>
                  <div className="flex gap-4 text-[10px] text-brand-slateText">
                    <span>
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      May 13, 2026
                    </span>
                    <span>
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      8 Comments
                    </span>
                  </div>
                  <button onClick={() => toggleExpand('blog2')} className="text-brand-gold text-[10px] font-bold uppercase tracking-wider mt-2 hover:underline">
                    Read More
                  </button>
                  <div id="blog2" className={`expand-content mt-2 text-brand-slateText text-xs leading-relaxed border-t border-brand-border pt-2 ${expanded.blog2 ? 'open' : ''}`}>
                    <p>Inflation hit 3.2% in June 2026. Food prices rose 4.5%, housing increased 5.1%, and energy fell 2.3%. Consider diversifying into inflation-protected securities and reviewing your budget.</p>
                  </div>
                </div>
              </div>

              <div className="border border-brand-border rounded-sm overflow-hidden hover:border-brand-gold transition shadow-sm bg-white">
                <div className="h-48 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80')" }}>
                  <div className="h-full bg-gradient-to-t from-black/40 to-transparent flex items-end">
                    <span className="bg-brand-gold text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 m-3">Finance</span>
                  </div>
                </div>
                <div className="p-5">
                  <h4 className="font-bold text-brand-dark text-sm mb-1">7 Tips To Get Best Exchange Rate In Currency</h4>
                  <p className="text-brand-slateText text-xs mb-2">Save money on international transfers and travel with these expert tips on timing, platforms, and fee structures.</p>
                  <div className="flex gap-4 text-[10px] text-brand-slateText">
                    <span>
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Apr 15, 2026
                    </span>
                    <span>
                      <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      15 Comments
                    </span>
                  </div>
                  <button onClick={() => toggleExpand('blog3')} className="text-brand-gold text-[10px] font-bold uppercase tracking-wider mt-2 hover:underline">
                    Read More
                  </button>
                  <div id="blog3" className={`expand-content mt-2 text-brand-slateText text-xs leading-relaxed border-t border-brand-border pt-2 ${expanded.blog3 ? 'open' : ''}`}>
                    <p>1) Monitor mid-market rates. 2) Use multi-currency accounts. 3) Avoid airport and hotel exchanges. 4) Set up rate alerts. 5) Use limit orders. 6) Consider peer-to-peer platforms. 7) Time your transfers around economic announcements.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="py-16 bg-cover bg-center relative" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1600&q=80')" }}>
          <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/90 to-brand-dark/70" />
          <div className="container mx-auto px-6 lg:px-12 relative z-10 text-center text-white">
            <div className="max-w-2xl mx-auto">
              <span className="text-brand-gold text-xs font-bold uppercase tracking-widest">We are now one of the largest digital finance providers</span>
              <h2 className="text-3xl md:text-4xl font-light mt-2">Dedicated to innovating, simplifying, and humanizing finance.</h2>
              <div className="flex flex-wrap justify-center gap-4 mt-6">
                <button
                  onClick={() => openApplyModal('Open Account')}
                  className="bg-brand-gold hover:bg-brand-goldLight text-white font-bold px-10 py-3.5 rounded-sm text-xs uppercase tracking-wider transition"
                >
                  Open Account Today
                </button>
                <a href="#personal" className="border border-white/30 hover:border-white text-white hover:bg-white/10 px-10 py-3.5 rounded-sm text-xs uppercase tracking-wider transition">
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="bg-brand-dark text-neutral-400 border-t border-neutral-800 pt-16 pb-8 text-xs font-medium">
        <div className="container mx-auto px-6 lg:px-12 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          <div className="col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/10 flex items-center justify-center text-white text-xs font-black rounded-sm">SS</div>
              <span className="text-base tracking-tight text-white font-bold">Summit Shares</span>
            </div>
            <p className="max-w-xs leading-relaxed text-neutral-500">Pioneering secure financial intelligence and asset structuring ecosystems natively on a global scale since 2012.</p>
            <div className="flex gap-4 pt-2">
              <a href="#" className="text-neutral-400 hover:text-brand-gold transition">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0zM7.08 20.47H3.56V8.97h3.52v11.5zM5.32 7.43c-1.13 0-2.04-.92-2.04-2.05 0-1.13.91-2.05 2.04-2.05s2.04.92 2.04 2.05c0 1.13-.91 2.05-2.04 2.05zm15.15 13.04h-3.51v-5.6c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.95v5.69h-3.51V8.97h3.37v1.56h.05c.47-.89 1.62-1.83 3.33-1.83 3.56 0 4.22 2.34 4.22 5.39v6.18z" />
                </svg>
              </a>
              <a href="#" className="text-neutral-400 hover:text-brand-gold transition">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="#" className="text-neutral-400 hover:text-brand-gold transition">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
              <a href="#" className="text-neutral-400 hover:text-brand-gold transition">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </a>
            </div>
          </div>
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-4 text-[10px]">Company</h5>
            <ul className="space-y-2 no-bullets">
              <li><a href="#personal" className="hover:text-white transition">About Us</a></li>
              <li><a href="#business" className="hover:text-white transition">Business Banking</a></li>
              <li><a href="#personal" className="hover:text-white transition">Personal Banking</a></li>
              <li><a href="#credit-cards" className="hover:text-white transition">Credit Cards</a></li>
              <li><a href="#loans" className="hover:text-white transition">Loans</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-4 text-[10px]">Resources</h5>
            <ul className="space-y-2 no-bullets">
              <li><a href="#support" className="hover:text-white transition">Contact Us</a></li>
              <li><a href="#" className="hover:text-white transition">FAQs</a></li>
              <li><a href="#" className="hover:text-white transition">Download App</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition">Terms &amp; Conditions</a></li>
            </ul>
          </div>
          <div>
            <h5 className="text-white font-bold uppercase tracking-wider mb-4 text-[10px]">Transfer Money</h5>
            <ul className="space-y-2 no-bullets">
              <li><a href="#" className="hover:text-white transition">Register / Login</a></li>
              <li><a href="#" className="hover:text-white transition">IBank Transfer</a></li>
              <li><a href="#" className="hover:text-white transition">USA Money Transfer</a></li>
              <li><a href="#" className="hover:text-white transition">UK Money Transfer</a></li>
              <li><a href="#" className="hover:text-white transition">Euro Money Transfer</a></li>
            </ul>
          </div>
        </div>

        <div className="container mx-auto px-6 lg:px-12 border-t border-neutral-800 pt-6 pb-4 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-neutral-600">
          <div className="flex flex-wrap justify-center gap-6 text-neutral-400">
            <span>
              <svg className="w-3 h-3 inline mr-1 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              301 East Water Street, Charlottesville, VA 22904
            </span>
            <span>
              <svg className="w-3 h-3 inline mr-1 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Summit Shares
            </span>
            <span>
              <svg className="w-3 h-3 inline mr-1 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              VIP Only
            </span>
          </div>
        </div>

        <div className="container mx-auto px-6 lg:px-12 border-t border-neutral-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-neutral-600">
          <p>&copy; 2026 Summit Shares. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="text-neutral-400 hover:text-brand-gold transition">Privacy</a>
            <a href="#" className="text-neutral-400 hover:text-brand-gold transition">Terms</a>
            <a href="#" className="text-neutral-400 hover:text-brand-gold transition">Cookies</a>
            <a href="#" className="text-neutral-400 hover:text-brand-gold transition">Accessibility</a>
          </div>
        </div>
      </footer>

      {/* ===== APPLY NOW MODAL ===== */}
      <div className={`modal-overlay ${applyOpen ? 'active' : ''}`} id="applyModal">
        <div className="modal-box">
          <button className="modal-close" onClick={closeApplyModal}>&times;</button>
          <h2 id="modalTitle">{applyProduct ? `Apply for ${applyProduct}` : 'Apply Now'}</h2>
          <p className="sub" id="modalSub">
            {applyProduct
              ? "Fill in your details and we'll process your application."
              : "Fill in your details and we'll get back to you."}
          </p>
          <form onSubmit={handleApplySubmit}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                required
                value={applyForm.full_name}
                onChange={(e) => setApplyForm((p) => ({ ...p, full_name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                placeholder="john@example.com"
                required
                value={applyForm.email}
                onChange={(e) => setApplyForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                placeholder="+1 (234) 567-8901"
                required
                value={applyForm.phone}
                onChange={(e) => setApplyForm((p) => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Product Interested In</label>
              <select
                id="productSelect"
                required
                value={applyForm.product_interested_in}
                onChange={(e) => setApplyForm((p) => ({ ...p, product_interested_in: e.target.value }))}
              >
                <option value="Business Account">Business Account</option>
                <option value="Premium Credit Card">Premium Credit Card</option>
                <option value="High Yield Savings">High Yield Savings</option>
                <option value="Personal Loan">Personal Loan</option>
                <option value="Mortgage">Mortgage</option>
              </select>
            </div>
            <div className="form-group">
              <label>Message (Optional)</label>
              <input
                type="text"
                placeholder="Any specific requirements?"
                value={applyForm.message}
                onChange={(e) => setApplyForm((p) => ({ ...p, message: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn-submit" disabled={applying}>
              {applying ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
          <p className="text-center text-brand-slateText text-[10px] mt-3">We respect your privacy. Your data is secure.</p>
        </div>
      </div>

      {/* ===== TOAST ===== */}
      {toastNode}
    </>
  );
}