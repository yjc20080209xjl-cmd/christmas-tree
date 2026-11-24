const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 5173;
const ROOT = __dirname;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".wasm": "application/wasm",
  ".task": "application/octet-stream",
  ".tgz": "application/gzip",
};
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);

/** 扫描根目录里的图片，作为「自动上树」的照片列表 */
function scanRootPhotos() {
  const out = [];
  let names = [];
  try { names = fs.readdirSync(ROOT); } catch (e) { console.error("扫描目录失败", e); return out; }
  for (const name of names) {
    const ext = path.extname(name).toLowerCase();
    if (!IMAGE_EXT.has(ext)) continue;
    const abs = path.join(ROOT, name);
    try {
      const st = fs.statSync(abs);
      if (!st.isFile()) continue;
      const base = name.replace(/\.[^.]+$/, "");
      const title = /^[0-9a-f]{16,}$/i.test(base) ? "" : base;
      out.push({ name: title, url: "/" + encodeURIComponent(name), mtime: st.mtimeMs });
    } catch (e) { /* 跳过无法读取的文件 */ }
  }
  out.sort((a, b) => a.mtime - b.mtime);
  return out;
}

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent((req.url || "/").split("?")[0]); }
  catch (e) { urlPath = req.url || "/"; }
  if (urlPath === "/") urlPath = "/index.html";

  if (urlPath === "/api/photos") {
    const body = JSON.stringify({ photos: scanRootPhotos() });
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
    res.end(body);
    return;
  }

  const fp = path.resolve(ROOT, "." + urlPath);
  if (fp !== ROOT && !fp.startsWith(ROOT + path.sep)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("403 Forbidden");
    return;
  }
  const ext = path.extname(fp).toLowerCase();
  const ctype = MIME[ext] || "application/octet-stream";
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("404 Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": ctype });
    res.end(data);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
  const n = scanRootPhotos().length;
  console.log(`🖼️  根目录检测到 ${n} 张图片，将自动挂到树上`);
});
