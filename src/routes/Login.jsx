import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { IconEye, IconEyeOff, IconAlertCircle } from '@/components/icons'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { login, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()

  if (isAuthenticated) return <Navigate to="/" replace />
  if (isLoading) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      navigate('/', { replace: true })
    } catch {
      setError('Invalid username or password')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="relative grid min-h-screen grid-cols-1 md:grid-cols-[480px_1fr]"
      style={{
        backgroundImage: "url('/branding/login-bg.jpg')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'linear-gradient(100deg, rgba(5,15,40,0.90) 0%, rgba(5,15,40,0.75) 45%, rgba(5,15,40,0.2) 100%)',
        }}
      />

      <div className="relative z-10 flex items-center justify-center px-6 py-10">
        <div
          className="w-full max-w-[380px] rounded-3xl border border-white/15 p-9 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
          style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}
        >
          <div className="mb-7 flex justify-center">
            <div className="rounded-2xl bg-white px-5 py-2.5 shadow-lg">
              <img
                src="/branding/seros-logo-animated.gif"
                alt="Seros"
                className="h-9 w-auto"
              />
            </div>
          </div>

          <h1 className="text-center text-2xl font-extrabold tracking-tight text-white">
            Welcome back
          </h1>
          <p className="mt-1.5 mb-7 text-center text-sm text-white/45">
            Sign in to continue to SerosIT
          </p>

          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/15 px-3.5 py-2.5 text-sm text-red-300">
              <IconAlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="username"
                className="text-[11px] font-bold uppercase tracking-wider text-white/50"
              >
                Username
              </label>
              <Input
                id="username"
                autoComplete="username"
                autoFocus
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-11 rounded-xl border-white/15 bg-white/8 px-4 text-[0.9rem] text-white placeholder:text-white/30 focus-visible:border-blue-400/60 focus-visible:bg-white/13 focus-visible:ring-blue-400/20"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                className="text-[11px] font-bold uppercase tracking-wider text-white/50"
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 rounded-xl border-white/15 bg-white/8 px-4 pr-11 text-[0.9rem] text-white placeholder:text-white/30 focus-visible:border-blue-400/60 focus-visible:bg-white/13 focus-visible:ring-blue-400/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 transition-colors hover:text-white/80"
                >
                  {showPassword ? (
                    <IconEyeOff className="h-4 w-4" />
                  ) : (
                    <IconEye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="mt-2 h-[46px] rounded-xl bg-[linear-gradient(90deg,#1a3f7a_0%,#2563eb_50%,#1a3f7a_100%)] bg-[length:200%_auto] text-[0.9rem] font-bold tracking-wide text-white shadow-[0_4px_20px_rgba(37,99,235,0.45)] transition-all hover:-translate-y-px hover:shadow-[0_6px_28px_rgba(37,99,235,0.6)] hover:bg-[position:100%_center]"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-center text-[11px] text-white/25">
            Seros · Internal tool · Confidential
          </p>
        </div>
      </div>

      <div className="relative z-10 hidden md:block" />
    </div>
  )
}
