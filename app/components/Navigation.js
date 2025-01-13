'use client';
import Link from 'next/link';
import { usePathname, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Navigation() {
  const pathname = usePathname();
  const params = useParams();
  const [mounted, setMounted] = useState(false);
  const [currentProject, setCurrentProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Get projectId from URL params
  const projectId = params?.projectId;

  useEffect(() => {
    const loadProjects = async () => {
      try {
        // Fetch all projects from the API
        const response = await fetch('/api/projects');
        if (!response.ok) throw new Error('Failed to fetch projects');
        const allProjects = await response.json();
        setProjects(allProjects);

        // Set current project if we have a projectId
        if (projectId) {
          const currentProj = allProjects.find(p => p.id === projectId);
          setCurrentProject(currentProj);
        }
      } catch (error) {
        console.error('Error loading projects:', error);
      }
    };

    setMounted(true);
    loadProjects();
  }, [projectId]);

  // Prevent flash of incorrect content during hydration
  if (!mounted) {
    return null;
  }

  // Helper function to determine if a path is active
  const isActivePath = (path) => {
    if (!pathname) return false;
    return pathname.includes(path);
  };

  return (
    <nav className="bg-[#1c2333] border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-white text-xl font-bold">
              AIBrandTracking
            </Link>
          </div>
          <div className="ml-10 flex items-center space-x-4">
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActivePath('/dashboard')
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
            >
              Dashboard
            </Link>
            
            {/* Show dropdown right after Dashboard on the Dashboard page */}
            {isActivePath('/dashboard') && (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                    currentProject
                      ? 'text-white bg-gray-900'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {currentProject ? currentProject.name : 'Select Project'}
                  <svg
                    className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1 w-56 rounded-md shadow-lg bg-[#1c2333] ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      {projects.map((project) => (
                        <Link
                          key={project.id}
                          href={`/monitoring/${project.id}`}
                          className={`block px-4 py-2 text-sm ${
                            project.id === projectId
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                          }`}
                          onClick={() => setIsDropdownOpen(false)}
                        >
                          {project.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {projectId && (
              <>
                <Link
                  href={`/setup/${projectId}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActivePath('/setup')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Setup
                </Link>
                <Link
                  href={`/topics/${projectId}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActivePath('/topics')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Topics & Queries
                </Link>
                <Link
                  href={`/monitoring/${projectId}`}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActivePath('/monitoring')
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Monitoring
                </Link>

                {/* Show dropdown at the end when not on Dashboard */}
                {!isActivePath('/dashboard') && (
                  <div className="relative">
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`px-3 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                        currentProject
                          ? 'text-white bg-gray-900'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      {currentProject ? currentProject.name : 'Select Project'}
                      <svg
                        className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute top-full right-0 mt-1 w-56 rounded-md shadow-lg bg-[#1c2333] ring-1 ring-black ring-opacity-5 z-50">
                        <div className="py-1">
                          {projects.map((project) => (
                            <Link
                              key={project.id}
                              href={`/monitoring/${project.id}`}
                              className={`block px-4 py-2 text-sm ${
                                project.id === projectId
                                  ? 'bg-gray-900 text-white'
                                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                              }`}
                              onClick={() => setIsDropdownOpen(false)}
                            >
                              {project.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}