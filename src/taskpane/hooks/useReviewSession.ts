/**
 * @issue #57
 */
import { useState, useEffect, useCallback } from "react";
import { ReviewerComment } from "../core/types/reviewer";
import { loadComments, saveComment, updateCommentStatus, deleteComment as deleteCommentFromStore } from "../core/services/review-service";
import { v4 as uuidv4 } from "uuid";

export const useReviewSession = (reviewerName: string) => {
  const [comments, setComments] = useState<ReviewerComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshComments = useCallback(async () => {
    setIsLoading(true);
    try {
      const loaded = await loadComments();
      setComments(loaded);
    } catch (error) {
      console.error("Failed to load reviewer comments", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshComments();
  }, [refreshComments]);

  const addComment = async (text: string, targetEntityId: string) => {
    const newComment: ReviewerComment = {
      id: uuidv4(),
      author: reviewerName,
      text,
      timestamp: new Date().toISOString(),
      status: "open",
      targetEntityId,
    };

    await saveComment(newComment);
    setComments(prev => [...prev, newComment]);
  };

  const resolveComment = async (id: string) => {
    await updateCommentStatus(id, "resolved", reviewerName);
    setComments(prev => prev.map(c => c.id === id ? {
      ...c,
      status: "resolved",
      resolvedBy: reviewerName,
      resolvedAt: new Date().toISOString()
    } : c));
  };

  const reopenComment = async (id: string) => {
    await updateCommentStatus(id, "open");
    setComments(prev => prev.map(c => c.id === id ? {
      ...c,
      status: "open",
      resolvedBy: undefined,
      resolvedAt: undefined
    } : c));
  };

  const deleteComment = async (id: string) => {
    await deleteCommentFromStore(id);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  return {
    comments,
    isLoading,
    addComment,
    resolveComment,
    reopenComment,
    deleteComment,
    refreshComments,
  };
};
