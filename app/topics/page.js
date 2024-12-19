"use client"
import { useState, useEffect } from 'react'

export default function Topics() {
  const [queries, setQueries] = useState('')
  const [topicsWithQueries, setTopicsWithQueries] = useState({})
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')

  useEffect(() => {
    // Load existing topics from localStorage
    const stored = localStorage.getItem('topicsWithQueries')
    if (stored) {
      setTopicsWithQueries(JSON.parse(stored))
    }
  }, [])

  const handleAddTopic = () => {
    if (newTopicName.trim()) {
      const updatedTopics = {
        ...topicsWithQueries,
        [newTopicName]: []
      }
      setTopicsWithQueries(updatedTopics)
      localStorage.setItem('topicsWithQueries', JSON.stringify(updatedTopics))
      setNewTopicName('')
      setShowModal(false)
    }
  }

  const handleAddQueriesToTopic = () => {
    if (!selectedTopic || !queries.trim()) return

    // Split queries by newline and filter out empty lines
    const newQueries = queries.split('\n').filter(q => q.trim())
    
    // Update the topics object
    const updatedTopics = {
      ...topicsWithQueries,
      [selectedTopic]: [...(topicsWithQueries[selectedTopic] || []), ...newQueries]
    }

    // Update state and localStorage
    setTopicsWithQueries(updatedTopics)
    localStorage.setItem('topicsWithQueries', JSON.stringify(updatedTopics))
    
    // Clear the queries input
    setQueries('')
    
    // Optional: Show some feedback
    console.log(`Added ${newQueries.length} queries to ${selectedTopic}`)
  }

  const handleDeleteTopic = (topicToDelete) => {
    const updatedTopics = { ...topicsWithQueries }
    delete updatedTopics[topicToDelete]
    setTopicsWithQueries(updatedTopics)
    localStorage.setItem('topicsWithQueries', JSON.stringify(updatedTopics))
    
    if (selectedTopic === topicToDelete) {
      setSelectedTopic(null)
    }
  }

  const handleTopicClick = (topic) => {
    console.log('Selected topic:', topic);
    setSelectedTopic(topic);
  };

  return (
    <div className="min-h-screen bg-[#0f1420] text-white">
      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-2 gap-8 mb-8">
          {/* Left Box - Add Queries */}
          <div className="bg-[#1c2333] rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="font-semibold">1</span>
              </div>
              <h2 className="text-xl font-semibold">Add your queries</h2>
            </div>
            <textarea
              value={queries}
              onChange={(e) => setQueries(e.target.value)}
              placeholder="Type queries, one per line"
              className="w-full h-48 bg-[#2a3447] text-white p-4 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Right Box - Select Topic */}
          <div className="bg-[#1c2333] rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="font-semibold">2</span>
              </div>
              <h2 className="text-xl font-semibold">Select topic</h2>
            </div>
            
            <div className="mb-2 text-sm text-gray-400">
              {selectedTopic ? `Selected: ${selectedTopic}` : 'No topic selected'}
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.keys(topicsWithQueries).map((topic, index) => (
                <div key={index} className="relative">
                  <button
                    onClick={() => {
                      console.log('Clicking topic:', topic);
                      setSelectedTopic(topic);
                    }}
                    className={`px-4 py-2 rounded-full ${
                      selectedTopic === topic 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-[#2a3447] text-gray-300 hover:bg-[#353f54]'
                    }`}
                  >
                    {topic}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTopic(topic);
                    }}
                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 
                               hover:bg-red-600 text-white flex items-center justify-center 
                               text-xs transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-full bg-[#2a3447] text-gray-300 hover:bg-[#353f54]"
              >
                + Add Topic
              </button>
            </div>

            <button
              onClick={handleAddQueriesToTopic}
              className={`w-full py-2 px-4 rounded-lg mb-6 ${
                selectedTopic && queries.trim()
                  ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  : 'bg-[#2a3447] text-gray-500'
              }`}
            >
              Add Queries to Topic
            </button>
          </div>
        </div>

        {/* Table section below both boxes */}
        <div className="bg-[#1c2333] rounded-lg p-6 mt-8">
          <h2 className="text-xl font-semibold mb-6">Topics and Their Queries</h2>
          <div className="overflow-hidden rounded-lg">
            <table className="w-full">
              <thead className="bg-[#2a3447]">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Topic</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Queries</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-300">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a3447]">
                {Object.entries(topicsWithQueries).map(([topic, queries]) => (
                  <tr key={topic} className="hover:bg-[#2a3447]">
                    <td className="px-6 py-4 text-sm font-medium text-blue-400">
                      {topic}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {queries.length > 0 ? queries.join(', ') : (
                        <span className="text-gray-500 italic">No queries yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {queries.length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={() => window.location.href = '/monitoring'}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Next →
          </button>
        </div>
      </main>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-[#1c2333] p-6 rounded-lg w-96">
            <h3 className="text-xl font-semibold mb-4">Add New Topic</h3>
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Enter topic name"
              className="w-full bg-[#2a3447] text-white p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mb-4"
              autoFocus
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setNewTopicName('')
                }}
                className="px-4 py-2 text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTopic}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Topic
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}