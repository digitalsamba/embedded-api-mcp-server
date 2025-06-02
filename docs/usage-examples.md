# Digital Samba MCP Server - Usage Examples

This guide provides comprehensive examples for using the Digital Samba MCP Server in various scenarios.

## Table of Contents
1. [Basic Setup](#basic-setup)
2. [Server Configuration](#server-configuration)
3. [Room Management](#room-management)
4. [Session Management](#session-management)
5. [Analytics](#analytics)
6. [Webhooks](#webhooks)
7. [Error Handling](#error-handling)
8. [Advanced Features](#advanced-features)

## Basic Setup

### Starting the Server

```javascript
import { startServer } from '@digitalsamba/mcp-server';

// Start with default configuration
const server = startServer();

// Start with custom port
const server = startServer({
  port: 8080
});
```

### Environment Variables

```bash
# Required
export DIGITAL_SAMBA_API_KEY="your-api-key"

# Optional
export PORT=4521
export DIGITAL_SAMBA_API_URL="https://api.digitalsamba.com/api/v1"
export ENABLE_CACHE=true
export CACHE_TTL=300000
export LOG_LEVEL=debug
```

## Server Configuration

### Basic Configuration

```javascript
import { createServer, startServer } from '@digitalsamba/mcp-server';

// Create server without starting
const config = createServer({
  port: 3000,
  apiUrl: 'https://api.digitalsamba.com/api/v1',
  enableCache: true,
  cacheTtl: 600000, // 10 minutes
  logLevel: 'info'
});

// Start server later
const server = startServer(config);
```

### Production Configuration

```javascript
const server = startServer({
  // Performance optimization
  enableCache: true,
  cacheTtl: 300000,
  enableConnectionManagement: true,
  connectionPoolSize: 10,
  
  // Resilience features
  enableRateLimiting: true,
  rateLimitRequestsPerMinute: 120,
  enableCircuitBreaker: true,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerResetTimeout: 30000,
  enableGracefulDegradation: true,
  
  // Monitoring
  enableMetrics: true,
  metricsEndpoint: '/metrics',
  collectDefaultMetrics: true,
  
  // Security
  webhookSecret: process.env.WEBHOOK_SECRET,
  
  // Logging
  logLevel: 'warn'
});
```

## Room Management

### Creating a Room

```javascript
// MCP Client request
const response = await mcpClient.callTool({
  name: 'create-room',
  arguments: {
    name: 'Team Meeting',
    description: 'Weekly team sync',
    privacy: 'private',
    max_participants: 50,
    friendly_url: 'team-weekly',
    
    // UI settings
    toolbar_enabled: true,
    chat_enabled: true,
    recordings_enabled: true,
    
    // Join settings
    audio_on_join_enabled: false,
    video_on_join_enabled: false
  }
});

console.log('Room created:', response.content[0].text);
```

### Updating a Room

```javascript
const response = await mcpClient.callTool({
  name: 'update-room',
  arguments: {
    roomId: 'room-123',
    name: 'Updated Team Meeting',
    max_participants: 100,
    is_locked: true
  }
});
```

### Generating Room Tokens

```javascript
// Generate token for participant
const response = await mcpClient.callTool({
  name: 'generate-token',
  arguments: {
    roomId: 'room-123',
    options: {
      u: 'John Doe',
      role: 'moderator',
      exp: '60', // Token expires in 60 minutes
      ud: 'user-123' // External user ID
    }
  }
});

const { token, link } = JSON.parse(response.content[0].text);
console.log('Join link:', link);
```

### Listing Rooms

```javascript
// Get all rooms
const response = await mcpClient.readResource({
  uri: 'digitalsamba://rooms'
});

// Get specific room
const response = await mcpClient.readResource({
  uri: 'digitalsamba://rooms/room-123'
});
```

## Session Management

### Getting Active Sessions

```javascript
// List all sessions
const response = await mcpClient.readResource({
  uri: 'digitalsamba://sessions'
});

// Get sessions for a specific room
const response = await mcpClient.readResource({
  uri: 'digitalsamba://sessions?room_id=room-123'
});
```

### Managing Participants

```javascript
// Mute a participant
const response = await mcpClient.callTool({
  name: 'mute-participant',
  arguments: {
    sessionId: 'session-123',
    participantId: 'participant-456',
    mediaType: 'audio'
  }
});

// Remove participant from session
const response = await mcpClient.callTool({
  name: 'remove-participant',
  arguments: {
    sessionId: 'session-123',
    participantId: 'participant-456'
  }
});
```

### Broadcasting Messages

```javascript
// Send message to all participants
const response = await mcpClient.callTool({
  name: 'broadcast-message',
  arguments: {
    sessionId: 'session-123',
    message: 'Meeting will start in 5 minutes',
    type: 'info'
  }
});

// Send private message
const response = await mcpClient.callTool({
  name: 'send-private-message',
  arguments: {
    sessionId: 'session-123',
    participantId: 'participant-456',
    message: 'Please turn on your camera'
  }
});
```

## Analytics

### Team Analytics

```javascript
// Get team usage statistics
const response = await mcpClient.readResource({
  uri: 'digitalsamba://analytics/team?date_start=2024-01-01&date_end=2024-01-31'
});

const stats = JSON.parse(response.contents[0].text);
console.log('Total sessions:', stats.total_sessions);
console.log('Total participants:', stats.total_participants);
console.log('Total minutes:', stats.total_minutes);
```

### Room Analytics

```javascript
// Get room-specific analytics
const response = await mcpClient.readResource({
  uri: 'digitalsamba://analytics/rooms?room_id=room-123&date_start=2024-01-01'
});

// Query analytics with tool
const response = await mcpClient.callTool({
  name: 'query-analytics',
  arguments: {
    metric: 'participation_minutes',
    dimensions: ['room_id', 'date'],
    filters: {
      room_id: 'room-123',
      date_start: '2024-01-01',
      date_end: '2024-01-31'
    },
    granularity: 'day'
  }
});
```

### Export Analytics

```javascript
// Export analytics data
const response = await mcpClient.callTool({
  name: 'export-analytics',
  arguments: {
    format: 'csv',
    metrics: ['sessions', 'participants', 'minutes'],
    date_start: '2024-01-01',
    date_end: '2024-01-31',
    groupBy: 'room'
  }
});
```

## Webhooks

### Setting Up Webhooks

```javascript
// Register webhook endpoint
const response = await mcpClient.callTool({
  name: 'create-webhook',
  arguments: {
    endpoint: 'https://your-server.com/webhooks',
    events: [
      'room.session.started',
      'room.session.ended',
      'room.participant.joined',
      'room.participant.left'
    ],
    authorization_header: 'Bearer your-webhook-token'
  }
});
```

### Webhook Event Handling

```javascript
// Express webhook handler
app.post('/webhooks', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const event = req.body;
  
  // Verify webhook signature
  if (!verifyWebhookSignature(signature, req.rawBody, webhookSecret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Handle events
  switch (event.type) {
    case 'room.session.started':
      console.log('Session started:', event.data.session_id);
      break;
    case 'room.participant.joined':
      console.log('Participant joined:', event.data.participant_name);
      break;
  }
  
  res.status(200).send('OK');
});
```

## Error Handling

### Basic Error Handling

```javascript
try {
  const response = await mcpClient.callTool({
    name: 'create-room',
    arguments: { name: 'Test Room' }
  });
} catch (error) {
  if (error.code === -32602) {
    console.error('Invalid parameters:', error.message);
  } else if (error.code === -32603) {
    console.error('Internal error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Handling API Errors

```javascript
try {
  const response = await mcpClient.readResource({
    uri: 'digitalsamba://rooms/invalid-id'
  });
} catch (error) {
  const errorData = JSON.parse(error.message);
  
  if (errorData.statusCode === 404) {
    console.error('Room not found');
  } else if (errorData.statusCode === 401) {
    console.error('Authentication failed - check API key');
  } else if (errorData.statusCode === 429) {
    console.error('Rate limit exceeded - retry after:', errorData.retryAfter);
  }
}
```

## Advanced Features

### Circuit Breaker Pattern

```javascript
// Server configuration with circuit breaker
const server = startServer({
  enableCircuitBreaker: true,
  circuitBreakerFailureThreshold: 5,
  circuitBreakerResetTimeout: 30000
});

// Monitor circuit breaker state
server.on('circuitBreaker:open', (service) => {
  console.log(`Circuit breaker opened for ${service}`);
});

server.on('circuitBreaker:halfOpen', (service) => {
  console.log(`Circuit breaker half-open for ${service}`);
});
```

### Graceful Degradation

```javascript
// Configure graceful degradation
const server = startServer({
  enableGracefulDegradation: true,
  gracefulDegradationMaxRetries: 3,
  gracefulDegradationInitialDelay: 1000
});

// The server will automatically:
// 1. Retry failed requests with exponential backoff
// 2. Serve cached responses when API is unavailable
// 3. Provide partial functionality during outages
```

### Metrics and Monitoring

```javascript
// Enable Prometheus metrics
const server = startServer({
  enableMetrics: true,
  metricsEndpoint: '/metrics',
  metricsPrefix: 'digitalsamba_',
  collectDefaultMetrics: true
});

// Access metrics endpoint
// GET http://localhost:4521/metrics

// Custom metric tracking
import { metricsRegistry } from '@digitalsamba/mcp-server';

// Track custom operations
const customCounter = metricsRegistry.register.counter({
  name: 'custom_operations_total',
  help: 'Total number of custom operations'
});

customCounter.inc();
```

### Connection Pooling

```javascript
// Optimize connection management
const server = startServer({
  enableConnectionManagement: true,
  connectionPoolSize: 10,
  enableTokenManagement: true,
  enableResourceOptimization: true
});

// Benefits:
// - Reuses HTTP connections
// - Automatic token refresh
// - Optimized resource allocation
```

## Best Practices

1. **Always handle errors gracefully**
   ```javascript
   const safeCall = async (tool, args) => {
     try {
       return await mcpClient.callTool({ name: tool, arguments: args });
     } catch (error) {
       logger.error(`Tool ${tool} failed:`, error);
       return { error: error.message };
     }
   };
   ```

2. **Use caching for read-heavy workloads**
   ```javascript
   const server = startServer({
     enableCache: true,
     cacheTtl: 300000 // 5 minutes
   });
   ```

3. **Implement proper shutdown handling**
   ```javascript
   process.on('SIGTERM', async () => {
     console.log('Shutting down gracefully...');
     await server.close();
     process.exit(0);
   });
   ```

4. **Monitor API usage**
   ```javascript
   // Enable metrics and check regularly
   const metrics = await fetch('http://localhost:4521/metrics');
   const data = await metrics.text();
   // Parse and monitor API call rates, errors, etc.
   ```

5. **Use environment-specific configurations**
   ```javascript
   const config = {
     development: {
       logLevel: 'debug',
       enableCache: false
     },
     production: {
       logLevel: 'warn',
       enableCache: true,
       enableRateLimiting: true
     }
   };
   
   const server = startServer(config[process.env.NODE_ENV || 'development']);
   ```