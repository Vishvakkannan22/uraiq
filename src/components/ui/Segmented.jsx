import { motion } from 'framer-motion'
import { spring } from '../../lib/motion'

export default function Segmented({ items, value, onChange, id = 'seg' }) {
  return (
    <div className="segmented" role="tablist">
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            className={`segmented__item ${active ? 'segmented__item--active' : ''}`}
            onClick={() => onChange(item.value)}
          >
            {active && (
              <motion.span layoutId={`${id}-thumb`} transition={spring} className="segmented__thumb" />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
