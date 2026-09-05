const CACHE = 'tilwa-v124-visual-practice'
const SCOPE = new URL('./', self.registration.scope)
const scoped = (path = '') => new URL(path.replace(/^\//, ''), SCOPE).pathname
const SHELL = [scoped(), scoped('index.html'), scoped('manifest.webmanifest'), scoped('icon.svg')]
self.addEventListener('install', (event) => event.waitUntil((async () => {
  const cache = await caches.open(CACHE)
  await cache.addAll(SHELL)
  const response = await fetch(scoped('audio-files.json'))
  if (response.ok) {
    const audioFiles = await response.json()
    await Promise.allSettled(audioFiles.map((file) => cache.add(scoped(file))))
  }
  await self.skipWaiting()
})()))
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const keys = await caches.keys()
  await Promise.all(keys.filter((key) => (key.startsWith('ayet-') || key.startsWith('tilwa-')) && key !== CACHE).map((key) => caches.delete(key)))
  await self.clients.claim()
})()))
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin || /^\/api\//.test(url.pathname) || /(?:auth|oauth|callback|account|checkout|billing|subscription|entitlement|portal)/i.test(url.pathname)) return
  const cacheable = event.request.mode === 'navigate' || ['script', 'style', 'image', 'font', 'audio', 'manifest'].includes(event.request.destination) || [scoped('audio-files.json'), scoped('exercise-library.json')].includes(url.pathname)
  if (!cacheable) return
  event.respondWith((async () => {
    const cached = await caches.match(event.request)
    if (cached && event.request.destination === 'audio') return cached
    try {
      const response = await fetch(event.request)
      if (response.ok) {
        const copy = response.clone()
        event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)))
      }
      return response
    } catch {
      return cached || (event.request.mode === 'navigate' ? caches.match(scoped('index.html')) : Response.error())
    }
  })())
})
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || scoped(), self.location.origin).href
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find((client) => client.url.startsWith(self.location.origin))
    if (existing) { await existing.focus(); return existing.navigate(target) }
    return clients.openWindow(target)
  })())
})
