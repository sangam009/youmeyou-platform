// Placeholder for Project model
// In future: define schema, DB integration, etc.

const { MongoClient, ObjectId } = require('mongodb');

let db = null;
let client = null;

// MongoDB connection with singleton pattern
async function connectDB() {
  if (db) return db;
  
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/design_service';
    client = new MongoClient(mongoUri);
    await client.connect();
    db = client.db();
    console.log('Connected to MongoDB for Project model');
    return db;
  } catch (error) {
    console.error('MongoDB connection error in Project model:', error);
    throw error;
  }
}

// Project class that mimics Mongoose behavior
class Project {
  constructor(data) {
    this.name = data.name;
    this.workspaceId = data.workspaceId;
    this.userId = data.userId;
    this.template = data.template || 'blank';
    this.templateConfig = data.templateConfig || {};
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const database = await connectDB();
    const collection = database.collection('projects');
    
    const result = await collection.insertOne({
      name: this.name,
      workspaceId: this.workspaceId,
      userId: this.userId,
      template: this.template,
      templateConfig: this.templateConfig,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });
    
    this._id = result.insertedId;
    return this;
  }

  // Static methods
  static async find(query = {}) {
    const database = await connectDB();
    const collection = database.collection('projects');
    
    // Convert string IDs to ObjectId if needed
    if (query._id && typeof query._id === 'string') {
      query._id = new ObjectId(query._id);
    }
    
    const projects = await collection.find(query).toArray();
    return projects.map(project => ({
      ...project,
      id: project._id.toString()
    }));
  }

  static async findById(id) {
    const database = await connectDB();
    const collection = database.collection('projects');
    
    const project = await collection.findOne({ _id: new ObjectId(id) });
    if (project) {
      project.id = project._id.toString();
    }
    return project;
  }

  static async findOne(query) {
    const database = await connectDB();
    const collection = database.collection('projects');
    
    // Convert string IDs to ObjectId if needed
    if (query._id && typeof query._id === 'string') {
      query._id = new ObjectId(query._id);
    }
    
    const project = await collection.findOne(query);
    if (project) {
      project.id = project._id.toString();
    }
    return project;
  }

  static async findOneAndUpdate(query, update, options = {}) {
    const database = await connectDB();
    const collection = database.collection('projects');
    
    // Convert string IDs to ObjectId if needed
    if (query._id && typeof query._id === 'string') {
      query._id = new ObjectId(query._id);
    }
    
    const result = await collection.findOneAndUpdate(
      query,
      { $set: update },
      { returnDocument: 'after', ...options }
    );
    
    if (result.value) {
      result.value.id = result.value._id.toString();
    }
    return result.value;
  }

  static async findOneAndDelete(query) {
    const database = await connectDB();
    const collection = database.collection('projects');
    
    // Convert string IDs to ObjectId if needed
    if (query._id && typeof query._id === 'string') {
      query._id = new ObjectId(query._id);
    }
    
    const result = await collection.findOneAndDelete(query);
    if (result.value) {
      result.value.id = result.value._id.toString();
    }
    return result.value;
  }

  static async updateOne(query, update) {
    const database = await connectDB();
    const collection = database.collection('projects');
    
    // Convert string IDs to ObjectId if needed
    if (query._id && typeof query._id === 'string') {
      query._id = new ObjectId(query._id);
    }
    
    return await collection.updateOne(query, { $set: update });
  }

  static async deleteOne(query) {
    const database = await connectDB();
    const collection = database.collection('projects');
    
    // Convert string IDs to ObjectId if needed
    if (query._id && typeof query._id === 'string') {
      query._id = new ObjectId(query._id);
    }
    
    return await collection.deleteOne(query);
  }
}

export default Project;
