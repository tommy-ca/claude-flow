#!/usr/bin/env node

/**
 * Simple test script to verify the web console works
 */

const express = require('express');
const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const path = require('path');

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Serve the console files
const consoleDir = path.join(__dirname, 'src/ui/console');
app.use('/console', express.static(consoleDir));

// Redirect root to console
app.get('/', (req, res) => {
  res.redirect('/console');
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket handling
wss.on('connection', (ws) => {
  console.log('🔌 WebSocket client connected');
  
  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
  });
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('📨 Received message:', message.method || 'unknown');
      
      // Handle initialize request
      if (message.method === 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            protocolVersion: { major: 2024, minor: 11, patch: 5 },
            capabilities: {
              logging: { level: 'info' },
              tools: { listChanged: true }
            },
            serverInfo: {
              name: 'Test Claude Code Server',
              version: '1.0.0'
            },
            instructions: 'Test server ready'
          }
        };
        ws.send(JSON.stringify(response));
      }
      
      // Handle ping
      if (message.method === 'ping') {
        ws.send(JSON.stringify({
          jsonrpc: '2.0',
          method: 'pong',
          params: { timestamp: Date.now() }
        }));
      }
      
      // Handle other requests with success response
      if (message.id && message.method !== 'initialize') {
        const response = {
          jsonrpc: '2.0',
          id: message.id,
          result: {
            success: true,
            message: `Command '${message.method}' executed successfully`,
            timestamp: new Date().toISOString()
          }
        };
        ws.send(JSON.stringify(response));
      }
      
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Send welcome notification
  setTimeout(() => {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      method: 'log/message',
      params: {
        level: 'info',
        message: 'Welcome to Claude Code Console Test Server!'
      }
    }));
  }, 1000);
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Test server running on http://localhost:${PORT}`);
  console.log(`🌐 Web console available at http://localhost:${PORT}/console`);
  console.log(`🔌 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log('');
  console.log('📌 Press Ctrl+C to stop the server...');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down test server...');
  server.close(() => {
    console.log('✅ Server stopped');
    process.exit(0);
  });
});