export interface User {
    id: number;
    name: string;
    email: string;
    password_hash?: string;
    phone?: string;
    location?: string;
    image_url?: string;
    created_at: Date;
    updated_at: Date;
}
export interface UpdateProfileData {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    image_url?: string;
}
export declare class UserModel {
    static create(name: string, email: string, password: string): Promise<User>;
    static findByEmail(email: string): Promise<User | null>;
    static findById(id: number): Promise<User | null>;
    static updateProfile(userId: number, data: UpdateProfileData): Promise<User | null>;
    static verifyPassword(email: string, password: string): Promise<User | null>;
}
//# sourceMappingURL=User.d.ts.map