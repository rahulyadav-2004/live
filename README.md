# 🎥 LiveShop - Real-Time Live Streaming Web App

A modern live streaming web application built with React, Firebase, and LiveKit. This app allows users to create and join live video streams with real-time chat, authentication, and secure token management.

## 🚀 Features

- **Real-time Video Streaming** with LiveKit WebRTC technology
- **User Authentication** with Firebase Auth (Google, Email/Password)
- **Live Stream Management** - Create, join, and end streams
- **Real-time Database** with Firestore for stream metadata
- **Secure Token Generation** via Firebase Cloud Functions
- **Responsive Design** with Tailwind CSS
- **Camera & Microphone Controls** with permission handling
- **Live Participant Tracking** in real-time
- **Modern UI/UX** with glassmorphism effects

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework with hooks
- **React Router DOM** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **LiveKit React Components** - Pre-built streaming components
- **Firebase SDK** - Authentication and Firestore

### Backend
- **Firebase Authentication** - User management
- **Firebase Firestore** - Real-time database
- **Firebase Cloud Functions** - Serverless backend
- **LiveKit Server SDK** - Token generation and room management

### Infrastructure
- **LiveKit Cloud** - WebRTC infrastructure
- **Firebase Hosting** - Frontend deployment
- **Firebase Functions** - Backend deployment

## � Prerequisites

Before setting up this project, you'll need:

