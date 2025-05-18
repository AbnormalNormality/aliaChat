import { initializeApp } from "https://www.gstatic.com/firebasejs/11.7.3/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  setDoc,
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-firestore.js";

import {
  getAuth,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

// --- Firebase Init ---
const firebaseConfig = {
  apiKey: "AIzaSyDYGxO2MhkYGm8l-UTRdT1dxmffx4zv5_0",
  authDomain: "alia-chat-4389d.firebaseapp.com",
  projectId: "alia-chat-4389d",
  storageBucket: "alia-chat-4389d.firebasestorage.app",
  messagingSenderId: "212747175022",
  appId: "1:212747175022:web:f9779790029587990029588a8be527f",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Providers ---
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
const microsoftProvider = new OAuthProvider("microsoft.com");

// --- Cache ---
const messagesCol = collection(db, "messages");
const messagesQuery = query(messagesCol, orderBy("timestamp"));

// --- Messaging ---
async function sendMessage(uid, text) {
  await addDoc(messagesCol, {
    uid,
    text,
    timestamp: serverTimestamp(),
  });
}

function listenMessages(callback) {
  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
    }));
    callback(messages);
  });
}

// --- Auth Helper Functions ---
async function signInWithGoogle() {
  await signInWithPopup(auth, googleProvider);
}

async function signInWithGitHub() {
  await signInWithPopup(auth, githubProvider);
}

async function signInWithMicrosoft() {
  await signInWithPopup(auth, microsoftProvider);
}

async function signInWithEmail(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

async function signUpWithEmail(email, password) {
  await createUserWithEmailAndPassword(auth, email, password);
}

// --- Main Auth Function ---
async function signIn(method, email, password) {
  if (method === "google") {
    await signInWithGoogle();
  } else if (method === "github") {
    await signInWithGitHub();
  } else if (method === "microsoft") {
    await signInWithMicrosoft();
  } else if (method === "email") {
    if (!email || !password) throw new Error("Email and password required");
    await signInWithEmail(email, password);
  } else if (method === "signup-email") {
    if (!email || !password) throw new Error("Email and password required");
    await signUpWithEmail(email, password);
  } else {
    throw new Error("Unknown sign-in method");
  }
}

function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

function getCurrentUser() {
  return auth.currentUser;
}

async function signOutUser() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Sign Out Error:", err);
  }
}

async function setUserProfile(uid, key, value) {
  await setDoc(doc(db, "users", uid), { [key]: value }, { merge: true });
}

async function getUserProfile(uid) {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? userDoc.data() : null;
}

// --- Exports ---
export {
  sendMessage,
  listenMessages,
  signIn,
  onAuthStateChange,
  getCurrentUser,
  signOutUser,
  setUserProfile,
  getUserProfile,
};
