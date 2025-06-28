const { MongoClient, ObjectId } = require('mongodb');
const logger = require('../utils/logger');

class WorkspaceModel {
  constructor() {
    this.uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    this.dbName = process.env.MONGODB_DB || 'designmicroservice';
    this.client = null;
    this.db = null;
  }

  async connect() {
    if (!this.client) {
      this.client = new MongoClient(this.uri);
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      logger.info('Connected to MongoDB for workspaces');
    }
    return this.db;
  }

  async getCollection() {
    const db = await this.connect();
    return db.collection('workspaces');
  }
}

// Create a singleton instance
const workspaceModel = new WorkspaceModel();

// Workspace class that mimics Mongoose behavior
class Workspace {
  constructor(data) {
    this.name = data.name;
    this.userId = data.userId;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    const collection = await workspaceModel.getCollection();
    const result = await collection.insertOne({
      name: this.name,
      userId: this.userId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });
    
    this._id = result.insertedId;
    return this;
  }

  static async find(query = {}) {
    const collection = await workspaceModel.getCollection();
    const cursor = collection.find(query);
    return await cursor.toArray();
  }

  static async findOne(query = {}) {
    const collection = await workspaceModel.getCollection();
    return await collection.findOne(query);
  }

  static async findById(id) {
    const collection = await workspaceModel.getCollection();
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async updateOne(query, update) {
    const collection = await workspaceModel.getCollection();
    return await collection.updateOne(query, { $set: { ...update, updatedAt: new Date() } });
  }

  static async deleteOne(query) {
    const collection = await workspaceModel.getCollection();
    return await collection.deleteOne(query);
  }

  // Method to select specific fields (mimics Mongoose .select())
  static select(fields) {
    return {
      async find(query = {}) {
        const collection = await workspaceModel.getCollection();
        const projection = {};
        if (typeof fields === 'string') {
          fields.split(' ').forEach(field => {
            if (field.startsWith('-')) {
              projection[field.slice(1)] = 0;
            } else {
              projection[field] = 1;
            }
          });
        }
        return await collection.find(query, { projection }).toArray();
      }
    };
  }
}

export default Workspace;
