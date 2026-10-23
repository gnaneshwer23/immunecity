/** Member data export and deletion plans. Browser-safe. Never touches evidence rows. */

export const REMOVED_MEMBER_NAME = "Removed member";
export const DELETE_CONFIRMATION = "delete-my-data";

export type PrivacyProfile = {
  userId: string;
  displayName: string;
  bio: string | null;
  affiliation: string | null;
  credential: string | null;
  interests: string[];
  visibility: string;
};

export type PrivacyPost = { id: string; authorId: string; title: string; body: string; status: string };
export type PrivacyComment = { id: string; authorId: string; postId: string; body: string; status: string };
export type PrivacySave = { id: string; userId: string; targetType: string; targetId: string };
export type PrivacyFollow = { id: string; userId: string; kind: "post" | "topic"; targetId: string };
export type PrivacyNotification = { id: string; userId: string; kind: string; body: string };
export type PrivacyConceptSave = { id: string; userId: string; conceptId: string };

export type PrivacyBundle = {
  profiles: readonly PrivacyProfile[];
  posts: readonly PrivacyPost[];
  comments: readonly PrivacyComment[];
  saves: readonly PrivacySave[];
  follows: readonly PrivacyFollow[];
  notifications: readonly PrivacyNotification[];
  conceptSaves: readonly PrivacyConceptSave[];
  /** Present only so a plan can prove these ids are not deleted. */
  evidenceIds?: readonly string[];
};

export type MemberExport = {
  profile: PrivacyProfile | null;
  posts: PrivacyPost[];
  comments: PrivacyComment[];
  saves: PrivacySave[];
  follows: PrivacyFollow[];
  notifications: PrivacyNotification[];
  conceptSaves: PrivacyConceptSave[];
};

/** One member's own rows. Other people's profiles, posts and evidence stay out. */
export function exportForMember(userId: string, bundle: PrivacyBundle): MemberExport {
  const id = userId.trim();
  return {
    profile: bundle.profiles.find((row) => row.userId === id) ?? null,
    posts: bundle.posts.filter((row) => row.authorId === id),
    comments: bundle.comments.filter((row) => row.authorId === id),
    saves: bundle.saves.filter((row) => row.userId === id),
    follows: bundle.follows.filter((row) => row.userId === id),
    notifications: bundle.notifications.filter((row) => row.userId === id),
    conceptSaves: bundle.conceptSaves.filter((row) => row.userId === id),
  };
}

export type MemberDeletionPlan = {
  userId: string;
  anonymizedProfile: PrivacyProfile | null;
  retainedPostIds: string[];
  retainedCommentIds: string[];
  deleteNotificationIds: string[];
  deleteSaveIds: string[];
  deleteFollowIds: string[];
  deleteConceptSaveIds: string[];
  evidenceIds: string[];
  writesGraph: false;
  changesRoles: false;
};

/**
 * Clear this member's personal fields, notifications, saves and follows.
 * Posts and comments stay, with the display name removed via the profile.
 * Evidence ids are copied through unchanged and are not a delete list.
 */
export function planMemberDeletion(userId: string, bundle: PrivacyBundle): MemberDeletionPlan {
  const mine = exportForMember(userId, bundle);
  return {
    userId: userId.trim(),
    anonymizedProfile: mine.profile
      ? {
          ...mine.profile,
          displayName: REMOVED_MEMBER_NAME,
          bio: null,
          affiliation: null,
          credential: null,
          interests: [],
        }
      : null,
    retainedPostIds: mine.posts.map((row) => row.id),
    retainedCommentIds: mine.comments.map((row) => row.id),
    deleteNotificationIds: mine.notifications.map((row) => row.id),
    deleteSaveIds: mine.saves.map((row) => row.id),
    deleteFollowIds: mine.follows.map((row) => row.id),
    deleteConceptSaveIds: mine.conceptSaves.map((row) => row.id),
    evidenceIds: [...(bundle.evidenceIds ?? [])],
    writesGraph: false,
    changesRoles: false,
  };
}
