import { Router } from 'express';
import { connectToDatabase } from '../database';
import { ObjectId } from 'mongodb';

const tasksRouter: Router = Router();

tasksRouter.post('/', async (req, res) => {
 try {
    const db = await connectToDatabase();

    const { title, completed = false } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({
        message: 'Task title is required',
      });
      return;
    }

    const result = await db.collection('tasks').insertOne({
      title: title.trim(),
      completed,
      createdAt: new Date(),
    });

    res.status(201).json({
      message: 'Task created successfully',
      task: {
        _id: result.insertedId,
        title: title.trim(),
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
  try{
  const db = await connectToDatabase();
  const reposnse = await db.collection('tasks').find().toArray();
  res.json({ message: 'add task work', tasks: reposnse });
  } catch(err){
    console.log(err, "Error fetching tasks")
  }
});

tasksRouter.patch('/:id', async (req, res) => {
  try{
    const db = await connectToDatabase();
    const id = req.params.id;
    const {title, completed} = req.body;
   if(title === undefined || completed === undefined || title === "" && completed === ""){
    console.log("No fields to update");
    return
   }

   if (completed !== undefined && typeof completed !== 'boolean') {
      res.status(400).json({
        message: 'Completed must be a boolean',
      });
      return;
    }
   const updates: { title?: string; completed?: boolean } = {};
    if (title !== undefined) updates.title = title;
    if (completed !== undefined) updates.completed = completed;
   const updateFeild = await db.collection('tasks').updateOne({ _id: new ObjectId(id) },
      { $set: updates })

    res.json({ message: 'Tasks edit works', updateFeild });
  } catch(err){
    console.log(err, "Error editing task")
  }
});

tasksRouter.delete('/:id',async (req, res) => {
 try{
  const db = await connectToDatabase();
  const id = req.params.id;
  if(!id){
    res.status(400).json({message: 'Task ID is required'});
  }
  const deleteFeild = await db.collection('tasks').deleteOne({ _id: new ObjectId(id) });
  res.json({ message: 'Task deleted successfully', deleteFeild });
 }catch(err){
  console.log(err, "Error deleting task")
 }
});

export default tasksRouter;