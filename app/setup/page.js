"use client"
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Setup() {
  const [brandName, setBrandName] = useState('Adidas')
  const [competitors, setCompetitors] = useState(['Nike', 'Salomon'])
  const router = useRouter()

  const removeCompetitor = (index) => {
    setCompetitors(competitors.filter((_, i) => i !== index))
  }

  const addCompetitor = () => {
    setCompetitors([...competitors, ''])
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    router.push('/topics')
  }

  return (
    <div className="min-h-screen bg-[#0f1420] text-white">
      <nav className="p-4 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center">
          <h1 className="text-xl font-bold">Seightly</h1>
          <div className="ml-8 space-x-6">
            <a href="/setup" className="text-gray-300 hover:text-white">Setup</a>
            <a href="/topics" className="text-gray-300 hover:text-white">Topics & Queries</a>
            <a href="/monitoring" className="text-gray-300 hover:text-white">Monitoring</a>
          </div>
        </div>
      </nav>

      <main className="max-w-lg mx-auto mt-16 p-6">
        <h2 className="text-2xl font-bold text-center mb-8">Brand Setup</h2>
        
        <div className="bg-[#1c2333] rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Your Brand Name</label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              className="w-full bg-[#2a3447] text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Competitor Brands</label>
            {competitors.map((competitor, index) => (
              <div key={index} className="flex mb-2">
                <input
                  type="text"
                  value={competitor}
                  onChange={(e) => {
                    const newCompetitors = [...competitors]
                    newCompetitors[index] = e.target.value
                    setCompetitors(newCompetitors)
                  }}
                  className="flex-1 bg-[#2a3447] text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={() => removeCompetitor(index)}
                  className="ml-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={addCompetitor}
              className="mt-2 text-sm text-gray-400 hover:text-white"
            >
              + Add Competitor
            </button>
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700"
          >
            Continue to Topics & Queries
          </button>
        </div>
      </main>
    </div>
  )
}