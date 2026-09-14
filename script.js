// ===============================
// KONFIGURASI API LOGIN
// (Google Apps Script Web App yang sudah ada)
// ===============================
const API_URL = "https://script.google.com/macros/s/AKfycbzMZVV93BH3d_aL1uADw5Whj_bYIXoZn8_2acT9g5HLRHKTuO_rFCUEoV4aa4XPFMNTMg/exec";

document.addEventListener("DOMContentLoaded", () => {

  // Efek partikel cahaya di background halaman login
  createLights();

  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const passwordInput = document.getElementById("password");
  const toggle = document.getElementById("togglePassword");

  // ===============================
  // TOGGLE TAMPIL/SEMBUNYI PASSWORD
  // ===============================
  if (toggle && passwordInput) {
    toggle.addEventListener("click", () => {
      if (passwordInput.type === "password") {
        passwordInput.type = "text";
        toggle.textContent = "🙈";
      } else {
        passwordInput.type = "password";
        toggle.textContent = "👁";
      }
    });
  }

  // ===============================
  // PROSES LOGIN
  // ===============================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const btn = loginForm.querySelector("button");

    btn.textContent = "Memeriksa...";
    btn.disabled = true;

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify({ username, password })
      });

      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Response bukan JSON: " + text);
      }

      if (data.status === "success") {
        localStorage.setItem("intel_session", JSON.stringify({
          username: data.username,
          role: data.role,
          token: data.token,
          loginTime: Date.now()
        }));

        btn.textContent = "Akses Diterima";

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 700);

      } else {
        btn.textContent = "Login Gagal";
        btn.disabled = false;

        setTimeout(() => {
          btn.textContent = "Masuk ke Sistem";
        }, 1500);
      }

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      btn.textContent = "Server Error";
      btn.disabled = false;

      setTimeout(() => {
        btn.textContent = "Masuk ke Sistem";
      }, 2000);
    }
  });

});

// ===============================
// EFEK PARTIKEL CAHAYA (dekorasi latar)
// ===============================
function createLights() {
  for (let i = 0; i < 15; i++) {
    const l = document.createElement("div");
    l.className = "light";
    l.style.left = Math.random() * 100 + "vw";
    l.style.animationDuration = (8 + Math.random() * 10) + "s";
    l.style.animationDelay = (Math.random() * 8) + "s";
    document.body.appendChild(l);
  }
}
