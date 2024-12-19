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
  const [chartTimeRange, setChartTimeRange] = useState('6m');
  const [topics, setTopics] = useState([]);
  const [analysisResults, setAnalysisResults] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [overallScore, setOverallScore] = useState(0);
  const [filterTopic, setFilterTopic] = useState('all');
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [monitoringData, setMonitoringData] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    // Load topics from localStorage
    const storedTopics = localStorage.getItem('topicsWithQueries');
    if (storedTopics) {
      const topicsData = JSON.parse(storedTopics);
      const topicsArray = Object.entries(topicsData).map(([name, queries]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        queries
      }));
      setTopics(topicsArray);
    }

    // Load any existing analysis results
    const storedResults = localStorage.getItem('analysisResults');
    if (storedResults) {
      setAnalysisResults(JSON.parse(storedResults));
    }
  }, []);

  useEffect(() => {
    const storedHistory = localStorage.getItem('analysisHistory');
    if (storedHistory) {
      setAnalysisHistory(JSON.parse(storedHistory));
    }
  }, []);

  useEffect(() => {
    console.log('Loading data from localStorage...');
    
    // Load topics
    const storedTopics = localStorage.getItem('topicsWithQueries');
    console.log('Stored topics:', storedTopics);
    
    if (storedTopics) {
      try {
        const topicsData = JSON.parse(storedTopics);
        console.log('Parsed topics:', topicsData);
        
        // Convert the topics data into the format we need
        const formattedData = {
          topics: Object.entries(topicsData).map(([name, queries]) => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name,
            queries
          }))
        };
        
        console.log('Formatted monitoring data:', formattedData);
        setMonitoringData(formattedData);
      } catch (error) {
        console.error('Error parsing topics:', error);
      }
    }

    // Load existing analysis results
    const savedAnalysisResults = localStorage.getItem('analysisResults');
    if (savedAnalysisResults) {
      try {
        setAnalysisResults(JSON.parse(savedAnalysisResults));
      } catch (error) {
        console.error('Error parsing analysis results:', error);
      }
    }
  }, []);

  useEffect(() => {
    console.log('Topics:', monitoringData?.topics);
    console.log('Analysis Results:', analysisResults);
  }, [monitoringData, analysisResults]);

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
    
    // Default brands if none are configured
    const defaultBrands = ['Adidas', 'Nike', 'Salomon'];
    
    // Get brands from localStorage with better error handling
    let brands = defaultBrands;
    try {
      const setupData = localStorage.getItem('setupData');
      if (setupData) {
        const parsedData = JSON.parse(setupData);
        brands = parsedData?.brands || defaultBrands;
      }
      console.log('Brands to track:', brands);
    } catch (error) {
      console.error('Error parsing setupData:', error);
      // Keep using default brands
    }
    
    setIsAnalyzing(true);
    const results = {};

    try {
      for (const topic of monitoringData.topics) {
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
                brands // Pass brands array
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

      setAnalysisResults(analysisWithTimestamp);
      localStorage.setItem('analysisResults', JSON.stringify(analysisWithTimestamp));
      
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

  const TopicCard = ({ topic, monitoringData, analysisResults }) => {
    const topicResults = analysisResults?.results?.[topic.id];
    const timestamp = analysisResults?.timestamp;
    
    const calculateTopicVisibility = (brandName) => {
      if (!topicResults?.queries) return 0;
      
      let totalScore = 0;
      topicResults.queries.forEach(query => {
        totalScore += calculateVisibilityScore(query, brandName);
      });
      
      return ((totalScore / topicResults.queries.length) * 100).toFixed(1);
    };

    // Count brand mentions
    const getBrandMentions = (brandName) => {
      if (!topicResults) return 0;
      return topicResults.queries.reduce((count, query) => {
        const mention = query.brandMentions.find(m => m.name === brandName);
        return count + (mention?.count || 0);
      }, 0);
    };

    // Format the timestamp
    const formatTimestamp = (timestamp) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString('en-US', { 
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    return (
      <div className="bg-[#1c2333] rounded-lg p-6">
        <div className="flex justify-between items-start mb-6">
          <h3 className="text-xl font-semibold text-white">{topic.name}</h3>
          <span className="text-sm text-gray-400 bg-[#2a3447] px-3 py-1 rounded-full">
            {topic.queries.length} queries
          </span>
        </div>

        {topicResults ? (
          <>
            <div className="mb-6">
              <div className="text-5xl font-bold text-white mb-1">
                {calculateTopicVisibility('Adidas')}%
              </div>
              <div className="flex items-center gap-2">
                <div className="text-sm text-gray-400">visibility score</div>
                {timestamp && (
                  <div className="text-xs text-gray-500">
                    • Updated {formatTimestamp(timestamp)}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {['Adidas', 'Nike', 'Salomon'].map(brand => (
                <div key={brand} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-300">{brand}</span>
                      <span className="text-emerald-400 text-sm">
                        {getBrandMentions(brand)} mentions
                      </span>
                    </div>
                    <span className="text-gray-300">
                      {calculateTopicVisibility(brand)}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-[#2a3447] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${calculateTopicVisibility(brand)}%` }}
                    />
                  </div>
                </div>
              ))}
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
  const getBrandColor = (brand) => {
    const colors = {
      'adidas': '#4ade80',  // green
      'nike': '#4ade80',    // green
      'salomon': '#a855f7'  // purple
    };
    return colors[brand.toLowerCase()] || '#60a5fa';
  };

  // First, let's structure our data correctly
  const prepareChartData = () => {
    if (!analysisResults || !monitoringData?.topics) return [];

    // Get visibility scores for each brand
    const getBrandVisibility = (brandName) => {
      if (!monitoringData?.topics) return 0;
      
      // Get scores from each topic
      const topicScores = monitoringData.topics
        .map(topic => {
          const topicResults = analysisResults[topic.id];
          if (!topicResults?.queries) return null;

          // Count mentioned queries
          const mentionedQueries = topicResults.queries.filter(query => 
            query.brandMentions?.some(m => m.name === brandName && m.mentioned)
          ).length;

          // Calculate percentage for this topic
          return (mentionedQueries / topicResults.queries.length) * 100;
        })
        .filter(score => score !== null);

      // Calculate average across all topics
      return topicScores.length > 0 
        ? topicScores.reduce((sum, score) => sum + score, 0) / topicScores.length 
        : 0;
    };

    // Get brands from setupData
    const setupData = localStorage.getItem('setupData');
    const brands = setupData ? JSON.parse(setupData).brands : ['Adidas', 'Nike', 'Salomon'];

    // Return dataset for each brand
    return brands.map(brand => ({
      label: brand,
      data: [{ x: new Date(), y: getBrandVisibility(brand) }],
      borderColor: getBrandColor(brand),
      backgroundColor: getBrandColor(brand),
      tension: 0.4,
      pointRadius: 4,
      pointHoverRadius: 6
    }));
  };

  const OverallVisibilityChart = () => {
    if (!monitoringData?.topics || !analysisResults) return null;

    const calculateAverageVisibility = (brandName) => {
      console.log(`\n=== Calculating visibility for ${brandName} ===`);
      
      const topicScores = [];
      
      // Calculate score for each topic
      Object.entries(analysisResults).forEach(([topicId, topicData]) => {
        console.log(`\nTopic: ${topicId}`);
        
        if (!topicData?.queries?.length) {
          console.log('No queries found');
          return;
        }
        
        // Count queries where brand is mentioned
        let mentionedQueries = 0;
        topicData.queries.forEach(query => {
          if (query.brandMentions?.some(m => m.name === brandName && m.mentioned)) {
            mentionedQueries++;
          }
        });
        
        const score = (mentionedQueries / topicData.queries.length) * 100;
        console.log(`Mentions: ${mentionedQueries}/${topicData.queries.length}`);
        console.log(`Score: ${score}%`);
        
        topicScores.push(score);
      });

      // Calculate average of topic scores
      const average = topicScores.length > 0
        ? topicScores.reduce((sum, score) => sum + score, 0) / topicScores.length
        : 0;

      console.log('\nTopic scores:', topicScores);
      console.log(`Average: ${average}%\n`);
      
      return average.toFixed(1);
    };

    const data = {
      labels: ['Dec 18'],
      datasets: [
        {
          label: 'Adidas',
          data: [calculateAverageVisibility('Adidas')],
          borderColor: '#4ade80',
          backgroundColor: '#4ade80',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Nike',
          data: [calculateAverageVisibility('Nike')],
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Salomon',
          data: [calculateAverageVisibility('Salomon')],
          borderColor: '#a855f7',
          backgroundColor: '#a855f7',
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    };

    return (
      <div className="bg-[#1c2333] rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-1">Overall Visibility Score</h2>
            <div className="text-gray-400">0.0% vs last week</div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded bg-[#2a3447]">1M</button>
            <button className="px-3 py-1 rounded bg-[#2a3447]">3M</button>
            <button className="px-3 py-1 rounded bg-blue-600">6M</button>
            <button className="px-3 py-1 rounded bg-[#2a3447]">1Y</button>
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
          monitoringData={monitoringData}
          analysisResults={analysisResults}
        />
      ));
  };

  const clearAnalysisData = () => {
    localStorage.removeItem('analysisResults');
    setAnalysisResults({});
    console.log('Analysis data cleared');
  };

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

        <div className="bg-[#1c2333] rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-semibold mb-1">Overall Visibility Score</h2>
              <div className="text-gray-400">
                {overallScore.toFixed(1)}% vs last week
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setChartTimeRange('1m')}
                className={`px-3 py-1 rounded ${
                  chartTimeRange === '1m' ? 'bg-blue-600' : 'bg-[#2a3447]'
                }`}
              >
                1M
              </button>
              <button
                onClick={() => setChartTimeRange('3m')}
                className={`px-3 py-1 rounded ${
                  chartTimeRange === '3m' ? 'bg-blue-600' : 'bg-[#2a3447]'
                }`}
              >
                3M
              </button>
              <button
                onClick={() => setChartTimeRange('6m')}
                className={`px-3 py-1 rounded ${
                  chartTimeRange === '6m' ? 'bg-blue-600' : 'bg-[#2a3447]'
                }`}
              >
                6M
              </button>
              <button
                onClick={() => setChartTimeRange('1y')}
                className={`px-3 py-1 rounded ${
                  chartTimeRange === '1y' ? 'bg-blue-600' : 'bg-[#2a3447]'
                }`}
              >
                1Y
              </button>
            </div>
          </div>

          <div className="h-64">
            <Line
              data={{
                datasets: prepareChartData()
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                  intersect: false,
                  mode: 'index'
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                    },
                    ticks: {
                      color: '#9ca3af',
                      callback: value => `${value}%`
                    },
                  },
                  x: {
                    type: 'time',
                    time: {
                      unit: 'day',
                      displayFormats: {
                        day: 'MMM d'
                      }
                    },
                    grid: {
                      color: 'rgba(255, 255, 255, 0.1)',
                    },
                    ticks: {
                      color: '#9ca3af',
                    },
                  },
                },
                plugins: {
                  legend: {
                    labels: {
                      color: '#9ca3af',
                    },
                  },
                  tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    callbacks: {
                      label: (context) => `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`
                    }
                  }
                },
              }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {!monitoringData && <div className="text-white">No monitoring data loaded</div>}
          {monitoringData && !monitoringData.topics && <div className="text-white">No topics found in data</div>}
          {monitoringData?.topics?.map(topic => (
            <TopicCard
              key={topic.id}
              topic={topic}
              monitoringData={monitoringData}
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
                <option key={topic.id} value={topic.name}>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2a3447]">
                {analysisResults?.results && Object.entries(analysisResults.results)
                  // Filter by selected topic
                  .filter(([topicName, _]) => filterTopic === 'all' || topicName === filterTopic.toLowerCase())
                  .map(([topicName, topicData]) => (
                    topicData.queries.map((query, queryIndex) => (
                      <tr key={`${topicName}-${queryIndex}`} className="hover:bg-[#2a3447]">
                        <td className="px-4 py-3 text-sm text-blue-400">{topicName}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">{query.query}</td>
                        <td className="px-4 py-3 text-sm text-gray-300">
                          <div className="max-h-[100px] overflow-y-auto pr-4">
                            {query.response}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {query.brandMentions.map((brand, index) => (
                            brand.mentioned && (
                              <span 
                                key={index}
                                className="inline-block bg-blue-600 bg-opacity-20 text-blue-400 px-2 py-1 rounded mr-2 mb-2"
                              >
                                {brand.name} ({brand.count})
                              </span>
                            )
                          ))}
                        </td>
                      </tr>
                    ))
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}