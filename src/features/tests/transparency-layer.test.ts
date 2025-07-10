import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TransparencyLayer } from '../core/transparency-layer';
import { TransparencyEvent, TransparencyEventType } from '../types';

describe('TransparencyLayer', () => {
  let transparencyLayer: TransparencyLayer;

  beforeEach(() => {
    transparencyLayer = new TransparencyLayer();
  });

  describe('log', () => {
    it('should log an event', () => {
      const event: TransparencyEvent = {
        type: TransparencyEventType.FEATURE_REGISTERED,
        featureId: 'test-feature',
        timestamp: new Date(),
        data: { test: 'data' }
      };

      transparencyLayer.log(event);
      
      const history = transparencyLayer.getHistory();
      expect(history).toContainEqual(event);
    });
  });

  describe('subscribe', () => {
    it('should notify subscribers of events', () => {
      const callback = jest.fn();
      transparencyLayer.subscribe(callback);

      const event: TransparencyEvent = {
        type: TransparencyEventType.FEATURE_STATE_CHANGE,
        featureId: 'test-feature',
        timestamp: new Date(),
        data: { newState: 'active' }
      };

      transparencyLayer.log(event);
      
      expect(callback).toHaveBeenCalledWith(event);
    });

    it('should return unsubscribe function', () => {
      const callback = jest.fn();
      const unsubscribe = transparencyLayer.subscribe(callback);

      unsubscribe();

      const event: TransparencyEvent = {
        type: TransparencyEventType.FEATURE_LOG,
        featureId: 'test-feature',
        timestamp: new Date()
      };

      transparencyLayer.log(event);
      
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      transparencyLayer.subscribe(callback1);
      transparencyLayer.subscribe(callback2);

      const event: TransparencyEvent = {
        type: TransparencyEventType.FEATURE_ERROR,
        featureId: 'test-feature',
        timestamp: new Date(),
        error: new Error('Test error')
      };

      transparencyLayer.log(event);
      
      expect(callback1).toHaveBeenCalledWith(event);
      expect(callback2).toHaveBeenCalledWith(event);
    });
  });

  describe('getHistory', () => {
    beforeEach(() => {
      const events = [
        {
          type: TransparencyEventType.FEATURE_REGISTERED,
          featureId: 'feature1',
          timestamp: new Date()
        },
        {
          type: TransparencyEventType.FEATURE_STATE_CHANGE,
          featureId: 'feature1',
          timestamp: new Date()
        },
        {
          type: TransparencyEventType.FEATURE_REGISTERED,
          featureId: 'feature2',
          timestamp: new Date()
        }
      ];

      events.forEach(event => transparencyLayer.log(event));
    });

    it('should return all events when no filter provided', () => {
      const history = transparencyLayer.getHistory();
      expect(history.length).toBe(3);
    });

    it('should filter events by featureId', () => {
      const history = transparencyLayer.getHistory('feature1');
      expect(history.length).toBe(2);
      expect(history.every(e => e.featureId === 'feature1')).toBe(true);
    });

    it('should limit results when limit provided', () => {
      const history = transparencyLayer.getHistory(undefined, 2);
      expect(history.length).toBe(2);
    });

    it('should apply both filter and limit', () => {
      const history = transparencyLayer.getHistory('feature1', 1);
      expect(history.length).toBe(1);
      expect(history[0].featureId).toBe('feature1');
    });
  });

  describe('clear', () => {
    beforeEach(() => {
      const events = [
        {
          type: TransparencyEventType.FEATURE_REGISTERED,
          featureId: 'feature1',
          timestamp: new Date()
        },
        {
          type: TransparencyEventType.FEATURE_REGISTERED,
          featureId: 'feature2',
          timestamp: new Date()
        }
      ];

      events.forEach(event => transparencyLayer.log(event));
    });

    it('should clear all events when no featureId provided', () => {
      transparencyLayer.clear();
      
      const history = transparencyLayer.getHistory();
      expect(history.length).toBe(0);
    });

    it('should clear events for specific featureId', () => {
      transparencyLayer.clear('feature1');
      
      const history = transparencyLayer.getHistory();
      expect(history.length).toBe(1);
      expect(history[0].featureId).toBe('feature2');
    });
  });
});