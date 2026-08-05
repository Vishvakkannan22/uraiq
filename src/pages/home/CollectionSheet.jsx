import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, FolderPlus, Plus } from 'lucide-react'
import Sheet from '../../components/ui/Sheet'
import { springPop } from '../../lib/motion'
import { collections as seed } from '../../data/mockData'

/** Save-to-collection picker. Creating one saves into it in the same step. */
export default function CollectionSheet({ open, onClose, desktop, onSaved }) {
  const [lists, setLists] = useState(seed)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  function save(list) {
    setLists((prev) => prev.map((l) => (l.id === list.id ? { ...l, count: l.count + 1 } : l)))
    onSaved(list.name)
    onClose()
  }

  function create() {
    const trimmed = name.trim()
    if (!trimmed) return
    const list = {
      id: `col-${Date.now()}`,
      name: trimmed,
      count: 1,
      gradient: 'var(--grad)',
    }
    setLists((prev) => [list, ...prev])
    setName('')
    setCreating(false)
    onSaved(trimmed)
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} desktop={desktop}>
      <h3 style={{ fontSize: 'var(--fs-17)', marginBottom: 'var(--s1)' }}>Save to collection</h3>
      <p style={{ fontSize: 'var(--fs-13)', color: 'var(--text-4)', marginBottom: 'var(--s4)' }}>
        Collections stay on this device.
      </p>

      <div className="col" style={{ gap: 'var(--s1)' }}>
        {lists.map((l) => (
          <motion.button key={l.id} whileTap={{ scale: 0.985 }} className="set-row" onClick={() => save(l)}>
            <span className="collection-chip" style={{ background: l.gradient }} />
            <span className="grow" style={{ minWidth: 0, textAlign: 'left' }}>
              <span className="set-row__title">{l.name}</span>
              <span className="set-row__body tnum">{l.count} saved</span>
            </span>
            <Check size={16} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
          </motion.button>
        ))}
      </div>

      {creating ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springPop}
          className="row"
          style={{ gap: 'var(--s2)', marginTop: 'var(--s4)' }}
        >
          <div className="search grow">
            <FolderPlus size={16} />
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="Collection name"
              aria-label="New collection name"
            />
          </div>
          <button className="btn btn--primary btn--sm" onClick={create} disabled={!name.trim()}>Create</button>
        </motion.div>
      ) : (
        <button className="btn btn--secondary btn--block btn--sm" style={{ marginTop: 'var(--s4)', gap: 8 }} onClick={() => setCreating(true)}>
          <Plus size={16} /> New collection
        </button>
      )}
    </Sheet>
  )
}
