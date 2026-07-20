import { DisputeStatus } from '../../database/entities/sub-admin-features.entity';
export declare class UpdateDisputeStatusDto {
    status: DisputeStatus;
    note?: string;
}
export declare class ResolveDisputeDto {
    resolution: string;
    notes?: string;
}
export declare class DisputeNoteDto {
    note: string;
}
