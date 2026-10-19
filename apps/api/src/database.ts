import { Db, MongoClient } from 'mongodb';

const databaseName = process.env.MONGODB_DATABASE || 'devhub';

let client: MongoClient | null = null;
let database: Db | null = null; 

export async function connectToDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  client ??= new MongoClient(uri);
  await client.connect();

  database = client.db(databaseName);

  console.log(`Connected to MongoDB: ${databaseName}`);

  return database;
}