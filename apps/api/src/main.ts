import express from 'express';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import { connectToDatabase } from './database';
import tasksRouter from './routes/tasks';

loadEnv({ path: resolve(process.cwd(), 'apps/api/.env') });

const port = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use("/api/tasks", tasksRouter);


app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'DevHub API is running',
  });
});

async function startServer() {
  try {
    console.log('Connecting to MongoDB...');
    await connectToDatabase();

    app.listen(port, () => {
      console.log(`API running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error('Failed to start API:', error);
    process.exit(1);
  }
}

void startServer();
