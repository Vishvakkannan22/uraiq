/* Mock data standing in for Firestore. Content is fictional. */

export const currentUser = {
  id: 'u-alex',
  name: 'Alex Rivera',
  handle: '@alexrivera',
  initials: 'AR',
  gradient: 'linear-gradient(135deg, #E879F9, #A855F7)',
  bio: 'CS ’26 · Club coordinator · building things at 2am',
  status: 'Online',
  ghostMode: false,
  stats: { posts: 48, followers: 1284, following: 312 },
}

const g = {
  violet: 'linear-gradient(135deg, #C084FC, #4F46E5)',
  pink: 'linear-gradient(135deg, #FBCFE8, #C084FC)',
  indigo: 'linear-gradient(135deg, #A5B4FC, #4338CA)',
  amber: 'linear-gradient(135deg, #FDE68A, #F59E0B)',
  teal: 'linear-gradient(135deg, #99F6E4, #0D9488)',
  rose: 'linear-gradient(135deg, #FDA4AF, #E11D48)',
  lime: 'linear-gradient(135deg, #D9F99D, #65A30D)',
  sky: 'linear-gradient(135deg, #BAE6FD, #0284C7)',
}

export const chats = [
  {
    id: 'marcus',
    name: 'Marcus Vance',
    initials: 'MV',
    gradient: g.violet,
    preview: 'Can you send the encrypted build notes?',
    time: '2m',
    unread: 3,
    pinned: true,
    encrypted: true,
    online: true,
    typing: true,
  },
  {
    id: 'cs-club',
    name: 'CS Club — Officers',
    initials: 'CC',
    gradient: g.pink,
    preview: "I'll design the event poster tonight",
    author: 'Elena',
    time: '14m',
    unread: 0,
    pinned: true,
    group: true,
    members: 8,
  },
  {
    id: 'elena',
    name: 'Elena Rostova',
    initials: 'ER',
    gradient: g.indigo,
    preview: 'Translated the caption to Japanese ✓',
    time: '1h',
    unread: 0,
    outgoing: false,
    online: true,
    encrypted: true,
  },
  {
    id: 'robotics',
    name: 'Robotics Hub',
    initials: 'RH',
    gradient: g.amber,
    preview: 'Meeting moved to Thu 6pm, Rm 204',
    author: 'Priya',
    time: '3h',
    unread: 12,
    group: true,
    members: 34,
  },
  {
    id: 'jordan',
    name: 'Jordan Okafor',
    initials: 'JO',
    gradient: g.teal,
    preview: 'You: sent a photo',
    time: '5h',
    unread: 0,
    outgoing: true,
    delivered: true,
    read: true,
  },
  {
    id: 'study',
    name: 'Finals Study Room',
    initials: 'FS',
    gradient: g.lime,
    preview: 'Sam: anyone got the ch. 7 notes?',
    time: 'Yesterday',
    unread: 0,
    group: true,
    members: 12,
    muted: true,
  },
  {
    id: 'mom',
    name: 'Mom',
    initials: 'M',
    gradient: g.rose,
    preview: 'Call me when you get a chance ❤️',
    time: 'Yesterday',
    unread: 1,
    online: false,
  },
  {
    id: 'design',
    name: 'Design Collective',
    initials: 'DC',
    gradient: g.sky,
    preview: 'Theo: dropped the new type scale in figma',
    time: 'Mon',
    unread: 0,
    group: true,
    members: 21,
  },
]

/* `messagesByChat` used to sit here — canned transcripts the thread rendered
   before there was a backend. Deleted: ChatThread now reads
   GET /conversations/:id/messages and nothing else. */

/* Canned reply chips. Keyed by the old seed ids, so a real conversation always
   falls through to `default` — which is correct, because these are generic
   openers rather than anything derived from the thread.
   TODO(milestone 2): generate these from the conversation; the tray is labelled
   "UraiQ", which implies the assistant read something. */
export const smartRepliesByChat = {
  marcus: ['Got it, thanks!', 'Can you resend?', 'On it 👍'],
  'cs-club': ['Looks great!', "I'll review tonight", 'Nice work 🔥'],
  elena: ['That translation is perfect', 'Love the setup', 'Send more shots'],
  default: ['Sounds good', 'Thanks!', "I'll get back to you"],
}

