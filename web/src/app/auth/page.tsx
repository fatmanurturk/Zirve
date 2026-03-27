"use client";

import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "login" | "register";

interface LoginForm {
  email: string;
  password: string;
}

interface RegisterForm {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// ─── Zirve Auth Page ──────────────────────────────────────────────────────────
export default function AuthPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [loginForm, setLoginForm] = useState<LoginForm>({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState<RegisterForm>({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          username: loginForm.email,
          password: loginForm.password,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Giriş başarısız.");
      }
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      setSuccess("Giriş başarılı! Yönlendiriliyorsunuz...");
      // TODO: router.push("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (registerForm.password !== registerForm.confirmPassword) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: registerForm.fullName,
          email: registerForm.email,
          password: registerForm.password,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Kayıt başarısız.");
      }
      setSuccess("Kayıt başarılı! Giriş yapabilirsiniz.");
      setTab("login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,300&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg:        #0d0f14;
          --surface:   #13161e;
          --border:    #1f2430;
          --accent:    #e8ff47;
          --accent-dim:#b5cc2e;
          --text:      #eef0f6;
          --muted:     #6b7280;
          --danger:    #ff5c5c;
          --success:   #4ade80;
          --font-head: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page {
          width: 100%;
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        /* ── LEFT PANEL ── */
        .left {
          position: relative;
          background: var(--surface);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 3rem;
          overflow: hidden;
          border-right: 1px solid var(--border);
        }

        .left::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 80% 60% at 20% 80%, rgba(232,255,71,0.08) 0%, transparent 70%),
            radial-gradient(ellipse 50% 40% at 80% 20%, rgba(232,255,71,0.04) 0%, transparent 60%);
          pointer-events: none;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          z-index: 1;
        }

        .brand-icon {
          width: 40px;
          height: 40px;
          background: var(--accent);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brand-icon svg { color: #0d0f14; }

        .brand-name {
          font-family: var(--font-head);
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text);
        }

        .hero-content {
          z-index: 1;
        }

        .hero-tag {
          display: inline-block;
          background: rgba(232,255,71,0.1);
          border: 1px solid rgba(232,255,71,0.25);
          color: var(--accent);
          font-size: 0.7rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          padding: 0.35rem 0.75rem;
          border-radius: 100px;
          margin-bottom: 1.5rem;
        }

        .hero-title {
          font-family: var(--font-head);
          font-size: clamp(2.2rem, 3.5vw, 3rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.04em;
          margin-bottom: 1.25rem;
        }

        .hero-title span {
          color: var(--accent);
        }

        .hero-desc {
          font-size: 0.95rem;
          line-height: 1.7;
          color: var(--muted);
          max-width: 380px;
        }

        .stats {
          display: flex;
          gap: 2.5rem;
          z-index: 1;
        }

        .stat-num {
          font-family: var(--font-head);
          font-size: 1.6rem;
          font-weight: 800;
          color: var(--accent);
          letter-spacing: -0.03em;
        }

        .stat-label {
          font-size: 0.75rem;
          color: var(--muted);
          margin-top: 0.15rem;
        }

        /* decorative grid */
        .grid-deco {
          position: absolute;
          right: -60px;
          top: 50%;
          transform: translateY(-50%);
          width: 220px;
          height: 220px;
          opacity: 0.04;
        }

        /* ── RIGHT PANEL ── */
        .right {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          background: var(--bg);
        }

        .form-card {
          width: 100%;
          max-width: 400px;
        }

        .form-header {
          margin-bottom: 2.5rem;
        }

        .form-title {
          font-family: var(--font-head);
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.03em;
          margin-bottom: 0.4rem;
        }

        .form-subtitle {
          font-size: 0.875rem;
          color: var(--muted);
        }

        /* Tabs */
        .tabs {
          display: flex;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 4px;
          margin-bottom: 2rem;
          gap: 4px;
        }

        .tab-btn {
          flex: 1;
          padding: 0.6rem 1rem;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: var(--muted);
          font-family: var(--font-body);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          background: var(--accent);
          color: #0d0f14;
          font-weight: 700;
        }

        /* Form */
        .field {
          margin-bottom: 1.25rem;
        }

        .field label {
          display: block;
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--muted);
          margin-bottom: 0.45rem;
          letter-spacing: 0.03em;
        }

        .field input {
          width: 100%;
          padding: 0.75rem 1rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: var(--text);
          font-family: var(--font-body);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .field input::placeholder { color: var(--muted); opacity: 0.5; }

        .field input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(232,255,71,0.08);
        }

        .submit-btn {
          width: 100%;
          padding: 0.85rem 1rem;
          background: var(--accent);
          color: #0d0f14;
          border: none;
          border-radius: 10px;
          font-family: var(--font-head);
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          cursor: pointer;
          margin-top: 0.5rem;
          transition: background 0.2s, transform 0.15s, opacity 0.2s;
          position: relative;
          overflow: hidden;
        }

        .submit-btn:hover:not(:disabled) { background: var(--accent-dim); }
        .submit-btn:active:not(:disabled) { transform: scale(0.985); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .submit-btn .spinner {
          display: inline-block;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(0,0,0,0.3);
          border-top-color: #0d0f14;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          vertical-align: middle;
          margin-right: 8px;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* Alert */
        .alert {
          padding: 0.7rem 1rem;
          border-radius: 8px;
          font-size: 0.82rem;
          margin-bottom: 1.25rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .alert.error {
          background: rgba(255,92,92,0.1);
          border: 1px solid rgba(255,92,92,0.25);
          color: var(--danger);
        }

        .alert.success {
          background: rgba(74,222,128,0.1);
          border: 1px solid rgba(74,222,128,0.25);
          color: var(--success);
        }

        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.5rem 0;
          color: var(--muted);
          font-size: 0.78rem;
        }

        .divider::before, .divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        .switch-text {
          text-align: center;
          font-size: 0.82rem;
          color: var(--muted);
          margin-top: 1.5rem;
        }

        .switch-text button {
          background: none;
          border: none;
          color: var(--accent);
          font-family: var(--font-body);
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: underline;
          text-underline-offset: 3px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .page { grid-template-columns: 1fr; }
          .left { display: none; }
          .right { padding: 2rem 1.5rem; min-height: 100vh; }
        }
      `}</style>

      <div className="page">
        {/* ── LEFT ── */}
        <div className="left">
          <div className="brand">
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 19h20L12 2z" />
              </svg>
            </div>
            <span className="brand-name">Zirve</span>
          </div>

          {/* decorative grid SVG */}
          <svg className="grid-deco" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {Array.from({ length: 6 }).map((_, i) =>
              Array.from({ length: 6 }).map((_, j) => (
                <circle key={`${i}-${j}`} cx={i * 40} cy={j * 40} r="2" fill="white" />
              ))
            )}
          </svg>

          <div className="hero-content">
            <div className="hero-tag">Gönüllü Platformu</div>
            <h1 className="hero-title">
              Değişim için<br /><span>zirveye</span><br />ulaş.
            </h1>
            <p className="hero-desc">
              Etkinliklere katıl, rozet kazan, topluluğunu büyüt. Gönüllülük deneyimini tek platformda yönet.
            </p>
          </div>

          <div className="stats">
            <div>
              <div className="stat-num">2.4K+</div>
              <div className="stat-label">Gönüllü</div>
            </div>
            <div>
              <div className="stat-num">180+</div>
              <div className="stat-label">Etkinlik</div>
            </div>
            <div>
              <div className="stat-num">45+</div>
              <div className="stat-label">Organizasyon</div>
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div className="right">
          <div className="form-card">
            <div className="form-header">
              <h2 className="form-title">
                {tab === "login" ? "Tekrar hoş geldin 👋" : "Aramıza katıl 🚀"}
              </h2>
              <p className="form-subtitle">
                {tab === "login"
                  ? "Devam etmek için hesabına giriş yap."
                  : "Ücretsiz hesap oluştur, hemen başla."}
              </p>
            </div>

            {/* Tabs */}
            <div className="tabs">
              <button
                className={`tab-btn${tab === "login" ? " active" : ""}`}
                onClick={() => { setTab("login"); setError(null); setSuccess(null); }}
              >
                Giriş Yap
              </button>
              <button
                className={`tab-btn${tab === "register" ? " active" : ""}`}
                onClick={() => { setTab("register"); setError(null); setSuccess(null); }}
              >
                Kayıt Ol
              </button>
            </div>

            {/* Alerts */}
            {error && (
              <div className="alert error">
                <span>⚠️</span> {error}
              </div>
            )}
            {success && (
              <div className="alert success">
                <span>✓</span> {success}
              </div>
            )}

            {/* Login Form */}
            {tab === "login" && (
              <form onSubmit={handleLogin}>
                <div className="field">
                  <label>E-posta</label>
                  <input
                    type="email"
                    placeholder="ornek@mail.com"
                    value={loginForm.email}
                    onChange={e => setLoginForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Şifre</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={loginForm.password}
                    onChange={e => setLoginForm(p => ({ ...p, password: e.target.value }))}
                    required
                  />
                </div>
                <button className="submit-btn" type="submit" disabled={loading}>
                  {loading && <span className="spinner" />}
                  {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                </button>
              </form>
            )}

            {/* Register Form */}
            {tab === "register" && (
              <form onSubmit={handleRegister}>
                <div className="field">
                  <label>Ad Soyad</label>
                  <input
                    type="text"
                    placeholder="Ahmet Yılmaz"
                    value={registerForm.fullName}
                    onChange={e => setRegisterForm(p => ({ ...p, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>E-posta</label>
                  <input
                    type="email"
                    placeholder="ornek@mail.com"
                    value={registerForm.email}
                    onChange={e => setRegisterForm(p => ({ ...p, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="field">
                  <label>Şifre</label>
                  <input
                    type="password"
                    placeholder="En az 8 karakter"
                    value={registerForm.password}
                    onChange={e => setRegisterForm(p => ({ ...p, password: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
                <div className="field">
                  <label>Şifre Tekrar</label>
                  <input
                    type="password"
                    placeholder="Şifreni tekrar gir"
                    value={registerForm.confirmPassword}
                    onChange={e => setRegisterForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    required
                  />
                </div>
                <button className="submit-btn" type="submit" disabled={loading}>
                  {loading && <span className="spinner" />}
                  {loading ? "Hesap oluşturuluyor..." : "Hesap Oluştur"}
                </button>
              </form>
            )}

            <div className="switch-text">
              {tab === "login" ? (
                <>Hesabın yok mu?{" "}
                  <button onClick={() => { setTab("register"); setError(null); setSuccess(null); }}>
                    Kayıt ol
                  </button>
                </>
              ) : (
                <>Zaten hesabın var mı?{" "}
                  <button onClick={() => { setTab("login"); setError(null); setSuccess(null); }}>
                    Giriş yap
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
