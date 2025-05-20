/**
 * Tests for the cache module
 */
import { MemoryCache } from '../src/cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache({
      ttl: 1000, // 1 second TTL for testing
      maxItems: 5
    });
  });

  test('should initialize with correct options', () => {
    expect(cache).toBeDefined();
  });

  test('should store and retrieve values', () => {
    const namespace = 'test';
    const key = 'key1';
    const value = { data: 'test-data' };
    
    cache.set(namespace, key, value);
    const retrieved = cache.get(namespace, key);
    
    expect(retrieved).toBeDefined();
    expect(retrieved?.value).toEqual(value);
  });

  test('should respect TTL and expire items', async () => {
    const namespace = 'test';
    const key = 'key1';
    const value = { data: 'test-data' };
    
    cache.set(namespace, key, value);
    
    // Should be available immediately
    expect(cache.get(namespace, key)?.value).toEqual(value);
    
    // Wait for TTL to expire
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    // Should be expired now
    expect(cache.get(namespace, key)).toBeUndefined();
  });

  test('should respect maxItems and evict oldest items', () => {
    const namespace = 'test';
    
    // Set 5 items (maxItems)
    for (let i = 0; i < 5; i++) {
      cache.set(namespace, `key${i}`, { data: `data${i}` });
    }
    
    // Should have all 5 items
    for (let i = 0; i < 5; i++) {
      expect(cache.get(namespace, `key${i}`)?.value).toEqual({ data: `data${i}` });
    }
    
    // Set one more item, which should evict the oldest
    cache.set(namespace, 'key5', { data: 'data5' });
    
    // First item should be evicted
    expect(cache.get(namespace, 'key0')).toBeUndefined();
    
    // But should have the new item
    expect(cache.get(namespace, 'key5')?.value).toEqual({ data: 'data5' });
  });

  test('should delete specific items', () => {
    const namespace = 'test';
    const key = 'key1';
    const value = { data: 'test-data' };
    
    cache.set(namespace, key, value);
    expect(cache.get(namespace, key)?.value).toEqual(value);
    
    // Delete the item
    const deleted = cache.delete(namespace, key);
    expect(deleted).toBe(true);
    
    // Should be gone
    expect(cache.get(namespace, key)).toBeUndefined();
  });

  test('should invalidate namespace', () => {
    const namespace1 = 'test1';
    const namespace2 = 'test2';
    
    // Set items in both namespaces
    cache.set(namespace1, 'key1', { data: 'data1' });
    cache.set(namespace1, 'key2', { data: 'data2' });
    cache.set(namespace2, 'key3', { data: 'data3' });
    
    // All items should be available
    expect(cache.get(namespace1, 'key1')?.value).toEqual({ data: 'data1' });
    expect(cache.get(namespace1, 'key2')?.value).toEqual({ data: 'data2' });
    expect(cache.get(namespace2, 'key3')?.value).toEqual({ data: 'data3' });
    
    // Invalidate namespace1
    const invalidated = cache.invalidateNamespace(namespace1);
    expect(invalidated).toBe(2); // Should have invalidated 2 items
    
    // Items in namespace1 should be gone
    expect(cache.get(namespace1, 'key1')).toBeUndefined();
    expect(cache.get(namespace1, 'key2')).toBeUndefined();
    
    // But namespace2 items should still be there
    expect(cache.get(namespace2, 'key3')?.value).toEqual({ data: 'data3' });
  });

  test('should clear the entire cache', () => {
    const namespace1 = 'test1';
    const namespace2 = 'test2';
    
    // Set items in both namespaces
    cache.set(namespace1, 'key1', { data: 'data1' });
    cache.set(namespace2, 'key2', { data: 'data2' });
    
    // Clear the cache
    cache.clear();
    
    // All items should be gone
    expect(cache.get(namespace1, 'key1')).toBeUndefined();
    expect(cache.get(namespace2, 'key2')).toBeUndefined();
  });

  test('should provide cache statistics', () => {
    const namespace = 'test';
    
    // Set 3 items
    cache.set(namespace, 'key1', { data: 'data1' });
    cache.set(namespace, 'key2', { data: 'data2' });
    cache.set(namespace, 'key3', { data: 'data3' });
    
    // Get statistics
    const stats = cache.getStats();
    
    expect(stats.totalItems).toBe(3);
    expect(stats.validItems).toBe(3);
    expect(stats.expiredItems).toBe(0);
    expect(stats.maxItems).toBe(5);
  });
});