export const stories = [
  { id: 's-me', name: 'Your story', initials: 'AR', gradient: currentUser.gradient, self: true, seen: true },
  { id: 's-elena', name: 'Elena', initials: 'ER', gradient: g.indigo, seen: false, time: '2h', viewers: 128, frames: [g.pink, g.violet] },
  { id: 's-marcus', name: 'Marcus', initials: 'MV', gradient: g.violet, seen: false, time: '4h', viewers: 64, frames: [g.indigo] },
  { id: 's-jordan', name: 'Jordan', initials: 'JO', gradient: g.teal, seen: false, time: '6h', viewers: 212, frames: [g.teal, g.lime, g.sky] },
  { id: 's-priya', name: 'Priya', initials: 'PK', gradient: g.amber, seen: true, time: '9h', viewers: 91, frames: [g.amber] },
  { id: 's-theo', name: 'Theo', initials: 'TL', gradient: g.sky, seen: true, time: '11h', viewers: 47, frames: [g.sky] },
]

export const reels = [
  { id: 'r1', user: 'elena.codes', gradient: g.pink, caption: 'translating my desk setup for the campus creators meetup ✨', likes: '2.4k', comments: 312, shares: 88, music: 'lo-fi study — mellowbeat' },
  { id: 'r2', user: 'robotics.hub', gradient: g.amber, caption: 'the arm finally picked up the cube on the first try 🤖', likes: '5.1k', comments: 640, shares: 210, music: 'original audio' },
  { id: 'r3', user: 'jordan.o', gradient: g.teal, caption: '5am trail run, no regrets', likes: '892', comments: 47, shares: 12, music: 'runner — kaito' },
]

export const communities = [
  { id: 'c-cs', name: 'CS Club', gradient: g.violet, members: 312, channels: 4, unread: 6, tag: 'Academics' },
  { id: 'c-design', name: 'Design Collective', gradient: g.pink, members: 98, channels: 2, unread: 0, tag: 'Creative' },
  { id: 'c-robotics', name: 'Robotics Hub', gradient: g.amber, members: 154, channels: 3, unread: 12, tag: 'Engineering' },
  { id: 'c-music', name: 'Campus Radio', gradient: g.teal, members: 421, channels: 5, unread: 0, tag: 'Media' },
  { id: 'c-esports', name: 'Esports League', gradient: g.indigo, members: 663, channels: 6, unread: 3, tag: 'Gaming' },
  { id: 'c-photo', name: 'Photo Walk', gradient: g.sky, members: 77, channels: 2, unread: 0, tag: 'Creative' },
]

export const events = [
  { id: 'e1', day: '14', month: 'Aug', title: 'Hackathon Kickoff', host: 'CS Club', where: 'Rm 204 · 6:00 PM', going: 84, gradient: g.violet },
  { id: 'e2', day: '17', month: 'Aug', title: 'Portfolio Review Night', host: 'Design Collective', where: 'Studio B · 7:30 PM', going: 31, gradient: g.pink },
  { id: 'e3', day: '22', month: 'Aug', title: 'Bot Battle Finals', host: 'Robotics Hub', where: 'Main Hall · 5:00 PM', going: 156, gradient: g.amber },
]

export const notifications = [
  { id: 'n1', type: 'reaction', name: 'Elena Rostova', initials: 'ER', gradient: g.indigo, text: 'reacted ❤️ to your message', time: '2m', unread: true },
  { id: 'n2', type: 'mention', name: 'CS Club', initials: 'CC', gradient: g.pink, text: 'Priya mentioned you in #announcements', time: '18m', unread: true },
  { id: 'n3', type: 'ai', name: 'UraiQ', initials: 'AI', gradient: 'var(--grad)', text: 'Your daily digest is ready — 14 messages across 3 chats', time: '1h', unread: true, ai: true },
  { id: 'n4', type: 'follow', name: 'Jordan Okafor', initials: 'JO', gradient: g.teal, text: 'started following you', time: '3h', unread: false },
  { id: 'n5', type: 'story', name: 'Marcus Vance', initials: 'MV', gradient: g.violet, text: 'viewed your story', time: '5h', unread: false },
  { id: 'n6', type: 'event', name: 'Robotics Hub', initials: 'RH', gradient: g.amber, text: 'Bot Battle Finals starts in 2 days', time: 'Yesterday', unread: false },
  { id: 'n7', type: 'security', name: 'Security', initials: '🔒', gradient: g.rose, text: 'Screenshot detected in a protected chat', time: 'Yesterday', unread: false },
]

export const profilePosts = [g.violet, g.pink, g.teal, g.amber, g.indigo, g.sky, g.lime, g.rose, g.violet]

/**
 * The Home feed. Photos, clips, articles and plain posts share one shape and
 * one card, deliberately — the feed never labels what kind of thing a post is,
 * so `media.kind` only ever changes how the media area is laid out, never
 * whether a "News"/"Video" badge appears.
 */
