"use client"
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import 'chartjs-adapter-date-fns';

// Dynamically import Chart components with no SSR
const Line = dynamic(
  () => import('react-chartjs-2').then(mod => mod.Line),
  { ssr: false }
);

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

// Define a color palette that will be used in sequence for any brands
const brandColorPalette = [
  {
    line: 'rgb(66, 133, 244)',  // Blue
    background: 'rgba(66, 133, 244, 0.1)'
  },
  {
    line: 'rgb(234, 67, 53)',   // Red
    background: 'rgba(234, 67, 53, 0.1)'
  },
  {
    line: 'rgb(251, 188, 4)',   // Yellow
    background: 'rgba(251, 188, 4, 0.1)'
  },
  {
    line: 'rgb(52, 168, 83)',   // Green
    background: 'rgba(52, 168, 83, 0.1)'
  },
  {
    line: 'rgb(156, 39, 176)',  // Purple
    background: 'rgba(156, 39, 176, 0.1)'
  },
  // Add more colors if needed
];

export default function Monitoring() {
  const { projectId } = useParams();
  const [topics, setTopics] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filterTopic, setFilterTopic] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [currentProject, setCurrentProject] = useState(null);
  const [hiddenDatasets, setHiddenDatasets] = useState(new Set());

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Load project details
        const projectRes = await fetch(`/api/projects/${projectId}`);
        const project = await projectRes.json();
        setCurrentProject(project);

        // Load topics
        const topicsRes = await fetch(`/api/topics/${projectId}`);
        const topicsData = await topicsRes.json();
        
        // Convert topics object to array format
        const formattedTopics = Object.entries(topicsData).map(([name, queries]) => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          queries: Array.isArray(queries) ? queries : [queries]
        }));
        setTopics(formattedTopics);

        // Load latest analysis results
        const analysisRes = await fetch(`/api/analysis/${projectId}`);
        if (analysisRes.ok) {
          const results = await analysisRes.json();
          if (results) {
            console.log('Loaded Analysis Results:', {
              results,
              hasHistory: !!results.history,
              historyLength: results.history?.length
            });
            setAnalysisResults(results);
          }
        }

      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [projectId]);

  const startAnalysis = async () => {
    if (!topics.length) {
      console.log('No topics found to analyze');
      return;
    }

    if (!currentProject?.brands?.length) {
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
            const response = await fetch(`/api/analyze/${projectId}`, {
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

      // When saving, check if we already have an entry for today
      const today = new Date().toISOString().split('T')[0]; // Get just the date part 'YYYY-MM-DD'
      
      // Create new analysis entry
      const newAnalysis = {
        results: results,
        timestamp: new Date().toISOString()
      };

      // If we have history, filter out any previous entry from today before saving
      if (analysisResults?.history) {
        analysisResults.history = analysisResults.history.filter(entry => {
          const entryDate = new Date(entry.timestamp).toISOString().split('T')[0];
          return entryDate !== today;
        });
      }

      // Save analysis results to database
      const saveResponse = await fetch(`/api/analysis/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...analysisResults,
          results: results,
          timestamp: new Date().toISOString(),
          history: analysisResults?.history ? [...analysisResults.history, newAnalysis] : [newAnalysis]
        }),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save analysis results');
      }

      const savedResults = await saveResponse.json();
      setAnalysisResults(savedResults);
      
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const TopicCard = ({ topic }) => {
    const calculateVisibility = (brandName) => {
      if (!analysisResults?.results?.[topic.id]?.queries) return 0;
      
      let totalScore = 0;
      const queries = analysisResults.results[topic.id].queries;
      const totalQueries = queries.length;

      queries.forEach(query => {
        const brandMention = query.brandMentions?.find(m => m.name === brandName);
        if (!brandMention?.mentioned) return;

        const position = brandMention.brandPosition;
        if (position === 1) totalScore += 1.0;
        else if (position === 2) totalScore += 0.75;
        else if (position === 3) totalScore += 0.5;
        else if (position === 4) totalScore += 0.25;
        else totalScore += 0.1;
      });

      return Math.round((totalScore / totalQueries * 100) * 10) / 10;
    };

    const calculateTopicComparison = () => {
      console.log('Calculating comparison for topic:', topic.name, {
        history: analysisResults?.history,
        topicId: topic.id
      });

      if (!analysisResults?.history?.length) {
        console.log('No history available');
        return {
          daily: '0.0',
          weekly: '0.0'
        };
      }

      const sortedHistory = [...analysisResults.history].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      // Get topic-specific scores
      const getTopicScore = (entry) => {
        console.log('Getting score from entry:', {
          entry,
          topicId: topic.id,
          results: entry?.results?.[topic.id],
          brand: currentProject?.brand
        });

        if (!entry?.results?.[topic.id]) return 0;
        
        let totalScore = 0;
        let totalQueries = 0;
        
        const queries = entry.results[topic.id].queries || [];
        queries.forEach(query => {
          totalQueries++;
          const brandMention = query.brandMentions?.find(m => m.name === currentProject?.brand);
          if (!brandMention?.mentioned) return;

          const position = brandMention.brandPosition;
          if (position === 1) totalScore += 1.0;
          else if (position === 2) totalScore += 0.75;
          else if (position === 3) totalScore += 0.5;
          else if (position === 4) totalScore += 0.25;
          else totalScore += 0.1;
        });

        const score = totalQueries > 0 ? (totalScore / totalQueries) * 100 : 0;
        console.log('Calculated score:', { totalScore, totalQueries, score });
        return score;
      };

      const currentScore = getTopicScore(sortedHistory[0]);
      const yesterdayScore = sortedHistory[1] ? getTopicScore(sortedHistory[1]) : currentScore;

      const weekAgoIndex = sortedHistory.findIndex(entry => {
        const entryDate = new Date(entry.timestamp);
        const currentDate = new Date(sortedHistory[0].timestamp);
        return currentDate.getTime() - entryDate.getTime() >= 7 * 24 * 60 * 60 * 1000;
      });

      const weekAgoScore = weekAgoIndex !== -1 ? getTopicScore(sortedHistory[weekAgoIndex]) : currentScore;

      console.log('Scores for', topic.name, {
        currentScore,
        yesterdayScore,
        weekAgoScore
      });

      // Calculate changes
      const dailyChange = yesterdayScore !== 0 
        ? -(((currentScore - yesterdayScore) / yesterdayScore) * 100)
        : 0;
      
      const weeklyChange = weekAgoScore !== 0 
        ? -(((currentScore - weekAgoScore) / weekAgoScore) * 100)
        : 0;

      console.log('Changes for', topic.name, {
        dailyChange,
        weeklyChange
      });

      return {
        daily: isFinite(dailyChange) ? dailyChange.toFixed(1) : '0.0',
        weekly: isFinite(weeklyChange) ? weeklyChange.toFixed(1) : '0.0'
      };
    };

    const mainBrandVisibility = calculateVisibility(currentProject.brand);
    const comparison = calculateTopicComparison();

    return (
      <div className="bg-[#1F2A40] p-6 rounded-lg">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold">{topic.name}</h3>
          <span className="text-2xl font-bold">{mainBrandVisibility}%</span>
        </div>
        <div className="text-sm text-gray-400 mb-4">
          <span className={comparison.weekly === '0.0' ? 'text-gray-400' : 
            Number(comparison.weekly) >= 0 ? 'text-green-500' : 'text-red-500'}>
            {comparison.weekly}% vs last week
          </span>
          <span className="ml-2">(
            <span className={comparison.daily === '0.0' ? 'text-gray-400' : 
              Number(comparison.daily) >= 0 ? 'text-green-500' : 'text-red-500'}>
              {comparison.daily}%
            </span> vs yesterday)
          </span>
        </div>
        <div className="space-y-2">
          {currentProject?.competitors?.map((competitor, index) => (
            <div key={competitor} className="flex justify-between items-center text-sm">
              <span className="text-gray-400">{competitor}</span>
              <span>{calculateVisibility(competitor)}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const prepareChartData = () => {
    if (!analysisResults?.history?.length) return { datasets: [] };

    // Log the data we're working with
    console.log('Chart Data:', {
      historyLength: analysisResults.history.length,
      dates: analysisResults.history.map(h => new Date(h.timestamp).toISOString().split('T')[0])
    });

    const sortedHistory = [...analysisResults.history].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );

    // Create datasets for each brand
    const datasets = currentProject?.brands?.map((brandName, index) => {
      const colorIndex = index % brandColorPalette.length;
      const brandColor = brandColorPalette[colorIndex];

      const data = sortedHistory.map(entry => ({
        x: new Date(entry.timestamp),
        y: calculateBrandScore(brandName, entry)
      }));

      return {
        label: brandName,
        data: data,
        borderColor: brandColor.line,
        backgroundColor: brandColor.background,
        fill: true,
        tension: 0.4,
        hidden: hiddenDatasets.has(brandName)
      };
    }) || [];

    return { datasets };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'day',
          displayFormats: {
            day: 'MMM dd'
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderDash: [5, 5],
          drawBorder: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          font: {
            size: 14
          },
          padding: 10
        }
      },
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
          borderDash: [5, 5],
          drawBorder: false,
          tickLength: 10
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.5)',
          callback: value => `${value}%`,
          font: {
            size: 14
          },
          padding: 10,
          stepSize: 10
        }
      }
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'center',
        onClick: (e, legendItem, legend) => {
          const brandName = legendItem.text;
          const index = legendItem.datasetIndex;
          const ci = legend.chart;
          
          if (hiddenDatasets.has(brandName)) {
            hiddenDatasets.delete(brandName);
          } else {
            hiddenDatasets.add(brandName);
          }
          setHiddenDatasets(new Set(hiddenDatasets));
          
          ci.setDatasetVisibility(index, !ci.isDatasetVisible(index));
          ci.update();
        },
        labels: {
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 15,
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 14,
            weight: '500'
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: {
          size: 13
        },
        bodyFont: {
          size: 13
        },
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y}%`
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const calculateBrandScore = (brandName) => {
    if (!analysisResults?.results) return 0;
    
    let totalScore = 0;
    let totalQueries = 0;

    // Loop through all topics and their queries
    Object.values(analysisResults.results).forEach(topicData => {
      topicData.queries.forEach(query => {
        totalQueries++;
        const brandMention = query.brandMentions?.find(m => m.name === brandName);
        if (!brandMention?.mentioned) return;

        const position = brandMention.brandPosition;
        if (position === 1) totalScore += 1.0;
        else if (position === 2) totalScore += 0.75;
        else if (position === 3) totalScore += 0.5;
        else if (position === 4) totalScore += 0.25;
        else totalScore += 0.1;
      });
    });

    return totalQueries > 0 ? Math.round((totalScore / totalQueries * 100) * 10) / 10 : 0;
  };

  const calculateComparison = () => {
    if (!analysisResults?.history?.length) {
      console.log('No history data available yet - first analysis will establish baseline');
      return {
        daily: 0,
        weekly: 0
      };
    }

    const sortedHistory = [...analysisResults.history].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    console.log('Sorted History:', sortedHistory.map(h => ({
      timestamp: h.timestamp,
      results: Object.keys(h.results || {}).length
    })));

    // Calculate average visibility score for all brands
    const getAverageScore = (entry) => {
      if (!entry?.results || !currentProject?.brands) {
        console.log('Missing results or brands:', { 
          hasResults: !!entry?.results, 
          brands: currentProject?.brands 
        });
        return 0;
      }
      
      const brandScores = currentProject.brands.map(brandName => {
        let totalScore = 0;
        let totalQueries = 0;

        Object.values(entry.results).forEach(topicData => {
          topicData.queries.forEach(query => {
            totalQueries++;
            const brandMention = query.brandMentions?.find(m => m.name === brandName);
            if (!brandMention?.mentioned) return;

            const position = brandMention.brandPosition;
            if (position === 1) totalScore += 1.0;
            else if (position === 2) totalScore += 0.75;
            else if (position === 3) totalScore += 0.5;
            else if (position === 4) totalScore += 0.25;
            else totalScore += 0.1;
          });
        });

        const score = totalQueries > 0 ? (totalScore / totalQueries) * 100 : 0;
        console.log(`Score for ${brandName}:`, { totalScore, totalQueries, score });
        return score;
      });

      const avgScore = brandScores.reduce((sum, score) => sum + score, 0) / brandScores.length;
      console.log('Average score:', avgScore);
      return avgScore;
    };

    const currentScore = getAverageScore(sortedHistory[0]);
    const yesterdayScore = sortedHistory[1] ? getAverageScore(sortedHistory[1]) : currentScore;
    
    const weekAgoIndex = sortedHistory.findIndex(entry => {
      const entryDate = new Date(entry.timestamp);
      const currentDate = new Date(sortedHistory[0].timestamp);
      return currentDate.getTime() - entryDate.getTime() >= 7 * 24 * 60 * 60 * 1000;
    });
    
    const weekAgoScore = weekAgoIndex !== -1 ? getAverageScore(sortedHistory[weekAgoIndex]) : currentScore;

    console.log('Raw Scores:', {
      current: currentScore,
      yesterday: yesterdayScore,
      weekAgo: weekAgoScore
    });

    // Invert the sign to show decrease as negative
    const dailyChange = -(((currentScore - yesterdayScore) / yesterdayScore) * 100);
    const weeklyChange = -(((currentScore - weekAgoScore) / weekAgoScore) * 100);

    console.log('Calculated Changes:', {
      daily: dailyChange,
      weekly: weeklyChange,
      calculation: `-(${currentScore} - ${yesterdayScore}) / ${yesterdayScore} * 100 = ${dailyChange}`
    });

    return {
      daily: isFinite(dailyChange) ? dailyChange.toFixed(1) : '0.0',
      weekly: isFinite(weeklyChange) ? weeklyChange.toFixed(1) : '0.0'
    };
  };

  if (isLoading) {
    return <div className="min-h-screen bg-[#141b2d] text-white p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-[#141b2d] text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">{currentProject?.name} Monitoring</h1>
            <p className="text-gray-400">Track your brand visibility across topics</p>
          </div>
          <button
            onClick={startAnalysis}
            disabled={isAnalyzing || topics.length === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {topics.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No topics configured. Please add topics before running analysis.
          </div>
        ) : (
          <>
            {analysisResults && (
              <div className="bg-[#1c2333] rounded-lg p-6 mb-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-xl font-semibold mb-1">Overall Visibility Score</h2>
                    <div className="text-gray-400">
                      <span className={calculateComparison().weekly === '0.0' ? 'text-gray-400' : 
                        Number(calculateComparison().weekly) >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {calculateComparison().weekly}% vs last week
                      </span>
                      <span className="ml-2">(
                        <span className={calculateComparison().daily === '0.0' ? 'text-gray-400' : 
                          Number(calculateComparison().daily) >= 0 ? 'text-green-500' : 'text-red-500'}>
                          {calculateComparison().daily}%
                        </span> vs yesterday)
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex gap-2">
                      <button className="px-3 py-1 rounded bg-[#2a3447]">1M</button>
                      <button className="px-3 py-1 rounded bg-[#2a3447]">3M</button>
                      <button className="px-3 py-1 rounded bg-blue-600">6M</button>
                      <button className="px-3 py-1 rounded bg-[#2a3447]">1Y</button>
                    </div>
                    <div className="text-xs text-gray-500">
                      Last updated {new Date(analysisResults.timestamp).toLocaleString('sv-SE', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }).toLowerCase()}
                    </div>
                  </div>
                </div>
                <div className="h-96">
                  <Line data={prepareChartData()} options={chartOptions} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {topics.map(topic => (
                <TopicCard key={topic.id} topic={topic} />
              ))}
            </div>

            <div className="bg-[#1F2A40] p-6 rounded-lg mt-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Query Analysis Details</h2>
                <select 
                  className="bg-[#2a3447] text-gray-300 px-4 py-2 rounded-lg"
                  onChange={(e) => setFilterTopic(e.target.value)}
                  value={filterTopic}
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
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">TOPIC</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">QUERY</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">RESPONSE</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">MENTIONED BRANDS</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">BRAND POSITION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2a3447]">
                    {analysisResults?.results && Object.entries(analysisResults.results)
                      .filter(([topicId, _]) => filterTopic === 'all' || topicId === filterTopic)
                      .map(([topicId, topicData]) => {
                        const topic = topics.find(t => t.id === topicId);
                        return topicData.queries.map((query, queryIndex) => (
                          <tr key={`${topicId}-${queryIndex}`} className="hover:bg-[#2a3447]">
                            <td className="px-4 py-3 text-sm text-blue-400">{topic?.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">{query.query}</td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              <div className="max-h-[100px] overflow-y-auto pr-4">
                                {query.response}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {query.brandMentions
                                ?.filter(brand => brand.mentioned)
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
                              {query.brandMentions
                                ?.find(b => b.name === currentProject?.brand)?.brandPosition 
                                ? `#${query.brandMentions.find(b => b.name === currentProject?.brand).brandPosition}`
                                : '-'}
                            </td>
                          </tr>
                        ));
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}