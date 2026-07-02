/** @issue #331 */
export type AnnouncementPriority = "polite" | "assertive";

interface Announcement {
  id: number;
  message: string;
  priority: AnnouncementPriority;
}

type AnnouncerSubscriber = (announcement: Announcement) => void;

class AnnouncerUtility {
  private subscribers = new Set<AnnouncerSubscriber>();
  private messageId = 0;
  private lastMessage = "";
  private lastAnnounceTime = 0;
  private lastPercentageReported = -1;

  public subscribe(callback: AnnouncerSubscriber) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  public announce(message: string, priority: AnnouncementPriority = "polite") {
    if (message === this.lastMessage) return;

    // Check for percentage-based progress updates
    const match = message.match(/(\d+)%/);
    if (match) {
      const percentage = parseInt(match[1], 10);
      const boundary = Math.floor(percentage / 25) * 25;

      if (boundary === this.lastPercentageReported && percentage !== 100 && percentage !== 0) {
        return; // throttle until next 25% boundary
      }
      this.lastPercentageReported = boundary;
    } else {
      const now = Date.now();
      // Throttle high-frequency polite updates, except for completion or cancellation events
      const isTerminal = message.includes("Complete") || message.includes("Cancelled");
      if (!isTerminal && priority === "polite" && now - this.lastAnnounceTime < 2000) {
        return;
      }
    }

    this.lastMessage = message;
    this.lastAnnounceTime = Date.now();

    const announcement = { id: ++this.messageId, message, priority };
    this.subscribers.forEach((sub) => sub(announcement));
  }
}

export const announcer = new AnnouncerUtility();