export const feed = [
  {
    id: 'f1',
    author: 'Elena Ruiz', handle: 'elena.codes', initials: 'ER', gradient: g.indigo,
    time: '12m',
    text: 'six months of night builds and the campus creators app finally shipped. thank you to everyone who tested it at 2am 💜 #shipped #campuscreators',
    media: { kind: 'photo', gradient: g.pink, ratio: '4 / 5' },
    likes: 248, comments: 31, shares: 8,
  },
  {
    id: 'f2',
    author: 'Robotics Hub', handle: 'robotics.hub', initials: 'RH', gradient: g.amber,
    time: '38m',
    text: 'the arm picked up the cube on the first try. no edits, no retakes 🤖 #robotics @jordan.o',
    media: { kind: 'clip', gradient: g.amber, ratio: '9 / 13', duration: '0:24' },
    likes: 5100, comments: 640, shares: 210,
  },
  {
    id: 'f3',
    author: 'Campus Wire', handle: 'campuswire', initials: 'CW', gradient: g.sky,
    time: '1h',
    text: 'The library extends 24-hour access through the end of finals week.',
    media: {
      kind: 'article', gradient: g.sky, ratio: '16 / 9',
      headline: 'Main library goes 24/7 for finals — third year running',
      source: 'campuswire.edu',
    },
    likes: 412, comments: 57, shares: 96,
  },
  {
    id: 'f4',
    author: 'Jordan Okafor', handle: 'jordan.o', initials: 'JO', gradient: g.teal,
    time: '2h',
    text: '5am trail run, no regrets. the fog over the ridge was worth every minute of it.',
    media: { kind: 'clip', gradient: g.teal, ratio: '9 / 13', duration: '0:41' },
    likes: 892, comments: 47, shares: 12,
  },
  {
    id: 'f5',
    author: 'Priya Kapoor', handle: 'priya.k', initials: 'PK', gradient: g.rose,
    time: '3h',
    text: 'hot take: the best debugging tool is still explaining the bug out loud to someone who has no idea what you are talking about #devlife',
    media: null,
    likes: 1340, comments: 208, shares: 61,
  },
  {
    id: 'f6',
    author: 'Theo Lang', handle: 'theo.builds', initials: 'TL', gradient: g.lime,
    time: '5h',
    text: 'the greenhouse sensors are live. soil moisture, light and temp, all on-device, nothing leaves the garden.',
    media: { kind: 'photo', gradient: g.lime, ratio: '1 / 1' },
    likes: 623, comments: 74, shares: 29,
  },
  {
    id: 'f7',
    author: 'Campus Wire', handle: 'campuswire', initials: 'CW', gradient: g.sky,
    time: '7h',
    text: 'Applications open Monday and close at the end of the month.',
    media: {
      kind: 'article', gradient: g.violet, ratio: '16 / 9',
      headline: 'Student research grants double for the spring cycle',
      source: 'campuswire.edu',
    },
    likes: 289, comments: 34, shares: 118,
  },
  {
    id: 'f8',
    author: 'Marcus Vance', handle: 'marcus.v', initials: 'MV', gradient: g.violet,
    time: '9h',
    text: 'encryption audit came back clean on the key derivation path. every message on this thing is sealed before it leaves your device.',
    media: { kind: 'photo', gradient: g.indigo, ratio: '4 / 5' },
    likes: 2100, comments: 156, shares: 340,
  },
]

/** Comment threads keyed by feed post id. `default` backs any post without its own. */
export const commentsByPost = {
  default: [
    { id: 'c1', author: 'Jordan Okafor', initials: 'JO', gradient: g.teal, time: '8m', text: 'this is genuinely impressive', likes: 12 },
    { id: 'c2', author: 'Priya Kapoor', initials: 'PK', gradient: g.rose, time: '21m', text: 'saving this for later, thank you for posting', likes: 4 },
    { id: 'c3', author: 'Theo Lang', initials: 'TL', gradient: g.lime, time: '44m', text: 'how long did the whole thing take end to end?', likes: 2 },
  ],
  f1: [
    { id: 'c4', author: 'Marcus Vance', initials: 'MV', gradient: g.violet, time: '4m', text: 'shipped it! congrats, this took forever', likes: 31 },
    { id: 'c5', author: 'Theo Lang', initials: 'TL', gradient: g.lime, time: '9m', text: 'the 2am testers deserve a medal', likes: 8 },
    { id: 'c6', author: 'Priya Kapoor', initials: 'PK', gradient: g.rose, time: '15m', text: 'been waiting for this one 🎉', likes: 5 },
  ],
  f3: [
    { id: 'c7', author: 'Elena Ruiz', initials: 'ER', gradient: g.indigo, time: '32m', text: 'third year running and still no extra outlets', likes: 47 },
    { id: 'c8', author: 'Jordan Okafor', initials: 'JO', gradient: g.teal, time: '51m', text: 'the third floor is the only quiet one, spread the word carefully', likes: 19 },
  ],
}

