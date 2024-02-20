const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const port = 3000;

app.use(cors());

app.use(express.json());

const fileInfo = (filePath) => {
  const stats = fs.statSync(filePath);
  return {
    name: path.basename(filePath),
    path: filePath,
    type: stats.isDirectory() ? "dir" : "file",
  };
};

app.get("/repo/:path/contents", (req, res) => {
  const reqPath = req.params.path;
  const dirPath = path.resolve(decodeURIComponent(reqPath));

  try {
    const files = fs
      .readdirSync(dirPath)
      .map((fileName) => fileInfo(path.join(dirPath, fileName)));
    res.json(files);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error reading directory", error: error.message });
  }
});

app.get("/file/:path", (req, res) => {
  const filePath = path.resolve(decodeURIComponent(req.params.path));

  try {
    if (fs.statSync(filePath).isFile()) {
      const content = fs.readFileSync(filePath, "base64");
      res.json({
        name: path.basename(filePath),
        path: filePath,
        type: "file",
        content: content,
      });
    } else {
      res.status(400).json({ message: "Path is not a file" });
    }
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error reading file", error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
