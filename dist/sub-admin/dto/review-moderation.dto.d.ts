export declare enum ReviewModerationAction {
    APPROVE = "approve",
    REJECT = "reject",
    REMOVE = "remove",
    CLEAR_FLAGS = "clear_flags"
}
export declare class ReviewModerationDto {
    action: ReviewModerationAction;
    reason: string;
    internalNote?: string;
}
