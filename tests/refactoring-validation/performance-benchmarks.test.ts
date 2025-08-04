/**
 * Performance Benchmarks for Refactored Components
 * 
 * Validates that refactoring achieved performance improvement targets:
 * - Document creation <10s (50% improvement)
 * - Cross-validation <8s (47% improvement) 
 * - Memory usage <100MB (50% improvement)
 * - Concurrent operations: 8 simultaneous
 * - Cache hit rate >90%
 */

import { jest } from '@jest/globals';
import { performance } from 'perf_hooks';
import { createMaestroHiveCoordinator } from '../../src/maestro-hive/coordinator';
import { createPresetConfig } from '../../src/maestro-hive/config';
import type { MaestroHiveCoordinator, MaestroHiveConfig } from '../../src/maestro-hive/interfaces';

jest.mock('../../src/hive-mind/core/HiveMind');

describe('⚡ Performance Benchmarks - Refactoring Validation', () => {
  let coordinator: MaestroHiveCoordinator;
  let config: MaestroHiveConfig;

  beforeEach(async () => {
    config = createPresetConfig('testing');
    config.name = 'PerformanceBenchmarkSwarm';
    config.maxAgents = 8;
    config.qualityThreshold = 0.8;
    config.consensusRequired = false;
    coordinator = createMaestroHiveCoordinator(config);
  });

  afterEach(async () => {
    if (coordinator) {
      await coordinator.shutdown();
    }
  });

  describe('🎯 Target Performance Validations', () => {
    
    test('Document creation <10s (50% improvement target)', async () => {
      await coordinator.initializeSwarm();
      
      const startTime = performance.now();
      
      // Simulate comprehensive document creation workflow
      const workflow = await coordinator.createWorkflow(
        'Performance Document Creation',
        'Complete document generation with validation'
      );
      
      // Create multiple document types
      const specTask = await coordinator.createTask(
        'Create comprehensive specification with requirements, acceptance criteria, and constraints',
        'spec',
        'high'
      );
      
      const designTask = await coordinator.createTask(
        'Design system architecture with detailed component specifications',
        'design', 
        'high'
      );
      
      const implTask = await coordinator.createTask(
        'Implement core functionality with proper error handling and logging',
        'implementation',
        'high'
      );
      
      const testTask = await coordinator.createTask(
        'Create comprehensive test suite with unit and integration tests',
        'test',
        'medium'
      );
      
      const reviewTask = await coordinator.createTask(
        'Review all documents for quality, consistency, and completeness',
        'review',
        'medium'
      );
      
      // Build workflow
      await coordinator.addTaskToWorkflow(workflow.id, specTask);
      await coordinator.addTaskToWorkflow(workflow.id, designTask);
      await coordinator.addTaskToWorkflow(workflow.id, implTask);
      await coordinator.addTaskToWorkflow(workflow.id, testTask);
      await coordinator.addTaskToWorkflow(workflow.id, reviewTask);
      
      // Execute complete workflow
      await coordinator.executeWorkflow(workflow.id);
      
      // Perform validation on generated content
      const specContent = await coordinator.generateContent(
        'User authentication system with OAuth integration',
        'spec'
      );
      
      const designContent = await coordinator.generateContent(
        'Microservices architecture with API gateway',
        'design'
      );
      
      await coordinator.validate(specContent, 'spec', false);
      await coordinator.validate(designContent, 'design', false);
      
      const duration = performance.now() - startTime;
      
      // Validate performance target
      expect(duration).toBeLessThan(10000); // <10 seconds (50% improvement)
      
      // Verify quality maintained despite speed
      const finalWorkflow = await coordinator.getWorkflow(workflow.id);
      expect(finalWorkflow?.status).toBe('completed');
      expect(finalWorkflow?.tasks).toHaveLength(5);
      expect(specContent.length).toBeGreaterThan(100);
      expect(designContent.length).toBeGreaterThan(100);
      
      console.log(`📊 Document Creation Performance: ${duration.toFixed(2)}ms (Target: <10,000ms)`);
    });

    test('Cross-validation <8s (47% improvement target)', async () => {
      await coordinator.initializeSwarm();
      
      const startTime = performance.now();
      
      // Prepare multiple content types for cross-validation
      const contentTypes = [
        {
          content: `# User Authentication Specification
          
          ## Overview
          This specification defines the requirements for a secure user authentication system.
          
          ## Functional Requirements
          - Users must be able to register with email and password
          - Password complexity must be enforced (8+ chars, mixed case, numbers, symbols)
          - Multi-factor authentication support required
          - Session management with configurable timeout
          - Password recovery via email verification
          
          ## Non-Functional Requirements
          - Authentication response time <200ms
          - Support for 10,000+ concurrent users
          - 99.9% uptime requirement
          - GDPR compliance for user data
          
          ## Security Requirements
          - Passwords hashed with bcrypt (cost factor 12+)
          - JWT tokens with 1-hour expiration
          - Rate limiting: 5 failed attempts locks account for 15 minutes
          - All authentication endpoints must use HTTPS
          
          ## Acceptance Criteria
          - [ ] User can register with valid email/password
          - [ ] Invalid passwords are rejected with clear error messages
          - [ ] Failed login attempts are logged and rate limited
          - [ ] JWT tokens expire and require refresh
          - [ ] Password reset flow works end-to-end`,
          type: 'spec'
        },
        {
          content: `# System Architecture Design
          
          ## Overview
          This document outlines the architecture for a scalable microservices-based authentication system.
          
          ## Architecture Components
          
          ### API Gateway
          - Request routing and load balancing
          - Rate limiting and throttling
          - JWT token validation
          - Request/response logging
          
          ### Authentication Service
          - User registration and login
          - Password hashing and validation
          - JWT token generation and refresh
          - Multi-factor authentication
          
          ### User Service
          - User profile management
          - Account settings and preferences
          - User data persistence
          - GDPR compliance features
          
          ### Notification Service
          - Email verification
          - Password reset notifications
          - Account activity alerts
          - SMS for 2FA codes
          
          ## Data Flow
          1. Client sends authentication request to API Gateway
          2. Gateway forwards to Authentication Service
          3. Service validates credentials against User Service
          4. JWT token generated and returned via Gateway
          5. Subsequent requests validated at Gateway level
          
          ## Technology Stack
          - Node.js with Express for API services
          - PostgreSQL for user data persistence
          - Redis for session and token caching
          - Docker containers with Kubernetes orchestration
          - NGINX as reverse proxy
          
          ## Security Considerations
          - All services communicate via internal network
          - Database connections encrypted with TLS
          - Secrets managed via Kubernetes secrets
          - Regular security scanning and updates`,
          type: 'design'
        },
        {
          content: `# Test Implementation Plan
          
          ## Unit Tests
          
          ### Authentication Service Tests
          - Password hashing validation
          - JWT token generation/validation
          - Rate limiting enforcement
          - Input validation and sanitization
          
          ### User Service Tests
          - User creation and retrieval
          - Profile updates and validation
          - Data consistency checks
          - Error handling scenarios
          
          ## Integration Tests
          
          ### API Gateway Integration
          - Request routing accuracy
          - Token validation flow
          - Rate limiting enforcement
          - Error response handling
          
          ### End-to-End Authentication Flow
          - Complete user registration
          - Login with various scenarios
          - Token refresh workflow
          - Password reset flow
          
          ## Performance Tests
          - Load testing with 1000+ concurrent users
          - Response time validation (<200ms)
          - Memory usage monitoring
          - Database connection pooling
          
          ## Security Tests
          - SQL injection prevention
          - XSS attack prevention
          - CSRF token validation
          - Rate limiting effectiveness
          
          ## Test Data Management
          - Automated test data setup/teardown
          - Test environment isolation
          - Consistent test data across environments
          - Performance baseline maintenance`,
          type: 'test'
        },
        {
          content: `# Quality Review Report
          
          ## Code Quality Assessment
          
          ### Strengths
          - Well-structured modular architecture
          - Comprehensive error handling
          - Clear separation of concerns
          - Extensive test coverage (>90%)
          - Consistent coding standards
          
          ### Areas for Improvement
          - Some functions exceed 20 lines (refactor recommended)
          - Missing JSDoc comments on public methods
          - Could benefit from more integration tests
          - Database migration scripts need version control
          
          ## Security Review
          
          ### Positive Findings
          - Proper password hashing implementation
          - JWT tokens properly signed and validated
          - Rate limiting correctly implemented
          - Input validation comprehensive
          
          ### Security Recommendations
          - Implement content security policy headers
          - Add request size limiting
          - Consider implementing API versioning
          - Regular dependency security audits needed
          
          ## Performance Analysis
          
          ### Metrics
          - Average response time: 145ms (within 200ms target)
          - Memory usage: 78MB per service instance
          - Database query optimization successful
          - Cache hit rate: 94%
          
          ### Recommendations
          - Consider connection pooling optimization
          - Implement response caching for static content
          - Monitor and tune garbage collection
          - Add performance alerting thresholds
          
          ## Compliance Assessment
          - GDPR requirements fully implemented
          - Data encryption at rest and in transit
          - Audit logging comprehensive
          - User consent mechanisms in place`,
          type: 'review'
        },
        {
          content: `# Implementation Documentation
          
          ## Development Approach
          
          ### Methodology
          - Test-driven development (TDD) approach
          - Continuous integration with automated testing
          - Code review requirements for all changes
          - Feature branch workflow with PR approvals
          
          ### Key Implementation Details
          
          #### Authentication Flow
          \`\`\`javascript
          // Simplified authentication flow
          async function authenticateUser(email, password) {
            const user = await userService.findByEmail(email);
            if (!user) throw new AuthError('Invalid credentials');
            
            const isValid = await bcrypt.compare(password, user.hashedPassword);
            if (!isValid) {
              await rateLimiter.recordFailedAttempt(email);
              throw new AuthError('Invalid credentials');
            }
            
            const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
            return { token, user: user.publicProfile };
          }
          \`\`\`
          
          #### Rate Limiting Implementation
          \`\`\`javascript
          class RateLimiter {
            async checkLimit(identifier, limit = 5, window = 900000) {
              const key = \`rate_limit:\${identifier}\`;
              const current = await redis.get(key) || 0;
              
              if (current >= limit) {
                throw new RateLimitError('Too many attempts');
              }
              
              await redis.incr(key);
              await redis.expire(key, window / 1000);
            }
          }
          \`\`\`
          
          ### Database Schema Updates
          - User table with proper indexing
          - Authentication attempts logging
          - Session management tables
          - Migration scripts for deployment
          
          ### Deployment Strategy
          - Blue-green deployment for zero downtime
          - Database migrations run automatically
          - Health checks and readiness probes
          - Rollback procedures documented`,
          type: 'implementation'
        }
      ];
      
      // Perform cross-validation on all content types
      const validationPromises = contentTypes.map(async ({ content, type }) => {
        const validation = await coordinator.validate(content, type, false);
        
        // Additional cross-validation checks
        const crossValidation = await coordinator.validate(content, 'review', false);
        
        return {
          primaryValidation: validation,
          crossValidation: crossValidation,
          contentType: type,
          contentLength: content.length
        };
      });
      
      const validationResults = await Promise.all(validationPromises);
      const duration = performance.now() - startTime;
      
      // Validate performance target
      expect(duration).toBeLessThan(8000); // <8 seconds (47% improvement)
      
      // Verify validation quality
      expect(validationResults).toHaveLength(5);
      validationResults.forEach(result => {
        expect(result.primaryValidation.valid).toBeDefined();
        expect(result.crossValidation.valid).toBeDefined();
        expect(result.primaryValidation.score).toBeGreaterThan(0);
        expect(result.crossValidation.score).toBeGreaterThan(0);
      });
      
      // Calculate average scores
      const avgPrimaryScore = validationResults.reduce((sum, r) => sum + r.primaryValidation.score, 0) / validationResults.length;
      const avgCrossScore = validationResults.reduce((sum, r) => sum + r.crossValidation.score, 0) / validationResults.length;
      
      expect(avgPrimaryScore).toBeGreaterThan(0.7);
      expect(avgCrossScore).toBeGreaterThan(0.6);
      
      console.log(`📊 Cross-Validation Performance: ${duration.toFixed(2)}ms (Target: <8,000ms)`);
      console.log(`📊 Average Primary Score: ${avgPrimaryScore.toFixed(3)}`);
      console.log(`📊 Average Cross Score: ${avgCrossScore.toFixed(3)}`);
    });

    test('Memory usage <100MB (50% improvement target)', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      await coordinator.initializeSwarm();
      
      // Create significant workload to test memory efficiency
      const workflows = [];
      const tasks = [];
      const agents = [];
      const validations = [];
      
      // Spawn agents
      for (let i = 0; i < 8; i++) {
        const agentTypes = ['analyst', 'coder', 'reviewer', 'architect'];
        const agentType = agentTypes[i % agentTypes.length];
        const agent = await coordinator.spawnAgent(agentType as any);
        agents.push(agent);
      }
      
      // Create workflows with tasks
      for (let w = 0; w < 10; w++) {
        const workflow = await coordinator.createWorkflow(
          `Memory Test Workflow ${w}`,
          `Testing memory efficiency with workflow ${w}`
        );
        workflows.push(workflow);
        
        // Add tasks to each workflow
        for (let t = 0; t < 10; t++) {
          const taskTypes = ['spec', 'design', 'implementation', 'test', 'review'];
          const taskType = taskTypes[t % taskTypes.length];
          
          const task = await coordinator.createTask(
            `Memory test task ${w}-${t} with detailed description and requirements`,
            taskType as any,
            'medium'
          );
          tasks.push(task);
          
          await coordinator.addTaskToWorkflow(workflow.id, task);
        }
      }
      
      // Execute workflows
      for (const workflow of workflows) {
        await coordinator.executeWorkflow(workflow.id);
      }
      
      // Perform content validations
      const testContents = [
        'Comprehensive specification document with detailed requirements and acceptance criteria',
        'System design document with architecture diagrams and implementation details',
        'Test plan with unit tests, integration tests, and performance benchmarks',
        'Code review report with quality assessment and improvement recommendations',
        'Implementation guide with code examples and deployment instructions'
      ];
      
      for (const content of testContents) {
        const validation = await coordinator.validate(content, 'spec', false);
        validations.push(validation);
      }
      
      // Generate content to test content generation memory usage
      const generatedContents = [];
      for (let i = 0; i < 20; i++) {
        const content = await coordinator.generateContent(
          `Generate comprehensive content for test case ${i} with detailed specifications`,
          'spec'
        );
        generatedContents.push(content);
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
        // Wait a bit for cleanup
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      // Validate memory target
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // <100MB (50% improvement)
      
      // Verify all operations completed successfully
      expect(workflows).toHaveLength(10);
      expect(tasks).toHaveLength(100);
      expect(agents).toHaveLength(8);
      expect(validations).toHaveLength(5);
      expect(generatedContents).toHaveLength(20);
      
      // Verify workflows completed
      const completedWorkflows = await Promise.all(
        workflows.map(w => coordinator.getWorkflow(w.id))
      );
      expect(completedWorkflows.every(w => w?.status === 'completed')).toBe(true);
      
      console.log(`📊 Memory Usage: ${memoryIncreaseMB.toFixed(2)}MB (Target: <100MB)`);
      console.log(`📊 Workflows Created: ${workflows.length}`);
      console.log(`📊 Tasks Created: ${tasks.length}`);
      console.log(`📊 Agents Spawned: ${agents.length}`);
    });

    test('Concurrent operations: 8 simultaneous workflows', async () => {
      await coordinator.initializeSwarm();
      
      const startTime = performance.now();
      
      // Create 8 workflows that will run simultaneously
      const workflowPromises = Array(8).fill(null).map(async (_, index) => {
        const workflow = await coordinator.createWorkflow(
          `Concurrent Workflow ${index}`,
          `Testing concurrent execution for workflow ${index}`
        );
        
        // Add multiple tasks to each workflow
        const taskPromises = Array(5).fill(null).map(async (_, taskIndex) => {
          const taskTypes = ['spec', 'design', 'implementation', 'test', 'review'];
          const taskType = taskTypes[taskIndex];
          
          const task = await coordinator.createTask(
            `Concurrent task ${index}-${taskIndex} with comprehensive requirements and detailed specifications for ${taskType} phase`,
            taskType as any,
            'medium'
          );
          
          return coordinator.addTaskToWorkflow(workflow.id, task);
        });
        
        await Promise.all(taskPromises);
        
        // Execute workflow
        return coordinator.executeWorkflow(workflow.id);
      });
      
      // Wait for all workflows to complete
      const completedWorkflows = await Promise.all(workflowPromises);
      const duration = performance.now() - startTime;
      
      // Validate concurrent execution performance
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
      expect(completedWorkflows).toHaveLength(8);
      expect(completedWorkflows.every(w => w.status === 'completed')).toBe(true);
      
      // Verify each workflow has correct number of tasks
      completedWorkflows.forEach(workflow => {
        expect(workflow.tasks).toHaveLength(5);
      });
      
      // Check system status after concurrent operations
      const systemStatus = await coordinator.getStatus();
      expect(systemStatus.workflows).toBeGreaterThanOrEqual(8);
      expect(systemStatus.tasks).toBeGreaterThanOrEqual(40); // 8 workflows * 5 tasks each
      
      console.log(`📊 Concurrent Execution: ${duration.toFixed(2)}ms for 8 workflows (Target: <20,000ms)`);
      console.log(`📊 Total Tasks Executed: ${systemStatus.tasks}`);
      console.log(`📊 Average Time per Workflow: ${(duration / 8).toFixed(2)}ms`);
    });

    test('Cache hit rate >90% validation', async () => {
      await coordinator.initializeSwarm();
      
      // Test content for caching validation
      const testContents = [
        'Cached specification content for performance testing with detailed requirements',
        'Cached design document with architecture and implementation details',
        'Cached test plan with comprehensive coverage and validation criteria'
      ];
      
      const validationResults = [];
      let cacheHits = 0;
      let totalValidations = 0;
      
      // First round - cache misses (initial validations)
      for (const content of testContents) {
        const startTime = performance.now();
        const validation = await coordinator.validate(content, 'spec', false);
        const duration = performance.now() - startTime;
        
        validationResults.push({
          content: content.substring(0, 50),
          firstValidation: { validation, duration }
        });
        totalValidations++;
      }
      
      // Second round - should hit cache (repeated validations)
      for (let round = 0; round < 10; round++) {
        for (let i = 0; i < testContents.length; i++) {
          const content = testContents[i];
          const startTime = performance.now();
          const validation = await coordinator.validate(content, 'spec', false);
          const duration = performance.now() - startTime;
          
          // Compare with first validation to detect caching
          const firstValidation = validationResults[i].firstValidation;
          const scoreDiff = Math.abs(validation.score - firstValidation.validation.score);
          const timeDiff = duration / firstValidation.duration;
          
          // If score is identical and validation is faster, likely cache hit
          if (scoreDiff < 0.001 && timeDiff < 0.5) {
            cacheHits++;
          }
          
          totalValidations++;
          
          if (!validationResults[i].subsequentValidations) {
            validationResults[i].subsequentValidations = [];
          }
          validationResults[i].subsequentValidations.push({ validation, duration });
        }
      }
      
      const cacheHitRate = (cacheHits / Math.max(totalValidations - testContents.length, 1)) * 100;
      
      // Validate cache performance
      expect(cacheHitRate).toBeGreaterThan(90); // >90% cache hit rate
      
      // Verify validation consistency (cache correctness)
      validationResults.forEach(result => {
        const firstScore = result.firstValidation.validation.score;
        if (result.subsequentValidations) {
          result.subsequentValidations.forEach(subsequent => {
            const scoreDiff = Math.abs(subsequent.validation.score - firstScore);
            expect(scoreDiff).toBeLessThan(0.01); // Consistent scores indicate proper caching
          });
        }
      });
      
      console.log(`📊 Cache Hit Rate: ${cacheHitRate.toFixed(1)}% (Target: >90%)`);
      console.log(`📊 Total Validations: ${totalValidations}`);
      console.log(`📊 Cache Hits: ${cacheHits}`);
      
      // Performance comparison
      const firstRoundAvgTime = validationResults.reduce((sum, r) => sum + r.firstValidation.duration, 0) / validationResults.length;
      const subsequentAvgTime = validationResults.reduce((sum, r) => {
        if (!r.subsequentValidations) return sum;
        const avg = r.subsequentValidations.reduce((s, v) => s + v.duration, 0) / r.subsequentValidations.length;
        return sum + avg;
      }, 0) / validationResults.length;
      
      const speedImprovement = ((firstRoundAvgTime - subsequentAvgTime) / firstRoundAvgTime) * 100;
      console.log(`📊 Cache Speed Improvement: ${speedImprovement.toFixed(1)}%`);
    });
  });

  describe('📈 Performance Monitoring and Analysis', () => {
    
    test('Response time distribution analysis', async () => {
      await coordinator.initializeSwarm();
      
      const responseTimes = {
        taskCreation: [],
        workflowCreation: [],
        contentValidation: [],
        contentGeneration: []
      };
      
      // Measure task creation times
      for (let i = 0; i < 20; i++) {
        const startTime = performance.now();
        await coordinator.createTask(`Performance test task ${i}`, 'spec', 'medium');
        responseTimes.taskCreation.push(performance.now() - startTime);
      }
      
      // Measure workflow creation times
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await coordinator.createWorkflow(`Performance test workflow ${i}`, `Workflow ${i}`);
        responseTimes.workflowCreation.push(performance.now() - startTime);
      }
      
      // Measure content validation times
      for (let i = 0; i < 15; i++) {
        const startTime = performance.now();
        await coordinator.validate(`Performance test content ${i} with requirements`, 'spec', false);
        responseTimes.contentValidation.push(performance.now() - startTime);
      }
      
      // Measure content generation times
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now();
        await coordinator.generateContent(`Performance test prompt ${i}`, 'spec');
        responseTimes.contentGeneration.push(performance.now() - startTime);
      }
      
      // Analyze response time distributions
      Object.entries(responseTimes).forEach(([operation, times]) => {
        const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
        
        console.log(`📊 ${operation}:`);
        console.log(`   Average: ${avg.toFixed(2)}ms`);
        console.log(`   Min: ${min.toFixed(2)}ms`);
        console.log(`   Max: ${max.toFixed(2)}ms`);
        console.log(`   95th percentile: ${p95.toFixed(2)}ms`);
        
        // Validate performance targets
        expect(avg).toBeLessThan(2000); // Average should be <2s
        expect(p95).toBeLessThan(5000); // 95th percentile should be <5s
      });
    });

    test('Memory usage pattern analysis', async () => {
      await coordinator.initializeSwarm();
      
      const memorySnapshots = [];
      const operations = [];
      
      // Baseline measurement
      memorySnapshots.push({
        operation: 'baseline',
        memory: process.memoryUsage().heapUsed,
        timestamp: Date.now()
      });
      
      // Create workload and measure memory at each step
      for (let i = 0; i < 5; i++) {
        // Create workflow
        const workflow = await coordinator.createWorkflow(`Memory test ${i}`, `Workflow ${i}`);
        memorySnapshots.push({
          operation: `workflow_${i}`,
          memory: process.memoryUsage().heapUsed,
          timestamp: Date.now()
        });
        
        // Add tasks
        for (let j = 0; j < 5; j++) {
          const task = await coordinator.createTask(`Task ${i}-${j}`, 'spec', 'medium');
          await coordinator.addTaskToWorkflow(workflow.id, task);
        }
        
        memorySnapshots.push({
          operation: `tasks_${i}`,
          memory: process.memoryUsage().heapUsed,
          timestamp: Date.now()
        });
        
        // Execute workflow
        await coordinator.executeWorkflow(workflow.id);
        memorySnapshots.push({
          operation: `execute_${i}`,
          memory: process.memoryUsage().heapUsed,
          timestamp: Date.now()
        });
      }
      
      // Force garbage collection and final measurement
      if (global.gc) {
        global.gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      memorySnapshots.push({
        operation: 'final',
        memory: process.memoryUsage().heapUsed,
        timestamp: Date.now()
      });
      
      // Analyze memory growth pattern
      const baselineMemory = memorySnapshots[0].memory;
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].memory;
      const totalGrowth = finalMemory - baselineMemory;
      const totalGrowthMB = totalGrowth / (1024 * 1024);
      
      console.log(`📊 Memory Usage Analysis:`);
      console.log(`   Baseline: ${(baselineMemory / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`   Final: ${(finalMemory / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`   Total Growth: ${totalGrowthMB.toFixed(2)}MB`);
      
      // Validate memory efficiency
      expect(totalGrowthMB).toBeLessThan(75); // Should be well under 100MB target
      
      // Check for memory leaks (no excessive growth)
      const maxSnapshot = memorySnapshots.reduce((max, snap) => 
        snap.memory > max.memory ? snap : max
      );
      const maxGrowthMB = (maxSnapshot.memory - baselineMemory) / (1024 * 1024);
      
      expect(maxGrowthMB).toBeLessThan(100); // Peak usage should not exceed 100MB
      
      console.log(`   Peak Growth: ${maxGrowthMB.toFixed(2)}MB`);
      console.log(`   Memory Efficiency: ${((100 - totalGrowthMB)).toFixed(1)}% under target`);
    });
  });
});