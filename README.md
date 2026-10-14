# SocialIndia - Indian own Video Sharing  Platform

SocialIndia is India's home-grown premium video-sharing and creator economy platform. Built with React, TypeScript, Vite, Tailwind CSS v4, and Firebase Firestore/Auth/Storage.

---

## 🚀 Setup & Installation Instructions

Follow these steps to run the application locally or deploy it to a production hosting service.

### 1. Environment Configuration

Create a `.env` file in the root directory (based on `.env.example`) and supply your credentials:

```bash
# Cloudinary Configuration (Unsigned video/image uploads)
VITE_CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_upload_preset
```

### 2. Firebase App Config

The application retrieves its credentials from a static config file `/firebase-applet-config.json` in the root workspace. Create this file with your target Google Firebase parameters:

```json
{
  "apiKey": "your-firebase-api-key",
  "authDomain": "your-project-id.firebaseapp.com",
  "projectId": "your-project-id",
  "storageBucket": "your-project-id.firebasestorage.app",
  "messagingSenderId": "your-sender-id",
  "appId": "your-app-id"
}
```

### 3. Deploy Firestore & Storage Security Rules

To enforce strict Least-Privilege access control policies across all collections and files, deploy the provided security rules using the Firebase CLI:

```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy Cloud Storage security rules
firebase deploy --only storage:rules
```

### 4. Direct Admin Promotion Steps

For strict security, **all client-side self-promotional privileges have been removed**. To assign the super-admin role to a platform manager:

1. Open your target [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Firestore Database** -> **`users`** collection.
3. Select the target user's document corresponding to their `uid` or `username`.
4. Modify the `role` field value from `"user"` or `"creator"` to `"admin"`.
5. Save the document. Role synchronization will reflect on the client immediately!

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React 19 (SPA), TypeScript, Vite
- **Styling**: Tailwind CSS v4 (Zero-Pill design)
- **Database / Auth**: Firebase Firestore & Firebase Authentication
- **Service Worker**: PWA Caching static same-origin shell assets with anti-PII caching filters
