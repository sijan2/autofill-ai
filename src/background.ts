// background.ts

import supabase from './lib/supabase'

interface SessionData {
  access_token: string
  refresh_token: string
}

interface Message {
  action: string
  data: any
  timestamp: number
  retryCount?: number
}

let socket: WebSocket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 5000 // 5 seconds
const KEEP_ALIVE_INTERVAL = 30000 // 30 seconds

let messageQueue: Message[] = []
const contentScriptReadyTabs = new Set<number>()
const MAX_RETRY_COUNT = 5

function connectWebSocket(): void {
  if (
    socket?.readyState === WebSocket.OPEN ||
    socket?.readyState === WebSocket.CONNECTING
  ) {
    console.log('WebSocket is already connected or connecting.')
    return
  }

  socket = new WebSocket('wss://websocket-sijan-6acdf23abc98.herokuapp.com')

  socket.onopen = (): void => {
    console.log('WebSocket connected')
    reconnectAttempts = 0
  }

  let lastOTPTime = 0
  const OTP_THROTTLE_INTERVAL = 2000 // 2 seconds

  socket.onmessage = (event: MessageEvent): void => {
    console.log('Received raw message:', event.data)
    try {
      const now = Date.now()
      if (now - lastOTPTime >= OTP_THROTTLE_INTERVAL) {
        lastOTPTime = now
        const data: any = JSON.parse(event.data)
        console.log('Parsed message:', data)
        if (data.historyId) {
          console.log('Queueing OTP message:', data.historyId)
          queueMessage({
            action: 'showOTP',
            data: { otp: data.historyId.toString() },
            timestamp: Date.now(),
          })
        } else {
          console.warn('Received message with missing historyId:', data)
        }
      } else {
        console.log('Throttling OTP message to prevent overload.')
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error)
    }
  }

  socket.onclose = (event: CloseEvent): void => {
    console.log('WebSocket disconnected. Reason:', event.reason)
    handleReconnection()
  }

  socket.onerror = (error: Event): void => {
    console.error('WebSocket error:', error)
    handleReconnection()
  }
}

function handleReconnection(): void {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    const delay = RECONNECT_DELAY * Math.pow(2, reconnectAttempts)
    reconnectAttempts++
    console.log(`Reconnecting in ${delay / 1000} seconds...`)
    setTimeout(connectWebSocket, delay)
  } else {
    console.error(
      'Max reconnection attempts reached. Please check your connection and reload the extension.'
    )
  }
}

function queueMessage(message: Message): void {
  message.timestamp = Date.now()
  messageQueue.push(message)
  console.log('Message queued:', message)
  processMessageQueue()
}

function notifyUser(message: string): void {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icon.png', // Replace with a valid icon URL or path
    title: 'Notification',
    message: message,
  })
}

function processMessageQueue(): void {
  console.log('Processing message queue. Queue length:', messageQueue.length)
  console.log(
    'Content scripts ready in tabs:',
    Array.from(contentScriptReadyTabs)
  )

  if (contentScriptReadyTabs.size === 0) {
    console.log('No content scripts are ready. Notifying user.')
    while (messageQueue.length > 0) {
      const message = messageQueue.shift()
      if (message && message.action === 'showOTP') {
        notifyUser(`OTP Received: ${message.data.otp}`)
      }
    }
    return
  }

  while (messageQueue.length > 0) {
    const message = messageQueue.shift()
    if (message) {
      sendMessageToContentScript(message)
    }
  }
}

function sendMessageToContentScript(message: Message): void {
  contentScriptReadyTabs.forEach((tabId) => {
    console.log('Sending message to content script in tab', tabId)
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        console.error(
          `Error sending message to tab ${tabId}:`,
          chrome.runtime.lastError.message
        )
        // Remove the tab from the set if there's an error
        contentScriptReadyTabs.delete(tabId)
        // Increment retry count
        message.retryCount = (message.retryCount || 0) + 1
        if (message.retryCount < MAX_RETRY_COUNT) {
          messageQueue.unshift(message)
        } else {
          console.error('Max retry attempts reached for message:', message)
        }
      } else {
        console.log(`Message sent successfully to tab ${tabId}`)
      }
    })
  })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentScriptReady') {
    if (sender.tab?.id != null) {
      contentScriptReadyTabs.add(sender.tab.id)
      console.log(`Content script ready in tab ${sender.tab.id}`)
      processMessageQueue()
    }
  }
})

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (contentScriptReadyTabs.has(tabId)) {
    contentScriptReadyTabs.delete(tabId)
    console.log(`Tab ${tabId} closed. Removed from ready tabs.`)
  }
})

function keepAlive(): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'ping' }))
  }
}

setInterval(keepAlive, KEEP_ALIVE_INTERVAL)

connectWebSocket()

chrome.tabs.onUpdated.addListener(
  (
    tabId: number,
    changeInfo: chrome.tabs.TabChangeInfo,
    tab: chrome.tabs.Tab
  ) => {
    if (changeInfo.status === 'complete') {
      chrome.tabs.sendMessage(tabId, { action: 'checkContentScriptReady' })
    }

    if (changeInfo.url?.includes('.chromiumapp.org/')) {
      console.log('OAuth callback URL detected:', changeInfo.url)
      finishUserOAuth(changeInfo.url, tabId)
    }
  }
)

async function finishUserOAuth(url: string, tabId: number): Promise<void> {
  try {
    console.log(`Handling user OAuth callback...`)
    const hashMap = parseUrlHash(url)
    console.log('Parsed hash map:', Object.fromEntries(hashMap))

    const access_token = hashMap.get('access_token')
    const refresh_token = hashMap.get('refresh_token')

    if (!access_token || !refresh_token) {
      throw new Error(`No supabase tokens found in URL hash`)
    }

    const sessionData: SessionData = {
      access_token,
      refresh_token,
    }

    await chrome.storage.local.set({ session: sessionData })
    console.log('Session data saved.')

    const savedData = await chrome.storage.local.get('session')
    console.log('Verified saved session data:', savedData)

    if (!savedData.session) {
      throw new Error('Failed to save session data to storage')
    }

    await chrome.tabs.update(tabId, { url: 'https://www.season.codes' })
    console.log(`Finished handling user OAuth callback`)
  } catch (error) {
    console.error('Error in finishUserOAuth:', error)
    notifyUser('Authentication failed. Please try again.')
  }
}

function parseUrlHash(url: string): Map<string, string> {
  return new Map(
    new URL(url).hash
      .slice(1)
      .split('&')
      .map((part) => {
        const [name, value] = part.split('=')
        return [name, decodeURIComponent(value)] as [string, string]
      })
  )
}

console.log('Background script loaded')
