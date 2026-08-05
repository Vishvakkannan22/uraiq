import { motion } from 'framer-motion'
import { spring } from '../../lib/motion'

export default function Toggle({ checked, onChange, label }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`toggle ${checked ? 'toggle--on' : ''}`}
    >
      <motion.span layout transition={spring} className="toggle__knob" style={{ left: checked ? 21 : 3 }} />
    </button>
  )
}
