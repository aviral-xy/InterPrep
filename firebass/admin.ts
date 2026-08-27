import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function normalizePrivateKey(key?: string) {
  if (!key) return undefined;

  // Support keys wrapped in single/double quotes in .env files.
  let normalized = key.trim().replace(/^(["'])([\s\S]*)\1$/, "$2");

  // Support escaped newlines and normalize Windows newlines.
  normalized = normalized.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");

  return normalized;
}

function getFirebaseCertConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin env vars. Required: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY."
    );
  }

  if (projectId.includes("...") || clientEmail.includes("...") || privateKey.includes("...")) {
    throw new Error(
      "Firebase Admin credentials appear truncated (contain '...'). Paste the full service account values into .env."
    );
  }

  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----") || !privateKey.includes("-----END PRIVATE KEY-----")) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is not a valid PEM. It must include BEGIN/END PRIVATE KEY markers."
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function ensureFirebaseAdminInitialized() {
  if (getApps().length) return;

  const certConfig = getFirebaseCertConfig();

  initializeApp({
    credential: cert(certConfig),
  });
}

export function getAdminAuth() {
  ensureFirebaseAdminInitialized();
  return getAuth();
}

export function getAdminDb() {
  ensureFirebaseAdminInitialized();
  return getFirestore();
}