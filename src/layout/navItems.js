import { Bell, MessageCircle, Phone, Search, Settings, SquarePen, User, Users } from 'lucide-react'

/**
 * Two shapes over one set of destinations.
 *
 * `navItems` is the primary five, and stays five: it drives the mobile tab bar,
 * where a sixth tab means every tab gets narrower than a thumb. `railGroups` is
 * the desktop rail, which has a full column of vertical space and can afford
 * the secondary destinations that would otherwise be buried — Notifications in
 * particular was only reachable from the profile screen.
 *
 * Both read from the same objects, so a route or label only ever changes here.
 */

const chats = { key: 'messages', label: 'Chats', to: '/chats', icon: MessageCircle }
const calls = { key: 'calls', label: 'Calls', to: '/calls', icon: Phone }
const compose = { key: 'compose', label: 'New', to: '/new', icon: SquarePen, center: true }
const search = { key: 'search', label: 'Find', to: '/search', icon: Search }
const profile = { key: 'profile', label: 'You', to: '/profile', icon: User }

const notifications = { key: 'notifications', label: 'Activity', to: '/notifications', icon: Bell }
const communities = { key: 'communities', label: 'Groups', to: '/communities', icon: Users }
/* Settings is a sheet owned by ProfilePage, not a route of its own. Router
   state is what carries "open it on arrival" without inventing a URL for a
   panel that cannot be linked to or refreshed into. */
const settings = {
  key: 'settings',
  label: 'Settings',
  to: '/profile',
  icon: Settings,
  state: { openSettings: true },
}

/**
 * Order is deliberate and fixed: Messages sits dead centre because it is the
 * product, and the tab bar renders that slot as a raised dock rather than a
 * flat icon. `center: true` is what drives that treatment.
 *
 * No `badge` field — a nav item's unread count is live data, not layout
 * config. Both navs pull the real number from `useUnreadCount()`.
 */
export const navItems = [chats, calls, compose, search, profile]

/**
 * The desktop rail, in bands separated by a hairline. The last group carries
 * `foot: true` and is pushed to the bottom of the column, so the rail reads
 * top-to-bottom as brand → what you do → where you browse → who you are.
 *
 * Deliberately absent: Saved / Bookmarks. There is a CollectionSheet but no
 * route and no endpoint behind it, and a nav item that leads nowhere is the
 * same broken-affordance problem as a disabled button that looks enabled.
 * TODO(milestone 2): add it here once /saved exists.
 */
export const railGroups = [
  { id: 'primary', items: [chats, calls, compose, search, notifications] },
  { id: 'browse', items: [communities] },
  { id: 'account', foot: true, items: [profile, settings] },
]
