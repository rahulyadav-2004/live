import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBKDrVh9QW2R7wJLIpQ_685C8-VmQ9QZKU",
  authDomain: "unbiased-app-ae0e3.firebaseapp.com",
  projectId: "unbiased-app-ae0e3",
  storageBucket: "unbiased-app-ae0e3.firebasestorage.app",
  messagingSenderId: "177367961612",
  appId: "1:177367961612:web:e5a57dd952a29f596f9e29",
  measurementId: "G-G5E5C62F2H"
};

// Check if Firebase config is properly set
const isFirebaseConfigured = () => {
  return firebaseConfig.apiKey !== "demo-api-key-replace-with-real" && 
         firebaseConfig.projectId !== "demo-project-id" &&
         firebaseConfig.apiKey && 
         firebaseConfig.projectId;
};

// Initialize Firebase only if properly configured
let app = null;
let auth = null;
let db = null;
let functions = null;

try {
  if (isFirebaseConfigured()) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app);
  } else {
    console.warn('Firebase is not properly configured. Please update the firebaseConfig in src/firebase/config.js');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

// Export auth, db, and functions
export { auth, db, functions };

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Auth functions with error handling
export const signUpWithEmail = async (email, password) => {
  if (!auth) {
    throw new Error('Firebase is not properly configured. Please check your configuration.');
  }
  return await createUserWithEmailAndPassword(auth, email, password);
};

export const signInWithEmail = async (email, password) => {
  if (!auth) {
    throw new Error('Firebase is not properly configured. Please check your configuration.');
  }
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error('Firebase is not properly configured. Please check your configuration.');
  }
  return await signInWithPopup(auth, googleProvider);
};

export const logOut = async () => {
  if (!auth) {
    throw new Error('Firebase is not properly configured. Please check your configuration.');
  }
  return await signOut(auth);
};

// Firestore functions with error handling
export const createUserProfile = async (user, additionalData = {}) => {
  if (!user || !db) return;
  
  try {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const { displayName, email, photoURL } = user;
      const createdAt = new Date();
      
      await setDoc(userRef, {
        displayName: displayName || additionalData.displayName || '',
        email,
        photoURL: photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || email)}&background=3F8AE0&color=fff`,
        createdAt,
        ...additionalData
      });
    }
    
    return userRef;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return null;
  }
};

export const getUserProfile = async (userId) => {
  if (!db) return null;
  
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data() : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// Export Firebase configuration status
export const isConfigured = isFirebaseConfigured;

// Firebase Functions for LiveKit integration
export const createLiveStream = functions ? httpsCallable(functions, 'createLiveStream') : null;
export const joinLiveStream = functions ? httpsCallable(functions, 'joinLiveStream') : null;
export const endLiveStream = functions ? httpsCallable(functions, 'endLiveStream') : null;
export const getActiveStreams = functions ? httpsCallable(functions, 'getActiveStreams') : null;
export const leaveLiveStream = functions ? httpsCallable(functions, 'leaveLiveStream') : null;

// Live Chat Functions
export const sendChatMessage = async (streamId, message, userInfo) => {
  if (!db) throw new Error('Firebase is not properly configured.');
  
  try {
    console.log('Firebase: Sending chat message', { streamId, message, userInfo });
    
    const chatRef = collection(db, 'liveChat');
    const messageData = {
      streamId: streamId,
      userId: userInfo.uid,
      userName: userInfo.displayName || userInfo.email || 'Anonymous',
      userAvatar: userInfo.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userInfo.displayName || userInfo.email || 'User')}&background=3F8AE0&color=fff`,
      message: message.trim(),
      timestamp: serverTimestamp(),
      createdAt: new Date().toISOString()
    };
    
    console.log('Firebase: Message data to save:', messageData);
    
    const docRef = await addDoc(chatRef, messageData);
    console.log('Firebase: Message saved with ID:', docRef.id);
    
    return docRef;
  } catch (error) {
    console.error('Firebase: Error sending chat message:', error);
    throw error;
  }
};

export const subscribeToChatMessages = (streamId, callback) => {
  if (!db) {
    console.error('Firebase: Database not initialized');
    return null;
  }
  
  try {
    console.log('Firebase: Setting up chat listener for streamId:', streamId);
    
    const chatRef = collection(db, 'liveChat');
    const q = query(
      chatRef,
      where('streamId', '==', streamId),
      orderBy('timestamp', 'asc')
    );
    
    return onSnapshot(q, (snapshot) => {
      console.log('Firebase: Chat snapshot received, docs count:', snapshot.docs.length);
      
      const messages = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Firebase: Message doc:', { id: doc.id, data });
        messages.push({
          id: doc.id,
          ...data
        });
      });
      
      console.log('Firebase: Calling callback with messages:', messages);
      callback(messages);
    }, (error) => {
      console.error('Firebase: Chat listener error:', error);
    });
  } catch (error) {
    console.error('Firebase: Error subscribing to chat messages:', error);
    return null;
  }
};

