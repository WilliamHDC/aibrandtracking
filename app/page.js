"use client"
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    console.log('Redirecting to dashboard...')
    router.push('/dashboard')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0f1420] flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl font-bold mb-2">AIBrandTracking</h1>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  )
}