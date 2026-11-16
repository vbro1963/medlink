// Import the existing Express + HTTP/WebSocket server. It listens on the PORT
// supplied by Netlify Server and serves the API and /ws endpoint.
process.env.NODE_ENV = 'production';
await import('../../server.ts');
