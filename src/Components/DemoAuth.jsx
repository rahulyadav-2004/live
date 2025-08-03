import React, { useState } from 'react';
import Viewer from './Viewer';

const DemoAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [demoUser] = useState({
    name: "Demo User",
    email: "demo@example.com",
    avatar: "https://ui-avatars.com/api/?name=Demo%20User&background=3F8AE0&color=fff"
  });

  if (isAuthenticated) {
    return <Viewer demoMode={true} demoUser={demoUser} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Demo Mode</h1>
          <p className="text-gray-600">Experience the live streaming interface</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => setIsAuthenticated(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Continue as Demo User
          </button>
          
          <div className="text-center">
            <p className="text-sm text-gray-500">
              This is a demo version. To enable full authentication,
              <br />
              configure Firebase in your project.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoAuth;
