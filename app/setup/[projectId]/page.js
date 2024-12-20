"use client"
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function Setup() {
  const router = useRouter()
  const { projectId } = useParams()
  const [projectName, setProjectName] = useState('')
  const [brand, setBrand] = useState('')
  const [competitor, setCompetitor] = useState('')
  const [competitors, setCompetitors] = useState([])
  const [isExistingProject, setIsExistingProject] = useState(false)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})

  useEffect(() => {
    // Load existing project data
    const projects = JSON.parse(localStorage.getItem('projects') || '[]')
    const currentProject = projects.find(p => p.id === projectId)
    
    if (currentProject) {
      setIsExistingProject(true)
      setProjectName(currentProject.name)
      setBrand(currentProject.brand)
      setCompetitors(currentProject.competitors || [])
    }
  }, [projectId])

  const handleAddCompetitor = () => {
    if (competitor.trim() && !competitors.includes(competitor.trim())) {
      setCompetitors([...competitors, competitor.trim()])
      setCompetitor('')
    }
  }

  const handleRemoveCompetitor = (competitorToRemove) => {
    setCompetitors(competitors.filter(c => c !== competitorToRemove))
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!projectName.trim()) {
      newErrors.projectName = 'Project name is required'
    }
    
    if (!brand.trim()) {
      newErrors.brand = 'Your brand name is required'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Mark all fields as touched
    setTouched({
      projectName: true,
      brand: true
    })

    if (!validateForm()) {
      return
    }

    const projects = JSON.parse(localStorage.getItem('projects') || '[]')
    
    if (isExistingProject) {
      // Update only competitors for existing project
      const updatedProjects = projects.map(p => {
        if (p.id === projectId) {
          return { 
            ...p, 
            competitors,
            brands: [brand, ...competitors]
          }
        }
        return p
      })
      localStorage.setItem('projects', JSON.stringify(updatedProjects))
    } else {
      // Create new project
      const newProject = {
        id: projectId,
        name: projectName,
        brand,
        competitors,
        brands: [brand, ...competitors]
      }
      localStorage.setItem('projects', JSON.stringify([...projects, newProject]))
    }

    router.push(`/topics/${projectId}`)
  }

  return (
    <div className="min-h-screen bg-[#0f1420] text-white">
      <main className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">Project Setup</h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Project Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => handleBlur('projectName')}
              className={`w-full bg-[#1c2333] p-3 rounded-lg ${
                isExistingProject ? 'opacity-50 cursor-not-allowed' : ''
              } ${errors.projectName && touched.projectName ? 'border border-red-500' : ''}`}
              disabled={isExistingProject}
              required
            />
            {errors.projectName && touched.projectName && (
              <p className="text-red-500 text-sm mt-1">{errors.projectName}</p>
            )}
            {isExistingProject && (
              <p className="text-sm text-gray-400 mt-1">Project name cannot be changed after creation</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Your Brand <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              onBlur={() => handleBlur('brand')}
              className={`w-full bg-[#1c2333] p-3 rounded-lg ${
                isExistingProject ? 'opacity-50 cursor-not-allowed' : ''
              } ${errors.brand && touched.brand ? 'border border-red-500' : ''}`}
              disabled={isExistingProject}
              required
            />
            {errors.brand && touched.brand && (
              <p className="text-red-500 text-sm mt-1">{errors.brand}</p>
            )}
            {isExistingProject && (
              <p className="text-sm text-gray-400 mt-1">Main brand cannot be changed after creation</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Competitors</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={competitor}
                onChange={(e) => setCompetitor(e.target.value)}
                className="flex-1 bg-[#1c2333] p-3 rounded-lg"
                placeholder="Add competitor"
              />
              <button
                type="button"
                onClick={handleAddCompetitor}
                className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Add
              </button>
            </div>
            
            <div className="space-y-2">
              {competitors.map((comp, index) => (
                <div key={index} className="flex items-center justify-between bg-[#1c2333] p-3 rounded-lg">
                  <span>{comp}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCompetitor(comp)}
                    className="text-red-400 hover:text-red-300"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={Object.keys(errors).length > 0 && Object.keys(touched).length > 0}
          >
            {isExistingProject ? 'Update Competitors' : 'Continue to Topics'}
          </button>
        </form>
      </main>
    </div>
  )
}