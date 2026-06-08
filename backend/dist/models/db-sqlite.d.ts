import { EventEmitter } from 'events';
interface QueryResult {
    rows: Record<string, unknown>[];
    rowCount: number;
}
declare class SQLiteDB extends EventEmitter {
    private db;
    private initPromise;
    private readonly dataDir;
    private readonly dbPath;
    totalCount: number | null;
    idleCount: number | null;
    waitingCount: number | null;
    constructor();
    private init;
    private ensureSchema;
    private save;
    private run;
    private all;
    query(sql: string, params?: unknown[]): Promise<QueryResult>;
    end(): Promise<void>;
}
declare const sqliteDB: SQLiteDB;
export default sqliteDB;
//# sourceMappingURL=db-sqlite.d.ts.map