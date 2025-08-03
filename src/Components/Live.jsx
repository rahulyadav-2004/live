import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logOut, createLiveStream, endLiveStream } from '../firebase/config';
import { useNavigate } from 'react-router-dom';
import { 
  LiveKitRoom, 
  RoomAudioRenderer,
  ControlBar,
  VideoTrack,
  useTracks,
  useLocalParticipant,
  useConnectionState,
  PreJoin
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track, ConnectionState } from 'livekit-client';
import LiveChat from './LiveChat';
import LiveViewers from './LiveViewers';
import ChatDebug from './ChatDebug';

const Live = ({ demoMode = false, demoUser = null }) => {
  const { currentUser, userProfile } = useAuth();
  const navigate = useNavigate();
  const [isLive, setIsLive] = useState(false);
  const [isStartingStream, setIsStartingStream] = useState(false);
  const [streamData, setStreamData] = useState(null);
  const [token, setToken] = useState('');
  const [viewerCount, setViewerCount] = useState(0);
  const [error, setError] = useState('');
  
  // LiveKit room URL from environment
  const livekitUrl = process.env.REACT_APP_LIVEKIT_URL || 'wss://scrolllive-kr9pmklh.livekit.cloud';
  
  // Use demo user data if in demo mode, otherwise use authenticated user data
  const [currentStreamer] = useState({
    name: demoMode 
      ? demoUser?.name || "Demo User"
      : userProfile?.displayName || currentUser?.displayName || "Anonymous User",
    avatar: demoMode
      ? demoUser?.avatar || "https://ui-avatars.com/api/?name=Demo%20User&background=3F8AE0&color=fff"
      : userProfile?.photoURL || currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userProfile?.displayName || currentUser?.displayName || currentUser?.email || 'User')}&background=3F8AE0&color=fff`,
    isStreaming: isLive,
    email: demoMode ? demoUser?.email || "demo@example.com" : currentUser?.email || "user@example.com"
  });

  // Start a new live stream
  const handleStartStream = async () => {
    if (demoMode) {
      setIsLive(true);
      return;
    }

    setIsStartingStream(true);
    setError('');
    
    try {
      // First, request camera/microphone permissions from browser
      console.log('Requesting browser permissions...');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        console.log('Browser permissions granted:', stream);
        // Stop the test stream, LiveKit will handle the actual streaming
        stream.getTracks().forEach(track => track.stop());
      } catch (permError) {
        console.error('Browser permission denied:', permError);
        throw new Error('Camera/microphone access is required for live streaming');
      }
      
      const result = await createLiveStream({
        title: `${currentStreamer.name}'s Live Stream`,
        category: 'General'
      });
      
      console.log('Full Firebase result:', result);
      console.log('Result.data:', result.data);
      
      // Extract data from Firebase Functions response
      const responseData = result.data || result;
      const { streamId, token: streamToken, roomName } = responseData;
      
      console.log('Extracted data:', { streamId, token: streamToken, roomName });
      console.log('Token type:', typeof streamToken);
      console.log('Token value:', streamToken);
      
      // Ensure token is a valid string
      if (!streamToken || typeof streamToken !== 'string') {
        throw new Error('Invalid token received from server');
      }
      
      setStreamData({ streamId, roomName });
      setToken(streamToken);
      setIsLive(true);
      
      console.log('Stream started successfully:', { streamId, roomName });
    } catch (error) {
      console.error('Error starting stream:', error);
      setError('Failed to start stream. Please try again.');
    } finally {
      setIsStartingStream(false);
    }
  };

  // End the live stream
  const handleEndStream = async () => {
    if (demoMode) {
      setIsLive(false);
      return;
    }

    if (!streamData?.streamId) return;
    
    try {
      await endLiveStream({ streamId: streamData.streamId });
      setIsLive(false);
      setStreamData(null);
      setToken('');
      setViewerCount(0);
      
      console.log('Stream ended successfully');
    } catch (error) {
      console.error('Error ending stream:', error);
      setError('Failed to end stream.');
    }
  };

  // Toggle stream state
  const handleToggleStream = () => {
    if (isLive) {
      handleEndStream();
    } else {
      handleStartStream();
    }
  };

  // Handle logout
  const handleLogout = async () => {
    if (demoMode) {
      // In demo mode, just reload the page
      window.location.reload();
      return;
    }
    
    // End stream before logging out
    if (isLive && streamData?.streamId) {
      await handleEndStream();
    }
    
    try {
      await logOut();
      navigate('/auth');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Simulate live viewer count updates (in demo mode)
  useEffect(() => {
    if (demoMode) {
      const interval = setInterval(() => {
        setViewerCount(prev => prev + Math.floor(Math.random() * 3) - 1);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [demoMode]);

  // Clean up stream on component unmount
  useEffect(() => {
    return () => {
      if (isLive && streamData?.streamId && !demoMode) {
        handleEndStream();
      }
    };
  }, []);

  // Component to track participants inside LiveKitRoom
  const ParticipantTracker = () => {
    const tracks = useTracks();
    const { localParticipant } = useLocalParticipant();
    
    useEffect(() => {
      console.log('All tracks:', tracks);
      console.log('Local participant:', localParticipant);
      if (localParticipant) {
        console.log('Local participant tracks:', localParticipant.tracks);
      }
      setViewerCount(1);
    }, [tracks, localParticipant]);

    return null;
  };

  // 🚨 DISCONNECT DETECTION - Automatically end stream on connection loss
  const DisconnectDetector = () => {
    const connectionState = useConnectionState();
    const [wasConnected, setWasConnected] = useState(false);
    
    // TEMPORARY: Disable auto-disconnect detection for testing
    const AUTO_DISCONNECT_ENABLED = false;
    
    useEffect(() => {
      console.log('LiveKit Connection State:', connectionState);
      
      if (!AUTO_DISCONNECT_ENABLED) {
        console.log('Auto-disconnect detection is DISABLED for testing');
        return;
      }
      
      // Track if we were ever connected
      if (connectionState === ConnectionState.Connected) {
        setWasConnected(true);
      }
      
      // Only trigger auto-end if we were previously connected and then disconnected
      // This prevents false positives during initial connection
      if (connectionState === ConnectionState.Disconnected && 
          wasConnected && 
          isLive && 
          streamData?.streamId && 
          !demoMode) {
        console.warn('🚨 LiveKit Disconnected after being connected - Auto-ending stream to prevent ghost stream');
        
        // Auto-end stream after disconnect
        setTimeout(async () => {
          // Double check we're still disconnected and live
          if (isLive && streamData?.streamId) {
            try {
              console.log('Auto-ending stream due to disconnect...');
              await endLiveStream({ streamId: streamData.streamId });
              setIsLive(false);
              setStreamData(null);
              setToken('');
              setViewerCount(0);
              setError('Stream ended due to connection loss');
              console.log('✅ Stream auto-ended successfully');
            } catch (error) {
              console.error('❌ Error auto-ending stream:', error);
              // Force local state cleanup even if server call fails
              setIsLive(false);
              setStreamData(null);
              setToken('');
              setViewerCount(0);
              setError('Stream ended due to connection loss');
            }
          }
        }, 8000); // 8 second delay to avoid false positives from brief disconnects
      }
    }, [connectionState, isLive, streamData?.streamId, demoMode, wasConnected]);

    return null;
  };

  // Video component to render camera feed
  const CameraFeed = () => {
    const tracks = useTracks([Track.Source.Camera]);
    const { localParticipant } = useLocalParticipant();
    const [cameraEnabled, setCameraEnabled] = useState(false);
    
    useEffect(() => {
      // Enable camera and microphone when component mounts
      const enableDevices = async () => {
        try {
          console.log('Requesting camera and microphone permissions...');
          await localParticipant.enableCameraAndMicrophone();
          setCameraEnabled(true);
          console.log('Camera and microphone enabled successfully');
        } catch (error) {
          console.error('Error enabling camera/microphone:', error);
          setError(`Camera access denied: ${error.message}`);
        }
      };
      
      if (localParticipant) {
        enableDevices();
      }
    }, [localParticipant]);
    
    const cameraTrack = tracks.find(track => track.source === Track.Source.Camera);
    
    console.log('Camera tracks:', tracks);
    console.log('Camera track found:', cameraTrack);
    console.log('Camera enabled:', cameraEnabled);
    
    if (cameraTrack && cameraTrack.publication?.track) {
      console.log('Rendering VideoTrack component');
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
          <div className="text-4xl mb-2">📹</div>
          {!cameraEnabled ? (
            <>
              <p className="text-sm">Starting camera...</p>
              <p className="text-xs mt-1">Please allow camera access when prompted</p>
            </>
          ) : (
            <>
              <p className="text-sm">Camera enabled, waiting for video...</p>
              <p className="text-xs mt-1">Tracks: {tracks.length}</p>
            </>
          )}
        </div>
      </div>
    );
  };

  // LiveKit Room Component for real streaming
  const LiveKitRoomComponent = () => {
    if (!isLive || !token || demoMode) return null;

    console.log('LiveKitRoomComponent - token type:', typeof token);
    console.log('LiveKitRoomComponent - token value:', token);
    console.log('LiveKitRoomComponent - token string:', String(token));

    return (
      <LiveKitRoom
        video={true}
        audio={true}
        token={String(token)}
        serverUrl={livekitUrl}
        connect={true}
        data-lk-theme="default"
        style={{
          height: '100%',
          width: '100%',
        }}
        onError={(error) => {
          console.error('LiveKit error:', error);
          // Silently handle connection errors without showing popup
        }}
        onConnected={() => {
          console.log('LiveKit connected successfully');
          setError('');
        }}
        onDisconnected={() => {
          console.log('LiveKit disconnected');
          setError('Disconnected from stream');
        }}
      >
        <ParticipantTracker />
        <DisconnectDetector />
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
          <CameraFeed />
          <RoomAudioRenderer />
          <ControlBar 
            variation="minimal"
            controls={{
              camera: true,
              microphone: true,
              screenShare: false,
              chat: false,
              settings: false
            }}
            style={{
              position: 'absolute',
              bottom: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '8px'
            }}
          />
        </div>
      </LiveKitRoom>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex">
      {/* Left Panel - User Info & Viewers */}
      <div className="w-72 bg-white border-r border-gray-200 flex flex-col">
        {/* Streamer Info */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src={currentStreamer.avatar} 
                alt={currentStreamer.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              {isLive && (
                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{currentStreamer.name}</h2>
              <div className="flex items-center space-x-1">
                {isLive ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-red-500 text-xs font-medium">LIVE</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    <span className="text-gray-500 text-xs font-medium">OFFLINE</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/viewer')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors mr-2"
              title="Browse Streams"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
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
          
          {/* Live Stats */}
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
              </svg>
              <span>{viewerCount.toLocaleString()}</span>
            </div>
            <span>{isLive ? 'Live now' : 'Offline'}</span>
          </div>
        </div>

        {/* Live Viewers */}
        <LiveViewers 
          streamId={streamData?.streamId || 'demo-stream'}
          demoMode={demoMode}
          title="Viewers"
        />

        {/* Action Buttons */}
        <div className="p-4 border-t border-gray-100 space-y-2">
          <button 
            onClick={handleToggleStream}
            disabled={isStartingStream}
            className={`w-full py-2 px-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              isLive 
                ? 'bg-red-500 hover:bg-red-600 text-white' 
                : 'bg-green-500 hover:bg-green-600 text-white'
            }`}
          >
            {isStartingStream ? 'Starting...' : (isLive ? 'End Stream' : 'Start Stream')}
          </button>
          
          {isLive && streamData && (
            <button 
              onClick={() => {
                const streamUrl = `${window.location.origin}/viewer?stream=${streamData.streamId}`;
                navigator.clipboard.writeText(streamUrl);
                // You could add a toast notification here
                alert('Stream link copied to clipboard!');
              }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded-md text-sm font-medium transition-colors"
            >
              Share Stream
            </button>
          )}
          
          {!isLive && (
            <button 
              className="w-full bg-gray-100 text-gray-400 py-2 px-3 rounded-md text-sm font-medium cursor-not-allowed"
              disabled
            >
              Share Stream
            </button>
          )}
          
          <div className="pt-2 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-1">
              {demoMode ? "Demo Mode" : "Logged in as:"}
            </div>
            <div className="text-sm text-gray-700 truncate">{currentStreamer.email}</div>
            {streamData && (
              <div className="text-xs text-gray-500 mt-1">
                Room: {streamData.roomName}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Center - Live Video */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="relative bg-gray-100 rounded-xl shadow-lg overflow-hidden" style={{ aspectRatio: '9/16', height: '75vh' }}>
          {/* Video Container */}
          <div className="w-full h-full">
            {isLive && !demoMode ? (
              // Real LiveKit video stream
              <LiveKitRoomComponent />
            ) : (
              // Placeholder for demo or offline state
              <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-400 bg-opacity-50 rounded-full flex items-center justify-center mb-3 mx-auto">
                    {isLive ? (
                      <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"/>
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                      </svg>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm font-medium">
                    {isLive ? (demoMode ? 'Demo Live Stream' : 'Loading...') : 'Stream Offline'}
                  </p>
                  {!isLive && (
                    <p className="text-gray-500 text-xs mt-1">
                      Click "Start Stream" to go live
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Live Indicator Overlay */}
          {isLive && (
            <div className="absolute top-3 left-3 bg-red-500 px-2 py-1 rounded-md flex items-center space-x-1">
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
              <span className="text-white text-xs font-medium">LIVE</span>
            </div>
          )}

          {/* Viewer Count Overlay */}
          {isLive && (
            <div className="absolute top-3 right-3 bg-black bg-opacity-20 px-2 py-1 rounded-md">
              <span className="text-white text-xs font-medium">{viewerCount.toLocaleString()}</span>
            </div>
          )}

          {/* Stream Controls - Only show in demo mode or when not using LiveKit */}
          {(demoMode || !isLive) && (
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center space-x-2">
              <button 
                className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-2 rounded-full transition-all shadow-sm"
                title="Microphone"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd"/>
                </svg>
              </button>
              <button 
                className="bg-white bg-opacity-90 hover:bg-opacity-100 text-gray-700 p-2 rounded-full transition-all shadow-sm"
                title="Camera"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z"/>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Live Chat */}
      <div className="flex flex-col">
        <ChatDebug streamId={streamData?.streamId || 'demo-stream'} />
        <LiveChat 
          streamId={streamData?.streamId || 'demo-stream'}
          demoMode={demoMode}
          title="Live Chat"
        />
      </div>
    </div>
  );
};

export default Live;