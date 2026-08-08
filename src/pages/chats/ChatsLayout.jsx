import { Outlet, useMatch } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import ChatListPane from './ChatListPane'
import { ease } from '../../lib/motion'

export default function ChatsLayout() {
  const inThread = useMatch('/chats/:chatId')

  return (
    <div className="chat-stack">
      <AnimatePresence initial={false}>
        <motion.div
          key={inThread ? 'thread' : 'list'}
          initial={{ x: inThread ? '100%' : '-28%', opacity: inThread ? 1 : 0.6 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: inThread ? '-28%' : '100%', opacity: inThread ? 0.6 : 1 }}
          transition={{ duration: 0.3, ease }}
          className="chat-stack__screen"
        >
          {inThread ? <Outlet /> : <ChatListPane />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
