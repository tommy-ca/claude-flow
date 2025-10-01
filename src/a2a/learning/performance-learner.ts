/**
 * A2A Performance Learning System
 *
 * Tracks agent performance by task type, learns optimal agent selection patterns,
 * adapts to new capabilities, and implements performance-based routing optimization.
 * Integrates with claude-flow's neural infrastructure.
 */

import {
  Capability,
  PerformanceMetrics,
  CapabilityMatch
} from '../capabilities/schema';

export class PerformanceLearner {
  private performanceHistory: Map<string, PerformanceRecord[]> = new Map();
  private selectionPatterns: Map<string, SelectionPattern> = new Map();
  private learningRate: number = 0.1;
  private explorationRate: number = 0.2;

  /**
   * Track agent performance for a task
   */
  async trackPerformance(
    taskType: string,
    capabilityId: string,
    metrics: PerformanceMetrics,
    success: boolean,
    context?: PerformanceContext
  ): Promise<void> {
    const record: PerformanceRecord = {
      taskType,
      capabilityId,
      metrics,
      success,
      context,
      timestamp: Date.now()
    };

    // Add to history
    const key = `${taskType}:${capabilityId}`;
    const history = this.performanceHistory.get(key) || [];
    history.push(record);

    // Keep last 100 records
    if (history.length > 100) {
      history.shift();
    }

    this.performanceHistory.set(key, history);

    // Update learning patterns
    await this.updateLearningPatterns(taskType, capabilityId, record);
  }

  /**
   * Learn optimal agent selection patterns
   */
  async learnSelectionPattern(
    taskType: string,
    successfulSelections: Array<{ capabilityId: string; score: number }>
  ): Promise<SelectionPattern> {
    const pattern = this.selectionPatterns.get(taskType) || {
      taskType,
      preferredCapabilities: new Map(),
      averageSuccess: 0,
      totalAttempts: 0,
      lastUpdated: Date.now()
    };

    // Update preferences based on successful selections
    for (const selection of successfulSelections) {
      const current = pattern.preferredCapabilities.get(selection.capabilityId) || 0;
      const updated = current + (this.learningRate * (selection.score - current));
      pattern.preferredCapabilities.set(selection.capabilityId, updated);
    }

    pattern.lastUpdated = Date.now();
    this.selectionPatterns.set(taskType, pattern);

    return pattern;
  }

  /**
   * Adapt to new agent capabilities
   */
  async adaptToNewCapability(
    newCapability: Capability,
    similarTaskTypes: string[]
  ): Promise<AdaptationResult> {
    const adaptationResult: AdaptationResult = {
      capabilityId: newCapability.id,
      recommendedTaskTypes: [],
      initialScore: 0.5, // Neutral starting point
      explorationPriority: 'high'
    };

    // Find similar capabilities and their performance
    for (const taskType of similarTaskTypes) {
      const pattern = this.selectionPatterns.get(taskType);

      if (!pattern) {
        // New task type - prioritize exploration
        adaptationResult.recommendedTaskTypes.push({
          taskType,
          confidence: 0.5,
          reason: 'New task type - exploration needed'
        });
        continue;
      }

      // Calculate similarity to existing successful capabilities
      const similarity = await this.calculateCapabilitySimilarity(
        newCapability,
        pattern.preferredCapabilities
      );

      if (similarity > 0.6) {
        adaptationResult.recommendedTaskTypes.push({
          taskType,
          confidence: similarity,
          reason: 'Similar to successful capabilities'
        });

        // Initialize with transfer learning
        this.selectionPatterns.set(taskType, {
          ...pattern,
          preferredCapabilities: new Map([
            ...pattern.preferredCapabilities,
            [newCapability.id, similarity * 0.8] // Conservative initial score
          ])
        });
      }
    }

    return adaptationResult;
  }

  /**
   * Performance-based routing optimization
   */
  async optimizeRouting(
    taskType: string,
    availableCapabilities: Capability[]
  ): Promise<RoutingDecision> {
    const pattern = this.selectionPatterns.get(taskType);

    if (!pattern || Math.random() < this.explorationRate) {
      // Exploration: try different capabilities
      return this.exploratoryRouting(taskType, availableCapabilities);
    }

    // Exploitation: use learned patterns
    return this.exploitativeRouting(taskType, availableCapabilities, pattern);
  }

  /**
   * Get performance statistics for a capability
   */
  getPerformanceStats(
    capabilityId: string,
    taskType?: string
  ): PerformanceStatistics {
    const allRecords: PerformanceRecord[] = [];

    // Gather relevant records
    for (const [key, records] of this.performanceHistory.entries()) {
      if (key.includes(capabilityId)) {
        if (!taskType || key.startsWith(taskType)) {
          allRecords.push(...records);
        }
      }
    }

    if (allRecords.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageLatency: 0,
        averageThroughput: 0,
        reliability: 0
      };
    }

