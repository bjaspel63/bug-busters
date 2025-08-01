(() => {
  let builtInSnippets = [];
  let currentSnippetIndex = 0;
  let currentSnippet = null;
  let score = 0;

  // Timer variables
  let timerDuration = 5 * 60; // 5 minutes in seconds
  let timeLeft = timerDuration;
  let timerInterval = null;

  // Profiles
  let profiles = JSON.parse(localStorage.getItem("profiles") || "[]");
  let currentUserIndex = 0;

  // DOM
  const bugExplanationEl = document.getElementById("bugExplanation");
  const codeSnippetEl = document.getElementById("codeSnippet");
  const scoreDisplay = document.getElementById("scoreDisplay");
  const playerInfo = document.getElementById("playerInfo");
  const newUserNameInput = document.getElementById("newUserNameInput");
  const createUserBtn = document.getElementById("createUserBtn");
  const showHintBtn = document.getElementById("showHintBtn");
  const nextSnippetBtn = document.getElementById("nextSnippetBtn");
  const generateCertificateBtn = document.getElementById("generateCertificateBtn");
  const bgMusic = document.getElementById("bgMusic");
  const toggleMusicBtn = document.getElementById("toggleMusicBtn");
  const timerDisplay = document.getElementById("timerDisplay");

  // Sections
  const loadingMessage = document.getElementById("loadingMessage");
  const gameSection = document.getElementById("gameSection");
  const certificateSection = document.getElementById("certificateSection");

  // Sound Effects
  const nextSound = document.getElementById("nextSound");
  const finishSound = document.getElementById("finishSound");

  let snippetsReady = false;
  let gameFinished = false;

  // ===== Timer Functions =====
  function startTimer() {
    timeLeft = timerDuration;
    updateTimerDisplay();

    if (timerInterval) clearInterval(timerInterval);

    timerInterval = setInterval(() => {
      if (gameFinished) {
        clearInterval(timerInterval);
        return;
      }

      timeLeft--;
      updateTimerDisplay();

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        finishGameDueToTimeout();
      }
    }, 1000);
  }

  function updateTimerDisplay() {
    if (!timerDisplay) return;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    timerDisplay.textContent = `Time Left: ${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  function finishGameDueToTimeout() {
    if (gameFinished) return;
    gameFinished = true;

    alert("⏰ Time's up! The game has finished.");

    // Stop & mute bg music
    bgMusic.pause();
    bgMusic.muted = true;

    // Play victory sound unmuted
    finishSound.muted = false;
    finishSound.currentTime = 0;
    finishSound.play().catch(e => console.log("Sound play error:", e));

    launchConfetti();

    // Show certificate button & section
    generateCertificateBtn.style.display = "inline-block";
    certificateSection.style.display = "block";

    // Disable next snippet button as game finished
    nextSnippetBtn.disabled = true;
    showHintBtn.disabled = true;
  }

  // ===== Utility =====
  function saveProfiles() {
    localStorage.setItem("profiles", JSON.stringify(profiles));
  }

  function updateScore(amount) {
    score += amount;
    if (score < 0) score = 0;
    scoreDisplay.textContent = `Completed: ${score}`;
    if (profiles[currentUserIndex]) {
      profiles[currentUserIndex].score = score;
      saveProfiles();
    }
  }

  // ===== Render Snippet =====
function renderSnippet(snippet) {
  codeSnippetEl.innerHTML = "";
  const lines = snippet.code.split("\n");

  lines.forEach((lineText, lineIndex) => {
    const lineDiv = document.createElement("div");
    lineDiv.classList.add("code-line");

    for (let i = 0; i < lineText.length; i++) {
      const charSpan = document.createElement("span");
      charSpan.textContent = lineText[i];
      charSpan.dataset.line = lineIndex;
      charSpan.dataset.char = i;
      charSpan.style.cursor = "pointer";
      charSpan.addEventListener("click", () => handleCharClick(lineIndex, i));
      lineDiv.appendChild(charSpan);
    }

    // Add extra clickable space at line end
    const endSpan = document.createElement("span");
    endSpan.textContent = " ";
    endSpan.dataset.line = lineIndex;
    endSpan.dataset.char = lines[lineIndex].length;
    endSpan.style.cursor = "pointer";
    endSpan.style.display = "inline-block";
    endSpan.style.width = "8px";
    endSpan.addEventListener("click", () => handleCharClick(lineIndex, lines[lineIndex].length));
    lineDiv.appendChild(endSpan);

    codeSnippetEl.appendChild(lineDiv);
  });

  // Always hide explanation when new snippet loads
  bugExplanationEl.style.display = "none";
}

  // ===== Play sound safely =====
  function playSound(audio) {
    if (audio) {
      audio.currentTime = 0;
      audio.play().catch((err) => console.log("🔇 Sound blocked:", err));
    }
  }

  // ===== Confetti function =====
  function launchConfetti() {
    const duration = 3 * 1000; // 3 seconds
    const end = Date.now() + duration;

    (function frame() {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 }
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 }
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    })();
  }

  // ===== Handle character click to fix bug =====
function handleCharClick(line, charPos) {
  if (!currentSnippet || gameFinished) return;

  const fix = currentSnippet.fixes.find(f => {
    if (f.length === 0) {
      return f.line === line && (charPos === f.position || charPos === f.position - 1);
    } else {
      return f.line === line && charPos >= f.position && charPos < f.position + f.length;
    }
  });

  if (fix) {
    // Fix the bug in the code string
    const lines = currentSnippet.code.split("\n");
    const lineText = lines[line];
    const fixedLine =
      lineText.substring(0, fix.position) +
      fix.correct +
      lineText.substring(fix.position + fix.length);
    lines[line] = fixedLine;
    currentSnippet.code = lines.join("\n");

    // Remove this fix from the fixes list
    currentSnippet.fixes = currentSnippet.fixes.filter(f => f !== fix);

    renderSnippet(currentSnippet);
    updateScore(1);

    // ✅ Show explanation after correct fix
    if (fix.explanation) {
      bugExplanationEl.innerHTML = `
        <p style="margin:8px 0; color:#fff; font-weight:bold;">✅ Correct Fix!</p>
        <p style="margin:8px 0;">💡 Bug Explanation: ${fix.explanation}</p>
      `;
      bugExplanationEl.style.display = "block";
    }

    // If no fixes remain → snippet completed
    if (currentSnippet.fixes.length === 0) {
      bugExplanationEl.innerHTML += `
        <p style="margin:8px 0; color:#4caf50; font-weight:bold;">
          🎉 Well done! Snippet fully fixed!
        </p>
      `;
      if (currentSnippetIndex === builtInSnippets.length - 1) {
        finishGame();
      }
    }
  } else {
    // ❌ Wrong click → show inside the div instead of alert
    bugExplanationEl.innerHTML = `
      <p style="margin:8px 0; color:#ff5252; font-weight:bold;">❌ Not a bug. Try again.</p>
    `;
    bugExplanationEl.style.display = "block";
  }
}


  // ===== Finish game normally =====
  function finishGame() {
    if (gameFinished) return;
    gameFinished = true;

    // Stop timer
    clearInterval(timerInterval);

    // Play victory sound
    finishSound.muted = false;
    finishSound.currentTime = 0;
    finishSound.play().catch(e => console.log("Sound play error:", e));

    // Stop & mute bg music
    bgMusic.pause();
    bgMusic.muted = true;

    launchConfetti();

    generateCertificateBtn.style.display = "inline-block";
    certificateSection.style.display = "block";

    nextSnippetBtn.disabled = true;
    showHintBtn.disabled = true;
  }

  // ===== Update navigation buttons =====
  function updateNavigationButtons() {
    nextSnippetBtn.disabled = gameFinished || currentSnippetIndex === builtInSnippets.length - 1;
    if (!gameFinished) {
      generateCertificateBtn.style.display = "none";
      certificateSection.style.display = "none";
      showHintBtn.disabled = false;
    }
  }

  // ===== Load snippet by index =====
function loadSnippet(index) {
  if (gameFinished) return;

  currentSnippetIndex = index;
  currentSnippet = JSON.parse(JSON.stringify(builtInSnippets[index]));
  renderSnippet(currentSnippet);
  updateNavigationButtons();

  bugExplanationEl.style.display = "none";
}

  // ===== Show hint button =====
  showHintBtn.addEventListener("click", () => {
    if (!currentSnippet || currentSnippet.fixes.length === 0) {
      return alert("No hints available.");
    }
    if (score < 1) {
      return alert("Not enough points for a hint.");
    }
    updateScore(-1);
    const hintFix = currentSnippet.fixes[0];
    alert(`💡 Hint: Look at line ${hintFix.line + 1}, near position ${hintFix.position + 1}`);
  });

  // ===== Next snippet button =====
  nextSnippetBtn.addEventListener("click", () => {
    if (gameFinished) return;
    if (currentSnippetIndex < builtInSnippets.length - 1) {
      loadSnippet(currentSnippetIndex + 1);
      playSound(nextSound);
    }
  });

  // ===== Create user and start game =====
  createUserBtn.addEventListener("click", () => {
    if (!snippetsReady) {
      alert("⏳ Please wait, loading snippets...");
      return;
    }
    createUser(newUserNameInput.value.trim());
    gameSection.style.display = "block";
    certificateSection.style.display = "none";
    gameFinished = false;

    // Play bg music muted initially
    bgMusic.muted = true;
    bgMusic.play().catch(() => {});

    startTimer();
  });

  // ===== Generate PDF certificate =====
  generateCertificateBtn.addEventListener("click", () => {
    const user = profiles[currentUserIndex];
    if (!user) return alert("No active player.");
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Background rectangle
    doc.setFillColor(230, 240, 255);
    doc.rect(0, 0, 210, 297, "F");

    // White inner box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(100, 149, 237);
    doc.roundedRect(10, 20, 190, 250, 10, 10, "FD");

    // Title
    doc.setTextColor(25, 25, 112);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Bug Busters Certificate", 105, 50, { align: "center" });

    // Subtitle
    doc.setFontSize(16);
    doc.setTextColor(70, 130, 180);
    doc.text("Certificate of Achievement", 105, 70, { align: "center" });

    // Recipient
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text("This certifies that", 105, 95, { align: "center" });

    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(user.name, 105, 115, { align: "center" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("has successfully completed all debugging challenges", 105, 135, { align: "center" });
    doc.text(`with a score of ${user.score}.`, 105, 150, { align: "center" });

    // Signature line + name
    const centerX = 105;
    doc.setDrawColor(100, 149, 237);
    doc.setLineWidth(0.8);
    doc.line(centerX - 40, 200, centerX + 40, 200);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Jaspel Bosales, Coding Teacher", centerX, 210, { align: "center" });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Issued by Bug Busters: Debugging Challenge", 105, 280, { align: "center" });

    doc.save(`${user.name}_Certificate.pdf`);
  });

  // ===== Profiles =====
  function createUser(name) {
    if (!name) return alert("Enter a name!");
    profiles.push({ name, score: 0 });
    currentUserIndex = profiles.length - 1;
    score = 0;
    saveProfiles();
    loadCurrentUserData();
    loadSnippet(0);
  }

  function loadCurrentUserData() {
    const user = profiles[currentUserIndex];
    if (!user) return;
    score = user.score;
    scoreDisplay.textContent = `Completed: ${score}`;
    playerInfo.textContent = `Player: ${user.name}`;
    generateCertificateBtn.style.display = "none";
  }

  // ===== Background Music Toggle =====
  toggleMusicBtn.addEventListener("click", () => {
    if (bgMusic.paused) {
      bgMusic.muted = false;
      bgMusic.play();
      toggleMusicBtn.textContent = "🔊";
    } else {
      bgMusic.pause();
      toggleMusicBtn.textContent = "🔈";
    }
  });

  // Enter key on username triggers start
  newUserNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      createUserBtn.click();
    }
  });

  // ===== Initialization =====
  async function init() {
    try {
      const resp = await fetch("snippets.json");
      builtInSnippets = await resp.json();
      snippetsReady = true;
      if (loadingMessage) loadingMessage.style.display = "none";
      newUserNameInput.disabled = false;
      createUserBtn.disabled = false;
      console.log("✅ Snippets loaded:", builtInSnippets.length);
    } catch (err) {
      alert("❌ Failed to load snippets.json");
      console.error(err);
    }

    if (profiles.length > 0) loadCurrentUserData();
  }

  init();

})();
