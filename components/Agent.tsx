'use client';

import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import Loading from './Loading';
import { createInterview, proxyGenerateInterview } from '@/lib/actions/generate.action';

const LOADING_STEPS = [
  "Initializing Gemini AI...",
  "Analyzing Job Role & Tech Stack...",
  "Crafting personalized questions with Gemini...",
  "Customizing behavioral & technical prompts...",
  "Generating precision interview questions...",
  "Saving interview framework to Firestore...",
  "Redirecting to your dashboard..."
];

const Agent = ({ userName, userId, type }: AgentProps) => {
  const router = useRouter();
  const [role, setRole] = useState('Frontend Developer');
  const [level, setLevel] = useState('Intermediate');
  const [techStack, setTechStack] = useState('React, Next.js, TypeScript');
  const [focusType, setFocusType] = useState('Technical');
  const [amount, setAmount] = useState(5);
  const [profile, setProfile] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Cycle through loading steps to look premium
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 2500);
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setError("User session not found. Please log in.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    setLoadingStep(0);

    try {
      // Call n8n safely via Server Action to bypass browser CORS rules
      const result = await proxyGenerateInterview({
        role,
        level,
        techstack: techStack,
        amount,
        type: focusType,
        profile: profile || "Not provided.",
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || "Failed to generate questions from n8n.");
      }

      const data = result.data;
      
      // Robustly handle both wrapped {success: true, questions: [...]} and direct responses from n8n
      let questionsData = data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        if ('questions' in data) {
          questionsData = data.questions;
        } else if (Array.isArray(data.body)) {
          questionsData = data.body;
        } else if (data.data && 'questions' in data.data) {
          questionsData = data.data.questions;
        }
      }

      if (!questionsData) {
        throw new Error("Failed to generate questions from server. Ensure your n8n workflow returns the generated questions.");
      }

      // Safe parse the questions
      let parsedQuestions: string[] = [];
      try {
        parsedQuestions = typeof questionsData === 'string' ? JSON.parse(questionsData) : questionsData;
      } catch (err) {
        console.warn("JSON parsing failed, attempting cleanup of code blocks:", err);
        try {
          let cleanStr = String(questionsData).trim();
          if (cleanStr.startsWith("```")) {
            cleanStr = cleanStr.replace(/```json|```/g, "").trim();
          }
          parsedQuestions = JSON.parse(cleanStr);
        } catch (innerErr) {
          console.warn("JSON parsing failed completely, falling back to line-by-line parsing:", innerErr);
          const lines = String(questionsData).split(/\r?\n/);
          parsedQuestions = lines
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => line.replace(/^(?:\d+[\.\)]|-|\*)\s*/, "").trim())
            .filter((line) => line.endsWith("?") || line.length > 10);
        }
      }

      if (!Array.isArray(parsedQuestions)) {
        throw new Error("Invalid questions format received.");
      }

      setLoadingStep(5); // Mark saving to database

      // Save to Firebase using Server Action
      const saveResult = await createInterview({
        role,
        type: focusType,
        level,
        profile: profile || "Not provided.",
        techstack: techStack.split(",").map((s) => s.trim()).filter(Boolean),
        questions: parsedQuestions,
        userId: userId,
      });

      if (!saveResult.success) {
        throw new Error(saveResult.error || "Failed to save interview to database.");
      }

      setLoadingStep(6); // Final step
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);

    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err?.message || "An unexpected error occurred. Is the Express server and n8n running?");
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center min-h-[450px]">
        <div className="w-20 h-20 relative mb-8">
          <span className="absolute inset-0 rounded-full border-4 border-pink-500/20 animate-pulse" />
          <span className="absolute inset-2 rounded-full border-4 border-t-pink-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <h3 className="text-xl font-semibold text-pink-400 mb-4 animate-pulse">
          Crafting Your Interview
        </h3>
        <div className="bg-dark-300 border border-dark-100 rounded-lg p-6 max-w-md w-full shadow-2xl glassmorphism">
          <p className="text-sm text-gray-400 font-mono transition-opacity duration-300">
            {LOADING_STEPS[loadingStep]}
          </p>
          <div className="w-full bg-dark-400 h-1.5 rounded-full overflow-hidden mt-4">
            <div 
              className="bg-pink-500 h-full transition-all duration-1000 ease-out"
              style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
          Configure Your Mock Interview
        </h2>
        <p className="mt-3 text-lg text-gray-400">
          Set your role, technology stack, and let Gemini & n8n design a tailor-made mock session.
        </p>
      </div>

      <div className="bg-dark-200 border border-dark-100 rounded-xl p-8 shadow-xl glassmorphism">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-950/50 border border-red-500/50 text-red-200 text-sm">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Job Role */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-300" htmlFor="role">
                Job Role
              </label>
              <input
                id="role"
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-dark-300 border border-dark-100 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors"
                required
                placeholder="e.g. Frontend Developer"
              />
            </div>

            {/* Experience Level */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-300" htmlFor="level">
                Experience Level
              </label>
              <select
                id="level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full bg-dark-300 border border-dark-100 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors cursor-pointer"
              >
                <option value="Junior">Junior (0-2 years)</option>
                <option value="Intermediate">Intermediate (2-5 years)</option>
                <option value="Senior">Senior (5+ years)</option>
                <option value="Lead">Lead / Architect</option>
              </select>
            </div>

            {/* Tech Stack */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-300" htmlFor="techStack">
                Tech Stack (Comma-separated)
              </label>
              <input
                id="techStack"
                type="text"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                className="w-full bg-dark-300 border border-dark-100 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors"
                required
                placeholder="React, Next.js, Node.js, Tailwind CSS"
              />
              <span className="text-xs text-gray-500">
                Comma separated technologies to direct the scope of your interview.
              </span>
            </div>

            {/* Focus Type */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-300" htmlFor="focusType">
                Interview Focus
              </label>
              <select
                id="focusType"
                value={focusType}
                onChange={(e) => setFocusType(e.target.value)}
                className="w-full bg-dark-300 border border-dark-100 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors cursor-pointer"
              >
                <option value="Technical">Technical (Algorithm, API, coding knowledge)</option>
                <option value="Behavioral">Behavioral (Situational, Soft Skills, Leadership)</option>
                <option value="Mixed">Mixed (Comprehensive hybrid evaluation)</option>
              </select>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-gray-300" htmlFor="amount">
                Number of Questions ({amount})
              </label>
              <div className="flex items-center gap-4 py-1">
                <input
                  id="amount"
                  type="range"
                  min="3"
                  max="10"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full h-2 bg-dark-300 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <span className="text-white font-semibold text-sm w-6">{amount}</span>
              </div>
            </div>

            {/* Profile / CV */}
            <div className="flex flex-col gap-2 md:col-span-2">
              <label className="text-sm font-semibold text-gray-300" htmlFor="profile">
                Paste Resume Details / CV Profile (Optional)
              </label>
              <textarea
                id="profile"
                value={profile}
                onChange={(e) => setProfile(e.target.value)}
                rows={4}
                className="w-full bg-dark-300 border border-dark-100 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-pink-500 transition-colors resize-y"
                placeholder="Paste relevant details about your work experience, projects, or education to get tailored, customized questions."
              />
            </div>
          </div>

          <div className="pt-4 flex justify-center">
            <button
              type="submit"
              className="px-8 py-4 bg-pink-500 hover:bg-pink-400 active:bg-pink-600 text-black font-extrabold rounded-lg shadow-lg hover:shadow-pink-950/20 transform hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
            >
              Generate Precision Mock Session
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Agent;