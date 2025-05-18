import {
  sendMessage,
  listenMessages,
  signIn,
  onAuthStateChange,
  getCurrentUser,
  signOutUser,
  setUserProfile,
  getUserProfile,
  db,
  collection,
  getDocs,
  writeBatch,
  doc,
} from "./firebase-backend.js";

const loggedOutDiv = document.getElementById("loggedOut");
const loggedInDiv = document.getElementById("loggedIn");

const usernameSpan = document.getElementById("username");
const providerSpan = document.getElementById("provider");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const messagesDiv = document.getElementById("messages");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");

const signOutBtn = document.getElementById("signOutBtn");

const userPhotoImg = document.getElementById("userPhoto");

const toggleNotifications = document.getElementById("toggleNotifications");

let unsubscribeMessages = null;
const userCache = {};

// Group buttons by ID and method
const buttonMethods = {
  signInGoogle: "google",
  signInGitHub: "github",
  signInMicrosoft: "microsoft",
  signInEmail: "email",
  signUpEmail: "signup-email",
};

// Cache buttons in an object
const signInButtons = Object.fromEntries(
  Object.keys(buttonMethods).map((id) => [id, document.getElementById(id)])
);

// Helper: disable/enable all sign-in buttons
function setButtonsDisabled(disabled) {
  Object.values(signInButtons).forEach((btn) => (btn.disabled = disabled));
}

// Attach event listeners in a loop to reduce duplication
for (const [id, method] of Object.entries(buttonMethods)) {
  signInButtons[id].addEventListener("click", () => handleSignIn(method));
}

function resetUIForSignedOut() {
  loggedInDiv.style.display = "none";
  loggedOutDiv.style.display = "block";
  messagesDiv.innerHTML = "";

  // Clear userCache safely on sign-out
  Object.keys(userCache).forEach((key) => delete userCache[key]);

  try {
    if (unsubscribeMessages) unsubscribeMessages();
  } catch (e) {
    console.error("Failed to unsubscribe from messages:", e);
  }
}

async function displayMessages(messages) {
  const nearBottomThreshold = 10; // pixels
  const isAtBottom =
    messagesDiv.scrollHeight -
      messagesDiv.scrollTop -
      messagesDiv.clientHeight <
    nearBottomThreshold;

  messagesDiv.innerHTML = "";
  const sortedMessages = [...messages].slice(-50);

  const lastMsg = sortedMessages[sortedMessages.length - 1];
  if (!lastMsg) return;

  for (const msg of sortedMessages) {
    const time =
      msg.timestamp instanceof Date
        ? msg.timestamp.toLocaleString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "";

    // Cache nickname and photoURL
    let profile = userCache[msg.uid];
    if (!profile) {
      profile = (await getUserProfile(msg.uid)) || {};
      userCache[msg.uid] = profile;
    }

    const nickname = profile.nickname || "Anon";
    const photoURL = profile.photoURL || null;

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");

    const header = document.createElement("div");
    header.classList.add("message-header");

    // Author wrapper for avatar + name
    const authorWrapper = document.createElement("div");
    authorWrapper.classList.add("message-author-wrapper");

    if (photoURL) {
      const avatar = document.createElement("img");
      avatar.src = photoURL;
      avatar.alt = "User photo";
      avatar.classList.add("message-avatar");
      // Hide avatar if image fails to load
      avatar.onerror = () => (avatar.style.display = "none");
      authorWrapper.appendChild(avatar);
    }

    const author = document.createElement("span");
    author.classList.add("message-author");
    author.textContent = nickname;
    authorWrapper.appendChild(author);

    header.appendChild(authorWrapper);

    // Timestamp with hover for full date
    const timestamp = document.createElement("div");
    timestamp.classList.add("message-timestamp");
    timestamp.textContent = time;
    if (msg.timestamp instanceof Date) {
      timestamp.title = msg.timestamp.toString();
    }
    header.appendChild(timestamp);

    const content = document.createElement("div");
    content.classList.add("message-content");
    content.textContent = msg.text;

    msgDiv.appendChild(header);
    msgDiv.appendChild(content);

    messagesDiv.appendChild(msgDiv);
  }

  const lastNotifiedId = localStorage.getItem("lastNotifiedMessageId");

  const user = getCurrentUser();

  if (lastMsg.id && lastMsg.id !== lastNotifiedId && lastMsg.uid != user.uid) {
    let profile = userCache[lastMsg.uid];
    if (!profile) {
      profile = (await getUserProfile(lastMsg.uid)) || {};
      userCache[lastMsg.uid] = profile;
    }
    const nickname = profile.nickname || "Anon";

    notify(`New message from ${nickname}: ${lastMsg.text}`);
    localStorage.setItem("lastNotifiedMessageId", lastMsg.id);
  }

  if (isAtBottom) {
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  }
}

