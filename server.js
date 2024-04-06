const path = require('path');
const express = require('express');
const serveIndex = require('serve-index');
const app = express();
const PORT = 3000;
const ROOT = path.join('dist', 'video-conversion', 'browser');

app.use((_, res, next) => {
    res.append('Cross-Origin-Opener-Policy', 'same-origin');
    res.append('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

app.use(express.static(ROOT));
app.use('/', serveIndex(ROOT));

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});
