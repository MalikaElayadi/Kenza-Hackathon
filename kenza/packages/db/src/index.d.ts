export declare class Database {
    private client;
    constructor(connectionString: string);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query(sql: string, params?: any[]): Promise<any>;
}
export default Database;
//# sourceMappingURL=index.d.ts.map