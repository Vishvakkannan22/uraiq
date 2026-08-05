import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, ShieldCheck } from 'lucide-react'
import AuthLayout, { Wordmark } from './AuthLayout'
import { ease } from '../../lib/motion'
import { auth } from '../../lib/api'

/**
 * The footer deliberately does not say "end-to-end encrypted": the server reads
 * every message in order to moderate it before delivery. Encrypted in transit
 * and at rest is true; end-to-end is not, and is incompatible with having a
 * safety agent at all.
 */
export default function LoginPage() {
  const navigate = useNavigate()
  /* Empty, not prefilled. The old demo credentials were harmless against mock
     data and are a real hazard against a real account store. */
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await auth.login(email, password)
      navigate('/home')
    } catch (err) {
      setError(err.message || 'Could not sign in')
      setBusy(false)
    }
  }

  return (
    <AuthLayout footer="Encrypted in transit - Zero ads - Free forever">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12, duration: 0.5, ease }}
      >
        <Wordmark />
        <p
          style={{
            textAlign: 'center',
            marginTop: 'var(--s3)',
            marginBottom: 'var(--s7)',
            fontSize: 'var(--fs-14)',
            color: 'var(--text-3)',
          }}
        >
          Welcome back. Pick up where you left off.
        </p>
      </motion.div>

      <motion.form
        onSubmit={submit}
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.22 } } }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}
      >
        <motion.div variants={fieldV} className="field">
          <label className="field__label" htmlFor="email">Email</label>
          <input id="email" className="field__input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </motion.div>

        <motion.div variants={fieldV} className="field">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <label className="field__label" htmlFor="password">Password</label>
            <a href="#" style={{ fontSize: 'var(--fs-11)', fontWeight: 600, color: 'var(--brand-600)' }}>Forgot?</a>
          </div>
          <input id="password" className="field__input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </motion.div>

        {error && (
          <motion.div variants={fieldV} className="notice notice--error" role="alert">
            {error}
          </motion.div>
        )}

        <motion.button
          variants={fieldV}
          type="submit"
          className="btn btn--primary btn--block"
          disabled={busy}
          style={{ marginTop: 'var(--s2)', height: 46 }}
        >
          {busy ? (
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}>
              <Loader2 size={18} />
            </motion.span>
          ) : (
            'Sign in'
          )}
        </motion.button>

        <motion.div
          variants={fieldV}
          className="row"
          style={{ justifyContent: 'center', gap: 6, fontSize: 'var(--fs-11)', color: 'var(--text-4)' }}
        >
          <ShieldCheck size={13} />
          Every message is checked for safety before it is delivered
        </motion.div>
      </motion.form>

      <div
        style={{
          marginTop: 'var(--s6)',
          paddingTop: 'var(--s5)',
          borderTop: '1px solid var(--divider)',
          textAlign: 'center',
          fontSize: 'var(--fs-13)',
          color: 'var(--text-4)',
        }}
      >
        New to UraiQ?{' '}
        <Link to="/signup" style={{ color: 'var(--brand-600)', fontWeight: 650 }}>Create an account</Link>
      </div>
    </AuthLayout>
  )
}

const fieldV = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease } },
}
