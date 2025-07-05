#!/usr/bin/env node

/**
 * Issue 108 Automated Update Script
 * Coordinates with other swarms and updates issue 108 based on changes
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class Issue108Coordinator {
  constructor() {
    this.swarmId = null;
    this.agents = [];
    this.issueNumber = 108;
    this.monitorInterval = 30000; // 30 seconds
  }

  async initialize() {
    console.log('🚀 Initializing Issue 108 Coordinator...');
    
    try {
      // Initialize swarm
      const swarmResult = execSync('npx ruv-swarm init hierarchical 4 --claude', { encoding: 'utf8' });
      this.swarmId = JSON.parse(swarmResult).id;
      
      // Spawn specialized agents
      const agents = [
        { type: 'coordinator', name: 'Issue Coordinator' },
        { type: 'analyst', name: 'Progress Tracker' },
        { type: 'researcher', name: 'Repository Monitor' },
        { type: 'coder', name: 'Integration Agent' }
      ];
      
      for (const agent of agents) {
        const result = execSync(`npx ruv-swarm agent spawn ${agent.type} --name "${agent.name}"`, { encoding: 'utf8' });
        this.agents.push(JSON.parse(result).agent);
      }
      
      console.log(`✅ Swarm initialized with ${this.agents.length} agents`);
      
      // Initialize DAA for cross-swarm coordination
      execSync('npx ruv-swarm daa init --coordination --learning --persistence disk', { encoding: 'utf8' });
      
    } catch (error) {
      console.error('❌ Initialization failed:', error.message);
      throw error;
    }
  }

  async monitorChanges() {
    console.log('🔍 Starting change monitoring...');
    
    setInterval(async () => {
      try {
        await this.checkForUpdates();
      } catch (error) {
        console.error('⚠️ Monitoring error:', error.message);
      }
    }, this.monitorInterval);
  }

  async checkForUpdates() {
    try {
      // Get current issue status
      const issueData = execSync(`gh issue view ${this.issueNumber} --json title,body,state,assignees,labels,comments,updatedAt`, { encoding: 'utf8' });
      const issue = JSON.parse(issueData);
      
      // Get repository changes
      const changes = this.getRecentChanges();
      
      // Store in swarm memory
      const memoryData = {
        timestamp: new Date().toISOString(),
        issue: issue,
        changes: changes,
        swarm_id: this.swarmId,
        coordination_active: true
      };
      
      execSync(`npx ruv-swarm memory store "issue_108_status" '${JSON.stringify(memoryData)}'`, { encoding: 'utf8' });
      
      // Check if update is needed
      if (this.shouldUpdateIssue(changes)) {
        await this.updateIssue(changes);
      }
      
      // Coordinate with other swarms
      await this.coordinateWithOtherSwarms();
      
    } catch (error) {
      console.error('❌ Update check failed:', error.message);
    }
  }

  getRecentChanges() {
    try {
      const gitChanges = execSync('git log --oneline --since="1 hour ago" --max-count=10', { encoding: 'utf8' });
      const diffStat = execSync('git diff --stat HEAD~1 HEAD', { encoding: 'utf8' });
      
      return {
        recent_commits: gitChanges.trim().split('\n').filter(line => line.trim()),
        diff_stat: diffStat.trim(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.warn('⚠️ Git changes check failed:', error.message);
      return { recent_commits: [], diff_stat: '', timestamp: new Date().toISOString() };
    }
  }

  shouldUpdateIssue(changes) {
    // Update if there are recent commits or significant changes
    return changes.recent_commits.length > 0 || 
           changes.diff_stat.length > 0 ||
           this.hasSignificantChanges(changes);
  }

  hasSignificantChanges(changes) {
    const significantPatterns = [
      'claude-flow',
      'issue 108',
      'typescript',
      'swarm',
      'fix',
      'update',
      'v2.0.0'
    ];
    
    return changes.recent_commits.some(commit => 
      significantPatterns.some(pattern => 
        commit.toLowerCase().includes(pattern.toLowerCase())
      )
    );
  }

  async updateIssue(changes) {
    console.log('📝 Updating issue 108...');
    
    try {
      // Orchestrate update task
      const taskResult = execSync(`npx ruv-swarm task orchestrate "Update issue 108 with latest changes" --strategy adaptive --priority high`, { encoding: 'utf8' });
      const task = JSON.parse(taskResult);
      
      // Generate update comment
      const updateComment = this.generateUpdateComment(changes, task);
      
      // Post comment to issue
      execSync(`gh issue comment ${this.issueNumber} --body "${updateComment}"`, { encoding: 'utf8' });
      
      console.log('✅ Issue 108 updated successfully');
      
    } catch (error) {
      console.error('❌ Issue update failed:', error.message);
    }
  }

  generateUpdateComment(changes, task) {
    const timestamp = new Date().toISOString();
    
    return `🚀 Swarm Progress Update - ${timestamp}

## 📊 Current Status

### 🔴 Recent Changes Detected
${changes.recent_commits.map(commit => `- ${commit}`).join('\n')}

### 🎯 Swarm Coordination Status
- **Task ID**: ${task.taskId}
- **Assigned Agents**: ${task.assigned_agents?.length || 0}
- **Strategy**: ${task.strategy}
- **Priority**: ${task.priority}

### 📈 Metrics
- **Swarm Memory**: $(npx ruv-swarm memory usage --summary)
- **Neural Networks**: Active
- **Cross-Swarm Coordination**: Enabled

### 📝 Next Steps
- Continue monitoring repository changes
- Coordinate with development swarm
- Update progress metrics as changes occur

---
🤖 *Automated update by Issue 108 Coordinator*`.replace(/\n/g, '\\n').replace(/"/g, '\\"');
  }

  async coordinateWithOtherSwarms() {
    try {
      // Check for other active swarms
      const swarmStatus = execSync('npx ruv-swarm status --json', { encoding: 'utf8' });
      const status = JSON.parse(swarmStatus);
      
      if (status.active_swarms > 1) {
        console.log(`🔗 Coordinating with ${status.active_swarms - 1} other swarms...`);
        
        // Share knowledge across swarms
        for (const agent of this.agents) {
          if (agent.type === 'coordinator') {
            const knowledgeData = {
              source: 'issue_108_coordinator',
              timestamp: new Date().toISOString(),
              issue_status: 'monitoring',
              coordination_active: true,
              swarm_id: this.swarmId
            };
            
            execSync(`npx ruv-swarm daa knowledge-share --source-agent ${agent.id} --knowledge-domain issue_108 --knowledge-content '${JSON.stringify(knowledgeData)}'`, { encoding: 'utf8' });
          }
        }
      }
      
    } catch (error) {
      console.warn('⚠️ Cross-swarm coordination warning:', error.message);
    }
  }

  async shutdown() {
    console.log('🛑 Shutting down Issue 108 Coordinator...');
    
    try {
      // Save final state
      const finalState = {
        timestamp: new Date().toISOString(),
        swarm_id: this.swarmId,
        agents: this.agents,
        status: 'shutdown',
        coordination_active: false
      };
      
      execSync(`npx ruv-swarm memory store "issue_108_final_state" '${JSON.stringify(finalState)}'`, { encoding: 'utf8' });
      
      console.log('✅ Shutdown complete');
      
    } catch (error) {
      console.error('❌ Shutdown error:', error.message);
    }
  }
}

// Main execution
async function main() {
  const coordinator = new Issue108Coordinator();
  
  try {
    await coordinator.initialize();
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await coordinator.shutdown();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await coordinator.shutdown();
      process.exit(0);
    });
    
    // Start monitoring
    await coordinator.monitorChanges();
    
    // Keep the process running
    console.log('📡 Issue 108 Coordinator is running. Press Ctrl+C to stop.');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { Issue108Coordinator };