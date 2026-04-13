import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory only
app.use(express.static(join(__dirname, 'public')));

const server = app.listen(PORT, () => {
    console.log(`Schedulae running at http://localhost:${PORT}`);
});

function shutdown() {
    server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
