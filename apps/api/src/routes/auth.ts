import { randomBytes } from 'node:crypto';
import { Router } from 'express';
import { InsertOneResult, ObjectId } from 'mongodb';
import {
  clearSessionCookie,
  getSessionToken,
  hashPassword,
  hashSessionToken,
  requireAuth,
  setSessionCookie,
  sessionDurationSeconds,
  verifyPassword,
} from '../auth';
import { connectToDatabase } from '../database';

const authRouter: Router = Router();

type UserDocument = {
  email: string;
  passwordHash: string;
  createdAt: Date;
};

type SessionDocument = {
  userId: ObjectId;
  tokenHash: string;
  expiresAt: Date;
};

function isRequestBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createSessionToken(): string {
  return randomBytes(32).toString('hex');
}

authRouter.post('/register', async (request, response) => {
  try {
    if (!isRequestBody(request.body)) {
      response.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const { email, password } = request.body;
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      response.status(400).json({ message: 'Enter a valid email address' });
      return;
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      response.status(400).json({ message: 'Password must be between 8 and 128 characters' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await connectToDatabase();
    const users = db.collection<UserDocument>('users');
    const existingUser = await users.findOne({ email: normalizedEmail });
    if (existingUser) {
      response.status(409).json({ message: 'An account with this email already exists' });
      return;
    }

    let result: InsertOneResult<UserDocument>;
    try {
      result = await users.insertOne({
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        createdAt: new Date(),
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        response.status(409).json({ message: 'An account with this email already exists' });
        return;
      }
      throw error;
    }
    const userId = result.insertedId;
    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);

    await db.collection<SessionDocument>('sessions').insertOne({
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    });

    setSessionCookie(response, token);
    response.status(201).json({
      user: { id: userId.toHexString(), email: normalizedEmail },
    });
  } catch (error) {
    console.error('Error registering user:', error);
    response.status(500).json({ message: 'Failed to create account' });
  }
});

authRouter.post('/login', async (request, response) => {
  try {
    if (!isRequestBody(request.body)) {
      response.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const { email, password } = request.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      response.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const db = await connectToDatabase();
    const user = await db.collection<UserDocument>('users').findOne({
      email: normalizedEmail,
    });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      response.status(401).json({ message: 'Email or password is incorrect' });
      return;
    }

    const token = createSessionToken();
    const expiresAt = new Date(Date.now() + sessionDurationSeconds * 1000);
    await db.collection<SessionDocument>('sessions').insertOne({
      userId: user._id,
      tokenHash: hashSessionToken(token),
      expiresAt,
    });

    setSessionCookie(response, token);
    response.json({
      user: { id: user._id.toHexString(), email: user.email },
    });
  } catch (error) {
    console.error('Error logging in:', error);
    response.status(500).json({ message: 'Failed to sign in' });
  }
});

authRouter.post('/logout', async (request, response) => {
  try {
    const token = getSessionToken(request);

    if (token) {
      const db = await connectToDatabase();
      await db.collection<SessionDocument>('sessions').deleteOne({
        tokenHash: hashSessionToken(token),
      });
    }

    clearSessionCookie(response);
    response.json({ message: 'Signed out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    response.status(500).json({ message: 'Failed to sign out' });
  }
});

authRouter.get('/me', requireAuth, (request, response) => {
  response.json({
    user: {
      id: request.user?.id.toHexString(),
      email: request.user?.email,
    },
  });
});

export default authRouter;
