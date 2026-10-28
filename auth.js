
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import { auth } from "./firebase.js";

if (!auth) {
  console.error("Firebase Authentication is not available.");
} else {
  const status = document.getElementById("auth-status");
  const form = document.getElementById("auth-form");
  const nameInput = document.getElementById("auth-name");
  const emailInput = document.getElementById("auth-email");
  const passwordInput = document.getElementById("auth-password");
  const confirmInput = document.getElementById("auth-confirm-password");
  const submitButton = document.getElementById("auth-submit");
  const toggleButton = document.getElementById("auth-toggle");
  const signOutButton = document.getElementById("auth-signout");
  const accountName = document.getElementById("auth-account-name");

  let isRegistering = true;

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.style.color = isError ? "#b91c1c" : "";
  }

  toggleButton.addEventListener("click", () => {
    isRegistering = !isRegistering;
    nameInput.hidden = !isRegistering;
    confirmInput.hidden = !isRegistering;
    submitButton.textContent = isRegistering ? "Create account" : "Sign in";
    toggleButton.textContent = isRegistering
      ? "Already have an account? Sign in"
      : "Need an account? Register";
    showStatus("");
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    submitButton.disabled = true;

    try {
      if (isRegistering) {
        if (password !== confirmInput.value) {
          throw new Error("Your passwords do not match.");
        }

        if (password.length < 6) {
          throw new Error("Use a password with at least 6 characters.");
        }

        const credential = await createUserWithEmailAndPassword(
          auth, email, password
        );

        try {
          await sendEmailVerification(credential.user);
          showStatus("Account created! Check your email to verify it.");
        } catch {
          showStatus("Account created, but the verification email could not be sent. You can request it later.");
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showStatus("Signed in successfully!");
      }
    } catch (error) {
      const messages = {
        "auth/email-already-in-use": "That email already has an account. Please sign in.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/weak-password": "Choose a stronger password.",
        "auth/invalid-credential": "Email or password is incorrect. Please try again.",
        "auth/too-many-requests": "Too many attempts. Please wait and try again.",
        "auth/network-request-failed": "Network error. Check your internet connection."
      };

      showStatus(
        messages[error.code] || error.message || "Something went wrong. Please try again.",
        true
      );
    } finally {
      submitButton.disabled = false;
    }
  });

  signOutButton.addEventListener("click", async () => {
    try {
      await signOut(auth);
      showStatus("You have signed out.");
    } catch {
      showStatus("Could not sign out. Please try again.", true);
    }
  });

  onAuthStateChanged(auth, (user) => {
    const signedIn = Boolean(user);

    form.hidden = signedIn;
    signOutButton.hidden = !signedIn;
    accountName.hidden = !signedIn;

    if (signedIn) {
      accountName.textContent = `Signed in as ${user.email || "Student"}`;
      nameInput.value = "";
      passwordInput.value = "";
      confirmInput.value = "";
    } else {
      accountName.textContent = "";
    }
  });
}
