import React, { useState, useEffect } from 'react'

interface ContentAppProps {
  otp: string
}

const ContentApp: React.FC<ContentAppProps> = ({ otp }) => {
  const [otps, setOtp] = useState(otp)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    console.log('OTP updated in ContentApp:', otp)
    setOtp(otp)
    setVisible(true)

    const timer = setTimeout(() => {
      setVisible(false)
    }, 5000)

    return () => {
      clearTimeout(timer)
      console.log('Timer cleared for OTP:', otp)
    }
  }, [otp])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '12px 20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        zIndex: 2147483647,
      }}
    >
      <p style={{ margin: '0 0 4px', fontWeight: 'bold' }}>OTP Received:</p>
      <p style={{ margin: 0, fontSize: '18px', letterSpacing: '1px' }}>{otp}</p>
    </div>
  )
}

export default ContentApp
