import 'dotenv/config';
import http from 'http';
import app from './app';
import { initWebSocketServer } from './socket';

import { schedulerService } from './services/scheduler.service';

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Mount WebSockets
initWebSocketServer(server);

// Start autonomous background scheduler
schedulerService.startScheduler(60);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

