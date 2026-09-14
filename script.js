// ===============================
// KONFIGURASI API LOGIN (Apps Script Web App)
// ===============================
// GANTI TEKS DI BAWAH DENGAN URL WEB APP ANDA YANG BARU DISALIN
const API_URL = "https://script.google.com/macros/s/AKfycbyPeZfGfmNTLfqc8vbOJOYgGijrrnCnEtPbe65ulZ3YljY7YuksZEj_aI0O11QQ92pR/exec";

const EYE_OPEN = '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/>';
const EYE_OFF  = '<path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-7-11-7a19.9 19.9 0 0 1 5.17-5.66M9.9 4.24A10.6 10.6 0 0 1 12 4c7 0 11 7 11 7a19.9 19.9 0 0 1-2.6 3.53M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>';

document.addEventListener("DOMContentLoaded", () => {

  createLights();
  startLiveClock();

  const loginForm = document.getElementById("loginForm");
  if (!loginForm) return;

  const passwordInput = document.getElementById("password");
  const toggle = document.getElementById("togglePassword");

  if (toggle && passwordInput) {
    toggle.addEventListener("click", () => {
      const showing = passwordInput.type === "text";
      passwordInput.type = showing ? "password" : "text";
      toggle.setAttribute("aria-pressed", String(!showing));
      toggle.setAttribute("aria-label", showing ? "Tampilkan kata sandi" : "Sembunyikan kata sandi");
      toggle.querySelector("svg").innerHTML = showing ? EYE_OPEN : EYE_OFF;
    });
  }

  // PROSES LOGIN POST KE APPS SCRIPT
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const btn = document.getElementById("submitBtn") || loginForm.querySelector("button");
    const label = btn.querySelector(".btn-label") || btn;

    setBtnState(label, btn, 'loading', 'Memeriksa...');

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();

      if (data.status === "success") {
        localStorage.setItem("intel_session", JSON.stringify({
          username: data.username,
          role: data.role,
          token: data.token,
          loginTime: Date.now()
        }));

        setBtnState(label, btn, 'success', 'Akses Diterima');
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 700);

      } else {
        setBtnState(label, btn, 'error', 'Login Gagal');
        btn.disabled = false;
        setTimeout(() => {
          setBtnState(label, btn, 'idle', 'Masuk ke Sistem');
        }, 1500);
      }

    } catch (err) {
      console.error("LOGIN ERROR:", err);
      setBtnState(label, btn, 'error', 'Server Error');
      btn.disabled = false;
      setTimeout(() => {
        setBtnState(label, btn, 'idle', 'Masuk ke Sistem');
      }, 2000);
    }
  });

});

function setBtnState(label, btn, state, text) {
  btn.disabled = state === 'loading' || state === 'success';
  if (state === 'loading') {
    label.innerHTML = `<span class="btn-spinner"></span><span>${text}</span>`;
  } else {
    label.innerHTML = `<span>${text}</span>`;
  }
}

function startLiveClock() {
  const el = document.getElementById("liveClock");
  if (!el) return;
  const fmt = () => new Date().toLocaleString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
  el.textContent = fmt();
  setInterval(() => { el.textContent = fmt(); }, 1000);
}

function createLights() {
  for (let i = 0; i < 16; i++) {
    const l = document.createElement("div");
    l.className = "light" + (i % 3 === 0 ? " light-g" : "");
    l.style.left = Math.random() * 100 + "vw";
    l.style.animationDuration = (8 + Math.random() * 10) + "s";
    l.style.animationDelay = (Math.random() * 8) + "s";
    document.body.appendChild(l);
  }
}