1. **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
2. **Firebase Account** - [Sign up here](https://firebase.google.com/)
3. **LiveKit Account** - [Sign up here](https://livekit.io/)
4. **Git** - [Download here](https://git-scm.com/)

## 🔧 Setup Instructions

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd live

# Install dependencies
npm install

# Install Firebase CLI globally
npm install -g firebase-tools

# Install function dependencies
cd functions
npm install
cd ..
```

### 2. Firebase Setup

1. **Create a Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Create a project"
   - Enable Google Analytics (optional)

2. **Enable Services:**
   - **Authentication:** Go to Authentication > Sign-in method
     - Enable Email/Password and Google providers
   - **Firestore:** Go to Firestore Database > Create database
     - Start in test mode for development
   - **Functions:** Functions will be enabled when you deploy

3. **Get Firebase Config:**
   - Go to Project Settings > General > Your apps
   - Click "Web app" icon and register your app
   - Copy the config object

4. **Update Firebase Config:**
   ```javascript
   // src/firebase/config.js
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-project.firebaseapp.com",
     projectId: "your-project-id",
     storageBucket: "your-project.appspot.com",
     messagingSenderId: "123456789",
     appId: "your-app-id"
   };
   ```

5. **Login to Firebase CLI:**
   ```bash
   firebase login
   firebase use --add  # Select your project
   ```

### 3. LiveKit Setup

1. **Create LiveKit Project:**
   - Go to [LiveKit Console](https://console.livekit.io/)
   - Create a new project
   - Note your WebSocket URL (e.g., `wss://myproject-12345.livekit.cloud`)

2. **Get API Credentials:**
   - Go to Settings > Keys
   - Create new API Key/Secret pair
   - Copy the API Key and Secret

3. **Configure Environment Variables:**
   ```bash
   # Create .env file in project root
   echo "REACT_APP_LIVEKIT_WS_URL=wss://your-project.livekit.cloud" > .env
   ```

4. **Configure Functions Environment:**
   ```bash
   # Set LiveKit credentials for Firebase Functions
   firebase functions:config:set \
     livekit.api_key="your-livekit-api-key" \
     livekit.secret_key="your-livekit-secret-key" \
     livekit.ws_url="wss://your-project.livekit.cloud"
   ```

### 4. Deploy Backend

```bash
# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Cloud Functions
firebase deploy --only functions

# Note the function URLs (you'll see them in the output)
```

### 5. Start Development

```bash
# Start the React development server
npm start
```

The app will open at [http://localhost:3000](http://localhost:3000).

## 📁 Project Structure

```
live/
├── public/                 # Static assets
├── src/
│   ├── App.jsx            # Main app component with routing
│   ├── index.js           # React app entry point
│   ├── index.css          # Global styles and Tailwind imports
│   ├── Components/
│   │   ├── Auth.jsx       # Authentication UI (login/signup)
│   │   ├── Live.jsx       # Live streaming page (broadcaster)
│   │   └── Viewer.jsx     # Stream viewing page (audience)
│   ├── contexts/
│   │   └── AuthContext.js # Authentication state management
│   ├── firebase/
│   │   └── config.js      # Firebase configuration and setup
│   └── assets/            # Images and static files
├── functions/
│   ├── index.js           # Firebase Cloud Functions
│   └── package.json       # Functions dependencies
├── firebase.json          # Firebase project configuration
├── firestore.indexes.json # Firestore composite indexes
├── .env                   # Environment variables (not in git)
└── package.json           # Frontend dependencies
```

## 🔐 How Authentication Works

1. **Firebase Auth Integration:**
   - `AuthContext.js` provides authentication state globally
   - Supports Google OAuth and Email/Password
   - Auto-persists login state across browser sessions

2. **Protected Routes:**
   - `/live` and `/viewer` require authentication
   - Redirects to `/auth` if not logged in

3. **User Profile:**
   - Stores user info in React context
   - Displays user name and avatar in UI

## 📺 How Live Streaming Works

### For Streamers (Live.jsx):

1. **Create Stream:**
   - Click "Go Live" button
   - App calls `createLiveStream` Firebase Function
   - Function creates LiveKit room and generates broadcaster token
   - Stream metadata saved to Firestore

2. **Camera Setup:**
   - Requests camera/microphone permissions
   - LiveKit automatically publishes video/audio tracks
   - Displays local video preview

3. **Stream Management:**
   - View live participant count
   - End stream anytime
   - Real-time updates via Firestore

### For Viewers (Viewer.jsx):

1. **Browse Streams:**
   - View list of active streams from Firestore
   - See stream titles, creator names, and participant counts

2. **Join Stream:**
   - Click "Join Stream" button
   - App calls `joinLiveStream` Firebase Function
   - Function generates viewer token for the room
   - Connects to LiveKit room and receives video/audio

3. **Real-time Experience:**
   - See live video feed from broadcaster
   - Participant count updates automatically
   - Leave stream anytime

## ⚡ Firebase Functions API

The backend provides these Cloud Functions:

### `createLiveStream`
- **Purpose:** Create a new live stream
- **Auth:** Required
- **Parameters:** `{ title: string }`
- **Returns:** `{ roomName: string, token: string }`

### `joinLiveStream`
- **Purpose:** Join an existing stream as viewer
- **Auth:** Required  
- **Parameters:** `{ roomName: string }`
- **Returns:** `{ token: string }`

### `endLiveStream`
- **Purpose:** End your live stream
- **Auth:** Required
- **Parameters:** `{ roomName: string }`
- **Returns:** `{ success: boolean }`

### `leaveLiveStream`
- **Purpose:** Leave a stream you're viewing
- **Auth:** Required
- **Parameters:** `{ roomName: string }`
- **Returns:** `{ success: boolean }`

### `getActiveStreams`
- **Purpose:** Get list of all active streams
- **Auth:** Required
- **Parameters:** None
- **Returns:** `{ streams: Array }`

## 🎨 UI Components Explained

### Authentication (Auth.jsx)
- Modern glassmorphism design
- Toggle between Login/Signup
- Google OAuth integration
- Form validation and error handling

### Live Streaming (Live.jsx)
- Camera preview with controls
- Stream title input
- Participant counter
- Go Live/End Stream buttons
- Permission handling for camera/mic

### Stream Viewing (Viewer.jsx)
- Grid of active streams
- Stream metadata display
- One-click join functionality
- Responsive card layout

## 🔍 Database Schema

### Firestore Collections:

#### `streams` Collection:
```javascript
{
  id: "auto-generated",
  title: "My Live Stream",
  creatorId: "user-uid",
  creatorName: "John Doe",
  roomName: "room_abc123",
  participantCount: 5,
  isActive: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `participants` Subcollection:
```javascript
{
  id: "user-uid",
  name: "Jane Smith",
  role: "viewer", // or "broadcaster"
  joinedAt: timestamp
}
```

## 🚀 Available Scripts

### Frontend:
```bash
npm start          # Start development server (port 3000)
npm run build      # Build for production
npm test           # Run tests
```

### Backend:
```bash
firebase deploy --only functions    # Deploy Cloud Functions
firebase deploy --only firestore    # Deploy Firestore rules/indexes
firebase deploy                     # Deploy everything
firebase emulators:start           # Run local emulators
```

## 🐛 Troubleshooting

### Common Issues:

1. **"Permission denied" Firestore errors:**
   - Check Firestore security rules
   - Ensure user is authenticated
   - Verify Firestore indexes are deployed

2. **LiveKit connection fails:**
   - Check `.env` file has correct WebSocket URL
   - Verify Firebase Functions have LiveKit credentials
   - Check browser console for WebRTC errors

3. **Camera/Microphone not working:**
   - Check browser permissions
   - Ensure HTTPS in production
   - Try different browsers

4. **Functions deployment fails:**
   - Ensure Firebase CLI is logged in
   - Check `functions/package.json` dependencies
   - Verify project ID is correct

### Debug Steps:

1. **Check Browser Console:**
   - Open Developer Tools (F12)
   - Look for error messages
   - Check Network tab for failed requests

2. **Check Firebase Console:**
   - Functions logs for backend errors
   - Firestore data to verify writes
   - Authentication users list

3. **Check LiveKit Console:**
   - Room activity and participants
   - WebRTC connection logs
   - Bandwidth and quality metrics

## 🔒 Security Features

- **Authentication Required:** All streams require user login
- **Secure Tokens:** LiveKit tokens generated server-side only
- **Firestore Rules:** Database access restricted to authenticated users
- **HTTPS Only:** Production deployment uses secure connections
- **Token Expiration:** LiveKit tokens auto-expire for security

## 🌟 Next Steps & Enhancements

### Beginner-Friendly Additions:
- Add stream chat functionality
- Implement screen sharing
- Add stream recording
- Create admin dashboard
- Add user profiles and follow system
- Implement stream categories/tags
- Add mobile responsive design improvements

### Advanced Features:
- Multi-quality streaming (720p, 1080p)
- Stream analytics and metrics
- Monetization with tips/subscriptions
- AI-powered content moderation
- CDN integration for global scaling

## 📚 Learning Resources

### For Beginners:
- [React Official Tutorial](https://react.dev/learn)
- [Firebase Documentation](https://firebase.google.com/docs)
- [LiveKit Documentation](https://docs.livekit.io/)
- [Tailwind CSS Guide](https://tailwindcss.com/docs)

### Advanced Topics:
- [WebRTC Fundamentals](https://webrtc.org/getting-started/)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

## 📄 License

This project is open source and available under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

For questions or support, please open an issue on GitHub!
