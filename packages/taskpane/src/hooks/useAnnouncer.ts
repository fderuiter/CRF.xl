/** @issue #331 */
import { useState, useEffect } from "react";
import { announcer, AnnouncementPriority } from "@crf-xl/core/services/announcer";


export const useAnnouncer = () => {
  const [announcement, setAnnouncement] = useState<{
    id: number;
    message: string;
    priority: AnnouncementPriority;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = announcer.subscribe((newAnnouncement) => {
      setAnnouncement(newAnnouncement);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  return { announcement, announce: announcer.announce.bind(announcer) };
};
