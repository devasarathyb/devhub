'use client';

import { FormEvent, useEffect, useState } from 'react';

type Task = {
  _id: string;
  title: string;
  completed: boolean;
};

type User = {
  id: string;
  email: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [pendingTaskAction, setPendingTaskAction] = useState<'updating' | 'deleting' | null>(null);

  async function getErrorMessage(response: Response, fallback: string) {
    try {
      const data: { message?: unknown } = await response.json();
      if (typeof data.message === 'string') return data.message;
    } catch {
      // Use the status-based message below when the response is not JSON.
    }

    if (response.status === 401) return 'Please sign in to continue.';
    if (response.status === 404) return 'The requested task could not be found.';
    if (response.status >= 500) return 'Something went wrong on the server. Please try again.';
    return fallback;
  }

  async function loadTasks() {
    try {
      const response = await fetch('/api/tasks', { cache: 'no-store' });
      if (!response.ok) {
        setError(await getErrorMessage(response, 'Could not load tasks. Please try again.'));
        return;
      }

      const data: { tasks: Task[] } = await response.json();
      setTasks(data.tasks);
      setError(null);
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function checkCurrentUser() {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (response.status === 401) {
        setUser(null);
        setLoading(false);
        return;
      }

      if (!response.ok) {
        setError(await getErrorMessage(response, 'Could not check your sign-in status.'));
        setLoading(false);
        return;
      }

      const data: { user: User } = await response.json();
      setUser(data.user);
      await loadTasks();
    } catch {
      setError('Could not connect to the server. Please try again.');
      setLoading(false);
    }
  }

  useEffect(() => {
    void checkCurrentUser();
  }, []);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response, 'Could not sign in. Please try again.'));
        return;
      }

      const data: { user: User } = await response.json();
      setUser(data.user);
      setPassword('');
      setLoading(true);
      await loadTasks();
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function logout() {
    setAuthLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) {
        setError(await getErrorMessage(response, 'Could not sign out. Please try again.'));
        return;
      }

      setUser(null);
      setTasks([]);
      setTitle('');
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Enter a task title before adding it.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: trimmedTitle }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response, 'Could not add the task. Please try again.'));
        return;
      }

      setTitle('');
      await loadTasks();
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleTask(task: Task) {
    setPendingTaskId(task._id);
    setPendingTaskAction('updating');
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });

      if (!response.ok) {
        setError(await getErrorMessage(response, 'Could not update the task. Please try again.'));
        return;
      }

      await loadTasks();
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setPendingTaskId(null);
      setPendingTaskAction(null);
    }
  }

  async function deleteTask(task: Task) {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;

    setPendingTaskId(task._id);
    setPendingTaskAction('deleting');
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
      if (!response.ok) {
        setError(await getErrorMessage(response, 'Could not delete the task. Please try again.'));
        return;
      }

      await loadTasks();
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setPendingTaskId(null);
      setPendingTaskAction(null);
    }
  }

  return (
    <main style={{ maxWidth: 640, margin: '40px auto', padding: 20 }}>
      <h1>DevHub Tasks</h1>

      {loading && <p>Loading...</p>}

      {!loading && !user && (
        <section>
          <h2>{authMode === 'login' ? 'Sign in' : 'Create account'}</h2>
          <form onSubmit={submitAuth} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                style={{ display: 'block', width: '100%', padding: 10 }}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                minLength={8}
                maxLength={128}
                required
                style={{ display: 'block', width: '100%', padding: 10 }}
              />
            </label>
            <button type="submit" disabled={authLoading}>
              {authLoading
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Sign in'
                  : 'Create account'}
            </button>
          </form>
          <button
            type="button"
            disabled={authLoading}
            onClick={() => {
              setAuthMode(authMode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            style={{ marginTop: 12 }}
          >
            {authMode === 'login' ? 'Need an account? Register' : 'Already registered? Sign in'}
          </button>
        </section>
      )}

      {!loading && user && (
        <>
          <p>
            Signed in as {user.email}{' '}
            <button type="button" onClick={() => void logout()} disabled={authLoading}>
              {authLoading ? 'Signing out...' : 'Sign out'}
            </button>
          </p>

      <form onSubmit={addTask} style={{ display: 'flex', gap: 8 }}>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="New task"
          required
          style={{ flex: 1, padding: 10 }}
        />
        <button type="submit" disabled={saving}>
          {saving ? 'Adding...' : 'Add'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!loading && !error && tasks.length === 0 && (
        <p>No tasks yet. Add one above to get started.</p>
      )}

      <ul style={{ padding: 0, listStyle: 'none' }}>
        {tasks.map((task) => (
          <li
            key={task._id}
            style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}
          >
            <input
              type="checkbox"
              checked={task.completed}
              disabled={pendingTaskId === task._id}
              onChange={() => void toggleTask(task)}
            />
            <span style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none' }}>
              {task.title}
            </span>
            <button
              type="button"
              disabled={pendingTaskId === task._id}
              onClick={() => void deleteTask(task)}
            >
              {pendingTaskId === task._id && pendingTaskAction === 'deleting'
                ? 'Deleting...'
                : 'Delete'}
            </button>
          </li>
        ))}
      </ul>
        </>
      )}

      {error && !user && <p style={{ color: 'red' }}>{error}</p>}
    </main>
  );
}