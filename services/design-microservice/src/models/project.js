// Placeholder for Project model
// In future: define schema, DB integration, etc.

import { MongoClient, ObjectId } from 'mongodb';

class Project {
  static async connect() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB || 'designmicroservice';
    const client = await MongoClient.connect(uri);
    return client.db(dbName);
  }

  static async create(data) {
    const db = await this.connect();
    const collection = db.collection('projects');
    const result = await collection.insertOne({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id: result.insertedId, ...data };
  }

  static async findById(id) {
    const db = await this.connect();
    const collection = db.collection('projects');
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async findByWorkspaceId(workspaceId) {
    const db = await this.connect();
    const collection = db.collection('projects');
    return await collection.find({ workspaceId }).toArray();
  }

  static async update(id, data) {
    const db = await this.connect();
    const collection = db.collection('projects');
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );
    return await this.findById(id);
  }

  static async delete(id) {
    const db = await this.connect();
    const collection = db.collection('projects');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}

export default Project;
