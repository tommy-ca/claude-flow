import {
  ITransparencyLayer,
  TransparencyEvent
} from '../types/feature-types';

/**
 * Transparency Layer implementation
 * Provides logging and event notification for feature system transparency
 */
export class TransparencyLayer implements ITransparencyLayer {
  private events: TransparencyEvent[] = [];
  private subscribers: Set<(event: TransparencyEvent) => void> = new Set();
  private maxHistorySize: number = 1000;

  constructor(maxHistorySize?: number) {
    if (maxHistorySize) {
      this.maxHistorySize = maxHistorySize;
    }
  }

  log(event: TransparencyEvent): void {
    // Add event to history
    this.events.push(event);

    // Maintain history size limit
    if (this.events.length > this.maxHistorySize) {
      this.events.shift();
    }

    // Notify all subscribers
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in transparency layer subscriber:', error);
      }
    });
  }

  subscribe(callback: (event: TransparencyEvent) => void): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  getHistory(featureId?: string, limit?: number): TransparencyEvent[] {
    let events = [...this.events];

    // Filter by featureId if provided
    if (featureId) {
      events = events.filter(event => event.featureId === featureId);
    }

    // Apply limit if provided
    if (limit && limit > 0) {
      events = events.slice(-limit);
    }

    return events;
  }

  clear(featureId?: string): void {
    if (featureId) {
      // Clear events for specific feature
      this.events = this.events.filter(event => event.featureId !== featureId);
    } else {
      // Clear all events
      this.events = [];
    }
  }
}