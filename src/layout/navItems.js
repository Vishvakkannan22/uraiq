import { Clapperboard, House, MessageCircle, Search, User } from 'lucide-react'

/**
 * Order is deliberate and fixed: Messages sits dead centre because it is the
 * product, and the tab bar renders that slot as a raised dock rather than a
 * flat icon. `center: true` is what drives that treatment.
 */
export const navItems = [
  { key: 'home', label: 'Home', to: '/home', icon: House },
  { key: 'reels', label: 'Reels', to: '/reels', icon: Clapperboard },
  { key: 'messages', label: 'Messages', to: '/chats', icon: MessageCircle, badge: 4, center: true },
  { key: 'search', label: 'Search', to: '/search', icon: Search },
  { key: 'profile', label: 'You', to: '/profile', icon: User },
]
