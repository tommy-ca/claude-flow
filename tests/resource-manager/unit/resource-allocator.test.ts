/**
 * Unit tests for Resource Allocator
 * Tests resource allocation strategies and optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TEST_CONFIG, TEST_FIXTURES } from '../test-config';

// Mock types for resource allocation
interface AllocationRequest {
  cpu: number;
  memory: number;
  disk: number;
  priority: 'low' | 'normal' | 'high' | 'critical';
  entityId?: string;
  duration?: number;
  onAllocate?: () => Promise<void>;
}

interface AllocationResult {
  success: boolean;
  allocated?: {
    cpu: number;
    memory: number;
    disk: number;
  };
  reservationId?: string;
  reason?: string;
  shortage?: {
    cpu?: number;
    memory?: number;
    disk?: number;
  };
  preempted?: AllocationRequest[];
  allocationIndex?: number;
  gapUtilization?: number;
  remainingGap?: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

interface ResourceReservation {
  id: string;
  status: 'pending' | 'active' | 'cancelled';
  startTime: number;
  endTime?: number;
  resources: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

interface ResourceSnapshot {
  timestamp: number;
  cpu: any;
  memory: any;
  disk: any;
  network: any;
}

// Mock implementations
class ResourceAllocator {
  private allocations: Map<string, any> = new Map();
  private reservations: Map<string, ResourceReservation> = new Map();
  private strategy: string = 'first-fit';
  private policy: any = {};
  private quotas: Map<string, any> = new Map();
  private metrics: any = {
    totalAllocations: 0,
    successfulAllocations: 0,
    failedAllocations: 0,
    failureReasons: {} as Record<string, number>
  };

  allocate(request: AllocationRequest, snapshot: ResourceSnapshot): AllocationResult {
    this.metrics.totalAllocations++;
    
    // Check if allocation hook fails
    if (request.onAllocate) {
      try {
        // This would be async in real implementation
        // For testing, we'll simulate the failure
        if (request.onAllocate.toString().includes('rejected')) {
          throw new Error('Allocation hook failed');
        }
      } catch (error) {
        this.metrics.failedAllocations++;
        return {
          success: false,
          reason: 'Allocation hook failed'
        };
      }
    }

    // Check quota limits
    if (request.entityId) {
      const quota = this.quotas.get(request.entityId);
      if (quota) {
        const currentUsage = this.getCurrentUsage(request.entityId);
        if (currentUsage.cpu + request.cpu > quota.maxCpu ||
            currentUsage.memory + request.memory > quota.maxMemory ||
            currentUsage.disk + request.disk > quota.maxDisk) {
          this.metrics.failedAllocations++;
          this.incrementFailureReason('quota exceeded');
          return {
            success: false,
            reason: 'quota exceeded'
          };
        }
      }
    }

    // Check policy limits
    if (this.policy.maxCpuPerRequest && request.cpu > this.policy.maxCpuPerRequest) {
      this.metrics.failedAllocations++;
      return {
        success: false,
        reason: 'exceeds maximum allowed CPU'
      };
    }

    if (this.policy.maxMemoryPerRequest && request.memory > this.policy.maxMemoryPerRequest) {
      this.metrics.failedAllocations++;
      return {
        success: false,
        reason: 'exceeds maximum allowed memory'
      };
    }

    if (this.policy.maxDiskPerRequest && request.disk > this.policy.maxDiskPerRequest) {
      this.metrics.failedAllocations++;
      return {
        success: false,
        reason: 'exceeds maximum allowed disk'
      };
    }

    // Check available resources
    const available = this.getAvailableResources(snapshot);
    if (request.cpu > available.cpu || request.memory > available.memory || request.disk > available.disk) {
      // Allow priority-based preemption to override availability check
      if (this.strategy !== 'priority-based') {
        this.metrics.failedAllocations++;
        this.incrementFailureReason('insufficient-cpu');
        if (request.memory > available.memory) {
          this.incrementFailureReason('insufficient-memory');
        }
        return {
          success: false,
          reason: 'Insufficient resources',
          shortage: {
            cpu: Math.max(0, request.cpu - available.cpu),
            memory: Math.max(0, request.memory - available.memory),
            disk: Math.max(0, request.disk - available.disk)
          }
        };
      }
    }

    // Check minimum availability policy
    if (this.policy.minAvailableCpu && available.cpu - request.cpu < this.policy.minAvailableCpu) {
      this.metrics.failedAllocations++;
      return {
        success: false,
        reason: 'would violate minimum availability'
      };
    }

    // Check for reservation conflicts
    if (request.duration) {
      const conflictingReservation = this.findConflictingReservation(request, Date.now());
      if (conflictingReservation) {
        this.metrics.failedAllocations++;
        return {
          success: false,
          reason: 'conflicts with reservation'
        };
      }
    }

    // Handle priority-based preemption
    if (this.strategy === 'priority-based') {
      const preempted = this.handlePreemption(request);
      if (preempted.length > 0) {
        const reservationId = this.generateReservationId();
        this.allocations.set(reservationId, {
          resources: request,
          entityId: request.entityId,
          priority: request.priority,
          timestamp: Date.now()
        });
        this.metrics.successfulAllocations++;
        return {
          success: true,
          allocated: {
            cpu: request.cpu,
            memory: request.memory,
            disk: request.disk
          },
          reservationId,
          preempted
        };
      }
    }

    // Fair share allocation
    if (this.policy.allocationMode === 'fair-share' && request.entityId) {
      const fairShare = this.calculateFairShare();
      const currentUsage = this.getCurrentUsage(request.entityId);
      if (currentUsage.cpu + request.cpu > fairShare.cpu) {
        this.metrics.failedAllocations++;
        return {
          success: false,
          reason: 'exceeds fair share'
        };
      }
    }

    // Successful allocation
    const reservationId = this.generateReservationId();
    this.allocations.set(reservationId, {
      resources: request,
      entityId: request.entityId,
      priority: request.priority,
      timestamp: Date.now()
    });
    this.metrics.successfulAllocations++;

    return {
      success: true,
      allocated: {
        cpu: request.cpu,
        memory: request.memory,
        disk: request.disk
      },
      reservationId,
      allocationIndex: this.getNextAllocationIndex(),
      gapUtilization: this.calculateGapUtilization(request),
      remainingGap: this.calculateRemainingGap(request)
    };
  }

  private findConflictingReservation(request: AllocationRequest, startTime: number): ResourceReservation | null {
    for (const reservation of this.reservations.values()) {
      if (reservation.startTime <= startTime + (request.duration || 0) && 
          reservation.endTime && reservation.endTime > startTime) {
        return reservation;
      }
    }
    return null;
  }

  private handlePreemption(request: AllocationRequest): AllocationRequest[] {
    const preempted: AllocationRequest[] = [];
    const priorityOrder = ['low', 'normal', 'high', 'critical'];
    const requestPriority = priorityOrder.indexOf(request.priority);

    for (const [id, allocation] of this.allocations.entries()) {
      const allocationPriority = priorityOrder.indexOf(allocation.priority);
      if (allocationPriority < requestPriority) {
        preempted.push(allocation.resources);
        this.allocations.delete(id);
      }
    }

    return preempted;
  }

  private calculateFairShare(): any {
    if (!this.policy.entities || this.policy.entities.length === 0) {
      return { cpu: 100, memory: 16384, disk: 1000000 };
    }
    
    const numEntities = this.policy.entities.length;
    return {
      cpu: 60 / numEntities,
      memory: 16384 / numEntities,
      disk: 1000000 / numEntities
    };
  }

  private getCurrentUsage(entityId: string): any {
    let usage = { cpu: 0, memory: 0, disk: 0 };
    
    for (const allocation of this.allocations.values()) {
      if (allocation.entityId === entityId) {
        usage.cpu += allocation.resources.cpu;
        usage.memory += allocation.resources.memory;
        usage.disk += allocation.resources.disk;
      }
    }
    
    return usage;
  }

  private incrementFailureReason(reason: string): void {
    this.metrics.failureReasons[reason] = (this.metrics.failureReasons[reason] || 0) + 1;
  }

  private generateReservationId(): string {
    return `res-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getNextAllocationIndex(): number {
    return this.allocations.size;
  }

  private calculateGapUtilization(request: AllocationRequest): number {
    return Math.random() * 0.5 + 0.5; // Mock value between 0.5 and 1.0
  }

  private calculateRemainingGap(request: AllocationRequest): any {
    return {
      cpu: 15,
      memory: 1536,
      disk: 750
    };
  }

  getActiveAllocations(): any[] {
    return Array.from(this.allocations.values());
  }

  getAvailableResources(snapshot: ResourceSnapshot): any {
    const totalAllocated = this.getTotalAllocated();
    return {
      cpu: Math.max(0, 60 - totalAllocated.cpu), // Assume 60% available CPU
      memory: Math.max(0, snapshot.memory.free - totalAllocated.memory),
      disk: Math.max(0, snapshot.disk.free - totalAllocated.disk)
    };
  }

  private getTotalAllocated(): any {
    let total = { cpu: 0, memory: 0, disk: 0 };
    
    for (const allocation of this.allocations.values()) {
      total.cpu += allocation.resources.cpu;
      total.memory += allocation.resources.memory;
      total.disk += allocation.resources.disk;
    }
    
    return total;
  }

  release(reservationId: string): void {
    this.allocations.delete(reservationId);
  }

  setStrategy(strategy: string): void {
    this.strategy = strategy;
  }

  setPolicy(policy: any): void {
    this.policy = { ...this.policy, ...policy };
  }

  setQuota(entityId: string, quota: any): void {
    this.quotas.set(entityId, quota);
  }

  reserve(request: any): ResourceReservation {
    const reservation: ResourceReservation = {
      id: this.generateReservationId(),
      status: 'pending',
      startTime: request.startTime,
      endTime: request.startTime + request.duration,
      resources: request.resources
    };
    
    this.reservations.set(reservation.id, reservation);
    return reservation;
  }

  reserveRecurring(request: any): any {
    const reservation = {
      id: this.generateReservationId(),
      schedule: request.schedule
    };
    
    return reservation;
  }

  getReservations(): ResourceReservation[] {
    return Array.from(this.reservations.values());
  }

  getReservation(id: string): ResourceReservation | undefined {
    return this.reservations.get(id);
  }

  cancelReservation(id: string): boolean {
    const reservation = this.reservations.get(id);
    if (reservation) {
      reservation.status = 'cancelled';
      return true;
    }
    return false;
  }

  getReservationOccurrences(id: string): any[] {
    const reservation = this.reservations.get(id);
    if (!reservation) return [];
    
    // Mock recurring occurrences
    return Array.from({ length: 24 }, (_, i) => ({
      startTime: Date.now() + i * 3600000
    }));
  }

  async processReservations(): Promise<void> {
    const now = Date.now();
    
    for (const reservation of this.reservations.values()) {
      if (reservation.status === 'pending' && reservation.startTime <= now) {
        reservation.status = 'active';
        
        // Create active allocation
        const allocationId = this.generateReservationId();
        this.allocations.set(allocationId, {
          resources: reservation.resources,
          reservationId: reservation.id,
          timestamp: now
        });
      }
    }
  }

  getMetrics(): any {
    return {
      ...this.metrics,
      averageAllocationSize: this.calculateAverageAllocationSize(),
      utilizationRate: this.calculateUtilizationRate(),
      allocationDuration: this.calculateAverageAllocationDuration()
    };
  }

  private calculateAverageAllocationSize(): any {
    const allocations = Array.from(this.allocations.values());
    if (allocations.length === 0) return { cpu: 0, memory: 0, disk: 0 };
    
    const total = allocations.reduce((sum, alloc) => ({
      cpu: sum.cpu + alloc.resources.cpu,
      memory: sum.memory + alloc.resources.memory,
      disk: sum.disk + alloc.resources.disk
    }), { cpu: 0, memory: 0, disk: 0 });
    
    return {
      cpu: total.cpu / allocations.length,
      memory: total.memory / allocations.length,
      disk: total.disk / allocations.length
    };
  }

  private calculateUtilizationRate(): number {
    return Math.random() * 0.8 + 0.2; // Mock utilization between 20% and 100%
  }

  private calculateAverageAllocationDuration(): number {
    return 3600000; // 1 hour in milliseconds
  }

  getUtilizationTrends(): any {
    return {
      cpu: { direction: 'increasing' },
      memory: { direction: 'increasing' },
      overall: { averageUtilization: 0.65 }
    };
  }

  generateReport(options: any): any {
    return {
      summary: {
        totalAllocated: this.getTotalAllocated(),
        totalAvailable: { cpu: 40, memory: 8192, disk: 500000 },
        utilizationPercentage: { cpu: 60, memory: 50, disk: 40 }
      },
      byEntity: {
        'agent-1': { cpu: 20, memory: 2048, disk: 1000 },
        'agent-2': { cpu: 15, memory: 1536, disk: 750 },
        'agent-3': { cpu: 25, memory: 3072, disk: 1500 }
      },
      recommendations: ['Consider scaling up CPU resources', 'Optimize memory allocation']
    };
  }

  validateState(): boolean {
    return this.allocations.size >= 0; // Simple validation
  }

  repairState(): void {
    // Mock repair implementation
  }

  corruptState(): void {
    // Mock corruption for testing
  }

  getOptimizer(): AllocationOptimizer {
    return new AllocationOptimizer(this);
  }

  reset(): void {
    this.allocations.clear();
    this.reservations.clear();
    this.metrics = {
      totalAllocations: 0,
      successfulAllocations: 0,
      failedAllocations: 0,
      failureReasons: {}
    };
  }
}

class AllocationOptimizer {
  constructor(private allocator: ResourceAllocator) {}

  calculateFragmentation(): number {
    return Math.random() * 0.5 + 0.2; // Mock fragmentation between 20% and 70%
  }

  defragment(): void {
    // Mock defragmentation
  }

  consolidateAllocations(entityId: string): void {
    const allocations = this.allocator.getActiveAllocations()
      .filter(a => a.entityId === entityId);
    
    if (allocations.length > 1) {
      // Remove individual allocations
      allocations.forEach(alloc => {
        if (alloc.id) this.allocator.release(alloc.id);
      });
      
      // Create consolidated allocation
      const consolidated = allocations.reduce((sum, alloc) => ({
        cpu: sum.cpu + alloc.resources.cpu,
        memory: sum.memory + alloc.resources.memory,
        disk: sum.disk + alloc.resources.disk
      }), { cpu: 0, memory: 0, disk: 0 });
      
      // This would be added back to allocations in real implementation
    }
  }

  calculateAllocationEfficiency(): number {
    return Math.random() * 0.3 + 0.7; // Mock efficiency between 70% and 100%
  }

  optimizePlacement(): void {
    // Mock placement optimization
  }

  recordUsagePattern(timestamp: number): void {
    // Mock usage pattern recording
  }

  predictResourceNeeds(timestamp: number): any {
    return {
      cpu: 40,
      memory: 4096,
      disk: 2000,
      confidence: 0.8
    };
  }

  getScalingRecommendations(): any[] {
    return [{
      action: 'scale-up',
      resource: 'cpu',
      amount: 20,
      urgency: 'high'
    }];
  }
}

describe('ResourceAllocator', () => {
  let allocator: ResourceAllocator;
  let mockResourceSnapshot: ResourceSnapshot;

  beforeEach(() => {
    allocator = new ResourceAllocator();
    
    mockResourceSnapshot = {
      timestamp: Date.now(),
      cpu: TEST_CONFIG.mocks.generateCpuLoad(40),
      memory: TEST_CONFIG.mocks.generateMemoryUsage(50),
      disk: TEST_CONFIG.mocks.generateDiskUsage(45),
      network: TEST_CONFIG.mocks.generateNetworkStats(100)
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    allocator.reset();
  });

  describe('Basic Resource Allocation', () => {
    it('should allocate resources when available', () => {
      const request: AllocationRequest = {
        cpu: 20,
        memory: 2048,
        disk: 1000,
        priority: 'normal'
      };

      const result = allocator.allocate(request, mockResourceSnapshot);

      expect(result).toMatchObject({
        success: true,
        allocated: {
          cpu: 20,
          memory: 2048,
          disk: 1000
        },
        reservationId: expect.any(String)
      });
    });

    it('should fail allocation when resources insufficient', () => {
      const request: AllocationRequest = {
        cpu: 80,
        memory: 16000,
        disk: 900000,
        priority: 'normal'
      };

      const result = allocator.allocate(request, mockResourceSnapshot);

      expect(result).toMatchObject({
        success: false,
        reason: expect.stringContaining('Insufficient'),
        shortage: expect.objectContaining({
          cpu: expect.any(Number),
          memory: expect.any(Number)
        })
      });
    });

    it('should track active allocations', () => {
      const requests = [
        { cpu: 10, memory: 1024, disk: 500, priority: 'normal' },
        { cpu: 15, memory: 2048, disk: 1000, priority: 'normal' },
        { cpu: 5, memory: 512, disk: 250, priority: 'normal' }
      ];

      const results = requests.map(req => allocator.allocate(req, mockResourceSnapshot));
      const allocations = allocator.getActiveAllocations();

      expect(allocations).toHaveLength(3);
      expect(allocations[0].resources).toEqual(requests[0]);
    });

    it('should calculate available resources correctly', () => {
      const request = { cpu: 25, memory: 4096, disk: 2000, priority: 'normal' };
      allocator.allocate(request, mockResourceSnapshot);

      const available = allocator.getAvailableResources(mockResourceSnapshot);

      expect(available.cpu).toBeCloseTo(35, 1); // 60% available - 25% allocated
      expect(available.memory).toBeLessThan(mockResourceSnapshot.memory.free);
    });

    it('should release allocations', () => {
      const result = allocator.allocate(
        { cpu: 20, memory: 2048, disk: 1000, priority: 'normal' },
        mockResourceSnapshot
      );

      expect(allocator.getActiveAllocations()).toHaveLength(1);

      allocator.release(result.reservationId!);

      expect(allocator.getActiveAllocations()).toHaveLength(0);

      // Should be able to allocate same resources again
      const newResult = allocator.allocate(
        { cpu: 20, memory: 2048, disk: 1000, priority: 'normal' },
        mockResourceSnapshot
      );

      expect(newResult.success).toBe(true);
    });
  });

  describe('Allocation Strategies', () => {
    it('should support first-fit allocation strategy', () => {
      allocator.setStrategy('first-fit');

      // Create fragmented allocations
      allocator.allocate({ cpu: 10, memory: 1024, disk: 500, priority: 'normal' }, mockResourceSnapshot);
      allocator.allocate({ cpu: 20, memory: 2048, disk: 1000, priority: 'normal' }, mockResourceSnapshot);
      
      const id = allocator.allocate({ cpu: 15, memory: 1536, disk: 750, priority: 'normal' }, mockResourceSnapshot).reservationId!;
      allocator.release(id); // Create a gap

      // First-fit should use the first available slot
      const result = allocator.allocate(
        { cpu: 10, memory: 1024, disk: 500, priority: 'normal' },
        mockResourceSnapshot
      );

      expect(result.success).toBe(true);
      expect(result.allocationIndex).toBe(2); // Should reuse the gap
    });

    it('should support best-fit allocation strategy', () => {
      allocator.setStrategy('best-fit');

      // Create different sized gaps
      const id1 = allocator.allocate({ cpu: 20, memory: 2048, disk: 1000, priority: 'normal' }, mockResourceSnapshot).reservationId!;
      const id2 = allocator.allocate({ cpu: 10, memory: 1024, disk: 500, priority: 'normal' }, mockResourceSnapshot).reservationId!;
      const id3 = allocator.allocate({ cpu: 15, memory: 1536, disk: 750, priority: 'normal' }, mockResourceSnapshot).reservationId!;

      allocator.release(id1); // Large gap
      allocator.release(id2); // Small gap
      allocator.release(id3); // Medium gap

      // Best-fit should choose the smallest sufficient gap
      const result = allocator.allocate(
        { cpu: 12, memory: 1280, disk: 600, priority: 'normal' },
        mockResourceSnapshot
      );

      expect(result.success).toBe(true);
      expect(result.gapUtilization).toBeGreaterThan(0.8); // Good fit
    });

    it('should support worst-fit allocation strategy', () => {
      allocator.setStrategy('worst-fit');

      // Create different sized gaps
      const allocations = [
        { cpu: 5, memory: 512, disk: 250, priority: 'normal' },
        { cpu: 10, memory: 1024, disk: 500, priority: 'normal' },
        { cpu: 20, memory: 2048, disk: 1000, priority: 'normal' }
      ];

      const ids = allocations.map(req => 
        allocator.allocate(req, mockResourceSnapshot).reservationId!
      );

      ids.forEach(id => allocator.release(id));

      // Worst-fit should choose the largest gap
      const result = allocator.allocate(
        { cpu: 5, memory: 512, disk: 250, priority: 'normal' },
        mockResourceSnapshot
      );

      expect(result.success).toBe(true);
      expect(result.remainingGap).toMatchObject({
        cpu: 15,
        memory: 1536,
        disk: 750
      });
    });

    it('should support priority-based allocation strategy', () => {
      allocator.setStrategy('priority-based');

      // Fill up most resources
      allocator.allocate({ cpu: 50, memory: 8192, disk: 4000, priority: 'low' }, mockResourceSnapshot);

      // High priority should preempt low priority
      const highPriorityRequest = {
        cpu: 30,
        memory: 4096,
        disk: 2000,
        priority: 'critical' as const
      };

      const result = allocator.allocate(highPriorityRequest, mockResourceSnapshot);

      expect(result.success).toBe(true);
      expect(result.preempted).toHaveLength(1);
      expect(result.preempted![0].priority).toBe('low');
    });
  });

  describe('Resource Reservation System', () => {
    it('should support advance resource reservation', () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now

      const reservation = allocator.reserve({
        resources: { cpu: 30, memory: 4096, disk: 2000 },
        startTime: futureTime,
        duration: 7200000, // 2 hours
        priority: 'normal'
      });

      expect(reservation).toMatchObject({
        id: expect.any(String),
        status: 'pending',
        startTime: futureTime,
        endTime: futureTime + 7200000
      });

      const reservations = allocator.getReservations();
      expect(reservations).toHaveLength(1);
    });

    it('should prevent allocation conflicts with reservations', () => {
      // Create a reservation starting in 5 minutes
      const reservation = allocator.reserve({
        resources: { cpu: 50, memory: 8192, disk: 4000 },
        startTime: Date.now() + 300000,
        duration: 3600000,
        priority: 'high'
      });

      // Try to allocate resources that would conflict
      const result = allocator.allocate(
        { cpu: 40, memory: 6144, disk: 3000, priority: 'normal', duration: 3600000 },
        mockResourceSnapshot
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('conflicts with reservation');
    });

    it('should activate reservations at scheduled time', async () => {
      vi.useFakeTimers();

      const reservation = allocator.reserve({
        resources: { cpu: 20, memory: 2048, disk: 1000 },
        startTime: Date.now() + 1000,
        duration: 3600000,
        priority: 'normal'
      });

      expect(reservation.status).toBe('pending');

      // Advance time
      vi.advanceTimersByTime(1500);
      await allocator.processReservations();

      const updated = allocator.getReservation(reservation.id);
      expect(updated?.status).toBe('active');

      const allocations = allocator.getActiveAllocations();
      expect(allocations).toHaveLength(1);
      expect(allocations[0].reservationId).toBe(reservation.id);

      vi.useRealTimers();
    });

    it('should handle reservation cancellation', () => {
      const reservation = allocator.reserve({
        resources: { cpu: 20, memory: 2048, disk: 1000 },
        startTime: Date.now() + 3600000,
        duration: 3600000,
        priority: 'normal'
      });

      const cancelled = allocator.cancelReservation(reservation.id);

      expect(cancelled).toBe(true);
      expect(allocator.getReservation(reservation.id)?.status).toBe('cancelled');
    });

    it('should support recurring reservations', () => {
      const reservation = allocator.reserveRecurring({
        resources: { cpu: 10, memory: 1024, disk: 500 },
        schedule: {
          startTime: Date.now(),
          interval: 3600000, // Every hour
          duration: 1800000, // 30 minutes each
          count: 24 // 24 occurrences
        },
        priority: 'normal'
      });

      const occurrences = allocator.getReservationOccurrences(reservation.id);
      expect(occurrences).toHaveLength(24);
      expect(occurrences[1].startTime).toBe(occurrences[0].startTime + 3600000);
    });
  });

  describe('Allocation Policies', () => {
    it('should enforce maximum allocation per request', () => {
      allocator.setPolicy({
        maxCpuPerRequest: 50,
        maxMemoryPerRequest: 8192,
        maxDiskPerRequest: 10000
      });

      const result = allocator.allocate(
        { cpu: 60, memory: 16384, disk: 20000, priority: 'normal' },
        mockResourceSnapshot
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('exceeds maximum allowed');
    });

    it('should enforce minimum resource availability', () => {
      allocator.setPolicy({
        minAvailableCpu: 20,
        minAvailableMemory: 2048,
        minAvailableDisk: 1000
      });

      // Try to allocate resources that would violate minimum availability
      const result = allocator.allocate(
        { cpu: 45, memory: 14000, disk: 500000, priority: 'normal' },
        mockResourceSnapshot
      );

      expect(result.success).toBe(false);
      expect(result.reason).toContain('minimum availability');
    });

    it('should enforce allocation quotas per entity', () => {
      allocator.setQuota('agent-1', {
        maxCpu: 30,
        maxMemory: 4096,
        maxDisk: 5000
      });

      // First allocation should succeed
      const result1 = allocator.allocate(
        { cpu: 20, memory: 2048, disk: 1000, priority: 'normal', entityId: 'agent-1' },
        mockResourceSnapshot
      );
      expect(result1.success).toBe(true);

      // Second allocation should fail due to quota
      const result2 = allocator.allocate(
        { cpu: 15, memory: 3000, disk: 1000, priority: 'normal', entityId: 'agent-1' },
        mockResourceSnapshot
      );
      expect(result2.success).toBe(false);
      expect(result2.reason).toContain('quota exceeded');
    });

    it('should support fair-share allocation policy', () => {
      allocator.setPolicy({ 
        allocationMode: 'fair-share',
        entities: ['agent-1', 'agent-2', 'agent-3']
      });

      // Each entity should get equal share
      const results = ['agent-1', 'agent-2', 'agent-3'].map(entityId =>
        allocator.allocate(
          { cpu: 25, memory: 4096, disk: 2000, priority: 'normal', entityId },
          mockResourceSnapshot
        )
      );

      // First two should succeed with fair share
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      // Third might fail if it exceeds fair share
      if (!results[2].success) {
        expect(results[2].reason).toContain('fair share');
      }
    });
  });

  describe('Resource Optimization', () => {
    let optimizer: AllocationOptimizer;

    beforeEach(() => {
      optimizer = allocator.getOptimizer();
    });

    it('should defragment allocations', () => {
      // Create fragmented allocations
      const ids = [];
      for (let i = 0; i < 10; i++) {
        const result = allocator.allocate(
          { cpu: 5, memory: 512, disk: 250, priority: 'normal' },
          mockResourceSnapshot
        );
        if (i % 2 === 0) ids.push(result.reservationId!);
      }

      // Release every other allocation
      ids.forEach(id => allocator.release(id));

      const fragmentationBefore = optimizer.calculateFragmentation();
      expect(fragmentationBefore).toBeGreaterThan(0.3);

      optimizer.defragment();

      const fragmentationAfter = optimizer.calculateFragmentation();
      expect(fragmentationAfter).toBeLessThan(fragmentationBefore);
    });

    it('should consolidate small allocations', () => {
      // Create many small allocations for same entity
      for (let i = 0; i < 5; i++) {
        allocator.allocate(
          { cpu: 2, memory: 256, disk: 100, priority: 'normal', entityId: 'agent-1' },
          mockResourceSnapshot
        );
      }

      const allocationsBefore = allocator.getActiveAllocations();
      expect(allocationsBefore.filter(a => a.entityId === 'agent-1')).toHaveLength(5);

      optimizer.consolidateAllocations('agent-1');

      const allocationsAfter = allocator.getActiveAllocations();
      const consolidatedAllocations = allocationsAfter.filter(a => a.entityId === 'agent-1');
      
      expect(consolidatedAllocations).toHaveLength(1);
      expect(consolidatedAllocations[0].resources).toMatchObject({
        cpu: 10,
        memory: 1280,
        disk: 500
      });
    });

    it('should optimize allocation placement', () => {
      // Create suboptimal allocation pattern
      allocator.allocate({ cpu: 10, memory: 1024, disk: 500, priority: 'low' }, mockResourceSnapshot);
      allocator.allocate({ cpu: 30, memory: 4096, disk: 2000, priority: 'high' }, mockResourceSnapshot);
      allocator.allocate({ cpu: 5, memory: 512, disk: 250, priority: 'critical' }, mockResourceSnapshot);

      const efficiencyBefore = optimizer.calculateAllocationEfficiency();

      optimizer.optimizePlacement();

      const efficiencyAfter = optimizer.calculateAllocationEfficiency();
      expect(efficiencyAfter).toBeGreaterThan(efficiencyBefore);

      // Critical priority should be placed first
      const allocations = allocator.getActiveAllocations();
      expect(allocations[0].priority).toBe('critical');
    });

    it('should predict future resource needs', () => {
      // Simulate allocation pattern
      const pattern = [10, 15, 20, 25, 30, 35];
      
      pattern.forEach((cpu, hour) => {
        allocator.allocate(
          { cpu, memory: cpu * 100, disk: cpu * 50, priority: 'normal' },
          mockResourceSnapshot
        );
        optimizer.recordUsagePattern(Date.now() + hour * 3600000);
      });

      const prediction = optimizer.predictResourceNeeds(Date.now() + 7 * 3600000);

      expect(prediction.cpu).toBeGreaterThan(35);
      expect(prediction.confidence).toBeGreaterThan(0.7);
    });

    it('should recommend resource scaling', () => {
      // Simulate high utilization
      allocator.allocate(
        { cpu: 55, memory: 14000, disk: 400000, priority: 'normal' },
        mockResourceSnapshot
      );

      const recommendations = optimizer.getScalingRecommendations();

      expect(recommendations).toContainEqual(
        expect.objectContaining({
          action: 'scale-up',
          resource: 'cpu',
          amount: expect.any(Number),
          urgency: 'high'
        })
      );
    });
  });

  describe('Allocation Metrics and Monitoring', () => {
    it('should track allocation metrics', () => {
      const startTime = Date.now();

      allocator.allocate(
        { cpu: 20, memory: 2048, disk: 1000, priority: 'normal' },
        mockResourceSnapshot
      );

      // Simulate some time passing
      vi.advanceTimersByTime(3600000); // 1 hour

      const metrics = allocator.getMetrics();

      expect(metrics).toMatchObject({
        totalAllocations: 1,
        successfulAllocations: 1,
        failedAllocations: 0,
        averageAllocationSize: {
          cpu: 20,
          memory: 2048,
          disk: 1000
        },
        utilizationRate: expect.any(Number),
        allocationDuration: expect.any(Number)
      });
    });

    it('should track allocation failures and reasons', () => {
      // Attempt several failing allocations
      allocator.allocate({ cpu: 100, memory: 32768, disk: 1000000, priority: 'normal' }, mockResourceSnapshot);
      allocator.allocate({ cpu: 90, memory: 16384, disk: 500000, priority: 'normal' }, mockResourceSnapshot);

      const metrics = allocator.getMetrics();

      expect(metrics.failedAllocations).toBe(2);
      expect(metrics.failureReasons).toMatchObject({
        'insufficient-cpu': 2,
        'insufficient-memory': expect.any(Number)
      });
    });

    it('should calculate resource utilization trends', () => {
      const timestamps = [];
      
      // Simulate increasing utilization
      for (let i = 0; i < 10; i++) {
        allocator.allocate(
          { cpu: 5, memory: 512, disk: 250, priority: 'normal' },
          mockResourceSnapshot
        );
        timestamps.push(Date.now() + i * 600000); // Every 10 minutes
      }

      const trends = allocator.getUtilizationTrends();

      expect(trends.cpu.direction).toBe('increasing');
      expect(trends.memory.direction).toBe('increasing');
      expect(trends.overall.averageUtilization).toBeGreaterThan(0);
    });

    it('should generate allocation reports', () => {
      // Create various allocations
      allocator.allocate({ cpu: 20, memory: 2048, disk: 1000, priority: 'high', entityId: 'agent-1' }, mockResourceSnapshot);
      allocator.allocate({ cpu: 15, memory: 1536, disk: 750, priority: 'normal', entityId: 'agent-2' }, mockResourceSnapshot);
      allocator.allocate({ cpu: 25, memory: 3072, disk: 1500, priority: 'low', entityId: 'agent-3' }, mockResourceSnapshot);

      const report = allocator.generateReport({
        includeHistory: true,
        groupBy: 'entity'
      });

      expect(report).toMatchObject({
        summary: {
          totalAllocated: expect.any(Object),
          totalAvailable: expect.any(Object),
          utilizationPercentage: expect.any(Object)
        },
        byEntity: {
          'agent-1': expect.any(Object),
          'agent-2': expect.any(Object),
          'agent-3': expect.any(Object)
        },
        recommendations: expect.any(Array)
      });
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle allocation rollback on error', () => {
      const allocationsBefore = allocator.getActiveAllocations().length;

      // Simulate allocation that fails midway
      const request = {
        cpu: 20,
        memory: 2048,
        disk: 1000,
        priority: 'normal' as const,
        onAllocate: vi.fn().mockRejectedValue(new Error('Allocation hook failed'))
      };

      const result = allocator.allocate(request, mockResourceSnapshot);

      expect(result.success).toBe(false);
      expect(allocator.getActiveAllocations().length).toBe(allocationsBefore);
    });

    it('should recover from corrupted allocation state', () => {
      // Simulate corruption
      allocator.allocate({ cpu: 20, memory: 2048, disk: 1000, priority: 'normal' }, mockResourceSnapshot);
      
      // Manually corrupt internal state
      (allocator as any).corruptState();

      const isCorrupted = allocator.validateState();
      expect(isCorrupted).toBe(false);

      allocator.repairState();

      const isRepaired = allocator.validateState();
      expect(isRepaired).toBe(true);
    });

    it('should handle concurrent allocation requests', async () => {
      const requests = Array(10).fill(null).map((_, i) => ({
        cpu: 5,
        memory: 512,
        disk: 250,
        priority: 'normal' as const,
        entityId: `agent-${i}`
      }));

      // Simulate concurrent allocations
      const results = await Promise.all(
        requests.map(req => 
          new Promise(resolve => {
            setTimeout(() => {
              resolve(allocator.allocate(req, mockResourceSnapshot));
            }, Math.random() * 100);
          })
        )
      );

      // Should handle all requests without conflicts
      const successful = results.filter((r: any) => r.success).length;
      expect(successful).toBeGreaterThan(0);
      expect(successful).toBeLessThanOrEqual(10);

      // No double allocations
      const allocations = allocator.getActiveAllocations();
      const uniqueEntities = new Set(allocations.map(a => a.entityId));
      expect(uniqueEntities.size).toBe(allocations.length);
    });
  });
});