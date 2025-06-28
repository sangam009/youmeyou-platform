import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'designmicroservice';

async function connect() {
  const client = await MongoClient.connect(uri);
  return client.db(dbName);
}

class Template {
  static async create({ name, projectId, data }) {
    const db = await connect();
    const collection = db.collection('templates');
    const result = await collection.insertOne({ name, projectId, data });
    const id = result.insertedId;
    return { id };
  }

  static async findById(id) {
    const db = await connect();
    const collection = db.collection('templates');
    return await collection.findOne({ _id: new ObjectId(id) });
  }

  static async update(id, data) {
    const db = await connect();
    const collection = db.collection('templates');
    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: data }
    );
    return await this.findById(id);
  }

  static async delete(id) {
    const db = await connect();
    const collection = db.collection('templates');
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  }
}

export default Template;
