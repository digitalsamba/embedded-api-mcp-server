# Setting Up Prometheus with Digital Samba MCP Server

This guide explains how to set up Prometheus to scrape metrics from the Digital Samba MCP Server and visualize them with Grafana.

## Prerequisites

- [Prometheus](https://prometheus.io/download/) installed
- [Grafana](https://grafana.com/grafana/download) (optional for visualization)
- Digital Samba MCP Server configured with metrics enabled

## 1. Enabling Metrics in the MCP Server

The MCP Server supports metrics collection out of the box. You can enable it in several ways:

### Environment Variables

```bash
# Enable metrics collection
ENABLE_METRICS=true

# Configure metrics endpoint (default: /metrics)
METRICS_ENDPOINT=/metrics

# Configure metrics prefix (default: digital_samba_mcp_)
METRICS_PREFIX=digital_samba_mcp_

# Enable default Node.js metrics collection
COLLECT_DEFAULT_METRICS=true
```

### Command Line Arguments

```bash
node dist/src/index.js --enable-metrics --metrics-prefix=digital_samba_mcp_ --port=3000
```

### Code Configuration

```typescript
import { startServer } from '@digital-samba/mcp-server';

const server = startServer({
  enableMetrics: true,
  metricsEndpoint: '/metrics',
  metricsPrefix: 'digital_samba_mcp_',
  collectDefaultMetrics: true
});
```

## 2. Configuring Prometheus

Create a `prometheus.yml` configuration file:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'digital-samba-mcp'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: /metrics
```

## 3. Starting Prometheus

Start Prometheus with your configuration:

```bash
prometheus --config.file=prometheus.yml
```

## 4. Verifying Metrics Collection

1. Start the Digital Samba MCP Server with metrics enabled:
   ```bash
   node dist/src/index.js --enable-metrics
   ```

2. Use the provided test script:
   ```bash
   test-metrics.bat
   ```

3. Access the metrics endpoint directly:
   ```
   http://localhost:3000/metrics
   ```

## 5. Available Metrics

The Digital Samba MCP Server exposes the following metrics:

### HTTP Metrics
- `http_requests_total` - Total number of HTTP requests (labels: method, path, status)
- `http_request_duration_seconds` - HTTP request duration in seconds (labels: method, path, status)
- `http_requests_in_flight` - Number of HTTP requests currently being processed (labels: method, path)
- `http_response_size_bytes` - Size of HTTP responses in bytes

### API Client Metrics
- `api_requests_total` - Total number of API requests (labels: endpoint, method)
- `api_request_duration_seconds` - API request duration in seconds (labels: endpoint, method, status)
- `api_errors_total` - Total number of API errors (labels: endpoint, method, error_type)

### Cache Metrics
- `cache_hits_total` - Total number of cache hits (labels: namespace)
- `cache_misses_total` - Total number of cache misses (labels: namespace)
- `cache_size_bytes` - Size of cache in bytes
- `cache_entries_count` - Number of entries in the cache (labels: namespace)

### Rate Limiting Metrics
- `rate_limit_exceeded_total` - Total number of rate limit exceeded events (labels: key_type)
- `rate_limit_remaining_tokens` - Number of tokens remaining for rate limited keys (labels: key_type)

### Connection Metrics
- `active_connections` - Number of active connections
- `active_sessions` - Number of active sessions

### Default Node.js Metrics
When `collectDefaultMetrics` is enabled, Prometheus also collects default Node.js metrics like:
- Memory usage
- Garbage collection metrics
- Event loop lag
- CPU usage
- And more...

## 6. Setting Up Grafana (Optional)

1. Install and start Grafana
2. Add Prometheus as a data source:
   - URL: `http://localhost:9090`
   - Access: `Browser`
   - Type: `Prometheus`

3. Create a new dashboard and add panels for key metrics:
   - HTTP request rate
   - HTTP request duration
   - Error rate
   - Cache hit/miss ratio
   - Active sessions

## 7. Example Queries

Here are some example PromQL queries for common metrics:

### HTTP Request Rate
```
rate(digital_samba_mcp_http_requests_total[5m])
```

### 95th Percentile Request Duration
```
histogram_quantile(0.95, sum(rate(digital_samba_mcp_http_request_duration_seconds_bucket[5m])) by (le, path))
```

### Error Rate
```
sum(rate(digital_samba_mcp_http_requests_total{status=~"5.."}[5m])) / sum(rate(digital_samba_mcp_http_requests_total[5m]))
```

### Cache Hit Ratio
```
sum(rate(digital_samba_mcp_cache_hits_total[5m])) / (sum(rate(digital_samba_mcp_cache_hits_total[5m])) + sum(rate(digital_samba_mcp_cache_misses_total[5m])))
```

### API Error Rate by Endpoint
```
sum(rate(digital_samba_mcp_api_errors_total[5m])) by (endpoint) / sum(rate(digital_samba_mcp_api_requests_total[5m])) by (endpoint)
```

## 8. Troubleshooting

### Metrics Not Appearing

1. Verify metrics are enabled in the MCP Server
2. Check the metrics endpoint is accessible
3. Ensure Prometheus is correctly configured to scrape the endpoint
4. Check for CORS or network issues if Prometheus and the MCP Server are on different hosts

### High Cardinality Issues

If you have a large number of unique path values, you might encounter high cardinality issues. Consider aggregating similar paths or using recording rules to pre-aggregate metrics.

## 9. Production Considerations

- Use authentication for the metrics endpoint in production
- Consider running Prometheus behind a reverse proxy
- Set up alerting for critical metrics
- Use a monitoring service like Grafana Cloud for long-term storage
- Implement service discovery for dynamic environments