export const unsubscribeFromChat = (unsubscribe) => {
  if (unsubscribe && typeof unsubscribe === 'function') {
    console.log('Firebase: Unsubscribing from chat');
    unsubscribe();
  }
};

// Live Participants Functions
export const addParticipantToStream = async (streamId, user, role = 'viewer') => {
  if (!db) {
    console.error('Firebase: Database not initialized');
    return false;
  }
  
  try {
    console.log('Firebase: Adding participant to stream:', { streamId, userId: user.uid, role });
    
    const streamRef = doc(db, 'streams', streamId);
    const streamDoc = await getDoc(streamRef);
    
    if (!streamDoc.exists()) {
      console.error('Firebase: Stream does not exist');
      return false;
    }
    
    const streamData = streamDoc.data();
    const participants = streamData.participants || [];
    
    // Check if participant already exists
    const existingIndex = participants.findIndex(p => p.userId === user.uid);
    
    const participantData = {
      userId: user.uid,
      userName: user.displayName || user.email || 'Anonymous User',
      userAvatar: user.photoURL || null,
      role: role,
      joinedAt: serverTimestamp(),
      isOnline: true
    };
    
    if (existingIndex >= 0) {
      // Update existing participant
      participants[existingIndex] = { ...participants[existingIndex], ...participantData };
    } else {
      // Add new participant
      participants.push(participantData);
    }
    
    // Update viewer count
    const viewerCount = participants.filter(p => p.isOnline).length;
    
    await updateDoc(streamRef, {
      participants: participants,
      viewerCount: viewerCount,
      lastActivity: serverTimestamp()
    });
    
    console.log('Firebase: Participant added successfully');
    return true;
  } catch (error) {
    console.error('Firebase: Error adding participant:', error);
    return false;
  }
};

export const removeParticipantFromStream = async (streamId, userId) => {
  if (!db) {
    console.error('Firebase: Database not initialized');
    return false;
  }
  
  try {
    console.log('Firebase: Removing participant from stream:', { streamId, userId });
    
    const streamRef = doc(db, 'streams', streamId);
    const streamDoc = await getDoc(streamRef);
    
    if (!streamDoc.exists()) {
      console.error('Firebase: Stream does not exist');
      return false;
    }
    
    const streamData = streamDoc.data();
    let participants = streamData.participants || [];
    
    // Remove participant or mark as offline
    participants = participants.filter(p => p.userId !== userId);
    
    // Update viewer count
    const viewerCount = participants.filter(p => p.isOnline).length;
    
    await updateDoc(streamRef, {
      participants: participants,
      viewerCount: viewerCount,
      lastActivity: serverTimestamp()
    });
    
    console.log('Firebase: Participant removed successfully');
    return true;
  } catch (error) {
    console.error('Firebase: Error removing participant:', error);
    return false;
  }
};

export const updateParticipantStatus = async (streamId, userId, isOnline) => {
  if (!db) {
    console.error('Firebase: Database not initialized');
    return false;
  }
  
  try {
    console.log('Firebase: Updating participant status:', { streamId, userId, isOnline });
    
    const streamRef = doc(db, 'streams', streamId);
    const streamDoc = await getDoc(streamRef);
    
    if (!streamDoc.exists()) {
      console.error('Firebase: Stream does not exist');
      return false;
    }
    
    const streamData = streamDoc.data();
    const participants = streamData.participants || [];
    
    const participantIndex = participants.findIndex(p => p.userId === userId);
    if (participantIndex >= 0) {
      participants[participantIndex].isOnline = isOnline;
      participants[participantIndex].lastSeen = serverTimestamp();
      
      // Update viewer count
      const viewerCount = participants.filter(p => p.isOnline).length;
      
      await updateDoc(streamRef, {
        participants: participants,
        viewerCount: viewerCount,
        lastActivity: serverTimestamp()
      });
      
      console.log('Firebase: Participant status updated successfully');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Firebase: Error updating participant status:', error);
    return false;
  }
};

export const subscribeToStreamParticipants = (streamId, callback) => {
  if (!db) {
    console.error('Firebase: Database not initialized');
    return null;
  }
  
  try {
    console.log('Firebase: Setting up participants listener for streamId:', streamId);
    
    const streamRef = doc(db, 'streams', streamId);
    
    return onSnapshot(streamRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const participants = data.participants || [];
        const viewerCount = data.viewerCount || 0;
        
        console.log('Firebase: Participants update:', { participants: participants.length, viewerCount });
        callback({ participants, viewerCount, streamData: data });
      } else {
        console.log('Firebase: Stream document does not exist');
        callback({ participants: [], viewerCount: 0, streamData: null });
      }
    }, (error) => {
      console.error('Firebase: Participants listener error:', error);
      callback({ participants: [], viewerCount: 0, streamData: null });
    });
  } catch (error) {
    console.error('Firebase: Error subscribing to participants:', error);
    return null;
  }
};

export const unsubscribeFromParticipants = (unsubscribe) => {
  if (unsubscribe && typeof unsubscribe === 'function') {
    console.log('Firebase: Unsubscribing from participants');
    unsubscribe();
  }
};

export default app;