'use client';

import React, { useRef, useEffect, useState } from "react";
import { useWebRTC } from "@/hooks/useWebRTC";
import { cn } from "@/lib/utils";
import { Video, VideoOff, Mic, MicOff, Settings, Shield } from "lucide-react";

interface VideoInterviewPanelProps {
  roomId: string;
}

export const VideoInterviewPanel = ({ roomId }: VideoInterviewPanelProps) => {
  const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
  
  const { localStream, remoteStream, connectionStatus } = useWebRTC({
    roomId,
    wsUrl,
  });

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  // Media Toggle states
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Bind local streams to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  // Bind remote streams to video element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Toggle Camera
  const toggleVideo = () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Toggle Microphone
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  return (
    <div className="w-full rounded-2xl bg-dark-200 border border-dark-100 overflow-hidden shadow-2xl glassmorphism p-6 mb-8 transition-all duration-300 hover:border-pink-500/20">
      
      {/* Upper Status Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-dark-100/50 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield className="size-5 text-pink-500 animate-pulse" />
            Secure Live Session Feed
          </h3>
          <p className="text-xs text-gray-500 font-mono mt-0.5">ROOM: {roomId}</p>
        </div>

        {/* Dynamic Glowing Status Badge */}
        <div className="flex items-center gap-3 bg-dark-300 border border-dark-100 rounded-full px-4 py-2">
          {connectionStatus === "connected" && (
            <div className="flex items-end gap-[2px] h-2.5 px-0.5">
              <span className="w-[1.5px] bg-pink-400 rounded-full animate-pulse h-1" style={{ animationDelay: '0.1s', animationDuration: '0.5s' }} />
              <span className="w-[1.5px] bg-pink-400 rounded-full animate-pulse h-2.5" style={{ animationDelay: '0.3s', animationDuration: '0.8s' }} />
              <span className="w-[1.5px] bg-pink-400 rounded-full animate-pulse h-1.5" style={{ animationDelay: '0.2s', animationDuration: '0.6s' }} />
            </div>
          )}
          <span className={cn(
            "w-2.5 h-2.5 rounded-full transition-all duration-500 animate-pulse",
            connectionStatus === "connected" && "bg-pink-500 shadow-[0_0_12px_#ec4899]",
            connectionStatus === "connecting" && "bg-amber-500 shadow-[0_0_12px_#f59e0b]",
            connectionStatus === "disconnected" && "bg-gray-500",
            connectionStatus === "failed" && "bg-red-500 shadow-[0_0_12px_#ef4444]"
          )} />
          <span className="text-xs font-bold uppercase tracking-wider font-mono text-gray-300">
            {connectionStatus === "connected" ? "Live Stream Ready" : `Signal: ${connectionStatus}`}
          </span>
        </div>
      </div>

      {/* Primary Video Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative min-h-[340px]">
        
        {/* Interviewer Stream (Large Remote feed) */}
        <div className="relative rounded-xl overflow-hidden bg-dark-300/85 border border-dark-100 flex items-center justify-center aspect-video group">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1] transition-transform duration-500 group-hover:scale-[1.02]"
          />
          
          {/* Fallback Awaiting State Overlay */}
          {connectionStatus !== "connected" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-md gap-3 p-4">
              {connectionStatus === "failed" ? (
                <>
                  <span className="text-3xl">🔌</span>
                  <p className="text-sm font-semibold text-red-400 font-mono tracking-wide">Signaling Connection Offline</p>
                  <p className="text-[11px] text-gray-400 text-center max-w-[320px] leading-relaxed">
                    Could not connect to the Express signaling server at <code className="text-red-300 font-mono">localhost:3001</code>.
                  </p>
                  <p className="text-[11px] text-gray-500 text-center max-w-[320px] bg-dark-400/50 p-2 rounded border border-dark-100/50 font-mono">
                    Ensure your backend server is running by typing:<br />
                    <span className="text-pink-400">npm run dev</span> inside the <code className="text-white">/backend</code> folder!
                  </p>
                </>
              ) : (
                <>
                  <div className="relative w-12 h-12 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full border-2 border-pink-500/20 animate-ping" />
                    <span className="text-3xl animate-bounce">🤖</span>
                  </div>
                  <p className="text-sm font-semibold text-pink-400 font-mono tracking-wide animate-pulse">Awaiting AI Interviewer...</p>
                  <p className="text-xs text-gray-500 px-4 text-center max-w-[280px]">
                    Establishing WebRTC session and matching feed connections...
                  </p>
                </>
              )}
            </div>
          )}

          <span className="absolute top-4 left-4 bg-black/80 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest font-mono text-pink-400 border border-pink-500/25 backdrop-blur-md uppercase">
            AI Recruiter (Chloe)
          </span>
        </div>

        {/* Candidate Media Preview (Local Feed) */}
        <div className="relative rounded-xl overflow-hidden bg-dark-300/85 border border-dark-100 flex items-center justify-center aspect-video group">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover transform scale-x-[-1] transition-all duration-500 group-hover:scale-[1.02]",
              !isVideoEnabled && "opacity-0"
            )}
          />

          {/* Camera Disabled visual placeholder */}
          {!isVideoEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-400 gap-2">
              <VideoOff className="size-8 text-gray-500 animate-pulse" />
              <span className="text-xs text-gray-500 font-semibold font-mono">Camera Feed Muted</span>
            </div>
          )}

          {!localStream && isVideoEnabled && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-dark-400 gap-2">
              <span className="size-6 border-2 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-gray-500 font-semibold font-mono uppercase tracking-wider">Accessing Stream...</span>
            </div>
          )}

          <span className="absolute top-4 left-4 bg-black/80 px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest font-mono text-white border border-dark-100/50 backdrop-blur-md uppercase">
            Candidate Preview
          </span>

          {/* Media Interactive controls inside Candidate stream */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/75 p-1.5 rounded-lg border border-dark-100/50 backdrop-blur-md">
            <button
              onClick={toggleVideo}
              className={cn(
                "p-2 rounded-md transition-all hover:scale-105 active:scale-95",
                isVideoEnabled 
                  ? "bg-dark-200 text-gray-300 hover:text-white hover:bg-dark-100" 
                  : "bg-red-950/80 text-red-400 border border-red-500/25"
              )}
              title={isVideoEnabled ? "Turn Camera Off" : "Turn Camera On"}
            >
              {isVideoEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
            </button>

            <button
              onClick={toggleAudio}
              className={cn(
                "p-2 rounded-md transition-all hover:scale-105 active:scale-95",
                isAudioEnabled 
                  ? "bg-dark-200 text-gray-300 hover:text-white hover:bg-dark-100" 
                  : "bg-red-950/80 text-red-400 border border-red-500/25"
              )}
              title={isAudioEnabled ? "Mute Microphone" : "Unmute Microphone"}
            >
              {isAudioEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
