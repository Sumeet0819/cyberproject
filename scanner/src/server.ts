import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import scanRoutes from './routes/scan.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 6001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/scan', scanRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'scanner' });
});

app.listen(PORT, () => {
  console.log(`Scanner service listening on port ${PORT}`);
});
