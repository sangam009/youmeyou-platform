import { MongoClient, ObjectId } from 'mongodb';
import logger from '../utils/logger.js';

class Workspace {
  static async findByUserId(userId) {
    try {
      const client = await MongoClient.connect(process.env.MONGODB_URI);
      const db = client.db();
      const workspaces = await db.collection('workspaces').find({ userId }).toArray();
      client.close();
      return workspaces;
    } catch (error) {
      logger.error('Error finding workspaces:', error);
      throw error;
    }
  }

  static async create(data) {
    try {
      const client = await MongoClient.connect(process.env.MONGODB_URI);
      const db = client.db();
      const result = await db.collection('workspaces').insertOne(data);
      client.close();
      return { ...data, _id: result.insertedId };
    } catch (error) {
      logger.error('Error creating workspace:', error);
      throw error;
    }
  }

  static async update(id, data) {
    try {
      const client = await MongoClient.connect(process.env.MONGODB_URI);
      const db = client.db();
      const result = await db.collection('workspaces').findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: data },
        { returnDocument: 'after' }
      );
      client.close();
      return result.value;
    } catch (error) {
      logger.error('Error updating workspace:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      const client = await MongoClient.connect(process.env.MONGODB_URI);
      const db = client.db();
      const result = await db.collection('workspaces').deleteOne({ _id: new ObjectId(id) });
      client.close();
      return result.deletedCount > 0;
    } catch (error) {
      logger.error('Error deleting workspace:', error);
      throw error;
    }
  }

  static async findById(id) {
    const db = await this.connect();
    const collection = db.collection('workspaces');
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async connect() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    const dbName = process.env.MONGODB_DB || 'designmicroservice';
    const client = await MongoClient.connect(uri);
    return client.db(dbName);
  }
}

export default Workspace;
