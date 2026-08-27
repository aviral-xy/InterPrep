'use client';

import React from "react";
import Editor from "@monaco-editor/react";
import { Terminal, Zap, Code, ShieldCheck, Bug, Cpu, Layers } from "lucide-react";

interface CodeReviewProps {
  codeReview: {
    writtenCode: string;
    language: string;
    timeComplexity: string;
    spaceComplexity: string;
    bugsFound: string[];
    critique: string;
    refactoredCode: string;
  };
}

export const FeedbackCodeReview = ({ codeReview }: CodeReviewProps) => {
  const {
    writtenCode,
    language,
    timeComplexity,
    spaceComplexity,
    bugsFound,
    critique,
    refactoredCode,
  } = codeReview;

  return (
    <div className="mt-10 rounded-2xl bg-dark-200 border border-dark-100 overflow-hidden shadow-2xl glassmorphism p-6 mb-8 transition-all duration-300">
      
      {/* Code Review Header */}
      <div className="flex items-center gap-3 border-b border-dark-100/50 pb-4 mb-6">
        <Cpu className="size-6 text-pink-500 animate-pulse" />
        <div>
          <h3 className="text-xl font-bold text-white">AI Deep Code Evaluation</h3>
          <p className="text-xs text-gray-500 font-mono">Algorithmic complexity, clean code, and logic audit</p>
        </div>
      </div>

      {/* Complexity Badges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Time Complexity Card */}
        <div className="bg-dark-300 border border-dark-100 p-4 rounded-xl flex items-center gap-4">
          <div className="size-10 rounded-lg bg-pink-500/10 flex items-center justify-center border border-pink-500/25">
            <Zap className="size-5 text-pink-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 font-mono">Time Complexity</p>
            <h4 className="text-lg font-bold text-white font-mono">{timeComplexity || "O(N)"}</h4>
          </div>
        </div>

        {/* Space Complexity Card */}
        <div className="bg-dark-300 border border-dark-100 p-4 rounded-xl flex items-center gap-4">
          <div className="size-10 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/25">
            <Layers className="size-5 text-cyan-500" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 font-mono">Space Complexity</p>
            <h4 className="text-lg font-bold text-white font-mono">{spaceComplexity || "O(1)"}</h4>
          </div>
        </div>
      </div>

      {/* Bugs & Warnings List */}
      {bugsFound && bugsFound.length > 0 && (
        <div className="mb-6 bg-red-950/20 border border-red-500/20 rounded-xl p-4">
          <h4 className="text-sm font-bold text-red-400 flex items-center gap-2 mb-2">
            <Bug className="size-4 text-red-500" />
            Vulnerabilities & Logical Caveats ({bugsFound.length})
          </h4>
          <ul className="space-y-1.5 list-disc pl-5">
            {bugsFound.map((bug, index) => (
              <li key={index} className="text-xs text-red-200 leading-relaxed font-mono">
                {bug}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Critique Section */}
      <div className="mb-6 bg-dark-300/50 border border-dark-100 p-4 rounded-xl leading-relaxed">
        <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
          <Terminal className="size-4 text-cyan-400" />
          Interviewer Audit Feedback
        </h4>
        <p className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-line">
          {critique}
        </p>
      </div>

      {/* Code Sandbox Side-by-Side Comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        
        {/* Candidate Original Code Box */}
        <div className="flex flex-col bg-dark-300/40 border border-dark-100 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 font-mono flex items-center gap-1.5">
              <Code className="size-3.5" />
              Your Solution
            </h4>
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-gray-500 bg-dark-400 px-2.5 py-1 rounded">
              {language}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-dark-100 bg-[#1e1e1e] flex-grow">
            <Editor
              height="300px"
              language={language}
              value={writtenCode}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: "on",
                scrollbar: { vertical: "visible", horizontal: "visible" },
                automaticLayout: true,
                domReadOnly: true
              }}
            />
          </div>
        </div>

        {/* AI Optimized Refactored Code Box */}
        <div className="flex flex-col bg-dark-300/40 border border-dark-100 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-pink-400 font-mono flex items-center gap-1.5">
              <ShieldCheck className="size-3.5" />
              Chloe's Optimized Proposal
            </h4>
            <span className="text-[10px] uppercase font-bold tracking-wider font-mono text-pink-400 bg-pink-950/20 px-2.5 py-1 rounded border border-pink-500/10">
              Approved
            </span>
          </div>

          <div className="rounded-lg overflow-hidden border border-pink-500/20 bg-[#1e1e1e] flex-grow">
            <Editor
              height="300px"
              language={language}
              value={refactoredCode}
              theme="vs-dark"
              options={{
                readOnly: true,
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: "on",
                scrollbar: { vertical: "visible", horizontal: "visible" },
                automaticLayout: true,
                domReadOnly: true
              }}
            />
          </div>
        </div>

      </div>

    </div>
  );
};
