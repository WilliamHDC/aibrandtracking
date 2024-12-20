"use client"
import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { format, subMonths } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { useParams } from 'next/navigation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

export default function Monitoring() {
  const { projectId } = useParams();
  const [chartTimeRange, setChartTimeRange] = useState('6m');
  const [topics, setTopics] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [filterTopic, setFilterTopic] = useState('all');
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [monitoringData, setMonitoringData] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);

  useEffect(() => {
    setIsLoading(true);
    console.log('Loading project data:', projectId);

    try {
      // Load project details
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const project = projects.find(p => p.id === projectId);
      setCurrentProject(project);

      // Load topics
      const projectTopics = localStorage.getItem(`topics_${projectId}`);
      if (projectTopics) {
        const topicsData = JSON.parse(projectTopics);
        const formattedTopics = Object.entries(topicsData).map(([name, queries]) => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          queries: Array.isArray(queries) ? queries : [queries]
        }));
        setTopics(formattedTopics);
        setMonitoringData({ topics: formattedTopics });
      }

      // Load project-specific analysis results
      const projectResults = localStorage.getItem(`results_${projectId}`);
      if (projectResults) {
        const results = JSON.parse(projectResults);
        console.log('Loaded analysis results:', results);
        setAnalysisResults(results);
      }

    } catch (error) {
      console.error('Error loading project data:', error);
    }

    setIsLoading(false);
  }, [projectId]);

  const calculateTopicScore = (topicResults) => {
    let totalScore = 0;
    let count = 0;
    
    topicResults.queries.forEach(query => {
      query.brandMentions.forEach(brand => {
        if (brand.mentioned) {
          const mentionScore = brand.count * (brand.positionScore || 0.5);
          totalScore += mentionScore;
          count++;
        }
      });
    });
    
    return count > 0 ? (totalScore / count) * 100 : 0;
  };

  const calculateBrandStats = (topicResults) => {
    const brandStats = {};
    
    topicResults.queries.forEach(query => {
      query.brandMentions.forEach(brand => {
        if (!brandStats[brand.name]) {
          brandStats[brand.name] = {
            mentions: 0,
            occurrences: 0
          };
        }
        if (brand.mentioned) {
          brandStats[brand.name].mentions += brand.count;
          brandStats[brand.name].occurrences++;
        }
      });
    });
    
    return Object.entries(brandStats).map(([name, stats]) => ({
      name,
      mentions: stats.mentions,
      score: (stats.mentions / stats.occurrences) * 100
    }));
  };

  const startAnalysis = async () => {
    console.log('Starting analysis...');
    
    if (!monitoringData?.topics) {
      console.log('No topics found to analyze');
      return;
    }
    
    // Get brands from current project
    const projects = JSON.parse(localStorage.getItem('projects') || '[]');
    const currentProject = projects.find(p => p.id === projectId);
    
    if (!currentProject?.brands || currentProject.brands.length === 0) {
      console.error('No brands found for project');
      return;
    }
    
    const brands = currentProject.brands;
    console.log('Brands to track:', brands);
    
    setIsAnalyzing(true);
    const results = {};

    try {
      for (const topic of topics) {
        console.log(`Analyzing topic: ${topic.name}`);
        results[topic.id] = {
          queries: []
        };

        for (const query of topic.queries) {
          console.log(`Processing query: ${query}`);
          try {
            const response = await fetch('/api/analyze', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                query,
                brands
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error('API response not ok:', errorText);
              continue;
            }

            const data = await response.json();
            console.log('Query analysis result:', data);
            
            results[topic.id].queries.push({
              query,
              response: data.response,
              brandMentions: data.brandMentions
            });
          } catch (error) {
            console.error('Query analysis failed:', error);
          }
        }
      }

      console.log('Analysis completed. Results:', results);
      const analysisWithTimestamp = {
        timestamp: new Date().toISOString(),
        results: results
      };

      // Save current results
      setAnalysisResults(analysisWithTimestamp);
      localStorage.setItem(`results_${projectId}`, JSON.stringify(analysisWithTimestamp));
      
      // Save to history
      const historyKey = `history_${projectId}`;
      const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]');
      existingHistory.push(analysisWithTimestamp);
      
      // Keep only last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const filteredHistory = existingHistory.filter(entry => 
        new Date(entry.timestamp) >= thirtyDaysAgo
      );
      
      // Save updated history
      localStorage.setItem(historyKey, JSON.stringify(filteredHistory));
      
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const calculateOverallScore = (results) => {
    if (!results) return 0;
    
    let totalScore = 0;
    let topicCount = 0;
    
    Object.values(results).forEach(topic => {
      const topicScore = calculateTopicScore(topic);
      if (topicScore > 0) {
        totalScore += topicScore;
        topicCount++;
      }
    });
    
    setOverallScore(topicCount > 0 ? totalScore / topicCount : 0);
  };

  const getFilteredData = () => {
    const now = new Date();
    const monthsToSubtract = {
      '1m': 1,
      '3m': 3,
      '6m': 6,
      '1y': 12
    }[chartTimeRange];

    const startDate = subMonths(now, monthsToSubtract);
    
    // Get all brands from topics
    const brandsToTrack = new Set();
    topics.forEach(topic => {
      topic.competitors?.forEach(brand => brandsToTrack.add(brand));
    });
    
    return analysisHistory
      .filter(entry => new Date(entry.timestamp) >= startDate)
      .reduce((acc, entry) => {
        // Calculate overall visibility
        const overallScore = entry.scores.reduce((sum, { score }) => sum + score, 0) / entry.scores.length;
        
        if (!acc.overall) acc.overall = [];
        acc.overall.push({
          x: new Date(entry.timestamp),
          y: overallScore
        });

        // Calculate per-brand visibility
        brandsToTrack.forEach(brand => {
          if (!acc[brand]) acc[brand] = [];
          
          const brandScore = entry.scores.reduce((sum, { brandMentions }) => {
            const mention = brandMentions.find(m => m.name.toLowerCase() === brand.toLowerCase());
            return sum + (mention?.count || 0);
          }, 0);

          acc[brand].push({
            x: new Date(entry.timestamp),
            y: brandScore
          });
        });

        return acc;
      }, {});
  };

  const calculateVisibilityScore = (query, brandName) => {
    console.log('--- Checking brand mentions ---');
    console.log('Query:', query);
    console.log('Brand mentions:', query.brandMentions);
    const brandMention = query.brandMentions.find(m => m.name === brandName);
    console.log('Found brand mention:', brandMention);
    
    if (!brandMention?.mentioned) return 0;

    // Check if we have positions data
    if (!brandMention.positions) {
      console.log('No positions data found for:', brandName);
      return 0;
    }

    const mentions = brandMention.positions;
    console.log('Positions:', mentions);
    
    const totalMentions = mentions.length;

    if (totalMentions === 0) return 0;

    // Calculate score based on position
    let score = 0;
    mentions.forEach((position, index) => {
      if (index === 0) score += 1.0;                    // First mention
      else if (index === totalMentions - 1) score += 0.25;  // Last mention
      else score += 0.5;                                // Middle mentions
    });

    return score;
  };

  const TopicCard = ({ topic, analysisResults }) => {
    const [brands, setBrands] = useState([]);
    const { projectId } = useParams();
    const [comparisons, setComparisons] = useState({ day: null, week: null });
    
    useEffect(() => {
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const currentProject = projects.find(p => p.id === projectId);
      if (currentProject?.brands) {
        setBrands(currentProject.brands);
      }
    }, [projectId]);

    useEffect(() => {
      const historyKey = `history_${projectId}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      if (history.length && topicResults) {
        const now = new Date(analysisResults.timestamp);
        
        // Calculate day comparison
        const yesterdayData = history.find(entry => {
          const entryDate = new Date(entry.timestamp);
          const diffDays = (now - entryDate) / (1000 * 60 * 60 * 24);
          return diffDays >= 1 && diffDays < 2;
        });

        // Calculate week comparison
        const lastWeekData = history.find(entry => {
          const entryDate = new Date(entry.timestamp);
          const diffDays = (now - entryDate) / (1000 * 60 * 60 * 24);
          return diffDays >= 7 && diffDays < 8;
        });

        const currentScore = calculateVisibility(brands[0]);
        
        setComparisons({
          day: yesterdayData ? 
            Number((currentScore - calculateVisibility(brands[0], yesterdayData.results?.[topic.id])).toFixed(1)) : 
            null,
          week: lastWeekData ? 
            Number((currentScore - calculateVisibility(brands[0], lastWeekData.results?.[topic.id])).toFixed(1)) : 
            null
        });
      }
    }, [projectId, analysisResults, topic.id, brands]);

    const topicResults = analysisResults?.results?.[topic.id];
    const timestamp = analysisResults?.timestamp;

    // Calculate visibility score considering mention positions
    const calculateVisibility = (brandName) => {
      if (!topicResults?.queries) return 0;
      
      let totalScore = 0;
      const totalQueries = topicResults.queries.length;

      topicResults.queries.forEach(query => {
        const brandMention = query.brandMentions?.find(m => m.name === brandName);
        if (!brandMention?.mentioned || !brandMention.positions) return;

        // Get the first position where the brand appears
        const position = brandMention.brandPosition;
        
        // Apply graduated scoring based on position
        if (position === 1) totalScore += 1.0;
        else if (position === 2) totalScore += 0.75;
        else if (position === 3) totalScore += 0.5;
        else if (position === 4) totalScore += 0.25;
        else totalScore += 0.1;
      });

      // Round to 1 decimal place
      return Math.round((totalScore / totalQueries * 100) * 10) / 10;
    };

    // Get brand mentions count
    const getBrandMentions = (brandName) => {
      if (!topicResults) return 0;
      return topicResults.queries?.reduce((count, query) => {
        const mention = query.brandMentions?.find(m => m.name === brandName);
        return count + (mention?.count || 0);
      }, 0) || 0;
    };

    // Format timestamp
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleString('sv-SE', { 
        timeZone: 'Europe/Stockholm',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    const calculateComparison = (brandName, daysAgo) => {
      const historyKey = `history_${projectId}`;
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
      
      if (!history.length) return null;

      const now = new Date();
      const compareDate = new Date(now.setDate(now.getDate() - daysAgo));
      
      // Find the closest previous entry
      const previousEntry = history
        .filter(entry => new Date(entry.timestamp) <= compareDate)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

      if (!previousEntry) return null;

      const currentScore = calculateVisibility(brandName);
      const previousScore = calculateVisibility(brandName, previousEntry.results?.[topic.id]);
      
      return Number((currentScore - previousScore).toFixed(1));
    };

    return (
      <div className="bg-[#1c2333] rounded-lg p-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-2xl font-bold text-white mb-1">{topic.name}</h3>
          </div>
          <span className="text-sm text-gray-400 bg-[#2a3447] px-3 py-1 rounded-full">
            {topic.queries?.length || 0} queries
          </span>
        </div>

        {topicResults ? (
          <>
            <div className="mb-6">
              <div className="text-6xl font-bold text-white mb-2">
                {calculateVisibility(brands[0]).toFixed(1)}%
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                {comparisons.day !== null && (
                  <span className={`text-xs ${comparisons.day > 0 ? 'text-green-400' : comparisons.day < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {comparisons.day > 0 ? '+' : ''}{comparisons.day}% day
                  </span>
                )}
                {comparisons.week !== null && (
                  <span className={`text-xs ${comparisons.week > 0 ? 'text-green-400' : comparisons.week < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                    {comparisons.week > 0 ? '+' : ''}{comparisons.week}% week
                  </span>
                )}
                {timestamp && (
                  <span className="text-xs text-gray-500">
                    • Updated {formatTimestamp(timestamp)}
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {brands.map(brand => {
                const visibility = calculateVisibility(brand);
                const mentions = getBrandMentions(brand);
                return (
                  <div key={brand} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-300">{brand}</span>
                        <span className="text-emerald-400 text-sm">
                          {mentions} mentions
                        </span>
                      </div>
                      <span className="text-gray-300">
                        {visibility.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#2a3447] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${visibility}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-400">
            No analysis data available
          </div>
        )}
      </div>
    );
  };

  // Helper function to get brand color
  const getBrandColor = (brand, isPrimaryBrand = false) => {
    // If it's the primary brand (your own brand)
    if (isPrimaryBrand) {
      return '#60A5FA'; // blue-400
    }

    // For competitors, rotate between these colors
    const competitorColors = [
      '#F87171', // red-400
      '#34D399', // emerald-400
      '#A78BFA', // violet-400
      '#FBBF24', // amber-400
      '#EC4899'  // pink-400
    ];

    // Hash the brand name to get a consistent color
    const index = brand.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return competitorColors[index % competitorColors.length];
  };

  // First, let's structure our data correctly
  const prepareChartData = () => {
    console.log('\n=== Preparing Chart Data ===');
    
    if (!analysisResults?.results) {
      console.log('No analysis results found');
      return [];
    }

    const setupData = localStorage.getItem('setupData');
    const brands = setupData ? JSON.parse(setupData).brands : ['Adidas', 'Nike', 'Salomon'];
    
    return brands.map(brand => {
      console.log(`\nCalculating for ${brand}:`);
      
      // Get topic scores from the topic cards calculation
      const topicScores = Object.entries(analysisResults.results).map(([topicId, topicData]) => {
        const totalQueries = topicData.queries?.length || 0;
        if (!totalQueries) return 0;
        
        // Use the same calculation as in TopicCard
        const mentionedQueries = topicData.queries.filter(query => 
          query.brandMentions?.some(m => m.name === brand && m.mentioned)
        ).length;
        
        const score = (mentionedQueries / totalQueries) * 100;
        console.log(`${topicId}: ${score.toFixed(1)}%`);
        return score;
      });
      
      // Calculate simple average
      const averageScore = topicScores.reduce((sum, score) => sum + score, 0) / topicScores.length;
      console.log(`${brand} average: ${averageScore.toFixed(1)}%`);

      return {
        label: brand,
        data: [{
          x: new Date(analysisResults.timestamp),
          y: averageScore // This should now match the topic cards
        }],
        borderColor: getBrandColor(brand),
        backgroundColor: getBrandColor(brand),
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6
      };
    });
  };

  const OverallVisibilityChart = () => {
    const [brands, setBrands] = useState([]);
    const { projectId } = useParams();
    
    useEffect(() => {
      // Get brands from current project
      const projects = JSON.parse(localStorage.getItem('projects') || '[]');
      const currentProject = projects.find(p => p.id === projectId);
      if (currentProject?.brands) {
        setBrands(currentProject.brands);
      }
    }, [projectId]);

    if (!monitoringData?.topics || !analysisResults?.timestamp || !brands.length) return null;

    const calculateAverageVisibility = (brandName) => {
      if (!analysisResults?.results) return 0;

      // Get scores from all topics
      const topicScores = Object.entries(analysisResults.results).map(([topicId, topicData]) => {
        if (!topicData?.queries) return 0;
        
        let totalScore = 0;
        const totalQueries = topicData.queries.length;

        topicData.queries.forEach(query => {
          const brandMention = query.brandMentions?.find(m => m.name === brandName);
          if (!brandMention?.mentioned || !brandMention.brandPosition === undefined) return;

          const position = brandMention.brandPosition;
          if (position === 1) totalScore += 1.0;
          else if (position === 2) totalScore += 0.75;
          else if (position === 3) totalScore += 0.5;
          else if (position === 4) totalScore += 0.25;
          else totalScore += 0.1;
        });

        return Math.round((totalScore / totalQueries * 100) * 10) / 10;
      });

      // Calculate average of all topic scores
      const validScores = topicScores.filter(score => score > 0);
      return validScores.length > 0 
        ? Number((validScores.reduce((sum, score) => sum + score, 0) / validScores.length).toFixed(1))
        : 0;
    };

    const data = {
      labels: [format(new Date(analysisResults?.timestamp || new Date()), 'MMM dd')],
      datasets: brands.map(brand => {
        const isPrimaryBrand = brand === currentProject?.brand;
        return {
          label: brand,
          data: [calculateAverageVisibility(brand)],
          borderColor: getBrandColor(brand, isPrimaryBrand),
          backgroundColor: getBrandColor(brand, isPrimaryBrand),
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6,
          // Make primary brand line thicker
          borderWidth: isPrimaryBrand ? 3 : 2,
          // Optional: Add dashed lines for competitors
          borderDash: isPrimaryBrand ? [] : [5, 5]
        };
      })
    };

    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '';
      return new Date(timestamp).toLocaleString('sv-SE', { 
        timeZone: 'Europe/Stockholm',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <div className="bg-[#1c2333] rounded-lg p-6 mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Overall Visibility Score</h2>
            <div className="text-gray-400">0.0% vs last week</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex gap-2">
              <button className="px-3 py-1 rounded bg-[#2a3447]">1M</button>
              <button className="px-3 py-1 rounded bg-[#2a3447]">3M</button>
              <button className="px-3 py-1 rounded bg-blue-600">6M</button>
              <button className="px-3 py-1 rounded bg-[#2a3447]">1Y</button>
            </div>
            {analysisResults?.timestamp && (
              <div className="text-xs text-gray-500">
                Last updated {formatTimestamp(analysisResults.timestamp)}
              </div>
            )}
          </div>
        </div>
        <div className="h-64">
          <Line 
            data={data} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100,
                  grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                  },
                  ticks: {
                    color: 'rgba(255, 255, 255, 0.5)',
                    callback: value => `${value}%`
                  }
                },
                x: {
                  grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                  },
                  ticks: {
                    color: 'rgba(255, 255, 255, 0.5)'
                  }
                }
              },
              plugins: {
                legend: {
                  position: 'top',
                  labels: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    usePointStyle: true,
                    pointStyle: 'circle'
                  }
                },
                tooltip: {
                  callbacks: {
                    label: (context) => `${context.dataset.label}: ${context.parsed.y}%`
                  }
                }
              }
            }}
          />
        </div>
      </div>
    );
  };

  const renderTopicCards = () => {
    if (!monitoringData?.topics) return null;

    return monitoringData.topics
      .filter(topic => topic.queries && topic.queries.length > 0)
      .map(topic => (
        <TopicCard 
          key={topic.id} 
          topic={topic}
          analysisResults={analysisResults}
        />
      ));
  };

  const clearAnalysisData = () => {
    localStorage.removeItem(`results_${projectId}`);
    localStorage.removeItem(`history_${projectId}`);
    setAnalysisResults({});
    console.log('Analysis data and history cleared for project:', projectId);
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
            <h1 className="text-3xl font-bold mb-2">Monitoring</h1>
            <p className="text-gray-400">Track your brand visibility across topics</p>
          </div>
          <div className="flex gap-4">
            <button
              onClick={clearAnalysisData}
              className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-700"
            >
              Clear Analysis
            </button>
            <button
              onClick={startAnalysis}
              disabled={isAnalyzing}
              className={`px-6 py-2 rounded-lg ${
                isAnalyzing ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isAnalyzing ? 'Analyzing...' : 'Start Analysis'}
            </button>
          </div>
        </div>

        <OverallVisibilityChart 
          projectId={projectId}
          analysisResults={analysisResults}
          monitoringData={monitoringData}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {topics.map(topic => (
            <TopicCard
              key={topic.id}
              topic={topic}
              projectId={projectId}
              analysisResults={analysisResults}
            />
          ))}
        </div>

        <div className="bg-[#1c2333] rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Query Analysis Details</h2>
            <select 
              className="bg-[#2a3447] text-gray-300 px-4 py-2 rounded-lg"
              onChange={(e) => setFilterTopic(e.target.value)}
            >
              <option value="all">All Topics</option>
              {topics.map(topic => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#2a3447]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-[120px]">TOPIC</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-[200px]">QUERY</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">RESPONSE</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-[200px]">MENTIONED BRANDS</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-300 w-[150px]">BRAND POSITION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a3447]">
                {analysisResults?.results && Object.entries(analysisResults.results)
                  .filter(([topicId, _]) => filterTopic === 'all' || topicId === filterTopic)
                  .map(([topicId, topicData]) => {
                    // Find topic name from topics array
                    const topic = topics.find(t => t.id === topicId);
                    return topicData.queries.map((query, queryIndex) => (
                      <tr key={`${topicId}-${queryIndex}`} className="hover:bg-[#2a3447]">
                        <td className="px-4 py-3 text-sm text-blue-400">{topic?.name || topicId}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{query.query}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <div className="max-h-[100px] overflow-y-auto pr-4">
                            {query.response}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {query.brandMentions
                            .filter(brand => brand.mentioned)
                            .map((brand, index) => (
                              <span 
                                key={index}
                                className="inline-block bg-blue-600 bg-opacity-20 text-blue-400 px-2 py-1 rounded mr-2 mb-2"
                              >
                                {brand.name}
                              </span>
                            ))}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {(() => {
                            const primaryBrand = query.brandMentions
                              .find(brand => brand.name === currentProject?.brand && brand.mentioned);
                            
                            return primaryBrand ? (
                              <span className="inline-block bg-blue-600 bg-opacity-20 text-blue-400 px-2 py-1 rounded">
                                #{primaryBrand.brandPosition}
                              </span>
                            ) : (
                              <span className="text-gray-500">-</span>
                            );
                          })()}
                        </td>
                      </tr>
                    ));
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}