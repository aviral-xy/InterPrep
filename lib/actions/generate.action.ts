"use server";

import { feedbackSchema } from "@/constants";
import { getAdminDb } from "@/firebass/admin";
import { google } from "@ai-sdk/google";
import { generateObject, generateText } from "ai";

export async function getInterviewByUserId(userId: string): Promise<Interview[] | null> {
    try {
    const db = getAdminDb();
        const Interviews = await db.collection('interviews')
        .where('userId', '==', userId)
        .orderBy('createdAt','desc')
        .get();

        return Interviews.docs.map((doc) => ({ id: doc.id, ...doc.data()}) ) as Interview[];
    } catch (error: any) {
        console.error('Error fetching interviews:', error?.message);
        // Return empty array instead of crashing if index is not ready
        if (error?.code === 9) {
            return [];
        }
        throw error;
    }
} 

export async function getLatestInterviews(params: GetLatestInterviewsParams): Promise<Interview[] | null> {
const { userId , 
    // limit = 20
 } = params

  const db = getAdminDb();

    const Interviews = await db.collection('interviews')
    .orderBy('createdAt','desc')
    .where('finalized', '==', true)
    .where('userId', '!=', userId)
    //limit(limit)
        .get();

        return Interviews.docs.map((doc) => ({ id: doc.id, ...doc.data()}) ) as Interview[];
} 

export async function getInterviewById(id: string): Promise<Interview | null> {
  const db = getAdminDb();
    const Interview = await db.collection('interviews')
    .doc(id)
    .get();

        return Interview.data() as Interview | null;
} 

