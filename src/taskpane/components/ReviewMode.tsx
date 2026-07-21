/* eslint-disable react/forbid-dom-props, react/forbid-component-props -- Temporary layout style exemption for legacy view */
/**
 * @issue #57
 */
import * as React from "react";
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Textarea,
  Card,
  CardHeader,
  CardFooter,
  Badge,
  Body1,
  Caption1,
  Divider,
} from "@fluentui/react-components";
import {
  CommentRegular,
  CheckmarkCircleRegular,
  ArrowClockwiseRegular,
  DeleteRegular,
} from "@fluentui/react-icons";
import { ReviewerComment } from "../core/types/reviewer";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderLeft: `1px solid ${tokens.colorNeutralStroke1}`,
    width: "300px",
    height: "100%",
    overflowY: "auto",
  },
  commentCard: {
    backgroundColor: tokens.colorNeutralBackground1,
  },
  resolvedCard: {
    opacity: 0.7,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  commentText: {
    marginTop: "8px",
    whiteSpace: "pre-wrap",
  },
  footer: {
    display: "flex",
    gap: "8px",
    justifyContent: "flex-end",
  },
  newCommentArea: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    marginBottom: "12px",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    textAlign: "center",
    color: tokens.colorNeutralForeground4,
  },
});

interface ReviewModeProps {
  comments: ReviewerComment[];
  selectedEntityId: string | null;
  onAddComment: (text: string, entityId: string) => Promise<void>;
  onResolveComment: (id: string) => Promise<void>;
  onReopenComment: (id: string) => Promise<void>;
  onDeleteComment: (id: string) => Promise<void>;
}

export const ReviewMode: React.FC<ReviewModeProps> = ({
  comments,
  selectedEntityId,
  onAddComment,
  onResolveComment,
  onReopenComment,
  onDeleteComment,
}) => {
  const styles = useStyles();
  const [newCommentText, setNewCommentText] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const filteredComments = selectedEntityId
    ? comments.filter((c) => c.targetEntityId === selectedEntityId)
    : comments;

  const handleAddComment = async () => {
    if (!newCommentText.trim() || !selectedEntityId) return;
    setIsSubmitting(true);
    try {
      await onAddComment(newCommentText, selectedEntityId);
      setNewCommentText("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <Text weight="semibold">Review Comments</Text>
        <Badge appearance="tint" color="informative">
          {filteredComments.length}
        </Badge>
      </div>

      {selectedEntityId && (
        <div className={styles.newCommentArea}>
          <Caption1>
            Adding comment for: <strong>{selectedEntityId}</strong>
          </Caption1>
          <Textarea
            placeholder="Type a review comment..."
            value={newCommentText}
            onChange={(_, data) => setNewCommentText(data.value)}
            rows={3}
          />
          <Button
            appearance="primary"
            size="small"
            disabled={!newCommentText.trim() || isSubmitting}
            onClick={handleAddComment}
          >
            Add Comment
          </Button>
        </div>
      )}

      <Divider />

      {filteredComments.length === 0 ? (
        <div className={styles.emptyState}>
          <CommentRegular fontSize={40} />
          <Body1>No comments {selectedEntityId ? "for this item" : "yet"}.</Body1>
          {selectedEntityId ? (
            <Caption1>Use the box above to pin a new comment.</Caption1>
          ) : (
            <Caption1>Select an item in the preview to add a comment.</Caption1>
          )}
        </div>
      ) : (
        filteredComments.map((comment) => (
          <Card
            key={comment.id}
            className={comment.status === "resolved" ? styles.resolvedCard : styles.commentCard}
          >
            <CardHeader
              header={
                <Text weight="semibold" size={200}>
                  {comment.author}
                </Text>
              }
              description={
                <Caption1>
                  {new Date(comment.timestamp).toLocaleString()}
                  {comment.status === "resolved" && ` • Resolved by ${comment.resolvedBy}`}
                </Caption1>
              }
              action={
                <Button
                  appearance="subtle"
                  icon={<DeleteRegular />}
                  onClick={() => onDeleteComment(comment.id)}
                />
              }
            />
            <Body1 className={styles.commentText}>{comment.text}</Body1>
            {comment.targetEntityId !== selectedEntityId && (
              <Caption1 italic style={{ marginTop: "4px" }}>
                Target: {comment.targetEntityId}
              </Caption1>
            )}
            <CardFooter className={styles.footer}>
              {comment.status === "open" ? (
                <Button
                  size="small"
                  icon={<CheckmarkCircleRegular />}
                  onClick={() => onResolveComment(comment.id)}
                >
                  Resolve
                </Button>
              ) : (
                <Button
                  size="small"
                  icon={<ArrowClockwiseRegular />}
                  onClick={() => onReopenComment(comment.id)}
                >
                  Reopen
                </Button>
              )}
            </CardFooter>
          </Card>
        ))
      )}
    </div>
  );
};