/** Targets offered by the share sheet. */
export const shareTargets = [
  { id: 'st-elena', name: 'Elena', initials: 'ER', gradient: g.indigo },
  { id: 'st-marcus', name: 'Marcus', initials: 'MV', gradient: g.violet },
  { id: 'st-jordan', name: 'Jordan', initials: 'JO', gradient: g.teal },
  { id: 'st-priya', name: 'Priya', initials: 'PK', gradient: g.rose },
  { id: 'st-theo', name: 'Theo', initials: 'TL', gradient: g.lime },
  { id: 'st-robotics', name: 'Robotics', initials: 'RH', gradient: g.amber },
]

export const blockedUsers = [
  { id: 'b1', name: 'spam.account.7742', initials: 'SA', gradient: g.rose, since: 'Blocked 2 weeks ago' },
  { id: 'b2', name: 'Unknown (+1 555 0134)', initials: '??', gradient: g.indigo, since: 'Blocked last month' },
  { id: 'b3', name: 'crypto.promo.hub', initials: 'CP', gradient: g.amber, since: 'Blocked in January' },
]

/** Sizes are fictional; the shape mirrors what a real on-device audit returns. */
export const storageBreakdown = [
  { id: 'media', label: 'Media cache', mb: 186.0, tint: 'var(--brand-500)', clearable: true },
  { id: 'messages', label: 'Messages', mb: 48.2, tint: 'var(--brand-300)', clearable: false },
  { id: 'ai', label: 'AI context', mb: 2.1, tint: 'var(--warning)', clearable: true },
  { id: 'keys', label: 'Encryption keys', mb: 0.012, tint: 'var(--success)', clearable: false },
]

export const notificationPrefs = [
  { key: 'messages', title: 'Direct messages', body: 'Every new message in a one-to-one chat' },
  { key: 'mentions', title: 'Mentions', body: 'Only when someone @s you in a group' },
  { key: 'reactions', title: 'Reactions', body: 'When someone reacts to your message or post' },
  { key: 'stories', title: 'Stories', body: 'When people you follow post a story' },
  { key: 'events', title: 'Events', body: 'Reminders an hour before an event starts' },
  { key: 'security', title: 'Security alerts', body: 'Key changes and new sign-ins. Always on.', locked: true },
]

/** Poll posts. `voted` is filled in at runtime; seed counts are the baseline. */
export const feedExtras = [
  {
    id: 'f9',
    author: 'CS Club', handle: 'csclub', initials: 'CC', gradient: g.pink,
    time: '25m',
    text: 'Locking the demo night this week. Vote and we\u2019ll book the room. #csclub #demonight',
    media: null,
    poll: {
      question: 'Which night works for the showcase?',
      closesIn: '6h left',
      options: [
        { id: 'thu', label: 'Thursday', votes: 34 },
        { id: 'fri', label: 'Friday', votes: 51 },
        { id: 'sat', label: 'Saturday', votes: 12 },
      ],
    },
    likes: 96, comments: 23, shares: 5,
  },
  {
    id: 'f10',
    author: 'Design Collective', handle: 'designco', initials: 'DC', gradient: g.sky,
    time: '1h',
    text: 'New type scale is live in the shared library. Shout if anything reads off at small sizes \u2014 cc @alexrivera #designsystem',
    media: { kind: 'photo', gradient: g.sky, ratio: '16 / 9' },
    likes: 187, comments: 19, shares: 22,
  },
]

export const collections = [
  { id: 'col-read', name: 'Read later', count: 12, gradient: g.violet },
  { id: 'col-build', name: 'Build ideas', count: 7, gradient: g.amber },
  { id: 'col-campus', name: 'Campus', count: 24, gradient: g.sky },
]

/** Shown only on your own posts. */
export const postInsights = {
  views: 4820,
  reach: 3140,
  profileVisits: 96,
  shares: 22,
  breakdown: [
    { label: 'From your followers', pct: 62 },
    { label: 'From Home', pct: 24 },
    { label: 'From Search', pct: 9 },
    { label: 'From shares', pct: 5 },
  ],
}
