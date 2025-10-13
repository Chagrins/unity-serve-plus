#!/usr/bin/env node

import chalk from 'chalk';
import fs, { readFileSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// MIME types for Unity WebGL builds
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.wasm': 'application/wasm',
  '.data': 'application/octet-stream',
  '.unityweb': 'application/octet-stream',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function getLocalIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function findAvailablePort(startPort = 3000) {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

async function startServer() {
  const currentDir = process.cwd();
  const port = await findAvailablePort();
  const localIP = getLocalIPAddress();

  const server = http.createServer((req, res) => {
    let filePath = path.join(currentDir, req.url === '/' ? 'index.html' : req.url);

    // Security: prevent directory traversal
    if (!filePath.startsWith(currentDir)) {
      res.writeHead(403, { 'Content-Type': 'text/plain' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (err, stats) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
        return;
      }

      if (stats.isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('File not found');
          return;
        }

        const mimeType = getMimeType(filePath);
        const headers = {
          'Content-Type': mimeType,
          'Cross-Origin-Embedder-Policy': 'require-corp',
          'Cross-Origin-Opener-Policy': 'same-origin'
        };

        // Add compression headers for Unity files
        if (filePath.endsWith('.br')) {
          headers['Content-Encoding'] = 'br';
          const originalExt = path.extname(filePath.slice(0, -3));
          headers['Content-Type'] = getMimeType(originalExt);
        } else if (filePath.endsWith('.gz')) {
          headers['Content-Encoding'] = 'gzip';
          const originalExt = path.extname(filePath.slice(0, -3));
          headers['Content-Type'] = getMimeType(originalExt);
        }

        res.writeHead(200, headers);
        res.end(data);
      });
    });
  });

  server.listen(port, () => {
    console.log(unityServeTagline);
    console.log(chalk.bold(`${chalk.green('→')} Local:  `), chalk.cyan(`http://localhost:${port}`));
    console.log(chalk.bold(`${chalk.green('→')} Network:`), chalk.cyan(`http://${localIP}:${port}`));
    console.log('');
    console.log(chalk.gray('Press Ctrl+C to stop the server'));
  });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(path.join(__dirname, './package.json'), 'utf8'));
const unityServeTagline = `\n${chalk.green.bold('UNITY-SERVE')}${chalk.green(` v${pkg.version}`)}\n`;

// Check if index.html exists
if (!fs.existsSync('index.html')) {
  console.log(unityServeTagline);
  console.log(chalk.bold(`${chalk.red("→")} Error:`), 'not in a Unity WebGL build folder');
  process.exit(1);
}

startServer().catch(console.error);