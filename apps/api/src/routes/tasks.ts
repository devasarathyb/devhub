import { Router } from 'express';
import { connectToDatabase } from '../database';
import { ObjectId } from 'mongodb';

const tasksRouter: Router = Router();

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isRequestBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

tasksRouter.post('/', async (req, res) => {
  try {
    if (!isRequestBody(req.body)) {
      res.status(400).json({ message: 'A JSON request body is required' });
      return;
    }

    const { title, completed = false } = req.body;
    if (typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ message: 'Task title is required' });
      return;
    }

    if (typeof completed !== 'boolean') {
      res.status(400).json({ message: 'Completed must be a boolean' });
      return;
    }

    const db = await connectToDatabase();
    const normalizedTitle = title.trim();
    const duplicate = await db.collection('tasks').findOne({
      title: { $regex: `^${escapeRegExp(normalizedTitle)}$`, $options: 'i' },
    });

    if (duplicate) {
      res.status(409).json({ message: 'A task with this title already exists' });
      return;
    }

    const result = await db.collection('tasks').insertOne({
      title: normalizedTitle,
      completed,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: 'Task created successfully',
      task: {
        _id: result.insertedId,
        title: normalizedTitle,
        completed,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({
      message: 'Failed to create task',
    });
  }
});

tasksRouter.get('/', async (req, res) => {
  try {
    const db = await connectToDatabase();
    const tasks = await db.collection('tasks').find().toArray();
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

tasksRouter.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid task ID' });
      return;
    }

    if (!isRequestBody(req.body)) {
      res.status(400).json({ message: 'A JSON request body is required' });
      return;
    }

    const { title, completed } = req.body;
    if (title === undefined && completed === undefined) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    if (title !== undefined && (typeof title !== 'string' || !title.trim())) {
      res.status(400).json({ message: 'Task title must not be empty' });
      return;
    }

    if (completed !== undefined && typeof completed !== 'boolean') {
      res.status(400).json({ message: 'Completed must be a boolean' });
      return;
    }

    const db = await connectToDatabase();
    const taskId = new ObjectId(id);
    const existingTask = await db.collection('tasks').findOne({ _id: taskId });
    if (!existingTask) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    const updates: { title?: string; completed?: boolean } = {};
    if (title !== undefined) {
      updates.title = title.trim();
    }
    if (completed !== undefined) updates.completed = completed;

    if (updates.title !== undefined) {
      const duplicate = await db.collection('tasks').findOne({
        _id: { $ne: taskId },
        title: { $regex: `^${escapeRegExp(updates.title)}$`, $options: 'i' },
      });

      if (duplicate) {
        res.status(409).json({ message: 'A task with this title already exists' });
        return;
      }
    }

    const result = await db.collection('tasks').updateOne(
      { _id: taskId },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error editing task:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

tasksRouter.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ message: 'Invalid task ID' });
      return;
    }

    const db = await connectToDatabase();
    const result = await db.collection('tasks').deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

tasksRouter.use((_req, res) => {
  res.status(404).json({ message: 'Task endpoint not found' });
});

export default tasksRouter;