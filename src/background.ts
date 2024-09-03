import supabase from './lib/supabase'

interface SessionData {
  access_token: string
  refresh_token: string
}

interface Message {
  action: string
  data: any
}

let socket: WebSocket | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5
const RECONNECT_DELAY = 5000 // 5 seconds
const KEEP_ALIVE_INTERVAL = 30000 // 30 seconds

let messageQueue: Message[] = []
let isContentScriptReady = false

let contentScriptReady = false

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

  socket.onmessage = (event: MessageEvent): void => {
    console.log('Received raw message:', event.data)
    try {
      const data: any = JSON.parse(event.data)
      console.log('Parsed message:', data)
      if (data.historyId) {
        console.log('Queueing OTP message:', data.historyId)
        queueMessage({
          action: 'showOTP',
          data: { otp: data.historyId.toString() },
        })
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
  }
}

function handleReconnection(): void {
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++
    console.log(
      `Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`
    )
    setTimeout(connectWebSocket, RECONNECT_DELAY)
  } else {
    console.error(
      'Max reconnection attempts reached. Please check your connection and reload the extension.'
    )
  }
}

function queueMessage(message: Message): void {
  messageQueue.push(message)
  console.log('Message queued:', message)
  processMessageQueue()
}

function processMessageQueue(): void {
  console.log('Processing message queue. Queue length:', messageQueue.length)
  console.log('Content script ready:', contentScriptReady)

  if (!contentScriptReady) {
    console.log('Content script not ready. Waiting...')
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
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0]
    if (activeTab?.id) {
      console.log('Sending message to content script:', message)
      chrome.tabs.sendMessage(activeTab.id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.log(
            'Error sending message:',
            chrome.runtime.lastError.message
          )
          messageQueue.unshift(message)
          contentScriptReady = false
        } else {
          console.log('Message sent successfully')
        }
      })
    } else {
      console.log('No active tab found')
    }
  })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentScriptReady') {
    console.log('Content script is ready')
    contentScriptReady = true
    processMessageQueue()
  }
})

function keepAlive(): void {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'ping' }))
  }
}

setInterval(keepAlive, KEEP_ALIVE_INTERVAL)

connectWebSocket()

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'contentScriptReady') {
    console.log('Content script is ready')
    isContentScriptReady = true
    processMessageQueue()
  }
})

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
