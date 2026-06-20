import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
} from 'firebase/auth'
import { auth, provider } from '../firebase'

const authModes = [
  { id: 'email', label: 'Email', sublabel: 'Password login' },
  { id: 'phone', label: 'Phone', sublabel: 'OTP login' },
  { id: 'google', label: 'Google', sublabel: 'One-click sign in' },
]

const formatAuthError = (error) => {
  const code = error?.code || ''

  switch (code) {
    case 'auth/wrong-password':
      return 'Wrong password. Please try again.'
    case 'auth/user-not-found':
      return 'No account found for this email.'
    case 'auth/email-already-in-use':
      return 'This email is already registered.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.'
    case 'auth/missing-password':
      return 'Please enter your password.'
    case 'auth/invalid-phone-number':
      return 'Please enter a valid Indian phone number.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/invalid-verification-code':
      return 'The OTP code is invalid or expired.'
    case 'auth/code-expired':
      return 'The OTP code has expired. Please request a new one.'
    case 'auth/credential-already-in-use':
      return 'This phone number is already linked to another account.'
    default:
      return error?.message || 'Something went wrong. Please try again.'
  }
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.74 1.22 9.27 3.6l6.93-6.93C35.97 2.76 30.46 0 24 0 14.62 0 6.52 5.38 2.56 13.22l8.07 6.27C12.52 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.58-.14-3.09-.4-4.5H24v9h12.6c-.55 3.02-2.24 5.57-4.79 7.28l7.53 5.85C43.95 37.12 46.5 31.37 46.5 24.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.63 28.49A14.4 14.4 0 0 1 9.5 24c0-1.57.27-3.09.75-4.49l-8.07-6.27A24 24 0 0 0 0 24c0 3.88.93 7.55 2.56 10.76l8.07-6.27z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.92-2.14 15.89-5.84l-7.53-5.85c-2.1 1.42-4.79 2.27-8.36 2.27-6.3 0-11.48-4.1-13.37-9.49l-8.07 6.27C6.52 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

function Login() {
  const [authMode, setAuthMode] = useState('email')
  const [loginMode, setLoginMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [confirmationResult, setConfirmationResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [currentUser, setCurrentUser] = useState(null)

  const recaptchaReadyRef = useRef(false)

  const googleProvider = useMemo(() => provider || new GoogleAuthProvider(), [])
  const phoneDigits = useMemo(() => phone.replace(/\D/g, '').slice(0, 10), [phone])
  const isSignUp = loginMode === 'signup'

  const displayName =
    currentUser?.displayName || currentUser?.email || currentUser?.phoneNumber || 'Student'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (authMode !== 'phone') return undefined
    if (recaptchaReadyRef.current || window.recaptchaVerifier) return undefined

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    })

    window.recaptchaVerifier = verifier
    verifier.render().catch((err) => {
      console.error('Recaptcha render error:', err)
      setError('Unable to initialize phone verification. Please refresh and try again.')
    })

    recaptchaReadyRef.current = true

    return undefined
  }, [authMode])

  const resetFeedback = () => {
    setError('')
    setSuccess('')
  }

  const runAuthAction = async (action) => {
    setLoading(true)
    resetFeedback()

    try {
      await action()
      setSuccess('Authentication successful. Redirecting to your dashboard...')
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = () =>
    runAuthAction(async () => {
      await signInWithPopup(auth, googleProvider)
    })

  const handleEmailSubmit = () =>
    runAuthAction(async () => {
      if (!email || !password) {
        throw new Error('Please enter both email and password.')
      }

      if (isSignUp) {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }

        await createUserWithEmailAndPassword(auth, email, password)
        return
      }

      await signInWithEmailAndPassword(auth, email, password)
    })

  const handleSendOtp = () =>
    runAuthAction(async () => {
      if (phoneDigits.length !== 10) {
        throw new Error('Please enter a valid 10-digit Indian phone number.')
      }

      const verifier = window.recaptchaVerifier
      if (!verifier) {
        throw new Error('reCAPTCHA is still loading. Please try again.')
      }

      const result = await signInWithPhoneNumber(auth, `+91${phoneDigits}`, verifier)
      setConfirmationResult(result)
      setSuccess('OTP sent successfully. Check your phone.')
    })

  const handleVerifyOtp = () =>
    runAuthAction(async () => {
      if (!confirmationResult) {
        throw new Error('Please send the OTP first.')
      }

      if (!otp.trim()) {
        throw new Error('Please enter the OTP sent to your phone.')
      }

      await confirmationResult.confirm(otp.trim())
    })

  const handleSignOut = () =>
    runAuthAction(async () => {
      await signOut(auth)
    })

  const primaryLabel =
    authMode === 'google'
      ? 'Continue with Google'
      : authMode === 'phone'
        ? confirmationResult
          ? 'Verify OTP'
          : 'Send OTP'
        : isSignUp
          ? 'Create account'
          : 'Login'

  const panelTitle =
    authMode === 'email'
      ? isSignUp
        ? 'Create your account'
        : 'Welcome back'
      : authMode === 'phone'
        ? 'Phone verification'
        : 'Quick sign in'

  const panelNote =
    authMode === 'email'
      ? isSignUp
        ? 'Set up your VidyaBot account to save lessons and progress.'
        : 'Sign in to continue your learning journey.'
      : authMode === 'phone'
        ? 'Enter your number and verify with an OTP.'
        : 'Use your Google account for instant access.'

  return (
    <div className="login-shell login-shell--split">
      <div className="login-shell__halo login-shell__halo--one" />
      <div className="login-shell__halo login-shell__halo--two" />

      <motion.div
        className="login-card-wrap login-card-wrap--split"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        <div className="login-split">
          <section className="login-visual">
            <div className="login-visual__topline">
              <span className="login-visual__badge">VidyaBot</span>
              <span className="login-visual__status">Adaptive AI tutor</span>
            </div>

            <div className="login-visual__art-wrap">
              <motion.img
                src="/vidyabot-logo.webp"
                alt="VidyaBot"
                className="login-visual__art"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>

            <div className="login-visual__copy">
              <h2>Learn Smarter. Learn Your Way.</h2>
              <p>
                Emotion-aware tutoring, saved sessions, and instant answers in one
                focused learning workspace.
              </p>
            </div>

            <div className="login-visual__chips" aria-hidden="true">
              <span>Adaptive lessons</span>
              <span>Saved history</span>
              <span>Instant feedback</span>
            </div>
          </section>

          <section className="login-panel">
            <div className="login-panel__brand">
              <img
                src="/vidyabot-logo.webp"
                alt="VidyaBot"
                className="login-panel__brand-mark"
                loading="eager"
              />
            </div>

            <div className="login-panel__header">
              <div className="login-panel__heading">
                <span className="login-kicker">VidyaBot access</span>
                <h1>{panelTitle}</h1>
                <p>{panelNote}</p>
              </div>

              <button
                type="button"
                className="login-switch login-switch--ghost"
                onClick={() => {
                  setLoginMode((prev) => (prev === 'login' ? 'signup' : 'login'))
                  resetFeedback()
                }}
              >
                {isSignUp ? 'Login instead' : 'Sign up instead'}
              </button>
            </div>

            {currentUser ? (
              <div className="login-signed-in">
                Signed in as <strong>{displayName}</strong>.
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="ml-2 underline underline-offset-4"
                >
                  Sign out
                </button>
              </div>
            ) : null}

            <div className="login-method-tabs" role="tablist" aria-label="Login methods">
              {authModes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  role="tab"
                  aria-selected={authMode === mode.id}
                  onClick={() => {
                    setAuthMode(mode.id)
                    resetFeedback()
                    if (mode.id !== 'phone') {
                      setConfirmationResult(null)
                      setOtp('')
                    }
                  }}
                  className={`login-method-tab ${
                    authMode === mode.id ? 'login-method-tab--active' : ''
                  }`}
                >
                  <span>{mode.label}</span>
                  <small>{mode.sublabel}</small>
                </button>
              ))}
            </div>

            <motion.div
              key={authMode}
              className="login-form-card"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {authMode === 'email' ? (
                <div className="login-form-stack">
                  <label className="login-field">
                    <span>Email</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>

                  <label className="login-field">
                    <span>Password</span>
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                    />
                  </label>

                  {isSignUp ? (
                    <label className="login-field">
                      <span>Confirm Password</span>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Confirm password"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}

              {authMode === 'phone' ? (
                <div className="login-form-stack">
                  <label className="login-field">
                    <span>Phone number</span>
                    <div className="login-phone">
                      <span className="login-phone__prefix">+91</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        placeholder="9876543210"
                      />
                    </div>
                  </label>

                  {confirmationResult ? (
                    <label className="login-field">
                      <span>OTP</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={otp}
                        onChange={(event) => setOtp(event.target.value)}
                        placeholder="Enter OTP"
                      />
                    </label>
                  ) : null}
                </div>
              ) : null}

              {authMode === 'google' ? (
                <div className="login-google-panel">
                  <div className="login-google-panel__copy">
                    <h2>One-click access</h2>
                    <p>Use your Google account to sign in instantly and sync your history.</p>
                  </div>
                </div>
              ) : null}

              <div className="login-action-area">
                {authMode === 'google' ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="login-button login-button--google"
                  >
                    {loading ? <span className="login-button__spinner" /> : <GoogleIcon />}
                    <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={authMode === 'email' ? handleEmailSubmit : confirmationResult ? handleVerifyOtp : handleSendOtp}
                    disabled={loading}
                    className="login-button login-button--primary"
                  >
                    {loading ? <span className="login-button__spinner" /> : null}
                    <span>{loading ? 'Processing...' : primaryLabel}</span>
                  </button>
                )}
              </div>

              {error ? <div className="login-alert login-alert--error">{error}</div> : null}
              {success ? <div className="login-alert login-alert--success">{success}</div> : null}

              {authMode !== 'google' ? (
                <>
                  <div className="login-divider">
                    <span>Or continue with Google</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={loading}
                    className="login-social-button"
                  >
                    <GoogleIcon />
                    <span>Continue with Google</span>
                  </button>
                </>
              ) : null}
            </motion.div>

            <footer className="login-footer">Powered by LangChain + Groq AI</footer>
          </section>
        </div>
      </motion.div>
    </div>
  )
}

export default Login
