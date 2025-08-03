import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, createUserProfile, getUserProfile, isConfigured } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);

  useEffect(() => {
    // Check if Firebase is configured
    const configured = isConfigured();
    setIsFirebaseConfigured(configured);

    if (!configured) {
      console.warn('Firebase is not configured. Using demo mode.');
      setLoading(false);
      return;
    }

    // Set up auth state listener only if Firebase is configured
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setCurrentUser(user);
        
        if (user) {
          try {
            // Create user profile if it doesn't exist
            await createUserProfile(user);
            
            // Get user profile data
            const profile = await getUserProfile(user.uid);
            setUserProfile(profile);
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else {
          setUserProfile(null);
        }
        
        setLoading(false);
      });

      return unsubscribe;
    } else {
      setLoading(false);
    }
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
    isFirebaseConfigured
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