    // Calculate statistics
    const successCount = allRecords.filter(r => r.success).length;
    const totalLatency = allRecords.reduce((sum, r) =>
      sum + (r.metrics.averageLatency || 0), 0
    );
    const totalThroughput = allRecords.reduce((sum, r) =>
      sum + (r.metrics.throughput || 0), 0
    );

    return {
      totalExecutions: allRecords.length,
      successRate: successCount / allRecords.length,
      averageLatency: totalLatency / allRecords.length,
      averageThroughput: totalThroughput / allRecords.length,
      reliability: successCount / allRecords.length,
      recentTrend: this.calculateTrend(allRecords)
    };
  }

  /**
   * Predict performance for a capability on a task
   */
  async predictPerformance(
    taskType: string,
    capabilityId: string
  ): Promise<PredictedPerformance> {
    // Get historical performance
    const stats = this.getPerformanceStats(capabilityId, taskType);

    if (stats.totalExecutions === 0) {
      // No history - use capability's stated metrics
      return {
        expectedLatency: 100,
        expectedSuccess: 0.5,
        confidence: 0.3,
        basedOn: 'capability_metrics'
      };
    }

    // Use historical data
    const confidence = Math.min(stats.totalExecutions / 20, 0.95);

    return {
      expectedLatency: stats.averageLatency,
      expectedSuccess: stats.successRate,
      expectedThroughput: stats.averageThroughput,
      confidence,
      basedOn: 'historical_data',
      trend: stats.recentTrend
    };
  }

  /**
   * Compare capabilities for a task
   */
  async compareCapabilities(
    taskType: string,
    capabilities: Capability[]
  ): Promise<CapabilityComparison[]> {
    const comparisons: CapabilityComparison[] = [];

    for (const capability of capabilities) {
      const prediction = await this.predictPerformance(taskType, capability.id);
      const stats = this.getPerformanceStats(capability.id, taskType);

      comparisons.push({
        capability,
        predictedPerformance: prediction,
        historicalStats: stats,
        recommendationScore: this.calculateRecommendationScore(prediction, stats)
      });
    }

    // Sort by recommendation score
    comparisons.sort((a, b) => b.recommendationScore - a.recommendationScore);

    return comparisons;
  }

  /**
   * Update learning patterns based on new performance record
   */
  private async updateLearningPatterns(
    taskType: string,
    capabilityId: string,
    record: PerformanceRecord
  ): Promise<void> {
    const pattern = this.selectionPatterns.get(taskType) || {
      taskType,
      preferredCapabilities: new Map(),
      averageSuccess: 0,
      totalAttempts: 0,
      lastUpdated: Date.now()
    };

    // Update capability preference
    const currentPreference = pattern.preferredCapabilities.get(capabilityId) || 0.5;
    const reward = record.success ? 1.0 : 0.0;
    const performanceScore = this.calculatePerformanceScore(record.metrics);
    const combinedScore = (reward * 0.7) + (performanceScore * 0.3);

    const newPreference = currentPreference +
      this.learningRate * (combinedScore - currentPreference);

    pattern.preferredCapabilities.set(capabilityId, newPreference);

    // Update overall statistics
    pattern.totalAttempts++;
    pattern.averageSuccess =
      (pattern.averageSuccess * (pattern.totalAttempts - 1) + reward) / pattern.totalAttempts;
    pattern.lastUpdated = Date.now();

    this.selectionPatterns.set(taskType, pattern);
  }

  /**
   * Calculate similarity between new capability and existing successful ones
   */
  private async calculateCapabilitySimilarity(
    newCapability: Capability,
    preferredCapabilities: Map<string, number>
  ): Promise<number> {
    // Simple similarity based on category and tags
    let maxSimilarity = 0;

    for (const [capId, score] of preferredCapabilities.entries()) {
      // In practice, would fetch the capability and compare
      // For now, return a mock similarity
      const similarity = 0.7; // Mock value
      maxSimilarity = Math.max(maxSimilarity, similarity * score);
    }

    return maxSimilarity;
  }

  /**
   * Exploratory routing - try different capabilities
   */
  private exploratoryRouting(
    taskType: string,
    availableCapabilities: Capability[]
  ): RoutingDecision {
    // Randomly select a capability (weighted by least tried)
    const stats = availableCapabilities.map(cap => ({
      capability: cap,
      executionCount: this.getPerformanceStats(cap.id, taskType).totalExecutions
    }));

    // Prefer less-tried capabilities
    stats.sort((a, b) => a.executionCount - b.executionCount);

    return {
      selectedCapability: stats[0].capability,
      confidence: 0.5,
      strategy: 'exploration',
      reason: 'Exploring less-tried capability'
    };
  }

  /**
   * Exploitative routing - use learned patterns
   */
  private exploitativeRouting(
    taskType: string,
    availableCapabilities: Capability[],
    pattern: SelectionPattern
  ): RoutingDecision {
    // Select capability with highest learned preference
    let bestCapability: Capability | null = null;
    let bestScore = -1;

    for (const capability of availableCapabilities) {
      const score = pattern.preferredCapabilities.get(capability.id) || 0;
      if (score > bestScore) {
        bestScore = score;
        bestCapability = capability;
      }
    }

    if (!bestCapability) {
      return this.exploratoryRouting(taskType, availableCapabilities);
    }

    return {
      selectedCapability: bestCapability,
      confidence: bestScore,
      strategy: 'exploitation',
      reason: 'Using learned optimal capability'
    };
  }

  /**
   * Calculate performance score from metrics
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 0;
    let weight = 0;

    if (metrics.successRate !== undefined) {
      score += metrics.successRate * 0.4;
      weight += 0.4;
    }

    if (metrics.averageLatency !== undefined) {
      // Lower latency is better, normalize to 0-1
      const latencyScore = Math.max(0, 1 - metrics.averageLatency / 1000);
      score += latencyScore * 0.3;
      weight += 0.3;
    }

    if (metrics.throughput !== undefined) {
      // Higher throughput is better, normalize to 0-1
      const throughputScore = Math.min(1, metrics.throughput / 100);
      score += throughputScore * 0.3;
      weight += 0.3;
    }

    return weight > 0 ? score / weight : 0.5;
  }

  /**
   * Calculate trend from recent records
   */
  private calculateTrend(records: PerformanceRecord[]): 'improving' | 'stable' | 'declining' {
    if (records.length < 10) {
      return 'stable';
    }

    const recentRecords = records.slice(-10);
    const olderRecords = records.slice(-20, -10);

    const recentSuccess = recentRecords.filter(r => r.success).length / recentRecords.length;
    const olderSuccess = olderRecords.filter(r => r.success).length / olderRecords.length;

    if (recentSuccess > olderSuccess + 0.1) return 'improving';
    if (recentSuccess < olderSuccess - 0.1) return 'declining';
    return 'stable';
  }

  /**
   * Calculate recommendation score
   */
  private calculateRecommendationScore(
    prediction: PredictedPerformance,
    stats: PerformanceStatistics
  ): number {
    let score = prediction.expectedSuccess * 0.5;

    // Factor in confidence
    score *= (0.5 + prediction.confidence * 0.5);

    // Factor in trend
    if (stats.recentTrend === 'improving') {
      score *= 1.1;
    } else if (stats.recentTrend === 'declining') {
      score *= 0.9;
    }

    return score;
  }
}

