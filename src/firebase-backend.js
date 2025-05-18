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
  GoogleAuthProvider,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.7.3/firebase-auth.js";

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
const provider = new GoogleAuthProvider();

const nicknameCache = {};
const messagesCol = collection(db, "messages");
const messagesQuery = query(messagesCol, orderBy("timestamp"));

async function getNickname(uid) {
  if (nicknameCache[uid]) return nicknameCache[uid];

  const userDoc = await getDoc(doc(db, "users", uid));
  if (userDoc.exists()) {
    const nickname = userDoc.data().nickname;
    nicknameCache[uid] = nickname;
    return nickname;
  }
  nicknameCache[uid] = "Anon";
  return "Anon";
}

async function setUserNickname(uid, nickname) {
  await setDoc(doc(db, "users", uid), { nickname });
  nicknameCache[uid] = nickname;
}

async function sendMessage(uid, nickname, text) {
  await addDoc(messagesCol, {
    uid,
    nickname,
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

async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error("Google Sign-In Error:", error);
  }
}

function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}

function getCurrentUser() {
  return auth.currentUser;
}

export {
  getNickname,
  setUserNickname,
  sendMessage,
  listenMessages,
  signInWithGoogle,
  onAuthStateChange,
  getCurrentUser,
};
