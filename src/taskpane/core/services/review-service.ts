/**
 * @issue #57
 */
/* eslint-disable no-undef */
/* global Excel */
import { ReviewerComment, ReviewerCommentStatus } from "../types/reviewer";

const REVIEW_XML_NAMESPACE = "http://schemas.crf-xl.com/review";

/**
 * Serializes a reviewer comment to XML string.
 */
function serializeComment(comment: ReviewerComment): string {
  return `<ReviewerComment>
    <Id>${comment.id}</Id>
    <Author>${comment.author}</Author>
    <Text><![CDATA[${comment.text}]]></Text>
    <Timestamp>${comment.timestamp}</Timestamp>
    <Status>${comment.status}</Status>
    <TargetEntityId>${comment.targetEntityId}</TargetEntityId>
    <ResolvedBy>${comment.resolvedBy || ""}</ResolvedBy>
    <ResolvedAt>${comment.resolvedAt || ""}</ResolvedAt>
  </ReviewerComment>`;
}

/**
 * Deserializes a reviewer comment from an XML element.
 */
function deserializeComment(element: Element): ReviewerComment {
  const getTagValue = (tagName: string) => {
    const el = element.getElementsByTagName(tagName)[0];
    return el ? el.textContent : "";
  };

  return {
    id: getTagValue("Id") || "",
    author: getTagValue("Author") || "",
    text: getTagValue("Text") || "",
    timestamp: getTagValue("Timestamp") || "",
    status: (getTagValue("Status") as ReviewerCommentStatus) || "open",
    targetEntityId: getTagValue("TargetEntityId") || "",
    resolvedBy: getTagValue("ResolvedBy") || undefined,
    resolvedAt: getTagValue("ResolvedAt") || undefined,
  };
}

/**
 * Saves a single reviewer comment to the CustomXmlParts store.
 */
export async function saveComment(comment: ReviewerComment): Promise<void> {
  await saveCommentsBatch([comment]);
}

/**
 * Saves multiple reviewer comments to the CustomXmlParts store.
 */
export async function saveCommentsBatch(comments: ReviewerComment[]): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    const parts = context.workbook.customXmlParts.getByNamespace(REVIEW_XML_NAMESPACE);
    parts.load("items");
    await context.sync();

    let xmlDoc: Document;
    let part: Excel.CustomXmlPart;

    if (parts.items.length === 0) {
      const initialXml = `<ReviewerComments xmlns="${REVIEW_XML_NAMESPACE}"></ReviewerComments>`;
      part = context.workbook.customXmlParts.add(initialXml);
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString(initialXml, "text/xml");
    } else {
      part = parts.items[0];
      (part as any).load("xml");
      await context.sync();
      const parser = new DOMParser();
      xmlDoc = parser.parseFromString((part as any).xml, "text/xml");
    }

    const root = xmlDoc.getElementsByTagName("ReviewerComments")[0];
    const existingNodes = Array.from(xmlDoc.getElementsByTagName("ReviewerComment"));

    for (const comment of comments) {
      let existingNode: Element | null = null;
      for (const node of existingNodes) {
        const idNode = node.getElementsByTagName("Id")[0];
        if (idNode && idNode.textContent === comment.id) {
          existingNode = node;
          break;
        }
      }

      const commentXml = serializeComment(comment);
      const tempDoc = new DOMParser().parseFromString(commentXml, "text/xml");
      const newNode = xmlDoc.importNode(tempDoc.documentElement, true);

      if (existingNode) {
        root.replaceChild(newNode, existingNode);
      } else {
        root.appendChild(newNode);
      }
    }

    const serializer = new XMLSerializer();
    const finalXml = serializer.serializeToString(xmlDoc);
    part.setXml(finalXml);
    await context.sync();
  });
}

/**
 * Loads all reviewer comments from the CustomXmlParts store.
 */
export async function loadComments(): Promise<ReviewerComment[]> {
  const comments: ReviewerComment[] = [];
  if (typeof Excel === "undefined") return comments;

  await Excel.run(async (context) => {
    const parts = context.workbook.customXmlParts.getByNamespace(REVIEW_XML_NAMESPACE);
    parts.load("items");
    await context.sync();

    if (parts.items.length > 0) {
      const part = parts.items[0];
      (part as any).load("xml");
      await context.sync();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString((part as any).xml, "text/xml");
      const nodes = xmlDoc.getElementsByTagName("ReviewerComment");
      for (let i = 0; i < nodes.length; i++) {
        comments.push(deserializeComment(nodes[i]));
      }
    }
  });

  return comments;
}

/**
 * Deletes a comment from the store.
 */
export async function deleteComment(id: string): Promise<void> {
  if (typeof Excel === "undefined") return;

  await Excel.run(async (context) => {
    const parts = context.workbook.customXmlParts.getByNamespace(REVIEW_XML_NAMESPACE);
    parts.load("items");
    await context.sync();

    if (parts.items.length > 0) {
      const part = parts.items[0];
      (part as any).load("xml");
      await context.sync();

      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString((part as any).xml, "text/xml");
      const root = xmlDoc.getElementsByTagName("ReviewerComments")[0];
      const nodes = Array.from(xmlDoc.getElementsByTagName("ReviewerComment"));

      for (const node of nodes) {
        const idNode = node.getElementsByTagName("Id")[0];
        if (idNode && idNode.textContent === id) {
          root.removeChild(node);
          break;
        }
      }

      const serializer = new XMLSerializer();
      const finalXml = serializer.serializeToString(xmlDoc);
      part.setXml(finalXml);
      await context.sync();
    }
  });
}

/**
 * Resolves or reopens a comment.
 */
export async function updateCommentStatus(
  id: string,
  status: ReviewerCommentStatus,
  reviewerName?: string
): Promise<void> {
  const comments = await loadComments();
  const comment = comments.find(c => c.id === id);
  if (comment) {
    comment.status = status;
    if (status === "resolved") {
      comment.resolvedBy = reviewerName;
      comment.resolvedAt = new Date().toISOString();
    } else {
      comment.resolvedBy = undefined;
      comment.resolvedAt = undefined;
    }
    await saveComment(comment);
  }
}
