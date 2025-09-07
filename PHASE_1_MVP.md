# Phase 1: MVP - Basic Repository Analysis

## 🎯 **Phase 1 Goals**
Build a working MVP that can analyze GitHub repositories and provide basic quality metrics.

## 📋 **What We're Building**
- Basic GitHub repository analysis
- Simple quality scoring (0-100)
- Basic web interface to view results
- Repository cloning and file analysis

## 🏗️ **Architecture Overview**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │  Express API    │    │   PostgreSQL    │
│   (Port 3000)   │◄──►│   (Port 8080)   │◄──►│   (Port 5432)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ Analysis Worker │
                       │   (Python)      │
                       └─────────────────┘
```

## 📁 **Project Structure**
```
devatlas/
├── frontend/                 # React app
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API calls
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── vite.config.js
├── backend/                 # Express API
│   ├── src/
│   │   ├── routes/         # API routes
│   │   ├── models/         # Database models
│   │   ├── services/       # Business logic
│   │   └── utils/          # Helper functions
│   ├── package.json
│   └── server.js
├── worker/                  # Analysis worker
│   ├── analyzers/          # Analysis modules
│   ├── requirements.txt
│   └── main.py
├── database/               # Database setup
│   ├── schema.sql
│   └── migrations/
├── docker-compose.yml      # Development setup
└── README.md
```

## 🚀 **Implementation Steps**

### Step 1: Setup Development Environment
```bash
# 1. Create project structure
mkdir devatlas && cd devatlas
mkdir frontend backend worker database

# 2. Initialize git
git init
echo "node_modules/\n.env\n*.log" > .gitignore

# 3. Setup Docker Compose
# (See docker-compose.yml below)
```

### Step 2: Database Setup
```sql
-- database/schema.sql
CREATE DATABASE devatlas;

