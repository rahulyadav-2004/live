import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logOut, getActiveStreams, joinLiveStream, leaveLiveStream } from '../firebase/config';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  VideoTrack,
  useTracks,
  useConnectionState
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, ConnectionState } from 'livekit-client';
import LiveChat from './LiveChat';
import LiveViewers from './LiveViewers';
import ChatDebug from './ChatDebug';

const Viewer = ({ demoMode = false, demoUser = null }) => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedStream, setSelectedStream] = useState(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [activeStreams, setActiveStreams] = useState([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(false);
  const [isJoiningStream, setIsJoiningStream] = useState(false);
  const [viewerToken, setViewerToken] = useState('');
  const [error, setError] = useState('');
  
  // LiveKit room URL from environment
  const livekitUrl = process.env.REACT_APP_LIVEKIT_URL || 'wss://scrolllive-kr9pmklh.livekit.cloud';

  // Mock active streams data for demo mode
  const mockStreams = [
    {
      id: 1,
      streamerName: "John Doe",
      streamerAvatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      title: "Tech Talk Live",
      viewerCount: 1247,
      duration: "2:15:30",
      category: "Technology"
    },
    {
      id: 2,
      streamerName: "Sarah Wilson",
      streamerAvatar: "https://images.unsplash.com/photo-1494790108755-2616b612b999?w=150&h=150&fit=crop&crop=face",
      title: "Cooking Masterclass",
      viewerCount: 892,
      duration: "1:32:45",
      category: "Lifestyle"
    },
    {
      id: 3,
      streamerName: "Mike Chen",
      streamerAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      title: "Gaming Stream",
      viewerCount: 2156,
      duration: "3:22:10",
      category: "Gaming"
    },
    {
      id: 4,
      streamerName: "Emma Davis",
      streamerAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      title: "Art & Design",
      viewerCount: 456,
      duration: "0:45:12",
      category: "Art"
    }
  ];

  // Fetch active streams from Firebase
  const fetchActiveStreams = async () => {
    if (demoMode) {
      setActiveStreams(mockStreams);
      return;
    }

    setIsLoadingStreams(true);
    try {
      const result = await getActiveStreams();
      setActiveStreams(result.data.streams || []);
    } catch (error) {
      console.error('Error fetching streams:', error);
      setError('Failed to load streams');
    } finally {
      setIsLoadingStreams(false);
    }
  };

  // Join a live stream
  const handleJoinStream = async (stream) => {
    if (demoMode) {
      setSelectedStream(stream);
      setViewerCount(stream.viewerCount);
      return;
    }

    setIsJoiningStream(true);
    setError('');
    
    try {
      const result = await joinLiveStream({ streamId: stream.id });
      const { token } = result.data;
      
      setViewerToken(token);
      setSelectedStream(stream);
      setViewerCount(stream.viewerCount || 0);
    } catch (error) {
      console.error('Error joining stream:', error);
      setError('Failed to join stream. Please try again.');
    } finally {
      setIsJoiningStream(false);
    }
  };

  // Leave the current stream
  const handleLeaveStream = async () => {
    if (demoMode) {
      setSelectedStream(null);
      setViewerCount(0);
      return;
    }

    if (selectedStream && viewerToken) {
      try {
        await leaveLiveStream({ streamId: selectedStream.id });
      } catch (error) {
        console.error('Error leaving stream:', error);
      }
    }
    
    setSelectedStream(null);
    setViewerToken('');
    setViewerCount(0);
  };

  // Use demo user data if in demo mode, otherwise use authenticated user data
  const currentViewer = {
    name: demoMode 
      ? demoUser?.name || "Demo User"
      : userProfile?.displayName || currentUser?.displayName || "Anonymous User",
    avatar: demoMode
      ? demoUser?.avatar || "https://ui-avatars.com/api/?name=Demo%20User&background=3F8AE0&color=fff"
      : userProfile?.photoURL || currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'User')}&background=3F8AE0&color=fff`,
    email: demoMode ? demoUser?.email || "demo@example.com" : currentUser?.email || "user@example.com"
  };

  // Handle logout
  const handleLogout = async () => {
    if (demoMode) {
      window.location.reload();
      return;
    }
    
    // Leave current stream before logging out
    if (selectedStream) {
      await handleLeaveStream();
    }
    
    try {
      await logOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Load streams on component mount
  useEffect(() => {
    fetchActiveStreams();
  }, [demoMode]);

  // Check for stream ID in URL params
  useEffect(() => {
    const streamId = searchParams.get('stream');
    if (streamId && activeStreams.length > 0) {
      const stream = activeStreams.find(s => s.id === streamId);
      if (stream) {
        handleJoinStream(stream);
      }
    }
  }, [searchParams, activeStreams]);

  // Simulate live viewer count updates for selected stream (demo mode)
  useEffect(() => {
    if (selectedStream && demoMode) {
      const interval = setInterval(() => {
        setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedStream, demoMode]);

  // Video component to render stream feed for viewers
  const StreamFeed = () => {
    const tracks = useTracks([Track.Source.Camera]);
    const cameraTrack = tracks.find(track => track.source === Track.Source.Camera);
    
    if (cameraTrack) {
      return (
        <VideoTrack 
          trackRef={cameraTrack} 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    }
    
    return (
      <div className="w-full h-full bg-gray-800 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-2">📺</div>
          <p className="text-sm">Connecting to stream...</p>
        </div>
      </div>
    );
  };

  // 🚨 VIEWER DISCONNECT DETECTION - Show notification when stream ends
  const ViewerDisconnectDetector = () => {
    // TEMPORARILY DISABLED to fix room context error
    console.log('ViewerDisconnectDetector: Disabled for now');
    return null;
    
    /* ORIGINAL CODE - COMMENTED OUT FOR NOW
    const connectionState = useConnectionState();
    
    useEffect(() => {
      console.log('Viewer LiveKit Connection State:', connectionState);
      
      // If connection is lost while viewing, show user-friendly message
      if (connectionState === ConnectionState.Disconnected && viewerToken && selectedStream && !demoMode) {
        console.warn('🚨 Viewer disconnected from stream');
        
        // Show disconnect message after brief delay
        setTimeout(() => {
          setError('Connection lost. The stream may have ended.');
          // Clear viewer token to allow rejoin attempt
          setViewerToken('');
        }, 3000); // 3 second delay to avoid false positives
      }
    }, [connectionState, viewerToken, selectedStream, demoMode]);

    return null;
    */
  };

  // If viewing a specific stream, show the stream interface
  if (selectedStream) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 flex">
        {/* Left Panel - Stream Info & Viewers */}
        <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
          {/* Back Button & Stream Info */}
          <div className="p-5 border-b border-gray-100">
            <button
              onClick={handleLeaveStream}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back to streams</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img 
                  src={selectedStream.streamerAvatar} 
                  alt={selectedStream.streamerName}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{selectedStream.streamerName}</h2>
                <p className="text-sm text-gray-600">{selectedStream.title}</p>
                <div className="flex items-center space-x-1 mt-1">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                  <span className="text-red-500 text-xs font-medium">LIVE</span>
                </div>
              </div>
            </div>
            
            {/* Stream Stats */}
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                </svg>
                <span>{viewerCount.toLocaleString()}</span>
              </div>
              <span>{selectedStream.duration}</span>
            </div>
          </div>

          {/* Current Viewer Info */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <img 
                src={currentViewer.avatar} 
                alt={currentViewer.name}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{currentViewer.name}</p>
                <p className="text-xs text-gray-500">Viewing</p>
              </div>
            </div>
          </div>

          {/* Live Viewers */}
          <LiveViewers 
            streamId={selectedStream?.id || 'demo-stream'}
            demoMode={demoMode}
            title="All Viewers"
          />

          {/* Viewer Actions */}
          <div className="p-4 border-t border-gray-100 space-y-2">
            <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-md text-sm font-medium transition-colors">
              Follow Streamer
            </button>
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md text-sm font-medium transition-colors">
              Share Stream
            </button>
            <div className="pt-2 border-t border-gray-100">
              <div className="text-xs text-gray-500 mb-1">
                {demoMode ? "Demo Mode" : "Logged in as:"}
              </div>
              <div className="text-sm text-gray-700 truncate">{currentViewer.email}</div>
            </div>
          </div>
        </div>

        {/* Center - Live Video */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="relative bg-gray-100 rounded-xl shadow-lg overflow-hidden" style={{ aspectRatio: '9/16', height: '75vh' }}>
            {/* Video Container */}
            <div className="w-full h-full">
              {viewerToken && !demoMode ? (
                // Real LiveKit viewer stream
                <LiveKitRoom
                  video={false}
                  audio={true}
                  token={viewerToken}
                  serverUrl={livekitUrl}
                  data-lk-theme="default"
                  style={{
                    height: '100%',
                    width: '100%',
                  }}
                  onError={(error) => {
                    console.error('LiveKit viewer error:', error);
                    // Silently handle connection errors without showing popup
                  }}
                >
                  <div style={{ height: '100%', width: '100%' }}>
                    <StreamFeed />
                    {/* Only render disconnect detector when actually connected */}
                    {viewerToken && <ViewerDisconnectDetector />}
                    <RoomAudioRenderer />
                  </div>
                </LiveKitRoom>
              ) : (
                // Placeholder for demo mode
                <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-400 bg-opacity-50 rounded-full flex items-center justify-center mb-3 mx-auto">
                      <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <p className="text-gray-600 text-sm font-medium">{selectedStream.title}</p>
                    {demoMode && (
                      <p className="text-gray-500 text-xs mt-1">Demo Mode - No video</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Live Indicator Overlay */}
            <div className="absolute top-3 left-3 bg-red-500 px-2 py-1 rounded-md flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-medium">LIVE</span>
            </div>

            {/* Viewer Count Overlay */}
            <div className="absolute top-3 right-3 bg-black bg-opacity-20 px-2 py-1 rounded-md">
              <span className="text-white text-xs font-medium">{viewerCount.toLocaleString()}</span>
            </div>

            {/* Loading Overlay */}
            {isJoiningStream && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-4 max-w-sm mx-4">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-gray-700 text-sm">Joining stream...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Live Chat */}
        <div className="flex flex-col">
          <ChatDebug streamId={selectedStream?.id || 'demo-stream'} />
          <LiveChat 
            streamId={selectedStream?.id || 'demo-stream'}
            demoMode={demoMode}
            title="Live Chat"
          />
        </div>
      </div>
    );
  }

  // Show list of active streams
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">Live Streams</h1>
              <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                {activeStreams.length} Live
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/live')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <span>Start Streaming</span>
              </button>
              
              <div className="flex items-center space-x-2">
                <img 
                  src={currentViewer.avatar} 
                  alt={currentViewer.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <span className="text-sm font-medium text-gray-700">{currentViewer.name}</span>
              </div>
              
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Logout"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Streams Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeStreams.map((stream) => (
            <div key={stream.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Stream Thumbnail */}
              <div className="relative aspect-video bg-gradient-to-br from-gray-200 to-gray-300">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gray-400 bg-opacity-50 rounded-full flex items-center justify-center mb-2 mx-auto">
                      <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                </div>
                
                {/* Live Badge */}
                <div className="absolute top-3 left-3 bg-red-500 px-2 py-1 rounded-md flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                  <span className="text-white text-xs font-medium">LIVE</span>
                </div>
                
                {/* Viewer Count */}
                <div className="absolute top-3 right-3 bg-black bg-opacity-50 px-2 py-1 rounded-md">
                  <span className="text-white text-xs">{stream.viewerCount.toLocaleString()}</span>
                </div>
                
                {/* Duration */}
                <div className="absolute bottom-3 right-3 bg-black bg-opacity-50 px-2 py-1 rounded-md">
                  <span className="text-white text-xs">{stream.duration}</span>
                </div>
              </div>
              
              {/* Stream Info */}
              <div className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <img 
                    src={stream.streamerAvatar} 
                    alt={stream.streamerName}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 text-sm">{stream.title}</h3>
                    <p className="text-gray-600 text-sm">{stream.streamerName}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {stream.category}
                  </span>
                  
                  <button
                    onClick={() => handleJoinStream(stream)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Join Stream
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Empty State */}
        {activeStreams.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active streams</h3>
            <p className="text-gray-600">Check back later for live content!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Viewer;
