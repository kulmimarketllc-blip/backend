export declare enum ContentModerationAction {
    APPROVE = "approve",
    REJECT = "reject",
    REMOVE = "remove",
    SUSPEND_MERCHANT = "suspend_merchant",
    CLEAR_FLAGS = "clear_flags"
}
export declare class ContentModerationDto {
    action: ContentModerationAction;
    reason: string;
    internalNote?: string;
}
