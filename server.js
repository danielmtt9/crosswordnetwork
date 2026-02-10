const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3004', 10);
// Bind to all interfaces by default so the dev server is reachable from LAN.
// If your environment disallows this (EPERM/EACCES), we fall back to loopback.
// Override via BIND_HOST=127.0.0.1 (or any other host) to force a specific bind.
const bindHost = process.env.BIND_HOST || '0.0.0.0';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

  app.prepare().then(() => {
    const httpServer = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

  let hasRetried = false;

  const startListening = (host) => {
    httpServer.listen(port, host, () => {
      console.log(`> Ready on http://localhost:${port} (listening on ${host}:${port})`);
    });
  };

  httpServer.on('error', (err) => {
    // Some environments disallow binding to 0.0.0.0. Retry on loopback once.
    if (!hasRetried && bindHost === '0.0.0.0' && (err.code === 'EPERM' || err.code === 'EACCES')) {
      hasRetried = true;
      console.error(`Bind to ${bindHost}:${port} failed (${err.code}). Falling back to 127.0.0.1.`);
      startListening('127.0.0.1');
      return;
    }
    throw err;
  });

  startListening(bindHost);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    httpServer.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
});
