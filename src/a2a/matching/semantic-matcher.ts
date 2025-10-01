/**
 * A2A Semantic Capability Matching with Embeddings
 *
 * Implements semantic capability matching using embeddings, task-to-capability mapping,
 * optimal agent selection algorithms, and load-based routing decisions.
 */

import {
  Capability,
  CapabilityQuery,
  CapabilityMatch,
  MatchReason,
  CapabilityCategory,
  PerformanceMetrics
} from '../capabilities/schema';

export class SemanticCapabilityMatcher {
  private embeddingCache: Map<string, number[]> = new Map();
  private performanceHistory: Map<string, PerformanceMetrics[]> = new Map();

  /**
   * Find matching capabilities using semantic search
   */
  async findMatches(
    query: CapabilityQuery,
    capabilities: Capability[],
    options?: MatchingOptions
  ): Promise<CapabilityMatch[]> {
    const matches: CapabilityMatch[] = [];

    // Generate query embedding if description provided
    let queryVector: number[] | undefined;
    if (query.description) {
      queryVector = await this.generateEmbedding(query.description);
    } else if (query.semanticVector) {
      queryVector = query.semanticVector;
    }

    for (const capability of capabilities) {
      const match = await this.matchCapability(query, capability, queryVector, options);

      if (match.score >= (options?.minScore || 0.5)) {
        matches.push(match);
      }
    }

    // Sort by score descending
    matches.sort((a, b) => b.score - a.score);

    // Apply load balancing if requested
    if (options?.enableLoadBalancing) {
      return this.applyLoadBalancing(matches, options);
    }

    return matches.slice(0, options?.maxResults || 10);
  }

  /**
   * Match a single capability against query
   */
  private async matchCapability(
    query: CapabilityQuery,
    capability: Capability,
    queryVector?: number[],
    options?: MatchingOptions
  ): Promise<CapabilityMatch> {
    const reasons: MatchReason[] = [];
    let totalScore = 0;
    let weightSum = 0;

    // Exact ID match
    if (query.capabilityId && query.capabilityId === capability.id) {
      reasons.push({
        type: 'exact',
        score: 1.0,
        details: 'Exact capability ID match'
      });
      totalScore += 1.0 * 1.0; // weight = 1.0
      weightSum += 1.0;
    }

    // Exact name match
    if (query.name && query.name.toLowerCase() === capability.name.toLowerCase()) {
      reasons.push({
        type: 'exact',
        score: 1.0,
        details: 'Exact name match'
      });
      totalScore += 1.0 * 0.9; // weight = 0.9
      weightSum += 0.9;
    }

    // Alias match
    if (query.name && capability.aliases?.some(alias =>
      alias.toLowerCase() === query.name!.toLowerCase()
    )) {
      reasons.push({
        type: 'alias',
        score: 0.95,
        details: 'Alias match'
      });
      totalScore += 0.95 * 0.8; // weight = 0.8
      weightSum += 0.8;
    }

    // Semantic similarity
    if (queryVector && capability.semanticVector) {
      const semanticScore = this.cosineSimilarity(queryVector, capability.semanticVector);
      reasons.push({
        type: 'semantic',
        score: semanticScore,
        details: `Semantic similarity: ${(semanticScore * 100).toFixed(1)}%`
      });
      totalScore += semanticScore * 0.7; // weight = 0.7
      weightSum += 0.7;
    }

    // Category match
    if (query.category && query.category === capability.category) {
      reasons.push({
        type: 'category',
        score: 0.8,
        details: `Category match: ${capability.category}`
      });
      totalScore += 0.8 * 0.5; // weight = 0.5
      weightSum += 0.5;
    }

    // Tag overlap
    if (query.tags && query.tags.length > 0) {
      const tagOverlap = this.calculateTagOverlap(query.tags, capability.tags);
      if (tagOverlap > 0) {
        reasons.push({
          type: 'category',
          score: tagOverlap,
          details: `Tag overlap: ${(tagOverlap * 100).toFixed(1)}%`
        });
        totalScore += tagOverlap * 0.4; // weight = 0.4
        weightSum += 0.4;
      }
    }

    // Performance constraints
    const performanceScore = this.evaluatePerformanceConstraints(query, capability);
    if (performanceScore > 0) {
      reasons.push({
        type: 'performance',
        score: performanceScore,
        details: 'Meets performance requirements'
      });
      totalScore += performanceScore * 0.6; // weight = 0.6
      weightSum += 0.6;
    }

    // Calculate final score
    const finalScore = weightSum > 0 ? totalScore / weightSum : 0;

    // Determine if adaptation is required
    const adaptationRequired = this.requiresAdaptation(query, capability);
    const adaptations = adaptationRequired ?
      await this.generateAdaptationStrategies(query, capability) : undefined;

    // Estimate performance
    const estimatedPerformance = this.estimatePerformance(capability);

    return {
      capability,
      score: finalScore,
      matchReasons: reasons,
      adaptationRequired,
      adaptations,
      estimatedPerformance
    };
  }

