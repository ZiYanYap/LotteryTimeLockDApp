const express = require("express");
const path = require("path");
const app = express();

// Serve static files from the root, css, and js directories
app.use(express.static(__dirname)); 
app.use(express.static(path.join(__dirname, '../')));
app.use(express.static(path.join(__dirname, '../css')));
app.use(express.static(path.join(__dirname, '../js')));
app.use(express.static(path.join(__dirname, '../components')));  // For serving components like footer, navbar, etc.

// Serve index.html from the root directory
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../index.html"));
});

// Start the server
const server = app.listen(5000, () => {
    console.log(`Server running on http://127.0.0.1:5000`);
});
