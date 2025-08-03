# Firebase Configuration Setup

To enable authentication in your LiveShop app, you need to set up Firebase:

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Authentication in the Firebase console
4. Enable Email/Password and Google sign-in methods

## 2. Get your Firebase configuration

1. In your Firebase project, go to Project Settings
2. Scroll down to "Your apps" and add a web app
3. Copy the Firebase configuration object

## 3. Update the Firebase config

Replace the placeholder values in `src/firebase/config.js` with your actual Firebase configuration:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

## 4. Set up Firestore (optional)

If you want to store user profiles:
1. Enable Firestore Database in your Firebase console
2. Set up security rules as needed

## Current Features

- ✅ Email/Password authentication
- ✅ Google sign-in
- ✅ Protected routes
- ✅ User profile integration
- ✅ Logout functionality
- ✅ Loading states
- ✅ Error handling

## Usage

- Users must authenticate to access the live streaming page
- The app will redirect unauthenticated users to `/auth`
- Authenticated users are redirected away from the auth page
- User information is displayed in the live streaming interface
