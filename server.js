"use strict";

const http = require("http");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const ROOT_DIR = __dirname;
const DATA_DIR = path.join(ROOT_DIR, "data");
const DATA_FILE = path.join(DATA_DIR, "tickets.json");
const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 4173);
const MAX_BODY_BYTES = 5 * 1024 * 1024;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

async function ensureDataFile() {
  await fsp.mkdir(DATA_DIR, { recursive: true });

  try {
    await fsp.access(DATA_FILE);
  } catch {
    await fsp.writeFile(DATA_FILE, "[]\n", "utf8");
  }
}

async function readTickets() {
  await ensureDataFile();
  const raw = await fsp.readFile(DATA_FILE, "utf8");
  const parsed = JSON.parse(raw || "[]");
  return Array.isArray(parsed) ? parsed : [];
}

async function writeTickets(tickets) {
  await ensureDataFile();
  await fsp.writeFile(DATA_FILE, `${JSON.stringify(tickets, null, 2)}\n`, "utf8");
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, body) {
  res.writeHead(statusCode, {
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8"
  });
  res.end(body);
}

function applyApiHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(new Error("Request body is too large."));
        req.destroy();
      }
    });

    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function resolveFilePath(urlPathname) {
  const requestedPath = urlPathname === "/" ? "/index.html" : decodeURIComponent(urlPathname);
  const safePath = path.normalize(path.join(ROOT_DIR, requestedPath));

  if (!safePath.startsWith(ROOT_DIR)) {
    return null;
  }

  return safePath;
}

async function serveStaticFile(req, res, pathname) {
  const filePath = resolveFilePath(pathname);
  if (!filePath) {
    sendText(res, 403, "Forbidden");
    return;
  }

  let stat;
  try {
    stat = await fsp.stat(filePath);
  } catch {
    sendText(res, 404, "Not found");
    return;
  }

  if (stat.isDirectory()) {
    sendText(res, 403, "Forbidden");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  res.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentType
  });

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
}

async function handleApi(req, res) {
  applyApiHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET") {
    sendJson(res, 200, await readTickets());
    return;
  }

  if (req.method === "PUT") {
    const rawBody = await collectRequestBody(req);
    let payload;

    try {
      payload = JSON.parse(rawBody || "[]");
    } catch {
      sendJson(res, 400, { error: "Invalid JSON payload." });
      return;
    }

    if (!Array.isArray(payload)) {
      sendJson(res, 400, { error: "Payload must be an array of tickets." });
      return;
    }

    await writeTickets(payload);
    sendJson(res, 200, payload);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed." });
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

    if (requestUrl.pathname === "/api/tickets") {
      await handleApi(req, res);
      return;
    }

    if (!["GET", "HEAD"].includes(req.method)) {
      sendText(res, 405, "Method not allowed");
      return;
    }

    await serveStaticFile(req, res, requestUrl.pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Internal server error." });
  }
});

server.listen(PORT, HOST, async () => {
  await ensureDataFile();
  console.log(`FOX Ticket Tracker running at http://${HOST}:${PORT}`);
});
