const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage (replace with database in production)
let topics = [];
let queries = [];

// Get all topics
app.get('/api/topics', (req, res) => {
  try {
    res.json(topics);
  } catch (error) {
    console.error('Error getting topics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new topic
app.post('/api/topics', (req, res) => {
  try {
    const { name } = req.body;
    const newTopic = {
      id: Date.now().toString(),
      name: name
    };
    topics.push(newTopic);
    res.json(newTopic);
  } catch (error) {
    console.error('Error adding topic:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete topic
app.delete('/api/topics/:id', (req, res) => {
  try {
    const { id } = req.params;
    topics = topics.filter(topic => topic.id !== id);
    // Also delete associated queries
    queries = queries.filter(query => query.topicId !== id);
    res.json({ message: 'Topic deleted' });
  } catch (error) {
    console.error('Error deleting topic:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all queries
app.get('/api/queries', (req, res) => {
  try {
    res.json(queries);
  } catch (error) {
    console.error('Error getting queries:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add new query
app.post('/api/queries', (req, res) => {
  try {
    const { text, topicId } = req.body;
    const newQuery = {
      id: Date.now().toString(),
      text,
      topicId,
      response: `Sample response for: ${text}`, // Replace with actual AI response later
      lastUpdated: new Date().toISOString()
    };
    queries.push(newQuery);
    res.json(newQuery);
  } catch (error) {
    console.error('Error adding query:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete query
app.delete('/api/queries/:id', (req, res) => {
  try {
    const { id } = req.params;
    queries = queries.filter(query => query.id !== id);
    res.json({ message: 'Query deleted' });
  } catch (error) {
    console.error('Error deleting query:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Keep the existing process-query endpoint
app.post('/api/process-query', (req, res) => {
  try {
    const { query } = req.body;
    console.log('Received query:', query);
    
    const response = { message: `You asked: ${query}` };
    console.log('Sending response:', response);
    
    res.json(response);
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = 3003;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});