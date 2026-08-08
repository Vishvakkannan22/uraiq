const CACHE_VERSION = 'uraiq-pwa-v2'
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/pwa-icon.svg',
  '/maskable-icon.svg',
  '/offline.html',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request))
    return
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.svg') || url.pathname.endsWith('.webmanifest')) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(CACHE_VERSION)
    cache.put(request, response.clone())
    return response
  } catch {
    const cache = await caches.open(CACHE_VERSION)
    return (
      (await cache.match(request)) ||
      (await cache.match('/')) ||
      (await cache.match('/offline.html'))
    )
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_VERSION)
  const cached = await cache.match(request)
  const fresh = fetch(request)
    .then((response) => {
      cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || fresh
}
