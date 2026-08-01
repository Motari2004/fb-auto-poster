import { neon } from '@neondatabase/serverless';

// Use the DATABASE_URL from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in environment variables');
}

// Create neon client
const sql = neon(DATABASE_URL);

// Initialize database tables
export async function initDb() {
  try {
    // Create app_state table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Neon Database initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
}

// Get state value
export async function getState(key) {
  try {
    const result = await sql`
      SELECT value FROM app_state WHERE key = ${key}
    `;
    if (result.length === 0) {
      return null;
    }
    return result[0].value;
  } catch (error) {
    console.error(`❌ Error getting state ${key}:`, error);
    return null;
  }
}

// Set state value
export async function setState(key, value) {
  try {
    await sql`
      INSERT INTO app_state (key, value, updated_at)
      VALUES (${key}, ${JSON.stringify(value)}, CURRENT_TIMESTAMP)
      ON CONFLICT (key) 
      DO UPDATE SET value = ${JSON.stringify(value)}, updated_at = CURRENT_TIMESTAMP
    `;
    return true;
  } catch (error) {
    console.error(`❌ Error setting state ${key}:`, error);
    return false;
  }
}

// Get all states
export async function getAllStates() {
  try {
    const result = await sql`
      SELECT * FROM app_state ORDER BY updated_at DESC
    `;
    return result;
  } catch (error) {
    console.error('❌ Error getting all states:', error);
    return [];
  }
}

// Delete state
export async function deleteState(key) {
  try {
    await sql`
      DELETE FROM app_state WHERE key = ${key}
    `;
    return true;
  } catch (error) {
    console.error(`❌ Error deleting state ${key}:`, error);
    return false;
  }
}

// Test connection
export async function testConnection() {
  try {
    const result = await sql`SELECT 1 as connected`;
    return result[0]?.connected === 1;
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    return false;
  }
}