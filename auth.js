
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  updateProfile
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";

import { auth } from "./firebase.js";

const accountScreen = document.getElementById("student-account");
const appContainer = document.getElementById("app-container");
const status = document.getElementById("auth-status");
const form = document.getElementById("auth-form");

const nameInput = document.getElementById("auth-name");
const emailInput = document.getElementById("auth-email");
const passwordInput = document.getElementById("auth-password");
const confirmInput = document.getElementById("auth-confirm-password");

const nameGroup = document.getElementById("auth-name-group");
const confirmGroup = document.getElementById("auth-confirm-group");

const submitButton = document.getElementById("auth-submit");
const toggleButton = document.getElementById("auth-toggle");
const signOutButton = document.getElementById("auth-signout");

const accountName = document.getElementById("auth-account-name");
const welcomeName = document.getElementById("welcomeName");

if (
  !auth ||
  !accountScreen ||
  !appContainer ||
  !status ||
  !form ||
  !nameInput ||
  !emailInput ||
  !passwordInput ||
  !confirmInput ||
  !nameGroup ||
  !confirmGroup ||
  !submitButton ||
  !toggleButton ||
  !signOutButton
) {
  console.error(
    "Student Hub authentication could not start. Check the Firebase setup and HTML element IDs."
  );
} else {
  let isRegistering = true;

  function showStatus(message, isError = false) {
    status.textContent = message;
    status.style.color = isError ? "#b91c1c" : "";
  }

  function setAuthMode(registering) {
    isRegistering = registering;

    nameGroup.hidden = !isRegistering;
    confirmGroup.hidden = !isRegistering;

    nameInput.required = isRegistering;
    confirmInput.required = isRegistering;

    passwordInput.autocomplete = isRegistering
      ? "new-password"
      : "current-password";

    confirmInput.autocomplete = "new-password";

    submitButton.textContent = isRegistering
      ? "Create account"
      : "Sign in";

    toggleButton.textContent = isRegistering
      ? "Already have an account? Sign in"
      : "Need an account? Register";

    form.reset();
    showStatus("");
  }

  toggleButton.addEventListener("click", () => {
    setAuthMode(!isRegistering);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (submitButton.disabled) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const fullName = nameInput.value.trim();

    if (isRegistering && !fullName) {
      showStatus("Please enter your full name.", true);
      return;
    }

    if (password.length < 6) {
      showStatus(
        "Your password must contain at least 6 characters.",
        true
      );
      return;
    }

    if (
      isRegistering &&
      password !== confirmInput.value
    ) {
      showStatus("Your passwords do not match.", true);
      return;
    }

    submitButton.disabled = true;
    toggleButton.disabled = true;
    showStatus(
      isRegistering ? "Creating your account..." : "Signing you in..."
    );

    try {
      if (isRegistering) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        try {
          await updateProfile(credential.user, {
            displayName: fullName
          });
        } catch (profileError) {
          console.error(
            "Could not save the profile name:",
            profileError
          );
        }

        try {
          await sendEmailVerification(credential.user);
          showStatus(
            "Your account has been created. A verification email has been sent."
          );
        } catch (verificationError) {
          console.error(
            "Verification email could not be sent:",
            verificationError
          );

          showStatus(
            "Your account was created, but the verification email could not be sent."
          );
        }
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        showStatus("Signed in successfully!");
      }
    } catch (error) {
      console.error("Authentication error:", error);

      const messages = {
        "auth/email-already-in-use":
          "This email already has an account. Please sign in.",
        "auth/invalid-email":
          "Please enter a valid email address.",
        "auth/weak-password":
          "Choose a stronger password.",
        "auth/invalid-credential":
          "Your email or password is incorrect. Please try again.",
        "auth/user-not-found":
          "No account was found for this email. Please register first.",
        "auth/wrong-password":
          "Your password is incorrect. Please try again.",
        "auth/too-many-requests":
          "Too many attempts. Please wait before trying again.",
        "auth/network-request-failed":
          "Network error. Please check your internet connection."
      };

      showStatus(
        messages[error.code] ||
          error.message ||
          "Something went wrong. Please try again.",
        true
      );
    } finally {
      submitButton.disabled = false;
      toggleButton.disabled = false;
    }
  });

  signOutButton.addEventListener("click", async () => {
    signOutButton.disabled = true;

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign-out error:", error);
      showStatus("Could not sign out. Please try again.", true);
    } finally {
      signOutButton.disabled = false;
    }
  });

  onAuthStateChanged(
    auth,
    (user) => {
      const signedIn = Boolean(user);

      accountScreen.hidden = signedIn;
      appContainer.hidden = !signedIn;
      signOutButton.hidden = !signedIn;

      if (accountName) {
        accountName.hidden = !signedIn;
        accountName.textContent = signedIn
          ? `Signed in as ${user.email || "Student"}`
          : "";
      }

      if (welcomeName) {
        welcomeName.textContent = signedIn
          ? (
              user.displayName ||
              user.email?.split("@")[0] ||
              "Student"
            )
          : "Student";
      }

      if (!signedIn) {
        setAuthMode(true);
      } else {
        nameInput.value = "";
        passwordInput.value = "";
        confirmInput.value = "";
      }
    },
    (error) => {
      console.error("Authentication state error:", error);
      showStatus(
        "We could not check your sign-in status. Please refresh the page.",
        true
      );
    }
  );
}
