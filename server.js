// Hostinger Node.js entry point
// This file uses CommonJS to bootstrap the ESM dist/index.js
import('./dist/index.js').catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