interface PerformanceRecord {
  taskType: string;
  capabilityId: string;
  metrics: PerformanceMetrics;
  success: boolean;
  context?: PerformanceContext;
  timestamp: number;
}

interface PerformanceContext {
  complexity?: 'low' | 'medium' | 'high';
  dataSize?: number;
  concurrentTasks?: number;
  [key: string]: any;
}

interface SelectionPattern {
  taskType: string;
  preferredCapabilities: Map<string, number>;
  averageSuccess: number;
  totalAttempts: number;
  lastUpdated: number;
}

interface AdaptationResult {
  capabilityId: string;
  recommendedTaskTypes: Array<{
    taskType: string;
    confidence: number;
    reason: string;
  }>;
  initialScore: number;
  explorationPriority: 'low' | 'medium' | 'high';
}

interface RoutingDecision {
  selectedCapability: Capability;
  confidence: number;
  strategy: 'exploration' | 'exploitation';
  reason: string;
}

interface PerformanceStatistics {
  totalExecutions: number;
  successRate: number;
  averageLatency: number;
  averageThroughput: number;
  reliability: number;
  recentTrend?: 'improving' | 'stable' | 'declining';
}

interface PredictedPerformance {
  expectedLatency: number;
  expectedSuccess: number;
  expectedThroughput?: number;
  confidence: number;
  basedOn: 'capability_metrics' | 'historical_data' | 'similar_tasks';
  trend?: 'improving' | 'stable' | 'declining';
}

interface CapabilityComparison {
  capability: Capability;
  predictedPerformance: PredictedPerformance;
  historicalStats: PerformanceStatistics;
  recommendationScore: number;
}
