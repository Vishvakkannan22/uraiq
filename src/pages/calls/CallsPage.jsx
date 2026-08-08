import { Link } from 'react-router-dom'
import { CloudOff, MessageCircle, Phone, Video } from 'lucide-react'
import Header from '../../layout/Header'
import Avatar from '../../components/ui/Avatar'
import StatePanel from '../../components/ui/StatePanel'
import { SkeletonRow } from '../../components/ui/Skeleton'
import { useChatList } from '../../lib/chat/useChatList'
import { useScrolled } from '../../lib/useScrolled'
import { useRef } from 'react'
import { listTimeLabel } from '../../lib/time'

export default function CallsPage() {
  const { chats, loading, error, retry } = useChatList()
  const scrollRef = useRef(null)
  const scrolled = useScrolled(scrollRef)

  return (
    <div className="calls-page">
      <Header title="Calls" subtitle="Reach people from your live chats" scrolled={scrolled} />

      <div ref={scrollRef} className="scroll grow" style={{ padding: '0 var(--gutter) var(--s8)' }}>
        <section className="compose-card compose-card--calls">
          <div className="compose-card__icon">
            <Phone size={20} />
          </div>
          <h2>Instant contact</h2>
          <p>Voice and video actions stay aligned with your realtime conversation list.</p>
        </section>

        {loading ? (
          <div style={{ marginTop: 'var(--s4)' }}>
            {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : error ? (
          <StatePanel compact icon={CloudOff} title="Couldn't load calls" body={error.message} actionLabel="Try again" onAction={retry} />
        ) : chats.length === 0 ? (
          <StatePanel compact icon={Phone} title="No contacts yet" body="Start a chat first, then calls appear here." />
        ) : (
          <div className="call-list">
            {chats.map((chat) => (
              <div key={chat.id} className="call-row">
                <Avatar initials={chat.initials} gradient={chat.gradient} size={48} status={chat.online ? 'online' : undefined} />
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="truncate call-row__name">{chat.name}</div>
                  <div className="truncate call-row__meta">
                    {chat.online ? 'Available now' : `Last active ${listTimeLabel(chat.updatedAt)}`}
                  </div>
                </div>
                <Link to={`/chats/${chat.id}`} className="iconbtn" aria-label={`Message ${chat.name}`}>
                  <MessageCircle size={18} />
                </Link>
                <Link to={`/chats/${chat.id}`} className="iconbtn iconbtn--brand" aria-label={`Call ${chat.name}`}>
                  <Phone size={17} />
                </Link>
                <Link to={`/chats/${chat.id}`} className="iconbtn" aria-label={`Video call ${chat.name}`}>
                  <Video size={18} />
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
