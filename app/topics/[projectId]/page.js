"use client"
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function Setup() {
  const { projectId } = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [queries, setQueries] = useState('')
  const [topicsWithQueries, setTopicsWithQueries] = useState({})
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const [project, setProject] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Try to load project data
        const projectRes = await fetch(`/api/projects/${projectId}`);
        if (projectRes.ok) {
          const projectData = await projectRes.json();
          setProject(projectData);

          // Only try to load topics if we have a project
          const topicsRes = await fetch(`/api/topics/${projectId}`);
          if (topicsRes.ok) {
            const topicsData = await topicsRes.json();
            setTopicsWithQueries(topicsData);
          } else {
            // Initialize empty topics for new projects
            setTopicsWithQueries({});
          }
        } else {
          // Handle new project case
          setProject(null);
          setTopicsWithQueries({});
        }
      } catch (error) {
        console.error('Error loading data:', error);
        // Initialize empty state for new projects
        setProject(null);
        setTopicsWithQueries({});
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-8 flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  const handleAddTopic = async () => {
    if (newTopicName.trim()) {
      try {
        const res = await fetch(`/api/topics/${projectId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newTopicName,
            queries: []
          })
        });

        if (res.ok) {
          setTopicsWithQueries(prev => ({
            ...prev,
            [newTopicName]: []
          }));
          setNewTopicName('');
          setShowModal(false);
        }
      } catch (error) {
        console.error('Error adding topic:', error);
      }
    }
  };

  const handleAddQueriesToTopic = async () => {
    if (!selectedTopic || !queries.trim()) return;

    const newQueries = queries.split('\n').filter(q => q.trim());
    const updatedQueries = [...(topicsWithQueries[selectedTopic] || []), ...newQueries];

    try {
      const res = await fetch(`/api/topics/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedTopic,
          queries: updatedQueries
        })
      });

      if (res.ok) {
        setTopicsWithQueries(prev => ({
          ...prev,
          [selectedTopic]: updatedQueries
        }));
        setQueries('');
      }
    } catch (error) {
      console.error('Error updating queries:', error);
    }
  };

  const handleDeleteTopic = async (topicToDelete) => {
    try {
      const res = await fetch(`/api/topics/${projectId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: topicToDelete })
      });

      if (res.ok) {
        const updatedTopics = { ...topicsWithQueries };
        delete updatedTopics[topicToDelete];
        setTopicsWithQueries(updatedTopics);
        
        if (selectedTopic === topicToDelete) {
          setSelectedTopic(null);
        }
      }
    } catch (error) {
      console.error('Error deleting topic:', error);
    }
  };

  const handleContinue = async () => {
    if (!topicsWithQueries || Object.keys(topicsWithQueries).length === 0) {
      console.error('No topics to save');
      return;
    }

    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...project,
          topics: Object.keys(topicsWithQueries)
        })
      });

      router.push(`/monitoring/${projectId}`);
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F1A] text-white p-8">
      <main className="max-w-7xl mx-auto space-y-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Left Box - Add Queries */}
          <div className="bg-[#151B2B] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#2563EB] rounded-full flex items-center justify-center text-lg font-medium">
                1
              </div>
              <h2 className="text-2xl font-semibold">Add your queries</h2>
            </div>
            <textarea
              value={queries}
              onChange={(e) => setQueries(e.target.value)}
              placeholder="Type queries, one per line"
              className="w-full h-48 bg-[#1E2639] text-gray-200 p-4 rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none resize-none placeholder-gray-500"
            />
          </div>

          {/* Right Box - Select Topic */}
          <div className="bg-[#151B2B] rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-[#2563EB] rounded-full flex items-center justify-center text-lg font-medium">
                2
              </div>
              <h2 className="text-2xl font-semibold">Select topic</h2>
            </div>
            
            <div className="mb-4 text-gray-400">
              {selectedTopic ? `Selected: ${selectedTopic}` : 'No topic selected'}
            </div>
            
            <div className="flex flex-wrap gap-3 mb-6">
              {Object.keys(topicsWithQueries).map((topic, index) => (
                <div key={index} className="relative">
                  <button
                    onClick={() => setSelectedTopic(topic)}
                    className={`px-4 py-2 rounded-full transition-colors ${
                      selectedTopic === topic 
                        ? 'bg-[#2563EB] text-white' 
                        : 'bg-[#1E2639] text-gray-300 hover:bg-[#2A3349]'
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
                className="px-4 py-2 rounded-full bg-[#1E2639] text-gray-300 hover:bg-[#2A3349] transition-colors"
              >
                + Add Topic
              </button>
            </div>

            <button
              onClick={handleAddQueriesToTopic}
              disabled={!selectedTopic || !queries.trim()}
              className={`w-full py-3 px-4 rounded-xl transition-colors ${
                selectedTopic && queries.trim()
                  ? 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white cursor-pointer'
                  : 'bg-[#1E2639] text-gray-500 cursor-not-allowed'
              }`}
            >
              Add Queries to Topic
            </button>
          </div>
        </div>

        {/* Table section */}
        <div className="bg-[#151B2B] rounded-2xl p-6">
          <h2 className="text-2xl font-semibold mb-6">Topics and Their Queries</h2>
          <div className="overflow-hidden rounded-xl">
            <table className="w-full">
              <thead className="bg-[#1E2639]">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Topic</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Queries</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2639]">
                {Object.entries(topicsWithQueries).map(([topic, queries]) => (
                  <tr key={topic} className="hover:bg-[#1E2639] transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-[#2563EB]">{topic}</td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {queries.length > 0 ? queries.join(', ') : (
                        <span className="text-gray-500 italic">No queries yet</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{queries.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleContinue}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-8 py-3 rounded-xl transition-colors flex items-center gap-2"
          >
            Next <span className="text-xl">→</span>
          </button>
        </div>
      </main>

      {/* Add Topic Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-[#151B2B] p-6 rounded-2xl w-96">
            <h3 className="text-xl font-semibold mb-4">Add New Topic</h3>
            <input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              placeholder="Enter topic name"
              className="w-full bg-[#1E2639] text-white p-3 rounded-xl focus:ring-2 focus:ring-[#2563EB] outline-none mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setNewTopicName('')
                }}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTopic}
                className="px-6 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl transition-colors"
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