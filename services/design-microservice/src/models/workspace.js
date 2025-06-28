import { MongoClient, ObjectId } from 'mongodb';
import logger from '/app/src/utils/logger.js';

class Workspace {
  static async findByUserId(userId) {
    const db = await this.connect();
    const collection = db.collection('workspaces');
    return await collection.find({ userId }).toArray();
  }

  static async create(data) {
    const db = await this.connect();
    const collection = db.collection('workspaces');
    const result = await collection.insertOne(data);
    return { id: result.insertedId, ...data };
  }

  static async update(id, data) {
    const db = await this.connect();
    const collection = db.collection('workspaces');
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return await this.findById(id);
  }

  static async delete(id) {
    const db = await this.connect();
    const collection = db.collection('workspaces');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
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
