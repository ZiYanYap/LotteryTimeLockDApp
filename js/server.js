const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the current directory
app.use(express.static(__dirname));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const server = app.listen(5000);
const portNumber = server.address().port;
console.log(`Port is open on http://127.0.0.1:${portNumber}`);
