export declare class ListFlaggedContentDto {
    page?: number;
    limit?: number;
    contentType?: 'product' | 'review' | 'comment';
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    minFlags?: number;
}
