import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { NextFunction, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from './database';

const scrypt = promisify(scryptCallback);
const sessionCookieName = 'devhub_session';
export const sessionDurationSeconds = 7 * 24 * 60 * 60;

export type AuthenticatedUser = {
  id: ObjectId;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

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

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${sessionCookieName}=`));

  return cookie?.slice(sessionCookieName.length + 1) || null;
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function setSessionCookie(response: Response, token: string): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionDurationSeconds}${secure}`
  );
}

export function clearSessionCookie(response: Response): void {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [salt, storedKeyHex] = passwordHash.split(':');
  if (!salt || !storedKeyHex || !/^[a-f0-9]{128}$/i.test(storedKeyHex)) {
    return false;
  }

  const storedKey = Buffer.from(storedKeyHex, 'hex');
  const suppliedKey = (await scrypt(password, salt, storedKey.length)) as Buffer;
  return timingSafeEqual(storedKey, suppliedKey);
}

export async function requireAuth(
  request: Request,
  response: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = getSessionToken(request);
    if (!token) {
      response.status(401).json({ message: 'Please sign in to continue' });
      return;
    }

    const db = await connectToDatabase();
    const session = await db.collection<SessionDocument>('sessions').findOne({
      tokenHash: hashSessionToken(token),
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      clearSessionCookie(response);
      response.status(401).json({ message: 'Your session has expired. Please sign in again' });
      return;
    }

    const user = await db.collection<UserDocument>('users').findOne(
      { _id: session.userId },
      { projection: { email: 1 } }
    );

    if (!user) {
      clearSessionCookie(response);
      response.status(401).json({ message: 'Please sign in to continue' });
      return;
    }

    request.user = { id: session.userId, email: user.email };
    next();
  } catch (error) {
    next(error);
  }
}
