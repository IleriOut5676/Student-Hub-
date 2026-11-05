if (profileForm) {
  profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const profile = {
      name: $("#studentName").value.trim(),
      course: $("#studentCourse").value.trim(),
      year: $("#studentYear").value
    };

    // Validate the student's name.
    if (!profile.name) {
      $("#profileMessage").textContent =
        "Please enter your name.";
      return;
    }

    // Save the profile locally first.
    if (!saveData(PROFILE_KEY, profile)) return;

    // Update the sidebar profile information.
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
      $("#profileMessage").textContent =
        "Profile saved locally. Please sign in to synchronise it.";
      return;
    }

    try {
      // Update Firebase Authentication display name.
      await updateProfile(user, {
        displayName: profile.name
      });

      // Save the student profile to Firestore.
      await setDoc(
        doc(db, "students", user.uid),
        {
          profile: profile,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      // Update the dashboard greeting.
      const firstName = profile.name
        .trim()
        .split(/\s+/)[0];

      const welcomeName =
        document.getElementById("welcomeName");

      const welcomeGreeting =
        document.getElementById("welcomeGreeting");

      if (welcomeName) {
        welcomeName.textContent = firstName;
      }

      if (welcomeGreeting) {
        welcomeGreeting.textContent =
          `WELCOME, ${firstName.toUpperCase()}!`;
      }

      // Display the successful synchronisation message.
      $("#profileMessage").textContent =
        "Profile saved and synchronised successfully! 💜";

    } catch (error) {
      console.error(
        "Profile synchronisation error:",
        error
      );

      $("#profileMessage").textContent =
        "Your profile was saved on this device, but cloud synchronisation failed. Please try again.";
    }
  });
}
