export declare enum UserModerationAction {
    WARN = "warn",
    SUSPEND = "suspend",
    RESTORE = "restore"
}
export declare class UserModerationDto {
    action: UserModerationAction;
    reason: string;
    notes?: string;
}
