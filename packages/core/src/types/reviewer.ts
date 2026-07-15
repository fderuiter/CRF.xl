/**
 * @issue #57
 */

export type ReviewerCommentStatus = "open" | "resolved";

export interface ReviewerComment {
  id: string;
  author: string;
  text: string;
  timestamp: string;
  status: ReviewerCommentStatus;
  targetEntityId: string; // The itemOid or other clinical entity OID
  resolvedBy?: string;
  resolvedAt?: string;
}

export interface ReviewSessionState {
  reviewerName: string;
  comments: ReviewerComment[];
  isReviewModeActive: boolean;
}
