import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import AppShell from './layout/AppShell'
import RequireAuth from './layout/RequireAuth'
import WelcomePage from './pages/auth/WelcomePage'
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'
import SearchPage from './pages/search/SearchPage'
import UniversePage from './pages/universe/UniversePage'
import ChatsLayout from './pages/chats/ChatsLayout'
import ChatThread, { NoChatSelected } from './pages/chats/ChatThread'
import NewChatPage from './pages/chats/NewChatPage'
import CallsPage from './pages/calls/CallsPage'
import StoryViewer from './pages/discover/StoryViewer'
import CommunitiesPage from './pages/communities/CommunitiesPage'
import NotificationsPage from './pages/notifications/NotificationsPage'
import ProfilePage from './pages/profile/ProfilePage'

function Router() {
  const location = useLocation()
  // Set when a story was opened from inside the app: the screen behind it stays
  // mounted so closing the story returns to it untouched.
  const background = location.state?.background

  return (
    <>
      <Routes location={background || location}>
        <Route path="/" element={<WelcomePage />} />
        <Route path="/welcome" element={<WelcomePage afterSignIn />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route path="/home" element={<Navigate to="/chats" replace />} />
          <Route path="/reels" element={<Navigate to="/calls" replace />} />
          <Route path="/chats" element={<ChatsLayout />}>
            <Route index element={<NoChatSelected />} />
            <Route path=":chatId" element={<ChatThread />} />
          </Route>
          <Route path="/new" element={<NewChatPage />} />
          <Route path="/calls" element={<CallsPage />} />
          <Route path="/search" element={<SearchPage />} />
          {/* A second way to see the same chats — the list stays the default. */}
          <Route path="/universe" element={<UniversePage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Reachable from Search and Profile rather than the tab bar. */}
          <Route path="/communities" element={<CommunitiesPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Route>

        {/* Direct visit to a story URL — renders on its own. */}
        <Route path="/stories/:storyId" element={<StoryViewer />} />
        <Route path="*" element={<Navigate to="/chats" replace />} />
      </Routes>

      <AnimatePresence>
        {background && (
          <Routes location={location} key={location.pathname}>
            <Route path="/stories/:storyId" element={<StoryViewer />} />
          </Routes>
        )}
      </AnimatePresence>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Router />
    </BrowserRouter>
  )
}
