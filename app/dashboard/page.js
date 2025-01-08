"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [projects, setProjects] = useState([]);
  
  const calculateVisibilityScore = (analysisResults, brandName) => {
    console.log('Calculating score for:', brandName, 'with:', analysisResults);
    
    if (!analysisResults?.results || Object.keys(analysisResults.results).length === 0) {
      console.log('No results found for', brandName);
      return 0;
    }

    let totalScore = 0;
    let totalQueries = 0;

    Object.values(analysisResults.results).forEach(topic => {
      if (!topic.queries) return;
      
      topic.queries.forEach(query => {
        totalQueries++;
        const brandMention = query.brandMentions?.find(m => 
          m.name.toLowerCase() === brandName.toLowerCase()
        );
        
        if (!brandMention?.mentioned) return;

        const position = brandMention.brandPosition;
        if (position === 1) totalScore += 1.0;
        else if (position === 2) totalScore += 0.75;
        else if (position === 3) totalScore += 0.5;
        else if (position === 4) totalScore += 0.25;
        else totalScore += 0.1;
      });
    });

    const finalScore = totalQueries > 0 
      ? Math.round((totalScore / totalQueries) * 1000) / 10 
      : 0;
    
    console.log('Final score for', brandName, ':', finalScore, '%');
    return finalScore;
  };

  const loadProjectData = async () => {
    try {
      console.log('1. Starting to load projects');
      const response = await fetch('/api/projects');
      const projectsData = await response.json();
      console.log('2. Projects loaded:', projectsData);
      
      const projectsWithScores = await Promise.all(projectsData.map(async (project) => {
        try {
          console.log(`3. Fetching analysis for project: ${project.name}`);
          const analysisResponse = await fetch(`/api/analysis/${project.id}/latest`);
          const analysisResults = await analysisResponse.json();
          console.log(`4. Analysis results for ${project.name}:`, analysisResults);
          
          return {
            ...project,
            visibilityScore: analysisResults.visibilityScore || 0,
            lastAnalysis: analysisResults.timestamp 
              ? new Date(analysisResults.timestamp).toLocaleDateString()
              : 'Never'
          };
        } catch (error) {
          console.error(`Error processing project ${project.name}:`, error);
          return {
            ...project,
            visibilityScore: 0,
            lastAnalysis: 'Never'
          };
        }
      }));

      console.log('5. Final projects with scores:', projectsWithScores);
      setProjects(projectsWithScores);
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  useEffect(() => {
    loadProjectData();
  }, []);

  const handleViewDetails = (projectId) => {
    router.push(`/monitoring/${projectId}`);
  };

  const handleNewProject = () => {
    // Generate a new project ID (timestamp-based)
    const newProjectId = Date.now().toString();
    // Redirect to setup page with the new ID
    router.push(`/setup/${newProjectId}`);
  };

  const handleDeleteProject = async (projectId) => {
    // Show confirmation dialog
    if (!window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      console.log('Attempting to delete project:', projectId);
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Delete response:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete project');
      }

      // Only update UI if deletion was successful
      setProjects(prevProjects => prevProjects.filter(p => p.id !== projectId));
      console.log('Project removed from UI');
    } catch (error) {
      console.error('Error deleting project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  const renderProjectCard = (project) => (
    <div key={project.id} className="bg-[#1F2A40] p-6 rounded-lg shadow-lg relative">
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent triggering card click
          handleDeleteProject(project.id);
        }}
        className="absolute top-4 right-4 text-gray-400 hover:text-red-400 transition-colors"
        title="Delete project"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path 
            fillRule="evenodd" 
            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" 
            clipRule="evenodd" 
          />
        </svg>
      </button>

      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold">{project.name}</h2>
      </div>
      <p className="text-gray-400 mb-4">
        {project.brand} vs {project.competitors?.join(', ')}
      </p>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-400">Visibility Score</span>
        <span className="text-lg font-semibold">
          {project.visibilityScore.toFixed(1)}%
        </span>
      </div>
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-gray-400">Last Analysis</span>
        <span className="text-sm">{project.lastAnalysis}</span>
      </div>
      <button 
        onClick={() => handleViewDetails(project.id)}
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
      >
        View Details
      </button>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={handleNewProject}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create New Project
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(renderProjectCard)}
      </div>
    </div>
  );
}