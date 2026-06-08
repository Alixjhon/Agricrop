export declare function testConnection(): Promise<boolean>;
export interface DatabaseWrapper {
    query(sql: string, params?: unknown[]): Promise<{
        rows: Record<string, unknown>[];
        rowCount: number;
    }>;
    readonly totalCount: number | null;
    readonly idleCount: number | null;
    readonly waitingCount: number | null;
    on(event: string, listener: (...args: unknown[]) => void): void;
    isUsingSQLite(): boolean;
    isUsingPostgreSQL(): boolean;
    end(): Promise<void>;
}
export declare const db: DatabaseWrapper;
export declare const useSQLite = false;
export default db;
//# sourceMappingURL=db.d.ts.map