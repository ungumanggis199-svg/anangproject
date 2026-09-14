// ===============================
// KONFIGURASI AKSES SPREADSHEET LOGIN
// ===============================
const SHEET_ID = '1VOZUFvj042hHXFejLHXjQg7FVO3otDNV_L3UGAnrhCQ';
const AKSES_SHEET_NAME = 'Akses';
const AKSES_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${AKSES_SHEET_NAME}`;

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
  // PROSES LOGIN VIA SPREADSHEET GVIZ
  // ===============================
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const btn = loginForm.querySelector("button");

    btn.textContent = "Memeriksa...";
    btn.disabled = true;

    try {
      // Ambil data JSON dari sheet 'Akses'
      const res = await fetch(AKSES_URL);
      const text = await res.text();
      
      // Bersihkan response agar menjadi JSON valid
      const cleanText = text.replace(/^[^(]+\(/, '').replace(/\);\s*$/, '');
      const json = JSON.parse(cleanText);
      
      const cols = json.table.cols;
      const rows = json.table.rows;

      // Cari indeks kolom berdasarkan nama headernya
      let userColIdx = -1;
      let passColIdx = -1;
      
      cols.forEach((col, idx) => {
        if (col.label) {
          const label = col.label.toLowerCase().trim();
          if (label === 'username') userColIdx = idx;
          if (label === 'password') passColIdx = idx;
        }
      });

      if (userColIdx === -1 || passColIdx === -1) {
        throw new Error("Header 'username' atau 'password' tidak ditemukan di sheet Akses.");
      }

      let isValid = false;
      let userRole = "Intelijen"; // Default

      // Verifikasi baris per baris
      for (let row of rows) {
        if (row.c && row.c[userColIdx] && row.c[passColIdx]) {
          const sheetUser = String(row.c[userColIdx].v).trim();
          const sheetPass = String(row.c[passColIdx].v).trim();
          
          if (sheetUser === username && sheetPass === password) {
            isValid = true;
            break;
          }
        }
      }

      if (isValid) {
        localStorage.setItem("intel_session", JSON.stringify({
          username: username,
          role: userRole,
          token: "spreadsheet-auth-" + Date.now(),
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