CREATE TABLE repositories (
    id SERIAL PRIMARY KEY,
    github_url VARCHAR(500) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    owner VARCHAR(255) NOT NULL,
    language VARCHAR(100),
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE analyses (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    status VARCHAR(50) DEFAULT 'pending',
    score INTEGER,
    metrics JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

CREATE TABLE analysis_results (
    id SERIAL PRIMARY KEY,
    analysis_id INTEGER REFERENCES analyses(id),
    metric_name VARCHAR(100),
    metric_value DECIMAL,
    details JSONB
);
```

### Step 3: Backend API (Express)
```javascript
// backend/package.json
{
  "name": "devatlas-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "pg": "^8.11.3",
    "dotenv": "^16.3.1",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

```javascript
// backend/server.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 8080;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/devatlas'
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/repositories', async (req, res) => {
  try {
    const { githubUrl } = req.body;
    
    // Validate GitHub URL
    if (!githubUrl || !githubUrl.includes('github.com')) {
      return res.status(400).json({ error: 'Valid GitHub URL required' });
    }
    
    // Extract owner/repo from URL
    const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    if (!match) {
      return res.status(400).json({ error: 'Invalid GitHub URL format' });
    }
    
    const [, owner, repo] = match;
    
    // Check if repository already exists
    const existingRepo = await pool.query(
      'SELECT * FROM repositories WHERE github_url = $1',
      [githubUrl]
    );
    
    if (existingRepo.rows.length > 0) {
      return res.json({ 
        message: 'Repository already exists',
        repository: existingRepo.rows[0]
      });
    }
    
    // Insert new repository
    const result = await pool.query(
      'INSERT INTO repositories (github_url, name, owner) VALUES ($1, $2, $3) RETURNING *',
      [githubUrl, repo, owner]
    );
    
    res.json({ 
      message: 'Repository added successfully',
      repository: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error adding repository:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/repositories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.*, 
             a.score as latest_score,
             a.status as latest_status,
             a.created_at as last_analyzed
      FROM repositories r
      LEFT JOIN LATERAL (
        SELECT score, status, created_at
        FROM analyses
        WHERE repository_id = r.id
        ORDER BY created_at DESC
        LIMIT 1
      ) a ON true
      ORDER BY r.created_at DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/analyze/:repositoryId', async (req, res) => {
  try {
    const { repositoryId } = req.params;
    
    // Create analysis record
    const analysis = await pool.query(
      'INSERT INTO analyses (repository_id, status) VALUES ($1, $2) RETURNING *',
      [repositoryId, 'pending']
    );
    
    // TODO: Trigger analysis worker
    // For now, just return the analysis ID
    
    res.json({ 
      message: 'Analysis started',
      analysisId: analysis.rows[0].id
    });
    
  } catch (error) {
    console.error('Error starting analysis:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
```

### Step 4: Frontend (React + Vite)
```json
// frontend/package.json
{
  "name": "devatlas-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.8.1",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.43",
    "@types/react-dom": "^18.2.17",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8"
  }
}
```

```jsx
// frontend/src/App.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8080/api';

function App() {
  const [repositories, setRepositories] = useState([]);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRepositories();
  }, []);

  const fetchRepositories = async () => {
    try {
      const response = await axios.get(`${API_BASE}/repositories`);
      setRepositories(response.data);
    } catch (error) {
      console.error('Error fetching repositories:', error);
    }
  };

  const addRepository = async (e) => {
    e.preventDefault();
    if (!newRepoUrl) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/repositories`, {
        githubUrl: newRepoUrl
      });
      setNewRepoUrl('');
      fetchRepositories();
    } catch (error) {
      console.error('Error adding repository:', error);
      alert('Error adding repository. Please check the URL.');
    } finally {
      setLoading(false);
    }
  };

  const startAnalysis = async (repoId) => {
    try {
      await axios.post(`${API_BASE}/analyze/${repoId}`);
      alert('Analysis started! Check back in a few minutes.');
      fetchRepositories();
    } catch (error) {
      console.error('Error starting analysis:', error);
      alert('Error starting analysis.');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">DevAtlas - Repository Analysis</h1>
      
      {/* Add Repository Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Add Repository</h2>
        <form onSubmit={addRepository} className="flex gap-4">
          <input
            type="url"
            value={newRepoUrl}
            onChange={(e) => setNewRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            className="flex-1 px-4 py-2 border rounded-lg"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Repository'}
          </button>
        </form>
      </div>

      {/* Repositories List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">Repositories</h2>
        </div>
        <div className="divide-y">
          {repositories.map((repo) => (
            <div key={repo.id} className="p-6 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">
                  {repo.owner}/{repo.name}
                </h3>
                <p className="text-gray-600">{repo.github_url}</p>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                  <span>⭐ {repo.stars}</span>
                  <span>🍴 {repo.forks}</span>
                  <span>📊 Score: {repo.latest_score || 'Not analyzed'}</span>
                </div>
              </div>
              <button
                onClick={() => startAnalysis(repo.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Analyze
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
```

### Step 5: Analysis Worker (Python)
```python
# worker/requirements.txt
requests==2.31.0
psycopg2-binary==2.9.9
gitpython==3.1.40
python-dotenv==1.0.0
```

```python
# worker/main.py
import os
import json
import psycopg2
import requests
from git import Repo
from dotenv import load_dotenv

load_dotenv()

class RepositoryAnalyzer:
    def __init__(self):
        self.db_conn = psycopg2.connect(
            os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/devatlas')
        )
    
    def analyze_repository(self, repo_id):
        """Main analysis function"""
        try:
            # Get repository info
            repo_info = self.get_repository_info(repo_id)
            if not repo_info:
                return False
            
            # Clone repository
            repo_path = self.clone_repository(repo_info['github_url'])
            if not repo_path:
                return False
            
            # Perform analysis
            metrics = self.calculate_metrics(repo_path)
            
            # Calculate score
            score = self.calculate_score(metrics)
            
            # Save results
            self.save_analysis_results(repo_id, score, metrics)
            
            return True
            
        except Exception as e:
            print(f"Error analyzing repository {repo_id}: {e}")
            return False
    
    def get_repository_info(self, repo_id):
        """Get repository info from database"""
        cursor = self.db_conn.cursor()
        cursor.execute("SELECT * FROM repositories WHERE id = %s", (repo_id,))
        result = cursor.fetchone()
        cursor.close()
        
        if result:
            return {
                'id': result[0],
                'github_url': result[1],
                'name': result[2],
                'owner': result[3]
            }
        return None
    
    def clone_repository(self, github_url):
        """Clone repository to temporary directory"""
        try:
            # Convert GitHub URL to clone URL
            clone_url = github_url.replace('github.com', 'github.com') + '.git'
            
            # Create temporary directory
            temp_dir = f"/tmp/repo_{hash(github_url)}"
            
            # Clone repository
            repo = Repo.clone_from(clone_url, temp_dir, depth=1)
            
            return temp_dir
            
        except Exception as e:
            print(f"Error cloning repository: {e}")
            return None
    
    def calculate_metrics(self, repo_path):
        """Calculate basic metrics for the repository"""
        metrics = {}
        
        try:
            # Count files and lines
            file_count = 0
            line_count = 0
            language_count = {}
            
            for root, dirs, files in os.walk(repo_path):
                # Skip hidden directories
                dirs[:] = [d for d in dirs if not d.startswith('.')]
                
                for file in files:
                    if file.startswith('.'):
                        continue
                    
                    file_path = os.path.join(root, file)
                    file_ext = os.path.splitext(file)[1]
                    
                    # Count lines in text files
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            lines = len(f.readlines())
                            line_count += lines
                            
                            # Count by language
                            if file_ext in ['.js', '.jsx']:
                                language_count['JavaScript'] = language_count.get('JavaScript', 0) + lines
                            elif file_ext in ['.py']:
                                language_count['Python'] = language_count.get('Python', 0) + lines
                            elif file_ext in ['.ts', '.tsx']:
                                language_count['TypeScript'] = language_count.get('TypeScript', 0) + lines
                            elif file_ext in ['.java']:
                                language_count['Java'] = language_count.get('Java', 0) + lines
                            elif file_ext in ['.go']:
                                language_count['Go'] = language_count.get('Go', 0) + lines
                                
                    except:
                        pass
                    
                    file_count += 1
            
            metrics = {
                'file_count': file_count,
                'line_count': line_count,
                'language_distribution': language_count,
                'has_readme': os.path.exists(os.path.join(repo_path, 'README.md')),
                'has_package_json': os.path.exists(os.path.join(repo_path, 'package.json')),
                'has_requirements_txt': os.path.exists(os.path.join(repo_path, 'requirements.txt')),
                'has_tests': self.has_test_files(repo_path)
            }
            
        except Exception as e:
            print(f"Error calculating metrics: {e}")
        
        return metrics
    
    def has_test_files(self, repo_path):
        """Check if repository has test files"""
        test_patterns = ['test', 'spec', '__tests__']
        
        for root, dirs, files in os.walk(repo_path):
            for file in files:
                if any(pattern in file.lower() for pattern in test_patterns):
                    return True
        return False
    
    def calculate_score(self, metrics):
        """Calculate overall score based on metrics"""
        score = 0
        
        # Base score
        score += 20
        
        # File count bonus (up to 20 points)
        if metrics['file_count'] > 0:
            score += min(20, metrics['file_count'] / 10)
        
        # README bonus (20 points)
        if metrics['has_readme']:
            score += 20
        
        # Package management bonus (10 points)
        if metrics['has_package_json'] or metrics['has_requirements_txt']:
            score += 10
        
        # Tests bonus (20 points)
        if metrics['has_tests']:
            score += 20
        
        # Language diversity bonus (10 points)
        if len(metrics['language_distribution']) > 1:
            score += 10
        
        return min(100, int(score))
    
    def save_analysis_results(self, repo_id, score, metrics):
        """Save analysis results to database"""
        cursor = self.db_conn.cursor()
        
        try:
            # Update analysis status and score
            cursor.execute(
                "UPDATE analyses SET status = 'completed', score = %s, completed_at = CURRENT_TIMESTAMP WHERE repository_id = %s ORDER BY created_at DESC LIMIT 1",
                (score, repo_id)
            )
            
            # Save detailed metrics
            cursor.execute(
                "INSERT INTO analysis_results (analysis_id, metric_name, metric_value, details) VALUES (%s, %s, %s, %s)",
                (repo_id, 'overall_score', score, json.dumps(metrics))
            )
            
            self.db_conn.commit()
            
        except Exception as e:
            print(f"Error saving results: {e}")
            self.db_conn.rollback()
        finally:
            cursor.close()

if __name__ == "__main__":
    analyzer = RepositoryAnalyzer()
    
    # For now, analyze the first pending repository
    cursor = analyzer.db_conn.cursor()
    cursor.execute("SELECT id FROM repositories ORDER BY created_at DESC LIMIT 1")
    result = cursor.fetchone()
    cursor.close()
    
    if result:
        repo_id = result[0]
        print(f"Analyzing repository {repo_id}...")
        success = analyzer.analyze_repository(repo_id)
        print(f"Analysis {'completed' if success else 'failed'}")
    else:
        print("No repositories to analyze")
```

### Step 6: Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: devatlas
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql

  backend:
    build: ./backend
    ports:
      - "8080:8080"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/devatlas
    depends_on:
      - postgres
    volumes:
      - ./backend:/app
    command: npm run dev

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    command: npm run dev

  worker:
    build: ./worker
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres:5432/devatlas
    depends_on:
      - postgres
    volumes:
      - ./worker:/app
    command: python main.py

volumes:
  postgres_data:
```

## 🧪 **How to Test Phase 1**

### 1. **Setup and Run**
```bash
# 1. Start all services
docker-compose up --build

# 2. Check services are running
curl http://localhost:8080/api/health
curl http://localhost:3000
```

### 2. **Test Repository Addition**
```bash
# Add a repository via API
curl -X POST http://localhost:8080/api/repositories \
  -H "Content-Type: application/json" \
  -d '{"githubUrl": "https://github.com/facebook/react"}'
```

### 3. **Test Analysis**
```bash
# Start analysis
curl -X POST http://localhost:8080/api/analyze/1

# Check results
curl http://localhost:8080/api/repositories
```

### 4. **Frontend Testing**
1. Open http://localhost:3000
2. Add a repository URL
3. Click "Analyze" button
4. Verify results appear

## ✅ **Phase 1 Success Criteria**
- [ ] Can add GitHub repositories via web interface
- [ ] Can clone and analyze repositories
- [ ] Can calculate basic quality scores
- [ ] Can display results in web interface
- [ ] All services run without errors
- [ ] Database persists data correctly

## 🚀 **How to Run Phase 1**
```bash
# 1. Clone and setup
git clone <your-repo> && cd devatlas

# 2. Start all services
docker-compose up --build

# 3. Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8080/api/health
# Database: localhost:5432
```

## 📝 **Notes for Developers**
- This is a **working MVP** - don't worry about perfect code
- Focus on **functionality over perfection**
- Use **console.log** for debugging
- **Test each component** before moving to the next
- **Keep it simple** - we'll improve in later phases

## 🔄 **Next Phase Preview**
Phase 2 will add:
- LLM-powered repository summaries
- Advanced security scanning
- Better UI with charts and graphs
- Real-time analysis updates
