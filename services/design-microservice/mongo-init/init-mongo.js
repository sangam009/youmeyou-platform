// MongoDB initialization script for design microservice

// Switch to design database
db = db.getSiblingDB('designmicroservice');

// Create collections with validation
db.createCollection('canvas_content', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['canvas_id', 'user_id', 'project_id', 'nodes', 'edges'],
      properties: {
        canvas_id: {
          bsonType: 'string',
          description: 'Unique canvas identifier'
        },
        user_id: {
          bsonType: 'string',
          description: 'User who owns the canvas'
        },
        project_id: {
          bsonType: 'int',
          description: 'Project this canvas belongs to'
        },
        nodes: {
          bsonType: 'array',
          description: 'Canvas nodes (components)'
        },
        edges: {
          bsonType: 'array',
          description: 'Canvas edges (connections)'
        },
        viewport: {
          bsonType: 'object',
          description: 'Canvas viewport settings'
        },
        metadata: {
          bsonType: 'object',
          description: 'Canvas metadata and settings'
        },
        collaboration: {
          bsonType: 'object',
          description: 'Real-time collaboration data'
        },
        analytics: {
          bsonType: 'object',
          description: 'Canvas usage analytics'
        }
      }
    }
  }
});

db.createCollection('canvas_versions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['canvas_id', 'version', 'user_id', 'snapshot'],
      properties: {
        canvas_id: {
          bsonType: 'string',
          description: 'Canvas identifier'
        },
        version: {
          bsonType: 'int',
          description: 'Version number'
        },
        user_id: {
          bsonType: 'string',
          description: 'User who created this version'
        },
        comment: {
          bsonType: 'string',
          description: 'Version comment'
        },
        snapshot: {
          bsonType: 'object',
          description: 'Canvas state snapshot'
        }
      }
    }
  }
});

// Create indexes for better performance
db.canvas_content.createIndex({ 'canvas_id': 1 }, { unique: true });
db.canvas_content.createIndex({ 'user_id': 1 });
db.canvas_content.createIndex({ 'project_id': 1 });
db.canvas_content.createIndex({ 'updated_at': -1 });
db.canvas_content.createIndex({ 'nodes.type': 1 });
db.canvas_content.createIndex({ 'metadata.tags': 1 });

db.canvas_versions.createIndex({ 'canvas_id': 1, 'version': -1 });
db.canvas_versions.createIndex({ 'created_at': -1 });
db.canvas_versions.createIndex({ 'user_id': 1 });

print('MongoDB initialized for design microservice');
print('Collections: canvas_content, canvas_versions');
print('Indexes created for optimal performance'); 