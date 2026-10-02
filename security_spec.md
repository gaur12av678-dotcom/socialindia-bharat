# SocialIndia Security Specification & Rules Validation

This specification defines the strict zero-trust security invariants and access control model for the SocialIndia database. It ensures data confidentiality, data integrity, identity safety, and robust access patterns.

## 1. Core Data Invariants

1. **Identity Integrity**: No user may spoof another user's identity. Fields like `uid`, `creatorId`, `uid`, and `reporterId` must match the authenticated user's `request.auth.uid`.
2. **Relational Consistency (Master Gate)**:
   - Comments on a video (`videos/{videoId}/comments/{commentId}`) require the parent video document to exist.
   - Likes on a video (`videos/{videoId}/likes/{uid}`) require the parent video document to exist.
3. **Immutable Auditing**: `createdAt` timestamps cannot be changed after creation, and `updatedAt` must always match `request.time` exactly.
4. **Role Escalation Prevention**: A user's `role` cannot be modified by the user themselves. The role is managed securely and can only be set or modified by an administrator.
5. **PII and Private Data Isolation**: User settings and private PII are isolated in the `users/{uid}/private/info` subcollection and are strictly accessible only by the owner of that profile.
6. **Notification Ownership**: Users can only read or modify their own notifications.
7. **Content Ownership**: Only the creator of a video can update or delete it. Only the author of a comment can update or delete it.
8. **Report Security**: Any authenticated user can submit a report. However, reports can only be read and updated by moderators or admins.

---

## 2. The "Dirty Dozen" Security Violations (TDD Payloads)

Below are 12 malicious payloads designed to attempt to break the laws of Identity, Integrity, and State. Security rules are mathematically constructed to block these payloads.

### Payload 1: Identity Spoofing (Write on other user's profile)
*   **Path**: `users/victim_uid_999`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `{ "uid": "victim_uid_999", "username": "attacker", "displayName": "Attacker", "role": "user" }`
*   **Expectation**: `PERMISSION_DENIED` (Cannot write to a profile that is not yours).

### Payload 2: Privilege Escalation (Self-assign Admin role)
*   **Path**: `users/attacker_uid_111`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `{ "uid": "attacker_uid_111", "username": "attacker", "displayName": "Attacker", "role": "admin", "status": "active" }`
*   **Expectation**: `PERMISSION_DENIED` (Cannot set your own role to 'admin').

### Payload 3: Video Hijacking (Edit another creator's video)
*   **Path**: `videos/victim_video_456`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `{ "title": "Hacked Video Title", "creatorId": "victim_creator_uid" }`
*   **Expectation**: `PERMISSION_DENIED` (Only the owner `creatorId` can update).

### Payload 4: Orphaned Comment Creation (Comment on non-existent video)
*   **Path**: `videos/fake_video_123/comments/comment_777`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `{ "commentId": "comment_777", "videoId": "fake_video_123", "uid": "attacker_uid_111", "text": "Injected comment!" }`
*   **Expectation**: `PERMISSION_DENIED` (Requires parent video document to exist).

### Payload 5: Comment Hijacking (Delete another user's comment)
*   **Path**: `videos/video_123/comments/victim_comment_888`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `DELETE`
*   **Expectation**: `PERMISSION_DENIED` (Only comment author can delete).

### Payload 6: Denial of Wallet (Resource Exhaustion via ID poisoning)
*   **Path**: `videos/VERY_LONG_GARBAGE_ID_EXCEEDING_LIMITS_99999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `{ "videoId": "VERY_LONG...", "title": "My Video" }`
*   **Expectation**: `PERMISSION_DENIED` (ID size checks and format validation fail).

### Payload 7: PII Data Leak (Read another user's private info)
*   **Path**: `users/victim_uid_999/private/info`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `GET`
*   **Expectation**: `PERMISSION_DENIED` (Only owner can read private info).

### Payload 8: History Eavesdropping (Read another user's watch history)
*   **Path**: `users/victim_uid_999/history/video_111`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `GET`
*   **Expectation**: `PERMISSION_DENIED` (Only the corresponding user can read their watch history).

### Payload 9: Notification Scraping (Read other users' notifications)
*   **Path**: `users/victim_uid_999/notifications/notification_444`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `GET` / `LIST`
*   **Expectation**: `PERMISSION_DENIED` (Only recipient can query).

### Payload 10: Report Tampering (Modify or delete submitted content reports)
*   **Path**: `reports/report_333`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `{ "status": "resolved" }`
*   **Expectation**: `PERMISSION_DENIED` (Only admin/moderator can update reports).

### Payload 11: Fake Timestamp (Spoofing Server time)
*   **Path**: `videos/video_123`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `{ "createdAt": "2000-01-01T00:00:00Z", "title": "Cheated Timestamp" }`
*   **Expectation**: `PERMISSION_DENIED` (Requires `createdAt` to match `request.time`).

### Payload 12: Duplicate/Invalid Like Injection (Liking on behalf of another user)
*   **Path**: `videos/video_123/likes/victim_uid`
*   **Actor**: `attacker_uid_111`
*   **Payload**: `{ "uid": "victim_uid", "videoId": "video_123", "createdAt": "request.time" }`
*   **Expectation**: `PERMISSION_DENIED` (The document ID of the like must match the sender's UID, and the payload's uid must also match the sender's UID).

---

## 3. Test Verification Rules Pattern

These cases are explicitly tested in `firestore.rules` by matching:
1. Is User Signed In?
2. Is Document ID valid and safe?
3. Does incoming sender ID match authenticated user ID?
4. Is schema validation helper function returning true?
5. If subcollection: Does parent parent resource exist?
