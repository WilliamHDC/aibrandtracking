"use client"
import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  const loadProjectData = () => {
    console.log('Loading project data...');
    const storedProjects = localStorage.getItem('projects');
    
    if (storedProjects) {
      let projects = JSON.parse(storedProjects);
      
      projects = projects.map(project => {
        console.log(`\nProcessing project: ${project.name} (${project.id})`);
        console.log('Project brand:', project.brand);
        
        const brandToUse = project.brand || (project.brands && project.brands[0]);
        console.log('Brand to use:', brandToUse);
        
        const latestResults = localStorage.getItem(`results_${project.id}`);
        
        if (latestResults && brandToUse) {
          const results = JSON.parse(latestResults);
          
          const visibilityScore = calculateVisibilityScore(brandToUse, results);
          console.log(`Visibility score for ${brandToUse}:`, visibilityScore);
          
          const history = JSON.parse(localStorage.getItem(`history_${project.id}`) || '[]');
          
          const now = new Date(results.timestamp);
          const dayAgo = history.find(entry => {
            const diffDays = (now - new Date(entry.timestamp)) / (1000 * 60 * 60 * 24);
            return diffDays >= 1 && diffDays < 2;
          });
          
          const weekAgo = history.find(entry => {
            const diffDays = (now - new Date(entry.timestamp)) / (1000 * 60 * 60 * 24);
            return diffDays >= 7 && diffDays < 8;
          });

          return {
            ...project,
            brand: brandToUse,
            lastScore: visibilityScore,
            lastAnalysis: results.timestamp,
            comparisons: {
              day: dayAgo ? Number((visibilityScore - calculateVisibilityScore(brandToUse, dayAgo)).toFixed(1)) : null,
              week: weekAgo ? Number((visibilityScore - calculateVisibilityScore(brandToUse, weekAgo)).toFixed(1)) : null
            }
          };
        }
        
        return {
          ...project,
          brand: brandToUse
        };
      });
      
      setProjects(projects);
    }
    setIsLoading(false);
  };

  const calculateVisibilityScore = (brandName, results) => {
    console.log('\nCalculating visibility score for:', brandName);
    if (!results?.results) {
      console.log('No results data found');
      return 0;
    }

    // Get scores from all topics
    const topicScores = Object.entries(results.results).map(([topicId, topicData]) => {
      console.log(`\nProcessing topic: ${topicId}`);
      if (!topicData?.queries) {
        console.log('No queries found for topic');
        return 0;
      }
      
      let totalScore = 0;
      const totalQueries = topicData.queries.length;
      console.log('Total queries:', totalQueries);

      topicData.queries.forEach((query, index) => {
        console.log(`\nQuery ${index + 1}:`, query.query);
        const brandMention = query.brandMentions?.find(m => m.name === brandName);
        console.log('Brand mention:', brandMention);
        
        if (!brandMention?.mentioned || brandMention.brandPosition === undefined) {
          console.log('Brand not mentioned or no position');
          return;
        }

        const position = brandMention.brandPosition;
        let positionScore = 0;
        if (position === 1) positionScore = 1.0;
        else if (position === 2) positionScore = 0.75;
        else if (position === 3) positionScore = 0.5;
        else if (position === 4) positionScore = 0.25;
        else positionScore = 0.1;
        
        totalScore += positionScore;
        console.log(`Position: ${position}, Score: ${positionScore}`);
      });

      const topicScore = Math.round((totalScore / totalQueries * 100) * 10) / 10;
      console.log(`Topic final score: ${topicScore}%`);
      return topicScore;
    });

    console.log('\nAll topic scores:', topicScores);
    
    // Calculate average of all topic scores
    const validScores = topicScores.filter(score => score > 0);
    console.log('Valid scores:', validScores);
    
    const finalScore = validScores.length > 0 
      ? Number((validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1))
      : 0;
      
    console.log('Final visibility score:', finalScore);
    return finalScore;
  };

  useEffect(() => {
    setMounted(true);
    if (pathname === '/dashboard') {
      loadProjectData();
    }
  }, [pathname]);

  if (!mounted) {
    return null;
  }

  const handleNewProject = () => {
    // Generate a new project ID (timestamp-based)
    const newProjectId = Date.now().toString();
    // Redirect to setup page with the new ID
    router.push(`/setup/${newProjectId}`);
  };

  const handleViewProject = (projectId) => {
    router.push(`/monitoring/${projectId}`);
  };

  const handleDeleteProject = (projectId) => {
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      // Get current projects
      const currentProjects = JSON.parse(localStorage.getItem('projects') || '[]');
      
      // Filter out the project to delete
      const updatedProjects = currentProjects.filter(p => p.id !== projectId);
      
      // Update localStorage
      localStorage.setItem('projects', JSON.stringify(updatedProjects));
      
      // Remove project-specific data
      localStorage.removeItem(`topics_${projectId}`);
      localStorage.removeItem(`results_${projectId}`);
      
      // Update state to trigger re-render
      setProjects(updatedProjects);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0f1420] flex items-center justify-center">
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold mb-2">Loading...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1420] text-white">
      <main className="max-w-7xl mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Projects</h1>
            <p className="text-gray-400">Manage and monitor your brand tracking projects</p>
          </div>
          <button
            onClick={handleNewProject}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Project
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 mb-4">No projects yet</p>
              <button
                onClick={handleNewProject}
                className="px-6 py-3 rounded-xl bg-[#1d4ed8] hover:bg-blue-700"
              >
                Create your first project
              </button>
            </div>
          ) : (
            projects.map(project => (
              <div key={project.id} className="bg-[#1c2333] rounded-xl p-8 relative">
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-400 p-2"
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
                
                <div className="space-y-6">
                  <div className="text-sm text-gray-400">
                    Tracking {project.brands?.length || 0} brands
                  </div>
                  
                  <div>
                    <div className="text-7xl font-bold mb-2">
                      {project.lastScore || 0}%
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      {project.comparisons?.day != null && (
                        <span className={`text-xs ${
                          (project.comparisons?.day || 0) > 0 ? 'text-green-400' : 
                          (project.comparisons?.day || 0) < 0 ? 'text-red-400' : 
                          'text-gray-400'
                        }`}>
                          {(project.comparisons?.day || 0) > 0 ? '+' : ''}
                          {project.comparisons?.day}% day
                        </span>
                      )}
                      {project.comparisons?.week != null && (
                        <span className={`text-xs ${
                          (project.comparisons?.week || 0) > 0 ? 'text-green-400' : 
                          (project.comparisons?.week || 0) < 0 ? 'text-red-400' : 
                          'text-gray-400'
                        }`}>
                          {(project.comparisons?.week || 0) > 0 ? '+' : ''}
                          {project.comparisons?.week}% week
                        </span>
                      )}
                    </div>
                    <div className="text-gray-400 mt-1">
                      overall visibility
                    </div>
                  </div>

                  <div>
                    <h3 className="text-2xl font-semibold mb-4">{project.name}</h3>
                    <button
                      onClick={() => handleViewProject(project.id)}
                      className="text-[#1d4ed8] hover:text-blue-500 flex items-center gap-2"
                    >
                      View Project →
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}