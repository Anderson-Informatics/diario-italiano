// Integration test setup - runs before each test file
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test-db'
process.env.JWT_SECRET = 'test-secret-key-for-integration-tests'