  /**
   * Task-to-capability mapping
   */
  async mapTaskToCapabilities(
    taskDescription: string,
    capabilities: Capability[]
  ): Promise<CapabilityMapping> {
    // Generate task embedding
    const taskEmbedding = await this.generateEmbedding(taskDescription);

    // Extract task requirements
    const requirements = this.extractTaskRequirements(taskDescription);

    // Find matching capabilities
    const query: CapabilityQuery = {
      description: taskDescription,
      semanticVector: taskEmbedding,
      ...requirements
    };

    const matches = await this.findMatches(query, capabilities);

    // Categorize matches
    const primaryCapabilities = matches.filter(m => m.score >= 0.8);
    const secondaryCapabilities = matches.filter(m => m.score >= 0.6 && m.score < 0.8);
    const fallbackCapabilities = matches.filter(m => m.score >= 0.4 && m.score < 0.6);

    return {
      taskDescription,
      taskEmbedding,
      primaryCapabilities,
      secondaryCapabilities,
      fallbackCapabilities,
      recommendedStrategy: this.recommendStrategy(primaryCapabilities, secondaryCapabilities)
    };
  }

  /**
   * Optimal agent selection algorithm
   */
  selectOptimalAgent(
    matches: CapabilityMatch[],
    selectionCriteria?: SelectionCriteria
  ): CapabilityMatch | null {
    if (matches.length === 0) {
      return null;
    }

    const criteria = {
      prioritizeReliability: true,
      prioritizePerformance: true,
      prioritizeAvailability: true,
      maxLatency: Infinity,
      minReliability: 0.8,
      ...selectionCriteria
    };

    // Filter by hard constraints
    let candidates = matches.filter(match => {
      const capability = match.capability;

      // Reliability threshold
      if (capability.reliability < criteria.minReliability) {
        return false;
      }

      // Latency threshold
      if (capability.metrics?.averageLatency &&
          capability.metrics.averageLatency > criteria.maxLatency) {
        return false;
      }

      return true;
    });

    if (candidates.length === 0) {
      return null;
    }

    // Score each candidate
    candidates = candidates.map(candidate => {
      let selectionScore = candidate.score;

      if (criteria.prioritizeReliability) {
        selectionScore *= candidate.capability.reliability;
      }

      if (criteria.prioritizePerformance && candidate.capability.metrics) {
        const perfScore = this.calculatePerformanceScore(candidate.capability.metrics);
        selectionScore *= perfScore;
      }

      if (criteria.prioritizeAvailability) {
        const availScore = this.calculateAvailabilityScore(candidate.capability);
        selectionScore *= availScore;
      }

      return {
        ...candidate,
        score: selectionScore
      };
    });

    // Sort and return best
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  }

  /**
   * Load-based routing decision
   */
  private applyLoadBalancing(
    matches: CapabilityMatch[],
    options?: MatchingOptions
  ): CapabilityMatch[] {
    const strategy = options?.loadBalancingStrategy || 'round-robin';

    switch (strategy) {
      case 'round-robin':
        return this.roundRobinBalance(matches);
      case 'least-loaded':
        return this.leastLoadedBalance(matches);
      case 'weighted':
        return this.weightedBalance(matches);
      case 'performance-based':
        return this.performanceBasedBalance(matches);
      default:
        return matches;
    }
  }

  /**
   * Round-robin load balancing
   */
  private roundRobinBalance(matches: CapabilityMatch[]): CapabilityMatch[] {
    // Rotate matches based on round-robin counter
    // Implementation would track counter in state
    return matches;
  }

  /**
   * Least-loaded load balancing
   */
  private leastLoadedBalance(matches: CapabilityMatch[]): CapabilityMatch[] {
    return matches.sort((a, b) => {
      const loadA = this.calculateCurrentLoad(a.capability);
      const loadB = this.calculateCurrentLoad(b.capability);
      return loadA - loadB;
    });
  }

  /**
   * Weighted load balancing
   */
  private weightedBalance(matches: CapabilityMatch[]): CapabilityMatch[] {
    return matches.sort((a, b) => {
      const weightA = a.score * a.capability.reliability;
      const weightB = b.score * b.capability.reliability;
      return weightB - weightA;
    });
  }

  /**
   * Performance-based load balancing
   */
  private performanceBasedBalance(matches: CapabilityMatch[]): CapabilityMatch[] {
    return matches.sort((a, b) => {
      const perfA = this.calculatePerformanceScore(a.capability.metrics || {});
      const perfB = this.calculatePerformanceScore(b.capability.metrics || {});
      return perfB - perfA;
    });
  }

