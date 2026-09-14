// ===============================
// KONFIGURASI API LOGIN (Apps Script Web App)
// ===============================
// GANTI TEKS DI BAWAH DENGAN URL WEB APP ANDA YANG BARU DISALIN
const API_URL = "https://script.google.com/macros/s/AKfycbyPeZfGfmNTLfqc8vbOJOYgGijrrnCnEtPbe65ulZ3YljY7YuksZEj_aI0O11QQ92pR/exec";

document.addEventListener("DOMContentLoaded", () => {

  createLights();

  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const passwordInput = document.getElementById("password");
  const toggle = document.getElementById("togglePassword");

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

  // PROSES LOGIN POST KE APPS SCRIPT
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
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      const data = await res.json();

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
