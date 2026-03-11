#!/usr/bin/env node

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

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
    let requestUrlParts = req.url.split('?')[0];
    let filePath = path.join(currentDir, requestUrlParts[0] === '/' ? 'index.html' : req.url);

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

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const pkg = JSON.parse(readFileSync(path.join(__dirname, './package.json'), 'utf8'));
  const unityServeTagline = `
  ============================================
   Unity Serve Plus - Serving Unity WebGL Builds
  ============================================
  Version: ${pkg.version}`;

  server.listen(port, () => {
    console.log(unityServeTagline);
    console.log(`${Green}Local${RC}: http://localhost:${port}`);
    console.log(`Network: http://${localIP}:${port}`);
    console.log('');
    console.log(`\nPress Ctrl+C to stop the server`);
  });
}

// Check if index.html exists
if (!fs.existsSync('index.html')) {
  console.log(unityServeTagline);
  console.log(`Error: Not in a Unity WebGL build folder`);
  process.exit(1);
}

startServer().catch(console.error);


// Reset
const RC='\033[0m'       // Text Reset

// Regular Colors
const Black='\033[0;30m'        // Black
const Red='\033[0;31m'          // Red
const Green='\033[0;32m'        // Green
const Yellow='\033[0;33m'       // Yellow
const Blue='\033[0;34m'         // Blue
const Purple='\033[0;35m'       // Purple
const Cyan='\033[0;36m'         // Cyan
const White='\033[0;37m'        // White

// Bold
const BBlack='\033[1;30m'       // Black
const BRed='\033[1;31m'         // Red
const BGreen='\033[1;32m'       // Green
const BYellow='\033[1;33m'      // Yellow
const BBlue='\033[1;34m'        // Blue
const BPurple='\033[1;35m'      // Purple
const BCyan='\033[1;36m'        // Cyan
const BWhite='\033[1;37m'       // White

// Underline
const UBlack='\033[4;30m'       // Black
const URed='\033[4;31m'         // Red
const UGreen='\033[4;32m'       // Green
const UYellow='\033[4;33m'      // Yellow
const UBlue='\033[4;34m'        // Blue
const UPurple='\033[4;35m'      // Purple
const UCyan='\033[4;36m'        // Cyan
const UWhite='\033[4;37m'       // White

// Background
const On_Black='\033[40m'       // Black
const On_Red='\033[41m'         // Red
const On_Green='\033[42m'       // Green
const On_Yellow='\033[43m'      // Yellow
const On_Blue='\033[44m'        // Blue
const On_Purple='\033[45m'      // Purple
const On_Cyan='\033[46m'        // Cyan
const On_White='\033[47m'       // White

// High Intensity
const IBlack='\033[0;90m'       // Black
const IRed='\033[0;91m'         // Red
const IGreen='\033[0;92m'       // Green
const IYellow='\033[0;93m'      // Yellow
const IBlue='\033[0;94m'        // Blue
const IPurple='\033[0;95m'      // Purple
const ICyan='\033[0;96m'        // Cyan
const IWhite='\033[0;97m'       // White

// Bold High Intensity
const BIBlack='\033[1;90m'      // Black
const BIRed='\033[1;91m'        // Red
const BIGreen='\033[1;92m'      // Green
const BIYellow='\033[1;93m'     // Yellow
const BIBlue='\033[1;94m'       // Blue
const BIPurple='\033[1;95m'     // Purple
const BICyan='\033[1;96m'       // Cyan
const BIWhite='\033[1;97m'      // White

// High Intensity backgrounds
const On_IBlack='\033[0;100m'   // Black
const On_IRed='\033[0;101m'     // Red
const On_IGreen='\033[0;102m'   // Green
const On_IYellow='\033[0;103m'  // Yellow
const On_IBlue='\033[0;104m'    // Blue
const On_IPurple='\033[0;105m'  // Purple
const On_ICyan='\033[0;106m'    // Cyan
const On_IWhite='\033[0;107m'   // White