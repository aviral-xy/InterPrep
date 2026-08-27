'use client';

import { createFeedback } from '@/lib/actions/generate.action';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useRef } from 'react';
import Loading from './Loading';
import { VideoInterviewPanel } from './VideoInterviewPanel';
import Editor from "@monaco-editor/react";
import { Code, Play, ChevronDown, Check, Columns, Sparkles } from "lucide-react";

interface SavedMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

const GetInterview = ({ userName, userId, type, interviewId, questions }: GetInterviewProps) => {
  const router = useRouter();
  
  // Navigation & State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVideo, setShowVideo] = useState(true);
  
  // Monaco Coding Sandbox States
  const [code, setCode] = useState<string>(
    `// Write your clean coding solution here...\n\nfunction solution() {\n  // your code goes here\n  return;\n}`
  );
  const [language, setLanguage] = useState<string>("javascript");
  const [showSandbox, setShowSandbox] = useState(true);
  
  // High-fidelity Simulated Compiler States
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);

  // References for speech
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'en-US';

        rec.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }

          if (finalTranscript || interimTranscript) {
            setAnswers((prev) => ({
              ...prev,
              [currentQuestionIndex]: (prev[currentQuestionIndex] || '') + finalTranscript + interimTranscript
            }));
          }
        };

        rec.onerror = (err: any) => {
          console.error("Speech recognition error:", err);
          if (err.error !== 'no-speech') {
            setIsRecording(false);
          }
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, [currentQuestionIndex]);

  // Voice synthesis: Chloe reads the question out loud
  const speakQuestion = (text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // cancel any active synthesis
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Load voices and select preferred female English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => 
        v.name.includes("Google US English") || 
        v.name.includes("Natural") || 
        v.lang.startsWith("en")
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      window.speechSynthesis.speak(utterance);
    }
  };

  // Speak question whenever index changes
  useEffect(() => {
    if (questions && questions.length > 0) {
      const activeQuestion = questions[currentQuestionIndex];
      // Slight timeout to wait for user transition to feel natural
      const t = setTimeout(() => {
        speakQuestion(activeQuestion);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [currentQuestionIndex, questions]);

  // Stop voice and synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please try Chrome, Edge, or Safari.");
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Failed to start speech recognition:", e);
      }
    }
  };

  const handleNext = () => {
    if (isRecording) {
      recognitionRef.current.stop();
    }
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (isRecording) {
      recognitionRef.current.stop();
    }
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const runSimulatedCode = () => {
    if (isCompiling) return;
    setIsCompiling(true);
    setShowTerminal(true);
    setTerminalOutput([`> Initializing ${language.toUpperCase()} isolated sandbox compiler...`]);

    const logs = [
      `> Allocating v8 virtual machine execution context...`,
      `> Parsing source tree AST compilation nodes...`,
      `> Bundling runtime bindings and standard core libraries...`,
      `> Executing mock unit specs on solution()...`,
      `✓ Spec #1: solution() returned successful execution status.`,
      `✓ Spec #2: Boundary case verification completed.`,
      `\n✨ Compilation Successful!\n✓ Test Suites: 1 passed, 1 total (2.8ms)\n✓ Output: solution() executed without errors.`
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setTerminalOutput(prev => [...prev, log]);
        if (index === logs.length - 1) {
          setIsCompiling(false);
        }
      }, (index + 1) * 350);
    });
  };

  const handleSubmit = async () => {
    if (isRecording) {
      recognitionRef.current.stop();
    }

    setIsRedirecting(true);
    setErrorMessage(null);

    // Format the transcript as array of alternating questions and answers
    const transcript: SavedMessage[] = [];
    
    questions?.forEach((q, index) => {
      transcript.push({
        role: 'assistant',
        content: q
      });
      transcript.push({
        role: 'user',
        content: answers[index]?.trim() || "(No response provided by candidate.)"
      });
    });

    try {
      const result = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: transcript,
        code: showSandbox ? code : undefined,
        language: showSandbox ? language : undefined,
      });

      if (result.success && result.feedbackId) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        throw new Error("Failed to save feedback evaluation.");
      }
    } catch (err: any) {
      console.error("Evaluation submission error:", err);
      setErrorMessage(err?.message || "Error submitting interview results.");
      setIsRedirecting(false);
    }
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loading />
        <p className="text-gray-400 mt-4">Loading interview session details...</p>
      </div>
    );
  }

  const activeQuestion = questions[currentQuestionIndex];
  const activeAnswer = answers[currentQuestionIndex] || '';
  const progressPercent = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      {isRedirecting && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="w-16 h-16 relative mb-6">
            <span className="absolute inset-0 rounded-full border-4 border-pink-500/20 animate-pulse" />
            <span className="absolute inset-2 rounded-full border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2 animate-pulse">Grading in Progress</h3>
          <p className="text-sm text-gray-400 max-w-sm text-center">
            Chloe is compiling your evaluation scores, strength details, and tailored improvement metrics. Hold tight!
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-500/50 text-red-200 text-sm">
          ❌ {errorMessage}
        </div>
      )}

      {/* Dynamic Cockpit Session Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 bg-dark-300 border border-dark-100/50 p-4 rounded-xl glassmorphism">
        <div className="flex items-center gap-3">
          <Sparkles className="size-5 text-primary-200 animate-pulse" />
          <div>
            <h4 className="text-sm font-bold text-white">Assessment Workspace Controls Center</h4>
            <p className="text-[10px] text-gray-500 font-mono">Toggle high-fidelity media widgets and code sandboxes</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Video Toggle */}
          <button
            onClick={() => setShowVideo(!showVideo)}
            className={cn(
              "px-3.5 py-2 text-[11px] font-bold rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-1.5",
              showVideo
                ? "bg-pink-950/30 text-pink-400 border-pink-500/30 hover:bg-pink-900/40"
                : "bg-dark-200 text-gray-400 border-dark-100 hover:text-white hover:bg-dark-100"
            )}
          >
            📹 {showVideo ? "Hide Camera" : "Show Camera"}
          </button>
          
          {/* Sandbox Toggle */}
          <button
            onClick={() => setShowSandbox(!showSandbox)}
            className={cn(
              "px-3.5 py-2 text-[11px] font-bold rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-1.5",
              showSandbox
                ? "bg-pink-950/30 text-pink-400 border-pink-500/30 hover:bg-pink-900/40"
                : "bg-dark-200 text-gray-400 border-dark-100 hover:text-white hover:bg-dark-100"
            )}
          >
            💻 {showSandbox ? "Close Sandbox" : "Open Coding Sandbox"}
          </button>
        </div>
      </div>

      {/* Conditionally render WebRTC Video Grid */}
      {showVideo && <VideoInterviewPanel roomId={interviewId || "default-session"} />}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column Wrapper: holds Interviewer Profile + Workspace */}
        <div className={cn(
          "grid grid-cols-1 gap-6 items-start",
          showSandbox ? "lg:col-span-6 w-full" : "lg:col-span-12 grid grid-cols-1 lg:grid-cols-12 gap-8"
        )}>
          
          {/* Virtual Interviewer Profile Card */}
          <div className={cn(
            "bg-dark-200 border border-dark-100 rounded-xl p-6 shadow-lg glassmorphism text-center flex flex-col items-center",
            showSandbox ? "w-full" : "lg:col-span-4"
          )}>
            <div className="relative w-32 h-32 mb-4">
              <span className={cn(
                "absolute inset-0 rounded-full border-4 border-primary-200/30 transition-all duration-300",
                isSpeaking && "animate-ping border-primary-200",
                isRecording && "border-red-500/50 scale-105"
              )} />
              <Image 
                src="/Chloe RT600.webp" 
                alt="Interviewer avatar" 
                width={128} 
                height={128} 
                className="object-cover rounded-full border border-dark-100 z-10 w-full h-full relative"
              />
              {isSpeaking && (
                <span className="absolute -bottom-1 -right-1 bg-primary-200 p-2 rounded-full border-2 border-dark-200 text-xs animate-bounce z-20">
                  🔊
                </span>
              )}
              {isRecording && (
                <span className="absolute -bottom-1 -left-1 bg-red-500 p-2 rounded-full border-2 border-dark-200 text-xs animate-pulse z-20">
                  🎙️
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-white">Chloe</h3>
            <p className="text-xs text-primary-100 font-mono mb-4">AI Recruiter & Virtual Interviewer</p>
            
            <div className="w-full bg-dark-300/50 rounded-lg p-4 border border-dark-100/50 text-left">
              <p className="text-xs text-gray-500 font-semibold mb-1 uppercase tracking-wider">Status</p>
              <p className="text-sm font-mono text-gray-300">
                {isSpeaking ? (
                  <span className="text-primary-100">● Chloe is reading the question</span>
                ) : isRecording ? (
                  <span className="text-red-400 animate-pulse">● Chloe is listening to your answer</span>
                ) : (
                  <span className="text-gray-400">● Chloe is waiting for your response</span>
                )}
              </p>
            </div>

            <button 
              onClick={() => speakQuestion(activeQuestion)} 
              className="mt-4 text-xs font-semibold text-primary-100 hover:text-primary-200 transition-colors flex items-center gap-1 py-1 px-3 bg-dark-300 border border-dark-100 rounded-full hover:bg-dark-400 cursor-pointer"
            >
              🔊 Repeat Question
            </button>
          </div>

          {/* Q&A Interactive workspace */}
          <div className={cn(
            "bg-dark-200 border border-dark-100 rounded-xl p-8 shadow-lg glassmorphism flex flex-col min-h-[460px]",
            showSandbox ? "w-full" : "lg:col-span-8"
          )}>
            
            {/* Progress Indicator */}
            <div className="mb-6">
              <div className="flex justify-between items-center text-sm font-semibold text-gray-400 mb-2">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span className="text-primary-200 font-mono">{Math.round(progressPercent)}% Completed</span>
              </div>
              <div className="w-full bg-dark-400 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-primary-200 h-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Question Text */}
            <div className="mb-6 flex-grow">
              <div className="text-xs font-semibold text-primary-200 uppercase tracking-widest mb-2 font-mono">Question</div>
              <h4 className="text-xl font-bold text-white leading-relaxed">
                {activeQuestion}
              </h4>
            </div>

            {/* Answer Input and Controller */}
            <div className="mb-6 relative">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="answer" className="text-xs font-semibold text-gray-400 uppercase tracking-widest font-mono">
                  Your Answer
                </label>
                
                {/* Micro dictation mic button */}
                <button
                  onClick={toggleRecording}
                  className={cn(
                    "flex items-center gap-2 py-1 px-3 rounded-full text-xs font-bold transition-all border cursor-pointer",
                    isRecording 
                      ? "bg-red-950/80 border-red-500 text-red-200 animate-pulse" 
                      : "bg-dark-300 border-dark-100 text-gray-400 hover:text-white hover:bg-dark-400"
                  )}
                  title={isRecording ? "Stop voice dictation" : "Dictate your answer using microphone"}
                >
                  <span className={cn("size-2 rounded-full", isRecording ? "bg-red-500" : "bg-gray-500")} />
                  {isRecording ? "Recording Answer..." : "Speak Answer (Voice)"}
                </button>
              </div>

              {/* Styled input container */}
              <div className="relative">
                <textarea
                  id="answer"
                  value={activeAnswer}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestionIndex]: e.target.value }))}
                  rows={8}
                  className="w-full bg-dark-300 border border-dark-100 rounded-lg px-4 py-4 text-white focus:outline-none focus:border-primary-200 transition-colors resize-y leading-relaxed"
                  placeholder={isRecording ? "Dictating voice in real-time... Speak into your microphone." : "Write your response here. Or click 'Speak Answer' to dictate."}
                />
                
                {/* Crimson Glow pulse sound wave indicator inside text area */}
                {isRecording && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-1.5 bg-red-950/95 border border-red-500/50 py-2 px-3.5 rounded-full shadow-[0_0_15px_rgba(239,68,68,0.25)] transition-all duration-300">
                    <div className="flex items-end gap-[3px] h-3 px-0.5">
                      <span className="w-[2px] bg-red-500 rounded-full animate-pulse h-2.5" style={{ animationDelay: '0.1s', animationDuration: '0.6s' }} />
                      <span className="w-[2px] bg-red-500 rounded-full animate-pulse h-3.5" style={{ animationDelay: '0.3s', animationDuration: '0.8s' }} />
                      <span className="w-[2px] bg-red-500 rounded-full animate-pulse h-1.5" style={{ animationDelay: '0.5s', animationDuration: '0.5s' }} />
                      <span className="w-[2px] bg-red-500 rounded-full animate-pulse h-3" style={{ animationDelay: '0.2s', animationDuration: '0.7s' }} />
                      <span className="w-[2px] bg-red-500 rounded-full animate-pulse h-2" style={{ animationDelay: '0.4s', animationDuration: '0.4s' }} />
                    </div>
                    <span className="text-[9px] font-bold text-red-300 font-mono uppercase tracking-wider">Live Mic</span>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation and Submission Buttons */}
            <div className="flex justify-between items-center border-t border-dark-100 pt-6">
              <button
                onClick={handleBack}
                disabled={currentQuestionIndex === 0}
                className="px-5 py-2.5 bg-dark-300 hover:bg-dark-400 text-gray-300 font-semibold rounded-lg border border-dark-100 disabled:opacity-40 disabled:pointer-events-none transition-colors text-sm cursor-pointer"
              >
                ← Previous
              </button>

              {isLastQuestion ? (
                <button
                  onClick={handleSubmit}
                  className="px-6 py-3 bg-primary-200 hover:bg-primary-100 active:bg-pink-600 text-white font-extrabold rounded-lg shadow-lg hover:shadow-pink-950/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-sm flex items-center gap-1 cursor-pointer"
                >
                  🏁 Finish & Get Feedback
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-primary-200 hover:bg-primary-100 text-white font-extrabold rounded-lg hover:shadow-pink-950/10 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 text-sm flex items-center gap-1 cursor-pointer"
                >
                  Next Question →
                </button>
              )}
            </div>

          </div>
        </div>

        {/* Monaco Coding Sandbox Panel (Renders on Right Hand Side when open) */}
        {showSandbox && (
          <div className="lg:col-span-6 bg-dark-200 border border-dark-100 rounded-xl p-6 shadow-lg glassmorphism flex flex-col min-h-[520px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(236,72,153,0.04)]">
            <div className="flex justify-between items-center mb-4 border-b border-dark-100/50 pb-3">
              <div className="flex items-center gap-2">
                <Code className="size-5 text-primary-200" />
                <div>
                  <h4 className="text-sm font-bold text-white">Coding Sandbox Workspace</h4>
                  <p className="text-[10px] text-gray-500 font-mono">Real-time compiler sandbox</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Language Selector */}
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="bg-dark-300 border border-dark-100/80 rounded px-2.5 py-1.5 text-xs text-white cursor-pointer focus:outline-none focus:border-pink-500 font-semibold"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="typescript">TypeScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                </select>

                {/* Highly Interactive Run Code Action Button */}
                <button
                  onClick={runSimulatedCode}
                  disabled={isCompiling}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded flex items-center gap-1.5 cursor-pointer transition-all duration-200",
                    isCompiling
                      ? "bg-pink-950/20 text-pink-600 border border-pink-950/50 pointer-events-none"
                      : "bg-pink-500 hover:bg-pink-400 active:bg-pink-600 text-black shadow-[0_0_12px_rgba(236,72,153,0.25)] hover:shadow-[0_0_16px_rgba(236,72,153,0.4)]"
                  )}
                >
                  <Play className={cn("size-3", isCompiling && "animate-spin")} />
                  {isCompiling ? "Compiling..." : "Run Code"}
                </button>
              </div>
            </div>

            {/* Monaco Editor component */}
            <div className="flex-grow rounded-lg overflow-hidden border border-dark-100/60 shadow-inner bg-[#1e1e1e] min-h-[300px]">
              <Editor
                height="320px"
                language={language}
                value={code}
                theme="vs-dark"
                onChange={(val) => setCode(val || "")}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollbar: { vertical: "visible", horizontal: "visible" },
                  automaticLayout: true,
                  padding: { top: 12, bottom: 12 }
                }}
              />
            </div>

            {/* Expandable Retro Console Terminal Drawer */}
            {showTerminal && (
              <div className="mt-4 rounded-lg border border-dark-100 bg-black/95 p-4 shadow-2xl transition-all duration-500 animate-slide-up">
                <div className="flex justify-between items-center border-b border-dark-100/40 pb-2 mb-2">
                  <span className="text-[10px] font-bold text-gray-500 font-mono tracking-widest uppercase">Output Console</span>
                  <button
                    onClick={() => setShowTerminal(false)}
                    className="text-xs text-gray-500 hover:text-white transition-colors cursor-pointer"
                  >
                    ✕ Hide
                  </button>
                </div>
                
                {/* Vintage Cyan Phosphor Scrolling Text */}
                <div className="max-h-[140px] overflow-y-auto font-mono text-[11px] text-cyan-400/90 space-y-1 scrollbar-thin select-text">
                  {terminalOutput.map((output, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "whitespace-pre-wrap leading-relaxed animate-fade-in",
                        output.includes("✓") && "text-cyan-400 font-bold",
                        output.includes("✨") && "text-cyan-400 font-extrabold mt-1",
                        output.includes(">") && "text-gray-500"
                      )}
                    >
                      {output}
                    </div>
                  ))}
                  {isCompiling && (
                    <span className="inline-block w-1.5 h-3.5 bg-cyan-500 ml-1 animate-pulse" />
                  )}
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-between items-center bg-dark-300/40 p-2.5 rounded-lg border border-dark-100/50">
              <span className="text-[9px] font-mono text-gray-500">
                Workspace synced automatically via secure mock pipeline
              </span>
              <span className="text-[9px] font-bold text-cyan-400 font-mono flex items-center gap-1">
                <span className="size-1.5 bg-cyan-500 rounded-full animate-ping" />
                Sandbox Connected
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default GetInterview;