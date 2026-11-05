// -----------------------------------------
// Profile settings
// -----------------------------------------

if (profileForm) {
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const profile = {
      name: $("#studentName").value.trim(),
      course: $("#studentCourse").value.trim(),
      year: $("#studentYear").value
    };

    const profileMessage = $("#profileMessage");

    if (!profile.name) {
      if (profileMessage) {
        profileMessage.textContent = "Please enter your name.";
      }
      return;
    }

    // Save locally first.
    if (!saveData(PROFILE_KEY, profile)) return;

    // Update the sidebar.
    const profileName = $(".profile strong");
    const profileDescription = $(".profile p");

    if (profileName) {
      profileName.textContent = profile.name;
    }

    if (profileDescription) {
      profileDescription.textContent =
        profile.course || "Future in progress";
    }

    // Check whether a student is signed in.
    const user = auth.currentUser;

    if (!user) {
      if (profileMessage) {
        profileMessage.textContent =
          "Profile saved locally. Please sign in to synchronise it.";
      }
      return;
    }

    try {
      await updateProfile(user, {
        displayName: profile.name
      });

      await setDoc(
        doc(db, "students", user.uid),
        {
          profile: profile,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      const firstName = profile.name.trim().split(/\s+/)[0];

      const welcomeName = $("#welcomeName");
      const welcomeGreeting = $("#welcomeGreeting");

      if (welcomeName) {
        welcomeName.textContent = firstName;
      }

      if (welcomeGreeting) {
        welcomeGreeting.textContent =
          `WELCOME, ${firstName.toUpperCase()}!`;
      }

      if (profileMessage) {
        profileMessage.textContent =
          "Profile saved and synchronised successfully! 💜";
      }

    } catch (error) {
      console.error("Profile synchronisation error:", error);

      if (profileMessage) {
        profileMessage.textContent =
          "Your profile was saved on this device, but cloud synchronisation failed. Please try again.";
      }
    }
  });
}

// -----------------------------------------
// Theme settings
// -----------------------------------------

if (themeSelect) {
  themeSelect.addEventListener("change", () => {
    applyTheme(themeSelect.value);
  });
}

// -----------------------------------------
// Notification preferences
// -----------------------------------------
const profileForm = $("#profileForm");
const themeSelect = $("#themeSelect");
if (saveNotificationsButton) {
  saveNotificationsButton.addEventListener("click", () => {
    const preferences = {
      assignments: $("#assignmentNotifications").checked,
      studySessions: $("#studyNotifications").checked,
      progress: $("#progressNotifications").checked
    };

    if (!saveData(NOTIFICATIONS_KEY, preferences)) return;

    const message = $("#notificationMessage");

    if (message) {
      message.textContent = "Reminder preferences saved! 💜";
    }
  });
}

// -----------------------------------------
// Browser notifications
// -----------------------------------------

const enableNotificationsButton = $("#enableNotifications");
const testNotificationButton = $("#testNotification");

if (enableNotificationsButton) {
  enableNotificationsButton.addEventListener("click", async () => {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications.");
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission === "granted") {
        alert("Notifications enabled successfully! 💜");
      } else if (permission === "denied") {
        alert(
          "Notifications are blocked. Please allow them in your browser settings."
        );
      } else {
        alert("Notification permission was not granted yet.");
      }

    } catch (error) {
      console.error("Could not enable notifications:", error);
      alert("We couldn't enable notifications. Please try again.");
    }
  });
}

if (testNotificationButton) {
  testNotificationButton.addEventListener("click", () => {
    if (!("Notification" in window)) {
      alert("Your browser does not support notifications.");
      return;
    }

    if (Notification.permission !== "granted") {
      alert("Please click Enable Browser Notifications first. 💜");
      return;
    }

    try {
      new Notification("Student Hub 🔔", {
        body: "It's working! Your study journey is getting smarter. 💜"
      });

    } catch (error) {
      console.error("Could not send test notification:", error);
      alert("The test notification could not be displayed.");
    }
  });
}

// -----------------------------------------
// Application initialisation
// -----------------------------------------

function initialiseStudentHub() {
  const yearElement = $("#currentYear");

  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Load saved settings.
  loadSettings();

  // Set minimum dates.
  const assignmentDate = $("#assignmentDueDate");
  const sessionDate = $("#sessionDate");

  if (assignmentDate) {
    assignmentDate.min = todayString();
  }

  if (sessionDate) {
    sessionDate.min = todayString();
  }

  // Render application data.
  renderAssignments();
  renderDashboard();
  renderSessions();
  renderNotes();
  renderStudyGroups();
  renderProgress();

  // Restore daily focus.
  if (dailyFocusInput) {
    dailyFocusInput.value = String(dailyFocus || "");
  }

  // Start scheduled reminders.
  startReminderChecks();

  // Open the dashboard.
  showSection("dashboard");

  console.log("Student Hub initialised successfully.");
}

// Wait until the HTML is ready before initialising.
if (document.readyState === "loading") {
  document.addEventListener(
    "DOMContentLoaded",
    initialiseStudentHub,
    { once: true }
  );
} else {
  initialiseStudentHub();
}
