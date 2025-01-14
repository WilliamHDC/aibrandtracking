"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function QueryGenerator() {
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [generatedQueries, setGeneratedQueries] = useState({});
  const [selectedQueries, setSelectedQueries] = useState(new Set());
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  useEffect(() => {
    // Fetch projects whenever the page is visited
    fetchProjects();
  }, [pathname]); // Re-run when pathname changes

  const handleProjectSelect = (projectId) => {
    const project = projects.find(p => p.id === projectId);
    setSelectedProject(project);
  };

  const handleKeywordsChange = (e) => {
    setKeywordInput(e.target.value);
    
    // Split by commas or newlines and clean up the keywords
    const newKeywords = e.target.value
      .split(/[,\n]/)  // Split by comma or newline
      .map(k => k.trim())  // Remove whitespace
      .filter(k => k.length > 0);  // Remove empty strings
    
    setKeywords(newKeywords);
  };

  const handleGenerate = async () => {
    if (!selectedProject || !keywords.length) {
      alert('Please select a project and add keywords');
      return;
    }

    try {
      console.log('Sending request with:', {
        brand: selectedProject.brand,
        competitors: selectedProject.competitors || [],
        keywords: keywords,
        language: selectedLanguage
      });

      const response = await fetch('/api/query-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          brand: selectedProject.brand,
          competitors: selectedProject.competitors || [],
          keywords: keywords,
          language: selectedLanguage
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate queries');
      }

      const data = await response.json();
      console.log('Received response:', data);
      setGeneratedQueries(data);
    } catch (error) {
      console.error('Error generating queries:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleCheckboxChange = (query) => {
    setSelectedQueries(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(query)) {
        newSelected.delete(query);
      } else {
        newSelected.add(query);
      }
      return newSelected;
    });
  };

  const handleAddQueries = async () => {
    if (selectedQueries.size === 0) {
      alert('Please select at least one query');
      return;
    }

    // Group selected queries by their topics
    const queriesByTopic = {};
    Object.entries(generatedQueries).forEach(([topic, queries]) => {
      queries.forEach(query => {
        if (selectedQueries.has(query)) {
          if (!queriesByTopic[topic]) {
            queriesByTopic[topic] = [];
          }
          queriesByTopic[topic].push(query);
        }
      });
    });

    try {
      // Add each topic and its queries
      for (const [topic, queries] of Object.entries(queriesByTopic)) {
        const res = await fetch(`/api/topics/${selectedProject.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: topic,
            queries: queries
          })
        });

        if (!res.ok) {
          throw new Error(`Failed to add topic: ${topic}`);
        }
      }

      // Navigate to topics page after successful addition
      router.push(`/topics/${selectedProject.id}`);
    } catch (error) {
      console.error('Error adding queries:', error);
      alert('Failed to add queries. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">AI Query Generator</h1>
      
      <div className="space-y-6 max-w-2xl">
        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Select Project</label>
          <select 
            className="w-full p-2 border rounded bg-[#1F2A40] border-gray-600"
            onChange={(e) => handleProjectSelect(e.target.value)}
          >
            <option value="">Select a project...</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProject && (
          <>
            {/* Project Info */}
            <div className="bg-[#1F2A40] p-4 rounded">
              <h3 className="font-medium mb-2">Project Details</h3>
              <p>Brand: {selectedProject.brand}</p>
              <p>Competitors: {selectedProject.competitors?.join(', ')}</p>
            </div>

            {/* Keywords Input */}
            <div>
              <label className="block text-sm font-medium mb-2">Keywords</label>
              <div className="mb-1 text-sm text-gray-400">
                Enter keywords separated by commas or new lines
              </div>
              <textarea
                className="w-full p-2 border rounded bg-[#1F2A40] border-gray-600"
                value={keywordInput}
                onChange={handleKeywordsChange}
                placeholder="trail running, marathon, training shoes"
                rows={4}
              />

              {/* Keywords Display */}
              <div className="flex flex-wrap gap-2 mt-2">
                {keywords.map((keyword, index) => (
                  <span 
                    key={index} 
                    className="px-3 py-1 bg-blue-600/20 rounded-full"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Query Language</label>
              <select 
                className="w-full p-2 border rounded bg-[#1F2A40] border-gray-600"
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                <option value="en">English</option>
                <option value="sv">Swedish</option>
                <option value="no">Norwegian</option>
                <option value="da">Danish</option>
                <option value="fi">Finnish</option>
                {/* Add more languages as needed */}
              </select>
            </div>

            <button
              onClick={handleGenerate}
              disabled={keywords.length === 0}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Queries
            </button>
          </>
        )}

        {/* Results Section */}
        {Object.keys(generatedQueries).length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-bold mb-6">Generated Queries</h2>
            <div className="bg-[#1F2A40] rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#2F3B52]">
                    <th className="px-4 py-3 text-left">Topic</th>
                    <th className="px-4 py-3 text-left">Query</th>
                    <th className="px-4 py-3 text-left w-[80px]">Select</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(generatedQueries).flatMap(([topic, queries]) =>
                    queries.map((query, index) => (
                      <tr key={`${topic}-${index}`} className="border-t border-gray-700">
                        <td className="px-4 py-3 text-gray-300">
                          {topic}
                        </td>
                        <td className="px-4 py-3">
                          {query}
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            id={`query-${topic}-${index}`}
                            checked={selectedQueries.has(query)}
                            onChange={() => handleCheckboxChange(query)}
                            className="rounded border-gray-600 bg-[#1F2A40]"
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <button
              className="mt-4 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={handleAddQueries}
              disabled={selectedQueries.size === 0}
            >
              Add Selected Queries to Topics ({selectedQueries.size} selected)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}