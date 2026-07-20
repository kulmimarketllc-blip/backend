import { UserRole } from '../../database/entities/user.entity';
export declare class ListUsersDto {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    status?: 'active' | 'inactive' | 'suspended';
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
}
