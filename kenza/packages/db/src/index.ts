// Database connection and utilities
import { Client } from 'pg';

export class Database {
  private client: Client;

  constructor(connectionString: string) {
    this.client = new Client({ connectionString });
  }

  async connect() {
    await this.client.connect();
  }

  async disconnect() {
    await this.client.end();
  }

  async query(sql: string, params?: any[]) {
    return this.client.query(sql, params);
  }
}

export default Database;
