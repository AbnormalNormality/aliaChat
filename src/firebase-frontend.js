import {
  getNickname,
  setUserNickname,
  sendMessage,
  listenMessages,
  signIn,
  signOutUser,
  onAuthStateChange,
  getCurrentUser,
} from "./firebase-backend.js";

// DOM Elements
const signInGoogleBtn = document.getElementById("signInGoogle");
const signInGitHubBtn = document.getElementById("signInGitHub");
const signInMicrosoftBtn = document.getElementById("signInMicrosoft");
const signInEmailBtn = document.getElementById("signInEmail");
const signUpEmailBtn = document.getElementById("signUpEmail");
const signOutBtn = document.getElementById("signOutBtn");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

const userInfo = document.getElementById("userInfo");
const userNameSpan = document.getElementById("userName");
const providerSpan = document.getElementById("provider");

const messagesDiv = document.getElementById("messages");
const inputSection = document.getElementById("inputSection");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("messageInput");

let unsubscribeMessages = null;

function resetUIForSignedOut() {
  userInfo.style.display = "none";
  inputSection.style.display = "none";
  signOutBtn.style.display = "none";

  signInGoogleBtn.style.display = "inline-block";
  signInGitHubBtn.style.display = "inline-block";
  signInMicrosoftBtn.style.display = "inline-block";
  signInEmailBtn.style.display = "inline-block";
  signUpEmailBtn.style.display = "inline-block";

  emailInput.style.display = "inline-block";
  passwordInput.style.display = "inline-block";

  messagesDiv.innerHTML = "";
  if (unsubscribeMessages) unsubscribeMessages();
}

async function displayMessages(messages) {
  messagesDiv.innerHTML = ""; // Clear old messages

  const reversed = [...messages].reverse(); // Newest first

  for (const msg of reversed) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message");

    const time =
      msg.timestamp instanceof Date ? msg.timestamp.toLocaleTimeString() : "";

    // Await the nickname since getNickname is async
    let nickname = await getNickname(msg.uid);
    if (!nickname) nickname = "Anon";

    msgDiv.textContent = `${nickname} (${time}): ${msg.text}`;
    messagesDiv.appendChild(msgDiv);
  }

  messagesDiv.scrollTop = 0; // Scroll to top to show newest message
}

async function handleUser(user) {
  if (!user) {
    resetUIForSignedOut();
    return;
  }

  // Hide sign-in buttons on signed-in
  signInGoogleBtn.style.display = "none";
  signInGitHubBtn.style.display = "none";
  signInMicrosoftBtn.style.display = "none";
  signInEmailBtn.style.display = "none";
  signUpEmailBtn.style.display = "none";
  emailInput.style.display = "none";
  passwordInput.style.display = "none";

  signOutBtn.style.display = "inline-block";
  inputSection.style.display = "flex";
  userInfo.style.display = "block";

  // Get or prompt for nickname
  let nickname = await getNickname(user.uid);
  if (!nickname || nickname === "Anon") {
    nickname = prompt(
      "Please enter your nickname:\n(This cannot be changed later except by a developer)"
    );
    if (nickname && nickname.trim().length > 0) {
      nickname = nickname.trim();
    } else {
      nickname = (user.displayName || user.email || "").split(" ")[0];
    }
    await setUserNickname(user.uid, nickname);
  }

  userNameSpan.textContent = nickname;

  // Set provider name text
  let providerId = user.providerData[0]?.providerId || "unknown";
  let providerName = "Unknown";

  switch (providerId) {
    case "google.com":
      providerName = "Google";
      break;
    case "github.com":
      providerName = "GitHub";
      break;
    case "microsoft.com":
      providerName = "Microsoft";
      break;
    case "password":
      providerName = "Email";
      break;
  }

  providerSpan.textContent = `${providerName}`;

  // Subscribe to messages
  if (unsubscribeMessages) unsubscribeMessages();
  unsubscribeMessages = listenMessages(displayMessages);
}

// Event Listeners for sign-in buttons
async function handleSignIn(method) {
  // Disable all sign-in buttons
  signInGoogleBtn.disabled = true;
  signInGitHubBtn.disabled = true;
  signInMicrosoftBtn.disabled = true;
  signInEmailBtn.disabled = true;
  signUpEmailBtn.disabled = true;

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
    // Enable all buttons again
    signInGoogleBtn.disabled = false;
    signInGitHubBtn.disabled = false;
    signInMicrosoftBtn.disabled = false;
    signInEmailBtn.disabled = false;
    signUpEmailBtn.disabled = false;
  }
}

// Event listeners remain same
signInGoogleBtn.addEventListener("click", () => handleSignIn("google"));
signInGitHubBtn.addEventListener("click", () => handleSignIn("github"));
signInMicrosoftBtn.addEventListener("click", () => handleSignIn("microsoft"));
signInEmailBtn.addEventListener("click", () => handleSignIn("email"));
signUpEmailBtn.addEventListener("click", () => handleSignIn("signup-email"));

signOutBtn.addEventListener("click", async () => {
  signOutBtn.disabled = true;
  try {
    await signOutUser();
  } finally {
    signOutBtn.disabled = false;
  }
});

// Send message logic
sendBtn.addEventListener("click", async () => {
  const text = messageInput.value.trim();
  if (!text) return;

  const user = getCurrentUser();
  if (!user) {
    alert("You must be signed in to send messages.");
    return;
  }

  await sendMessage(user.uid, text);
  messageInput.value = "";
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendBtn.click();
  }
});

// Listen for auth state changes
onAuthStateChange(handleUser);
