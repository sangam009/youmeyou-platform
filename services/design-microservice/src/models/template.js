const { MongoClient } = require('mongodb');
const { ObjectId } = require('mongodb');

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const dbName = process.env.MONGODB_DB || 'designmicroservice';

let client;

async function connect() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db(dbName);
}

const Template = {
  async create({ name, projectId, data }) {
    const db = await connect();
    const result = await db.collection('templates').insertOne({
      name,
      projectId,
      data,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { id: result.insertedId, name, projectId, data };
  },

  async findById(id) {
    const db = await connect();
    return db.collection('templates').findOne({ _id: new ObjectId(id) });
  },

  async findByProjectId(projectId) {
    const db = await connect();
    return db.collection('templates').find({ projectId }).toArray();
  },

  async update(id, { name, data }) {
    const db = await connect();
    await db.collection('templates').updateOne(
      { _id: id },
      { $set: { name, data, updatedAt: new Date() } }
    );
    return { id, name, data };
  },

  async delete(id) {
    const db = await connect();
    await db.collection('templates').deleteOne({ _id: id });
    return { id };
  }
};

export default Template;
