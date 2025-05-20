// Simple Express Server Test
import express from 'express';

console.log("Starting simple Express server test...");

try {
  // Create Express app
  const app = express();
  
  console.log("Express app created");
  
  // Add a simple route
  app.get('/', (req, res) => {
    console.log("Received request to /");
    res.send('Hello World!');
  });
  
  // Add health check endpoint
  app.get('/health', (req, res) => {
    console.log("Received request to /health");
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });
  
  // Start the server
  const PORT = process.env.PORT || 3000;
  const server = app.listen(PORT, () => {
    console.log(`Express server running on port ${PORT}`);
    console.log(`Try visiting http://localhost:${PORT}/ in your browser`);
  });
  
  console.log("Server start call completed");
} catch (error) {
  console.error("Error during Express server initialization:", error);
}