export async function createFeedback(params: CreateFeedbackParams) {
    const { interviewId, userId, transcript, feedbackId, code, language } = params;
    const db = getAdminDb();
  
    try {
      const formattedTranscript = transcript
        .map(
          (sentence: { role: string; content: string }) =>
            `- ${sentence.role}: ${sentence.content}\n`
        )
        .join("");
  
      let codingContext = "";
      if (code && code.trim().length > 0) {
        codingContext = `
          The candidate also submitted a coding solution in the interactive editor:
          Language: ${language || "javascript"}
          Submitted Code:
          \`\`\`${language || "javascript"}
          ${code}
          \`\`\`
          
          Your evaluation MUST include a thorough review of this code. Critique its algorithms, syntax, edge-case coverage, and complexity. Provide an optimized, refactored solution.
        `;
      }

      const { object } = await generateObject({
        model: google("gemini-2.5-flash", {
          structuredOutputs: false,
        }),
        schema: feedbackSchema,
        prompt: `
          You are an AI interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories. Be thorough and detailed in your analysis. Don't be lenient with the candidate. If there are mistakes or areas for improvement, point them out.
          Transcript:
          ${formattedTranscript}
          
          ${codingContext}
  
          Please score the candidate from 0 to 100 in the following areas. Do not add categories other than the ones provided:
          - **Communication Skills**: Clarity, articulation, structured responses.
          - **Technical Knowledge**: Understanding of key concepts for the role.
          - **Problem-Solving**: Ability to analyze problems and propose solutions.
          - **Cultural & Role Fit**: Alignment with company values and job role.
          - **Confidence & Clarity**: Confidence in responses, engagement, and clarity.

          If code was submitted, ensure you fully populate the "codeReview" object containing the candidate's time/space complexities, found bugs/warnings list, detailed critique paragraph, and your full optimized refactoredCode string. If no code was submitted, omit the "codeReview" object entirely.
          `,
        system:
          "You are a professional interviewer analyzing a mock interview. Your task is to evaluate the candidate based on structured categories",
      });
  
      const feedback = {
        interviewId: interviewId,
        userId: userId,
        totalScore: object.totalScore,
        categoryScores: object.categoryScores,
        strengths: object.strengths,
        areasForImprovement: object.areasForImprovement,
        finalAssessment: object.finalAssessment,
        createdAt: new Date().toISOString(),
        ...(object.codeReview ? { codeReview: object.codeReview } : {})
      };
  
      let feedbackRef;
  
      if (feedbackId) {
        feedbackRef = db.collection("feedback").doc(feedbackId);
      } else {
        feedbackRef = db.collection("feedback").doc();
      }
  
      await feedbackRef.set(feedback);
  
      return { success: true, feedbackId: feedbackRef.id };
    } catch (error) {
      console.error("Error saving feedback:", error);
      return { success: false };
    }
  }


  export async function getFeedbackByInterviewId(
    params: GetFeedbackByInterviewIdParams
  ): Promise<Feedback | null> {
    const { interviewId, userId } = params;
    const db = getAdminDb();
  
    const querySnapshot = await db
      .collection("feedback")
      .where("interviewId", "==", interviewId)
      .where("userId", "==", userId)
      .limit(1)
      .get();
  
    if (querySnapshot.empty) return null;
  
    const feedbackDoc = querySnapshot.docs[0];
    return { id: feedbackDoc.id, ...feedbackDoc.data() } as Feedback;
  }

  export async function createInterview(params: {
    role: string;
    type: string;
    level: string;
    profile: string;
    techstack: string[];
    questions: string[];
    userId: string;
  }) {
    const { role, type, level, profile, techstack, questions, userId } = params;
    const db = getAdminDb();
    
    try {
      const { getRandomInterviewCover } = await import("@/lib/utils");
      
      const interview = {
        role: role,
        type: type,
        level: level,
        profile: profile,
        techstack: techstack,
        questions: questions,
        userId: userId,
        finalized: true,
        coverImage: getRandomInterviewCover(),
        createdAt: new Date().toISOString(),
      };

      const interviewRef = await db.collection("interviews").add(interview);
      return { success: true, id: interviewRef.id };
    } catch (error: any) {
      console.error("Error creating interview in Firestore:", error);
      return { success: false, error: error?.message || "Failed to create interview" };
    }
  }

  export async function proxyGenerateInterview(params: {
    role: string;
    level: string;
    techstack: string;
    amount: number;
    type: string;
    profile: string;
  }) {
    const { role, level, techstack, amount, type, profile } = params;
    const n8nUrl = "https://n8n-production-7cbf9.up.railway.app/webhook-test/generate-interview";

    try {
      const response = await fetch(n8nUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          level,
          techstack,
          amount,
          type,
          profile: profile || "Not provided.",
        }),
      });

      if (!response.ok) {
        let errMsg = `n8n error ${response.status}`;
        try {
          const e = await response.json();
          if (e?.message) errMsg = e.message;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();

      // Detect if n8n returned an unevaluated expression (its internal HTTP node failed)
      const questionsRaw = data?.questions ?? data?.data?.questions ?? "";
      if (typeof questionsRaw === "string" && questionsRaw.includes("{{")) {
        throw new Error("n8n workflow internal error: Gemini HTTP node did not execute. Fix the URL and API key in the n8n HTTP Request node.");
      }

      return { success: true, data };
    } catch (error: any) {
      console.error("n8n webhook failed, falling back to direct Gemini:", error?.message);

      // ── Fallback: call Gemini directly ──────────────────────────────────
      try {
        const prompt = `Generate ${amount} interview questions for ${role} at ${level} level with ${techstack} tech stack.
The focus between behavioural and technical questions should lean towards: ${type}.
The user's profile/resume: ${profile || "Not provided."}.
Please return ONLY the questions as a valid JSON array of strings, with no extra text, no markdown, no code blocks.
Example format: ["Question 1?", "Question 2?", "Question 3?"]
The questions will be read by a voice assistant so do not use "/" or "*" or any special characters that might break speech.`;

        const { text } = await generateText({
          model: google("gemini-2.5-flash"),
          prompt,
        });

        let cleaned = text.trim();
        if (cleaned.startsWith("```")) {
          cleaned = cleaned.replace(/```json|```/g, "").trim();
        }

        return { success: true, data: { success: true, questions: cleaned } };
      } catch (geminiError: any) {
        console.error("Gemini fallback also failed:", geminiError?.message);
        return { success: false, error: geminiError?.message || "Failed to generate questions." };
      }
    }
  }