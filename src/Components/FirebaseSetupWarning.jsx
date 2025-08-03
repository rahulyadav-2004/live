import React, { useState } from 'react';
import DemoAuth from './DemoAuth';

const FirebaseSetupWarning = () => {
  const [showDemo, setShowDemo] = useState(false);

  if (showDemo) {
    return <DemoAuth />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Firebase Setup Required
        </h1>
        
        <p className="text-gray-600 mb-6">
          To enable authentication and full functionality, you need to configure Firebase.
        </p>
        
        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-gray-900 mb-2">Quick Setup Steps:</h3>
          <ol className="text-sm text-gray-600 space-y-1">
            <li>1. Create a Firebase project at console.firebase.google.com</li>
            <li>2. Enable Authentication with Email/Password and Google</li>
            <li>3. Copy your Firebase config</li>
            <li>4. Update src/firebase/config.js with your config</li>
          </ol>
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={() => window.open('https://console.firebase.google.com', '_blank')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Setup Firebase
          </button>
          
          <button 
            onClick={() => setShowDemo(true)}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Try Demo Mode
          </button>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          See FIREBASE_SETUP.md for detailed instructions
        </p>
      </div>
    </div>
  );
};

export default FirebaseSetupWarning;
