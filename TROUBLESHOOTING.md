# Troubleshooting Guide

## Common Issues

### Installation Issues

#### Error: Cannot find module
- Ensure you have Node.js 16+ installed
- Run `npm install` to install dependencies
- Check that the package was installed correctly

### Authentication Issues

#### Error: Invalid API key
- Verify your API key is correct
- Check that the API key has the necessary permissions
- Ensure the API key is properly set via environment variable or command line

### Connection Issues

#### Error: Circuit breaker is OPEN
- The server has detected multiple failures
- Wait for the circuit breaker to reset (default: 30 seconds)
- Check your network connection
- Verify the Digital Samba API is accessible

### Build Issues

#### TypeScript compilation errors
- Run `npm run build:clean` to clean and rebuild
- Check for any syntax errors in your code
- Ensure all dependencies are installed

## Debug Mode

Enable debug logging:

```bash
DEBUG=digital-samba:* npx digital-samba-mcp-server --api-key YOUR_KEY
```

## Getting Help

- Check the [documentation](https://github.com/digital-samba/digital-samba-mcp-server)
- Open an issue on [GitHub](https://github.com/digital-samba/digital-samba-mcp-server/issues)
- Contact Digital Samba support