import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Check, Loader2 } from 'lucide-react'
import AuthLayout, { Wordmark } from './AuthLayout'
import { ease } from '../../lib/motion'
import { auth } from '../../lib/api'

/* "End-to-end encrypted" removed deliberately — the safety agent reads every
   message before delivery, so the claim would be false. */
const perks = ['Free UraiQ assistant, no paywall', 'Safety checks on by default', 'No ads, no data selling']

export default function SignupPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (key) => (e) => setForm((value) => ({ ...value, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await auth.signup(form)
      navigate('/welcome', { replace: true })
    } catch (err) {
      setError(err.message || 'Could not create the account')
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5, ease }}>
        <Wordmark />
        <p style={{ textAlign: 'center', marginTop: 'var(--s3)', marginBottom: 'var(--s5)', fontSize: 'var(--fs-14)', color: 'var(--text-3)' }}>
          Create your account - it takes a minute.
        </p>
      </motion.div>

      <motion.ul
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.2 } } }}
        style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 'var(--s6)' }}
      >
        {perks.map((perk) => (
          <motion.li key={perk} variants={fieldV} className="row" style={{ gap: 9, fontSize: 'var(--fs-13)', color: 'var(--text-3)' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 17, height: 17, borderRadius: 999, background: 'var(--brand-100)', color: 'var(--brand-600)', flexShrink: 0 }}>
              <Check size={11} strokeWidth={3} />
            </span>
            {perk}
          </motion.li>
        ))}
      </motion.ul>

      <motion.form
        onSubmit={submit}
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.4 } } }}
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s4)' }}
      >
        <motion.div variants={fieldV} className="field">
          <label className="field__label" htmlFor="name">Display name</label>
          <input id="name" className="field__input" value={form.name} onChange={set('name')} placeholder="Alex Rivera" autoComplete="name" />
        </motion.div>
        <motion.div variants={fieldV} className="field">
          <label className="field__label" htmlFor="su-email">Email</label>
          <input id="su-email" className="field__input" type="email" value={form.email} onChange={set('email')} placeholder="you@campus.edu" autoComplete="email" />
        </motion.div>
        <motion.div variants={fieldV} className="field">
          <label className="field__label" htmlFor="su-pass">Password</label>
          <input id="su-pass" className="field__input" type="password" value={form.password} onChange={set('password')} placeholder="At least 8 characters" autoComplete="new-password" />
        </motion.div>

        {error && (
          <motion.div variants={fieldV} className="notice notice--error" role="alert">
            {error}
          </motion.div>
        )}

        <motion.button variants={fieldV} type="submit" className="btn btn--primary btn--block" disabled={busy}           style={{ marginTop: 'var(--s2)', height: 46 }}>
          {busy ? (
            <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }} style={{ display: 'flex' }}>
              <Loader2 size={18} />
            </motion.span>
          ) : (
            'Create account'
          )}
        </motion.button>
      </motion.form>

      <div style={{ marginTop: 'var(--s6)', paddingTop: 'var(--s5)', borderTop: '1px solid var(--divider)', textAlign: 'center', fontSize: 'var(--fs-13)', color: 'var(--text-4)' }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--brand-600)', fontWeight: 650 }}>Sign in</Link>
      </div>
    </AuthLayout>
  )
}

const fieldV = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease } },
}
