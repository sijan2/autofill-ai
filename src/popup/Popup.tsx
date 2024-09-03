import React, { useState, useEffect } from 'react'
import { createClient, Session } from '@supabase/supabase-js'

const supabase = createClient('', '')

function Popup() {
  const [isLoading, setIsLoading] = useState(false)
  const [session, setSession] = useState<Session | null>(null)

  useEffect(() => {
    const fetchSessionData = async () => {
      const result = await new Promise((resolve, reject) => {
        chrome.storage.local.get('session', (data) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve(data.session)
          }
        })
      })

      if (result) {
        console.log('Session data retrieved:', result)

        setSession(result as Session | null)
      } else {
        console.log('No session data found')
      }
    }

    fetchSessionData()
  }, [])

  async function loginWithGoogle() {
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: chrome.identity.getRedirectURL(),
        },
      })
      if (error) throw error

      await chrome.tabs.create({ url: data.url })
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleLogout() {
    setIsLoading(true)

    try {
      await supabase.auth.signOut()
      await chrome.storage.local.remove('session')
      setSession(null)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex flex-col w-[300px] rounded bg-slate-50 p-4'>
      <button
        className='w-full p-2 rounded-lg bg-black text-white font-bold disabled:bg-gray-400 mb-4'
        onClick={session ? handleLogout : loginWithGoogle}
        disabled={isLoading}
      >
        {isLoading ? 'Loading...' : session ? 'Logout' : 'Login'}
      </button>
    </div>
  )
}

export default Popup