async function handleUser(user) {
  if (!user) {
    resetUIForSignedOut();
    return;
  }

  loggedInDiv.style.display = "block";
  loggedOutDiv.style.display = "none";

  let profile = (await getUserProfile(user.uid)) || {};

  // Nickname handling
  let nickname = profile.nickname;
  if (!nickname || nickname === "Anon") {
    nickname = prompt("Enter your nickname:");
    nickname = nickname?.trim() || user.displayName || user.email || "User";
    await setUserProfile(user.uid, "nickname", nickname);
  }

  // Photo handling
  let photoURL = profile.photoURL || user.photoURL || null;
  if (photoURL && profile.photoURL !== photoURL) {
    await setUserProfile(user.uid, "photoURL", photoURL);
  }

  usernameSpan.textContent = nickname;

  const providerId = user.providerData[0]?.providerId || "unknown";
  const providerMap = {
    "google.com": "Google",
    "github.com": "GitHub",
    "microsoft.com": "Microsoft",
    password: "Email",
  };

  providerSpan.textContent = providerMap[providerId] || "Unknown";

  if (photoURL) {
    userPhotoImg.src = photoURL;
    userPhotoImg.style.display = "inline-block";
  } else {
    userPhotoImg.style.display = "none";
  }

  try {
    if (unsubscribeMessages) unsubscribeMessages();
  } catch (e) {
    console.error("Failed to unsubscribe from messages:", e);
  }
  unsubscribeMessages = listenMessages(displayMessages);
}

async function handleSignIn(method) {
  setButtonsDisabled(true);
  try {
    let email = null,
      password = null;

    if (method === "email" || method === "signup-email") {
      email = emailInput.value.trim();
      password = passwordInput.value.trim();
      if (!email || !password) {
        alert("Please enter email and password.");
        return;
      }
    }

    await signIn(method, email, password);

    if (method === "signup-email") {
      alert("Sign-up successful! You are now signed in.");
    }
  } catch (e) {
    alert(`${method} failed: ${e.message}`);
  } finally {
    setButtonsDisabled(false);
  }
}

async function signOut() {
  signOutBtn.disabled = true;
  try {
    await signOutUser();
  } finally {
    signOutBtn.disabled = false;
  }
}

signOutBtn.addEventListener("click", async () => {
  await signOut();
});

async function sendMessageFromInput() {
  const text = messageInput.value.trim();
  if (!text) return;

  if (text.length > 1000) {
    alert("Message is too long (max 1000 characters).");
    return;
  }

  const user = getCurrentUser();
  if (!user) {
    alert("You must be signed in to send messages.");
    return;
  }

  await sendMessage(user.uid, text);
  messageInput.value = "";
  messageInput.focus();
}

sendBtn.addEventListener("click", async () => {
  await sendMessageFromInput();
});

messageInput.addEventListener("keydown", async (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    await sendMessageFromInput();
  }
});

if (!("Notification" in window)) {
  alert("This browser does not support desktop notifications.");
} else if (Notification.permission !== "granted") {
  Notification.requestPermission().then((permission) => {
    if (permission === "granted") {
      alert("Notifications enabled!");
    } else {
      alert("Notifications denied.");
    }
  });
}

function notify(content) {
  if (Notification.permission === "granted" && toggleNotifications.checked) {
    new Notification(content);
  }
}

toggleNotifications.addEventListener("change", () => {
  localStorage.setItem("notificationsEnabled", toggleNotifications.checked);
});

const enableNotifs = localStorage.getItem("notificationsEnabled");
if (enableNotifs !== null) {
  toggleNotifications.checked = enableNotifs === "true";
}

async function clearAllMessages() {
  const messagesRef = collection(db, "messages");
  const snapshot = await getDocs(messagesRef);

  const batch = writeBatch(db);

  snapshot.forEach((docSnap) => {
    batch.delete(doc(db, "messages", docSnap.id));
  });

  await batch.commit();
  console.log("All messages cleared");
}

async function handleKeyRelease(event) {
  const user = getCurrentUser();
  if (!user) return;

  if (devIds.includes(user.uid) && event.ctrlKey && event.key === "0") {
    console.log("Triggering clearAllMessages");
    clearAllMessages().catch(console.error);
  }
}

document.addEventListener("keyup", handleKeyRelease);

const devIds = ["EDxShAtQrAhVlTp1PhiuWxGyWB23"];

// Initialize auth listener
onAuthStateChange(handleUser);
