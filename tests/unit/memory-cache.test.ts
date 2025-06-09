/**
 * Unit tests for the MemoryCache implementation
 * 
 * This file tests the memory-based caching functionality, including
 * setting, getting, invalidating, and TTL expiration.
 * 
 * @group unit
 * @group cache
 */

import { MemoryCache } from '../../src/cache';

describe('MemoryCache', () => {
  // Mock Date.now for time-based tests
  const originalDateNow = Date.now;
  let currentTime = 1622000000000; // Fixed timestamp for testing
  const cacheInstances: MemoryCache[] = [];
  
  beforeEach(() => {
    // Mock Date.now to return controlled time
    Date.now = jest.fn(() => currentTime);
  });
  
  afterEach(() => {
    // Destroy all cache instances to clean up timers
    cacheInstances.forEach(cache => cache.destroy());
    cacheInstances.length = 0;
    
    // Restore original Date.now
    Date.now = originalDateNow;
  });
  
  describe('Constructor', () => {
    it('should create a cache with default options', () => {
      const cache = new MemoryCache();
      expect(cache).toBeInstanceOf(MemoryCache);
    });
    
    it('should create a cache with custom TTL', () => {
      const cache = new MemoryCache({ ttl: 60000 });
      expect(cache).toBeInstanceOf(MemoryCache);
    });
    
    it('should create a cache with custom max items', () => {
      const cache = new MemoryCache({ maxItems: 100 });
      expect(cache).toBeInstanceOf(MemoryCache);
    });
    
    it('should create a cache with ETag support', () => {
      const cache = new MemoryCache({ useEtag: true });
      expect(cache).toBeInstanceOf(MemoryCache);
    });
  });
  
  describe('set and get', () => {
    it('should store and retrieve a value', () => {
      const cache = new MemoryCache();
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      cache.set('default', key, value);
      const result = cache.get('default', key);
      
      expect(result?.value).toEqual(value);
    });
    
    it('should store values in namespaces', () => {
      const cache = new MemoryCache();
      const namespace = 'namespace1';
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      cache.set(namespace, key, value);
      const result = cache.get(namespace, key);
      
      expect(result?.value).toEqual(value);
    });
    
    it('should not retrieve values from different namespaces', () => {
      const cache = new MemoryCache();
      const key = 'test-key';
      const value1 = { data: 'value1' };
      const value2 = { data: 'value2' };
      
      cache.set('namespace1', key, value1);
      cache.set('namespace2', key, value2);
      
      expect(cache.get('namespace1', key)?.value).toEqual(value1);
      expect(cache.get('namespace2', key)?.value).toEqual(value2);
      expect(cache.get('default', key)).toBeUndefined();
    });
    
    it('should respect TTL for cached items', () => {
      const ttl = 1000; // 1 second
      const cache = new MemoryCache({ ttl });
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      // Set value at current time
      cache.set('default', key, value);
      
      // Item should be available immediately
      expect(cache.get('default', key)?.value).toEqual(value);
      
      // Advance time by half the TTL
      currentTime += ttl / 2;
      
      // Item should still be available
      expect(cache.get('default', key)?.value).toEqual(value);
      
      // Advance time past TTL
      currentTime += ttl;
      
      // Item should be expired
      expect(cache.get('default', key)).toBeUndefined();
    });
    
    it('should respect custom TTL for specific items', () => {
      const defaultTtl = 1000; // 1 second
      const customTtl = 5000; // 5 seconds
      const cache = new MemoryCache({ ttl: defaultTtl });
      
      const key1 = 'key1';
      const key2 = 'key2';
      const value = { data: 'test-value' };
      
      // Set both values, one with default TTL, one with custom TTL
      cache.set('default', key1, value);
      cache.set('default', key2, value, customTtl);
      
      // Both should be available immediately
      expect(cache.get('default', key1)?.value).toEqual(value);
      expect(cache.get('default', key2)?.value).toEqual(value);
      
      // Advance time past default TTL
      currentTime += defaultTtl + 100;
      
      // Key1 should be expired, key2 should still be available
      expect(cache.get('default', key1)).toBeUndefined();
      expect(cache.get('default', key2)?.value).toEqual(value);
      
      // Advance time past custom TTL
      currentTime += customTtl;
      
      // Both should be expired
      expect(cache.get('default', key1)).toBeUndefined();
      expect(cache.get('default', key2)).toBeUndefined();
    });
  });
  
  describe('invalidate', () => {
    it('should invalidate a specific key', () => {
      const cache = new MemoryCache();
      const key1 = 'key1';
      const key2 = 'key2';
      const value = { data: 'test-value' };
      
      cache.set('default', key1, value);
      cache.set('default', key2, value);
      
      // Both keys should be available
      expect(cache.get('default', key1)?.value).toEqual(value);
      expect(cache.get('default', key2)?.value).toEqual(value);
      
      // Invalidate one key
      cache.invalidate('default', key1);
      
      // Key1 should be invalidated, key2 should still be available
      expect(cache.get('default', key1)).toBeUndefined();
      expect(cache.get('default', key2)?.value).toEqual(value);
    });
    
    it('should invalidate keys in a specific namespace', () => {
      const cache = new MemoryCache();
      const namespace1 = 'namespace1';
      const namespace2 = 'namespace2';
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      cache.set(namespace1, key, value);
      cache.set(namespace2, key, value);
      
      // Both namespaced keys should be available
      expect(cache.get(namespace1, key)?.value).toEqual(value);
      expect(cache.get(namespace2, key)?.value).toEqual(value);
      
      // Invalidate one namespace
      cache.invalidateNamespace(namespace1);
      
      // Key in namespace1 should be invalidated, namespace2 should be intact
      expect(cache.get(namespace1, key)).toBeUndefined();
      expect(cache.get(namespace2, key)?.value).toEqual(value);
    });
    
    it('should invalidate all keys with invalidateAll', () => {
      const cache = new MemoryCache();
      const key1 = 'key1';
      const key2 = 'key2';
      const namespace = 'namespace';
      const value = { data: 'test-value' };
      
      cache.set('default', key1, value);
      cache.set('default', key2, value);
      cache.set(namespace, key1, value);
      
      // All keys should be available
      expect(cache.get('default', key1)?.value).toEqual(value);
      expect(cache.get('default', key2)?.value).toEqual(value);
      expect(cache.get(namespace, key1)?.value).toEqual(value);
      
      // Invalidate all keys
      cache.clear();
      
      // All keys should be invalidated
      expect(cache.get('default', key1)).toBeUndefined();
      expect(cache.get('default', key2)).toBeUndefined();
      expect(cache.get(namespace, key1)).toBeUndefined();
    });
  });
  
  describe('size limiting', () => {
    it('should respect maxItems and remove oldest items first', () => {
      const maxItems = 3;
      const cache = new MemoryCache({ maxItems });
      
      // Add maxItems items
      for (let i = 0; i < maxItems; i++) {
        const key = `key${i}`;
        const value = { data: `value${i}` };
        cache.set('default', key, value);
        
        // Check that all added items are available
        for (let j = 0; j <= i; j++) {
          expect(cache.get('default', `key${j}`)?.value).toEqual({ data: `value${j}` });
        }
      }
      
      // Add one more item (exceeding maxItems)
      cache.set('default', 'key-extra', { data: 'extra' });
      
      // The oldest item should be removed
      expect(cache.get('default', 'key0')).toBeUndefined();
      
      // Newer items should still be available
      expect(cache.get('default', 'key1')?.value).toEqual({ data: 'value1' });
      expect(cache.get('default', 'key2')?.value).toEqual({ data: 'value2' });
      expect(cache.get('default', 'key-extra')?.value).toEqual({ data: 'extra' });
    });
    
    it('should respect global size limit across namespaces', () => {
      const maxItems = 3;
      const cache = new MemoryCache({ maxItems });
      const namespace1 = 'namespace1';
      const namespace2 = 'namespace2';
      
      // Add 2 items to namespace1
      cache.set(namespace1, 'key1', { data: 'value1' });
      cache.set(namespace1, 'key2', { data: 'value2' });
      
      // Add 1 item to namespace2 (total = 3, at limit)
      cache.set(namespace2, 'key1', { data: 'value1' });
      
      // All items should be available (exactly at limit)
      expect(cache.get(namespace1, 'key1')?.value).toEqual({ data: 'value1' });
      expect(cache.get(namespace1, 'key2')?.value).toEqual({ data: 'value2' });
      expect(cache.get(namespace2, 'key1')?.value).toEqual({ data: 'value1' });
      
      // Add one more item (exceeding limit) 
      cache.set(namespace2, 'key2', { data: 'value2' });
      
      // The oldest item (first item in namespace1) should be removed
      expect(cache.get(namespace1, 'key1')).toBeUndefined();
      expect(cache.get(namespace1, 'key2')?.value).toEqual({ data: 'value2' });
      expect(cache.get(namespace2, 'key1')?.value).toEqual({ data: 'value1' });
      expect(cache.get(namespace2, 'key2')?.value).toEqual({ data: 'value2' });
    });
  });
  
  describe('ETag support', () => {
    it('should generate and store ETags when useEtag is enabled', () => {
      const cache = new MemoryCache({ useEtag: true });
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      cache.set('default', key, value);
      const result = cache.get('default', key);
      
      expect(result?.value).toEqual(value);
      expect(result).toHaveProperty('etag');
      expect(typeof result?.etag).toBe('string');
    });
    
    it('should return undefined for both value and etag when key not found', () => {
      const cache = new MemoryCache({ useEtag: true });
      const key = 'non-existent-key';
      
      const result = cache.get('default', key);
      
      expect(result).toBeUndefined();
    });
    
    it('should generate the same ETag for the same value', () => {
      const cache = new MemoryCache({ useEtag: true });
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      cache.set('default', key, value);
      const result1 = cache.get('default', key);
      
      // Set the same value again
      cache.set('default', key, { ...value });
      const result2 = cache.get('default', key);
      
      expect(result1?.etag).toBe(result2?.etag);
    });
    
    it('should generate different ETags for different values', () => {
      const cache = new MemoryCache({ useEtag: true });
      const key = 'test-key';
      
      cache.set('default', key, { data: 'value1' });
      const result1 = cache.get('default', key);
      
      // Set a different value
      cache.set('default', key, { data: 'value2' });
      const result2 = cache.get('default', key);
      
      expect(result1?.etag).not.toBe(result2?.etag);
    });
  });
  
  describe('key existence', () => {
    it('should return value for existing keys', () => {
      const cache = new MemoryCache();
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      cache.set('default', key, value);
      
      expect(cache.get('default', key)).toBeDefined();
    });
    
    it('should return undefined for non-existent keys', () => {
      const cache = new MemoryCache();
      const key = 'non-existent-key';
      
      expect(cache.get('default', key)).toBeUndefined();
    });
    
    it('should return undefined for expired keys', () => {
      const ttl = 1000; // 1 second
      const cache = new MemoryCache({ ttl });
      const key = 'test-key';
      const value = { data: 'test-value' };
      
      cache.set('default', key, value);
      
      // Key should exist initially
      expect(cache.get('default', key)).toBeDefined();
      
      // Advance time past TTL
      currentTime += ttl + 100;
      
      // Key should be considered non-existent after expiration
      expect(cache.get('default', key)).toBeUndefined();
    });
  });
});