  /**
   * Generate embedding for text
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    // Check cache
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    // Generate embedding using sentence transformers or similar
    // For now, return a mock embedding
    const embedding = this.mockEmbedding(text);

    this.embeddingCache.set(text, embedding);
    return embedding;
  }

  /**
   * Mock embedding generation (replace with actual implementation)
   */
  private mockEmbedding(text: string): number[] {
    // Simple hash-based mock embedding
    const dimension = 384; // Common embedding dimension
    const embedding = new Array(dimension).fill(0);

    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      embedding[i % dimension] += charCode / 1000;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  /**
   * Calculate cosine similarity between vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      magnitudeA += a[i] * a[i];
      magnitudeB += b[i] * b[i];
    }

    const magnitude = Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Calculate tag overlap score
   */
  private calculateTagOverlap(queryTags: string[], capabilityTags: string[]): number {
    const querySet = new Set(queryTags.map(t => t.toLowerCase()));
    const capSet = new Set(capabilityTags.map(t => t.toLowerCase()));

    let overlap = 0;
    for (const tag of querySet) {
      if (capSet.has(tag)) {
        overlap++;
      }
    }

    return overlap / Math.max(querySet.size, 1);
  }

  /**
   * Evaluate performance constraints
   */
  private evaluatePerformanceConstraints(
    query: CapabilityQuery,
    capability: Capability
  ): number {
    let score = 1.0;

    // Check reliability
    if (query.minReliability && capability.reliability < query.minReliability) {
      score *= capability.reliability / query.minReliability;
    }

    // Check latency
    if (query.maxLatency && capability.metrics?.averageLatency) {
      if (capability.metrics.averageLatency > query.maxLatency) {
        score *= query.maxLatency / capability.metrics.averageLatency;
      }
    }

    // Check throughput
    if (query.minThroughput && capability.metrics?.throughput) {
      if (capability.metrics.throughput < query.minThroughput) {
        score *= capability.metrics.throughput / query.minThroughput;
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Check if adaptation is required
   */
  private requiresAdaptation(query: CapabilityQuery, capability: Capability): boolean {
    // Check platform compatibility
    if (query.requiredPlatforms &&
        !query.requiredPlatforms.includes(capability.provider.platform)) {
      return true;
    }

    // Check if excluded platform
    if (query.excludedPlatforms?.includes(capability.provider.platform)) {
      return true;
    }

    return false;
  }

  /**
   * Generate adaptation strategies
   */
  private async generateAdaptationStrategies(
    query: CapabilityQuery,
    capability: Capability
  ): Promise<any[]> {
    // Return empty array for now
    // Implementation would analyze differences and generate strategies
    return [];
  }

  /**
   * Estimate performance
   */
  private estimatePerformance(capability: Capability): PerformanceMetrics {
    // Return current metrics or historical average
    return capability.metrics || {
      averageLatency: 100,
      throughput: 10,
      successRate: capability.reliability,
      errorRate: 1 - capability.reliability
    };
  }

  /**
   * Extract task requirements from description
   */
  private extractTaskRequirements(description: string): Partial<CapabilityQuery> {
    const requirements: Partial<CapabilityQuery> = {};

    // Simple keyword extraction
    const lowerDesc = description.toLowerCase();

    if (lowerDesc.includes('fast') || lowerDesc.includes('quick')) {
      requirements.maxLatency = 100;
    }

    if (lowerDesc.includes('reliable') || lowerDesc.includes('stable')) {
      requirements.minReliability = 0.95;
    }

    return requirements;
  }

  /**
   * Recommend execution strategy
   */
  private recommendStrategy(
    primary: CapabilityMatch[],
    secondary: CapabilityMatch[]
  ): ExecutionStrategy {
    if (primary.length >= 2) {
      return 'parallel';
    } else if (primary.length === 1 && secondary.length > 0) {
      return 'fallback';
    } else if (primary.length === 1) {
      return 'single';
    } else {
      return 'aggregate';
    }
  }

  /**
   * Calculate performance score
   */
  private calculatePerformanceScore(metrics: PerformanceMetrics): number {
    let score = 1.0;

    if (metrics.successRate) {
      score *= metrics.successRate;
    }

    if (metrics.averageLatency) {
      // Lower latency is better, normalize to 0-1
      const latencyScore = Math.max(0, 1 - metrics.averageLatency / 1000);
      score *= latencyScore;
    }

    return score;
  }

  /**
   * Calculate availability score
   */
  private calculateAvailabilityScore(capability: Capability): number {
    // Check current load and health
    const currentLoad = this.calculateCurrentLoad(capability);
    const maxLoad = capability.constraints?.maxConcurrency || 100;

    return Math.max(0, 1 - currentLoad / maxLoad);
  }

  /**
   * Calculate current load
   */
  private calculateCurrentLoad(capability: Capability): number {
    // Would track active requests in production
    return 0;
  }
}

interface MatchingOptions {
  minScore?: number;
  maxResults?: number;
  enableLoadBalancing?: boolean;
  loadBalancingStrategy?: 'round-robin' | 'least-loaded' | 'weighted' | 'performance-based';
}

interface CapabilityMapping {
  taskDescription: string;
  taskEmbedding: number[];
  primaryCapabilities: CapabilityMatch[];
  secondaryCapabilities: CapabilityMatch[];
  fallbackCapabilities: CapabilityMatch[];
  recommendedStrategy: ExecutionStrategy;
}

type ExecutionStrategy = 'single' | 'parallel' | 'fallback' | 'aggregate';

interface SelectionCriteria {
  prioritizeReliability?: boolean;
  prioritizePerformance?: boolean;
  prioritizeAvailability?: boolean;
  maxLatency?: number;
  minReliability?: number;
}
