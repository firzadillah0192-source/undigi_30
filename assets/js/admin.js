/**
 * admin.js â€” Logika Utama & Modul Admin Panel
 *
 * Requirements: 15.4, 15.6, 16.1, 16.2, 16.3, 17.4, 17.5, 17.6, 19.4
 */

// ---------------------------------------------------------------------------
// State Global
// ---------------------------------------------------------------------------
let csrfToken = "";

// ---------------------------------------------------------------------------
// Utilitas & Helper Global
// ---------------------------------------------------------------------------

/**
 * Menampilkan notifikasi sukses/error melayang di pojok kanan atas.
 * @param {string} msg
 * @param {'success'|'error'|'info'} type
 */
function showNotification(msg, type = "info") {
  let container = document.getElementById("notification-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "notification-container";
    container.className = "notification-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `notification notification--${type}`;
  toast.innerHTML = `<span>${msg}</span>`;
  container.appendChild(toast);

  // Trigger CSS transition slide-in
  setTimeout(() => toast.classList.add("show"), 10);

  // Slide-out dan hapus setelah 3 detik
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Menampilkan dialog konfirmasi kustom.
 * @param {string} msg
 * @param {Function} onConfirm
 */
function showConfirmDialog(msg, onConfirm) {
  let modal = document.getElementById("confirm-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "confirm-modal";
    modal.className = "modal";
    modal.innerHTML = `
      <div class="modal-content">
        <h3 class="modal-title">Konfirmasi</h3>
        <div class="modal-body" id="confirm-modal-body"></div>
        <div class="modal-footer">
          <button id="confirm-modal-btn-cancel" class="btn btn--outline">Batal</button>
          <button id="confirm-modal-btn-ok" class="btn btn--danger">Hapus</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document.getElementById("confirm-modal-body").textContent = msg;
  modal.classList.add("show");

  const btnCancel = document.getElementById("confirm-modal-btn-cancel");
  const btnOk = document.getElementById("confirm-modal-btn-ok");

  const close = () => modal.classList.remove("show");

  btnCancel.onclick = close;
  btnOk.onclick = () => {
    close();
    if (onConfirm) onConfirm();
  };
}

/**
 * Mengambil token CSRF baru dari server.
 */
async function fetchCsrfToken() {
  try {
    const res = await fetch("/api/?endpoint=auth&action=csrf");
    const data = await res.json();
    if (data.success) {
      csrfToken = data.csrf_token;
      // Isi semua input csrf_token tersembunyi yang ada di form
      document.querySelectorAll('input[name="csrf_token"]').forEach((input) => {
        input.value = csrfToken;
      });
    }
  } catch (err) {
    console.error("Gagal memuat CSRF Token:", err);
  }
}

/**
 * Memastikan sesi admin aktif. Jika tidak, redirect ke login.html.
 */
async function checkSession() {
  // Lewati pengecekan jika berada di login.html
  if (window.location.pathname.endsWith("login.html")) return;

  try {
    const res = await fetch("/api/?endpoint=dashboard");
    const contentType = res.headers.get("content-type");

    // Jika PHP redirect ke login.html, statusnya 200/302 namun content-typenya HTML
    if (!res.ok || (contentType && !contentType.includes("application/json"))) {
      window.location.href = "login.html";
      return;
    }

    const data = await res.json();
    if (!data.success) {
      window.location.href = "login.html";
    }
  } catch {
    window.location.href = "login.html";
  }
}

/**
 * Setup toggle sidebar untuk responsive mobile.
 */
function initSidebarToggle() {
  const toggleBtn = document.getElementById("sidebar-toggle-btn");
  const sidebar = document.querySelector(".admin-sidebar");
  if (toggleBtn && sidebar) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }
}

// ---------------------------------------------------------------------------
// Modul: Login
// ---------------------------------------------------------------------------
function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");

    const payload = {
      username: usernameInput.value.trim(),
      password: passwordInput.value,
      csrf_token: csrfToken,
    };

    try {
      const res = await fetch("/api/?endpoint=auth&action=login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        window.location.href = "index.html";
      } else {
        // Tampilkan lockout info jika status 429
        if (res.status === 429) {
          showNotification(`${data.error} Silakan coba lagi dalam ${data.retry_after} detik.`, "error");
        } else {
          showNotification(data.error || "Gagal masuk ke sistem.", "error");
        }
        // Ambil token CSRF baru setelah percobaan gagal
        fetchCsrfToken();
      }
    } catch {
      showNotification("Terjadi kesalahan jaringan saat mencoba login.", "error");
    }
  });
}

/**
 * Fungsi logout yang dipanggil dari header/sidebar.
 */
async function handleLogout() {
  try {
    const res = await fetch("/api/?endpoint=auth&action=logout", {
      method: "POST",
    });
    const data = await res.json();
    if (data.success) {
      window.location.href = "login.html";
    }
  } catch {
    window.location.href = "login.html";
  }
}

// ---------------------------------------------------------------------------
// Modul: Dashboard
// ---------------------------------------------------------------------------
async function initDashboard() {
  const valHadir = document.getElementById("stat-rsvp-hadir");
  const valTidakHadir = document.getElementById("stat-rsvp-tidak-hadir");
  const valUcapan = document.getElementById("stat-guestbook-total");

  if (!valHadir) return;

  try {
    const res = await fetch("/api/?endpoint=dashboard");
    const data = await res.json();
    if (data.success) {
      valHadir.textContent = data.data.rsvp_hadir || 0;
      valTidakHadir.textContent = data.data.rsvp_tidak_hadir || 0;
      valUcapan.textContent = data.data.guestbook_total || 0;
    }
  } catch {
    showNotification("Gagal memuat statistik dashboard.", "error");
  }
}

// ---------------------------------------------------------------------------
// Modul: Mempelai
// ---------------------------------------------------------------------------
async function initCouple() {
  const groomForm = document.getElementById("groom-form");
  const brideForm = document.getElementById("bride-form");

  if (!groomForm && !brideForm) return;

  // Muat data awal mempelai
  try {
    const res = await fetch("/api/?endpoint=content");
    const data = await res.json();
    if (data.success && data.data.couple) {
      const { groom, bride } = data.data.couple;
      fillCoupleFields("groom", groom);
      fillCoupleFields("bride", bride);
    }
  } catch {
    showNotification("Gagal memuat data mempelai.", "error");
  }

  function fillCoupleFields(role, person) {
    if (!person) return;
    const prefix = `${role}-`;
    const fullNameEl = document.getElementById(prefix + "full-name");
    const nicknameEl = document.getElementById(prefix + "nickname");
    const fatherEl = document.getElementById(prefix + "father");
    const motherEl = document.getElementById(prefix + "mother");
    const previewEl = document.getElementById(prefix + "preview");

    if (fullNameEl) fullNameEl.value = person.full_name || "";
    if (nicknameEl) nicknameEl.value = person.nickname || "";
    if (fatherEl) fatherEl.value = person.father_name || "";
    if (motherEl) motherEl.value = person.mother_name || "";
    if (previewEl && person.photo_path) previewEl.src = "../" + person.photo_path;
  }

  // Setup event listeners untuk update text & upload foto
  ["groom", "bride"].forEach((role) => {
    const form = document.getElementById(`${role}-form`);
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const payload = {
          full_name: document.getElementById(`${role}-full-name`).value.trim(),
          nickname: document.getElementById(`${role}-nickname`).value.trim(),
          father_name: document.getElementById(`${role}-father`).value.trim(),
          mother_name: document.getElementById(`${role}-mother`).value.trim(),
          csrf_token: csrfToken,
        };

        if (payload.full_name === "") {
          showNotification("Nama lengkap tidak boleh kosong.", "error");
          return;
        }

        try {
          const res = await fetch(`/api/?endpoint=couple&role=${role}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (data.success) {
            showNotification(`Data ${role === "groom" ? "Mempelai Pria" : "Mempelai Wanita"} berhasil disimpan.`, "success");
          } else {
            showNotification(data.error || "Gagal menyimpan data.", "error");
          }
        } catch {
          showNotification("Terjadi kesalahan koneksi.", "error");
        }
      });
    }

    const photoInput = document.getElementById(`${role}-photo`);
    if (photoInput) {
      photoInput.addEventListener("change", async () => {
        if (photoInput.files.length === 0) return;
        const file = photoInput.files[0];

        // Validasi client-side: format & size < 5 MB
        const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
        if (!allowedTypes.includes(file.type)) {
          showNotification("Format file harus JPG, PNG, atau WebP.", "error");
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          showNotification("Ukuran foto maksimal 5 MB.", "error");
          return;
        }

        const formData = new FormData();
        formData.append("photo", file);
        formData.append("csrf_token", csrfToken);

        try {
          const res = await fetch(`/api/?endpoint=couple&role=${role}&action=photo`, {
            method: "POST",
            body: formData,
          });
          const data = await res.json();
          if (data.success) {
            showNotification("Foto berhasil diupload.", "success");
            const previewEl = document.getElementById(`${role}-preview`);
            if (previewEl) previewEl.src = "../" + data.data.photo_path;
          } else {
            showNotification(data.error || "Gagal mengunggah foto.", "error");
          }
        } catch {
          showNotification("Gagal melakukan upload foto.", "error");
        }
      });
    }
  });
}

// ---------------------------------------------------------------------------
// Modul: Detail Acara
// ---------------------------------------------------------------------------
async function initEvents() {
  const form = document.getElementById("events-form");
  if (!form) return;

  // Muat data awal acara
  try {
    const res = await fetch("/api/?endpoint=content");
    const data = await res.json();
    if (data.success && data.data.events) {
      const { akad, resepsi } = data.data.events;
      fillEventFields("akad", akad);
      fillEventFields("resepsi", resepsi);
    }
  } catch {
    showNotification("Gagal memuat detail acara.", "error");
  }

  function fillEventFields(type, ev) {
    if (!ev) return;
    const prefix = `${type}-`;
    document.getElementById(prefix + "date").value = ev.event_date || "";
    document.getElementById(prefix + "start-time").value = ev.start_time || "";
    document.getElementById(prefix + "end-time").value = ev.end_time || "";
    document.getElementById(prefix + "venue").value = ev.venue_name || "";
    document.getElementById(prefix + "address").value = ev.address || "";
    document.getElementById(prefix + "maps-url").value = ev.maps_url || "";
    document.getElementById(prefix + "maps-embed").value = ev.maps_embed_url || "";
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Validasi rentang waktu akad & resepsi
    const validateTimes = (type) => {
      const start = document.getElementById(`${type}-start-time`).value;
      const end = document.getElementById(`${type}-end-time`).value;
      if (start && end && start > end) {
        showNotification(`Waktu selesai ${type} tidak boleh mendahului waktu mulai.`, "error");
        return false;
      }
      return true;
    };

    if (!validateTimes("akad") || !validateTimes("resepsi")) return;

    const saveEvent = async (type) => {
      const prefix = `${type}-`;
      const payload = {
        event_date: document.getElementById(prefix + "date").value,
        start_time: document.getElementById(prefix + "start-time").value,
        end_time: document.getElementById(prefix + "end-time").value,
        venue_name: document.getElementById(prefix + "venue").value.trim(),
        address: document.getElementById(prefix + "address").value.trim(),
        maps_url: document.getElementById(prefix + "maps-url").value.trim(),
        maps_embed_url: document.getElementById(prefix + "maps-embed").value.trim(),
        csrf_token: csrfToken,
      };

      const res = await fetch(`/api/?endpoint=events&type=${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    };

    try {
      const resAkad = await saveEvent("akad");
      const resResepsi = await saveEvent("resepsi");

      if (resAkad.success && resResepsi.success) {
        showNotification("Detail acara berhasil diperbarui.", "success");
      } else {
        showNotification("Gagal memperbarui beberapa acara.", "error");
      }
    } catch {
      showNotification("Koneksi gagal saat menyimpan detail acara.", "error");
    }
  });
}

// ---------------------------------------------------------------------------
// Modul: Galeri Foto
// ---------------------------------------------------------------------------
async function initGallery() {
  const container = document.getElementById("gallery-items-container");
  const form = document.getElementById("gallery-upload-form");

  if (!container) return;

  const loadGallery = async () => {
    container.innerHTML = "";
    try {
      const res = await fetch("/api/?endpoint=content");
      const data = await res.json();
      if (data.success && data.data.gallery) {
        data.data.gallery.forEach((item) => {
          const div = document.createElement("div");
          div.className = "gallery-card";
          div.innerHTML = `
            <img src="../${item.file_path}" alt="${item.caption || 'Foto'}">
            <div class="gallery-card__overlay">
              <button class="btn btn--danger btn--sm btn-delete-photo" data-id="${item.id}">
                <i data-feather="trash-2"></i> Hapus
              </button>
            </div>
          `;
          container.appendChild(div);
        });

        // Re-init Feather Icons
        if (typeof feather !== "undefined") {
          feather.replace({ "aria-hidden": "true" });
        }

        // Action delete photo
        container.querySelectorAll(".btn-delete-photo").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            showConfirmDialog("Apakah Anda yakin ingin menghapus foto ini dari galeri?", async () => {
              try {
                const res = await fetch(`/api/?endpoint=gallery&id=${id}`, {
                  method: "DELETE",
                });
                const data = await res.json();
                if (data.success) {
                  showNotification("Foto berhasil dihapus.", "success");
                  loadGallery();
                } else {
                  showNotification(data.error || "Gagal menghapus foto.", "error");
                }
              } catch {
                showNotification("Gagal menghubungi server.", "error");
              }
            });
          });
        });
      }
    } catch {
      showNotification("Gagal memuat galeri.", "error");
    }
  };

  await loadGallery();

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const photoInput = document.getElementById("gallery-photo");
      const captionInput = document.getElementById("gallery-caption");
      const orderInput = document.getElementById("gallery-sort-order");

      if (photoInput.files.length === 0) {
        showNotification("Pilih file foto terlebih dahulu.", "error");
        return;
      }

      const file = photoInput.files[0];
      if (file.size > 5 * 1024 * 1024) {
        showNotification("Ukuran file foto maksimal 5 MB.", "error");
        return;
      }

      const formData = new FormData();
      formData.append("photo", file);
      formData.append("caption", captionInput.value.trim());
      formData.append("sort_order", orderInput.value || 0);
      formData.append("csrf_token", csrfToken);

      try {
        const res = await fetch("/api/?endpoint=gallery", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          showNotification("Foto berhasil ditambahkan ke galeri.", "success");
          form.reset();
          loadGallery();
        } else {
          showNotification(data.error || "Gagal mengunggah foto.", "error");
        }
      } catch {
        showNotification("Koneksi gagal saat mengunggah foto.", "error");
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Modul: Love Story
// ---------------------------------------------------------------------------
async function initLoveStory() {
  const container = document.getElementById("story-items-container");
  const form = document.getElementById("story-form");

  if (!container) return;

  let editingStoryId = null;
  const submitButton = form ? form.querySelector('button[type="submit"]') : null;

  const resetStoryForm = () => {
    editingStoryId = null;
    if (form) form.reset();
    const photoInput = document.getElementById("story-photo");
    if (photoInput) photoInput.disabled = false;
    if (submitButton) submitButton.innerHTML = '<i data-feather="plus"></i> Tambah Kisah';
    if (window.feather) feather.replace();
  };

  const loadStory = async () => {
    container.innerHTML = "";
    try {
      const res = await fetch("/api/?endpoint=content");
      const data = await res.json();
      if (data.success && data.data.love_story) {
        data.data.love_story.forEach((item) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong>${item.title || ""}</strong></td>
            <td>${item.story_date || ""}</td>
            <td>${item.description || ""}</td>
            <td>
              ${item.photo_path ? `<img src="../${item.photo_path}" style="height: 50px; border-radius: 4px;">` : "-"}
            </td>
            <td>
              <button class="btn btn--outline btn-edit-story"
                data-id="${item.id}"
                data-title="${encodeURIComponent(item.title || "")}"
                data-date="${encodeURIComponent(item.story_date || "")}"
                data-desc="${encodeURIComponent(item.description || "")}"
                data-order="${item.sort_order || 0}">Edit</button>
              <button class="btn btn--danger btn-delete-story" data-id="${item.id}">Hapus</button>
            </td>
          `;
          container.appendChild(tr);
        });

        container.querySelectorAll(".btn-edit-story").forEach((btn) => {
          btn.addEventListener("click", () => {
            editingStoryId = btn.dataset.id;
            document.getElementById("story-title").value = decodeURIComponent(btn.dataset.title || "");
            document.getElementById("story-date").value = decodeURIComponent(btn.dataset.date || "");
            document.getElementById("story-desc").value = decodeURIComponent(btn.dataset.desc || "");
            document.getElementById("story-sort-order").value = btn.dataset.order || 0;
            const photoInput = document.getElementById("story-photo");
            if (photoInput) photoInput.disabled = true;
            if (submitButton) submitButton.innerHTML = '<i data-feather="save"></i> Simpan Perubahan';
            if (window.feather) feather.replace();
            if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        });

        container.querySelectorAll(".btn-delete-story").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            showConfirmDialog("Hapus item love story ini?", async () => {
              try {
                const res = await fetch(`/api/?endpoint=love-story&id=${id}`, {
                  method: "DELETE",
                });
                const data = await res.json();
                if (data.success) {
                  showNotification("Kisah berhasil dihapus.", "success");
                  loadStory();
                } else {
                  showNotification(data.error || "Gagal menghapus.", "error");
                }
              } catch {
                showNotification("Gagal menghubungi server.", "error");
              }
            });
          });
        });
      }
    } catch {
      showNotification("Gagal memuat perjalanan kisah cinta.", "error");
    }
  };

  await loadStory();

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const titleInput = document.getElementById("story-title");
      const dateInput = document.getElementById("story-date");
      const descInput = document.getElementById("story-desc");
      const photoInput = document.getElementById("story-photo");
      const orderInput = document.getElementById("story-sort-order");

      if (titleInput.value.trim() === "") {
        showNotification("Judul tidak boleh kosong.", "error");
        return;
      }
      if (dateInput.value === "") {
        showNotification("Tanggal tidak boleh kosong.", "error");
        return;
      }

      const storyPayload = {
        title: titleInput.value.trim(),
        story_date: dateInput.value,
        description: descInput.value.trim(),
        sort_order: parseInt(orderInput.value || 0, 10),
        csrf_token: csrfToken,
      };

      let requestUrl = "/api/?endpoint=love-story";
      let requestOptions;

      if (editingStoryId) {
        requestUrl += `&id=${editingStoryId}`;
        requestOptions = {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(storyPayload),
        };
      } else {
        const formData = new FormData();
        Object.entries(storyPayload).forEach(([key, value]) => formData.append(key, value));

        if (photoInput.files.length > 0) {
          const file = photoInput.files[0];
          if (file.size > 5 * 1024 * 1024) {
            showNotification("Ukuran file foto maksimal 5 MB.", "error");
            return;
          }
          formData.append("photo", file);
        }

        requestOptions = { method: "POST", body: formData };
      }

      try {
        const res = await fetch(requestUrl, requestOptions);
        const data = await res.json();
        if (data.success) {
          showNotification(editingStoryId ? "Kisah berhasil diperbarui." : "Kisah berhasil ditambahkan.", "success");
          resetStoryForm();
          loadStory();
        } else {
          showNotification(data.error || "Gagal menyimpan kisah.", "error");
        }
      } catch {
        showNotification("Terjadi kesalahan jaringan.", "error");
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Modul: Amplop Digital / Rekening Bank
// ---------------------------------------------------------------------------
async function initEnvelope() {
  const container = document.getElementById("envelope-items-container");
  const form = document.getElementById("envelope-form");

  if (!container) return;

  let editingEnvelopeId = null;
  const submitButton = form ? form.querySelector('button[type="submit"]') : null;

  const resetEnvelopeForm = () => {
    editingEnvelopeId = null;
    if (form) form.reset();
    if (submitButton) submitButton.innerHTML = '<i data-feather="plus"></i> Tambah Rekening';
    if (window.feather) feather.replace();
  };

  const loadEnvelope = async () => {
    container.innerHTML = "";
    try {
      const res = await fetch("/api/?endpoint=content");
      const data = await res.json();
      if (data.success && data.data.digital_envelope) {
        data.data.digital_envelope.forEach((item) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong>${item.bank_name || ""}</strong></td>
            <td>${item.account_holder || ""}</td>
            <td><code>${item.account_number || ""}</code></td>
            <td>
              <button class="btn btn--outline btn-edit-envelope"
                data-id="${item.id}"
                data-bank="${encodeURIComponent(item.bank_name || "")}"
                data-holder="${encodeURIComponent(item.account_holder || "")}"
                data-number="${encodeURIComponent(item.account_number || "")}"
                data-order="${item.sort_order || 0}">Edit</button>
              <button class="btn btn--danger btn-delete-envelope" data-id="${item.id}">Hapus</button>
            </td>
          `;
          container.appendChild(tr);
        });

        container.querySelectorAll(".btn-edit-envelope").forEach((btn) => {
          btn.addEventListener("click", () => {
            editingEnvelopeId = btn.dataset.id;
            document.getElementById("envelope-bank").value = decodeURIComponent(btn.dataset.bank || "");
            document.getElementById("envelope-holder").value = decodeURIComponent(btn.dataset.holder || "");
            document.getElementById("envelope-number").value = decodeURIComponent(btn.dataset.number || "");
            document.getElementById("envelope-sort-order").value = btn.dataset.order || 0;
            if (submitButton) submitButton.innerHTML = '<i data-feather="save"></i> Simpan Perubahan';
            if (window.feather) feather.replace();
            if (form) form.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        });

        container.querySelectorAll(".btn-delete-envelope").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            showConfirmDialog("Hapus nomor rekening ini?", async () => {
              try {
                const res = await fetch(`/api/?endpoint=envelope&id=${id}`, {
                  method: "DELETE",
                });
                const data = await res.json();
                if (data.success) {
                  showNotification("Rekening berhasil dihapus.", "success");
                  loadEnvelope();
                } else {
                  showNotification(data.error || "Gagal menghapus.", "error");
                }
              } catch {
                showNotification("Gagal menghubungi server.", "error");
              }
            });
          });
        });
      }
    } catch {
      showNotification("Gagal memuat daftar amplop digital.", "error");
    }
  };

  await loadEnvelope();

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const bankInput = document.getElementById("envelope-bank");
      const holderInput = document.getElementById("envelope-holder");
      const numberInput = document.getElementById("envelope-number");
      const orderInput = document.getElementById("envelope-sort-order");

      const payload = {
        bank_name: bankInput.value.trim(),
        account_holder: holderInput.value.trim(),
        account_number: numberInput.value.trim(),
        sort_order: parseInt(orderInput.value || 0, 10),
        csrf_token: csrfToken,
      };

      if (payload.bank_name === "" || payload.account_holder === "" || payload.account_number === "") {
        showNotification("Semua field wajib diisi.", "error");
        return;
      }

      try {
        const res = await fetch(editingEnvelopeId ? `/api/?endpoint=envelope&id=${editingEnvelopeId}` : "/api/?endpoint=envelope", {
          method: editingEnvelopeId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.success) {
          showNotification(editingEnvelopeId ? "Rekening berhasil diperbarui." : "Rekening berhasil ditambahkan.", "success");
          resetEnvelopeForm();
          loadEnvelope();
        } else {
          showNotification(data.error || "Gagal menyimpan rekening.", "error");
        }
      } catch {
        showNotification("Terjadi kesalahan koneksi.", "error");
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Modul: RSVP
// ---------------------------------------------------------------------------
async function initRSVP() {
  const container = document.getElementById("rsvp-items-container");
  const btnExport = document.getElementById("btn-export-rsvp");

  if (!container) return;

  const loadRSVP = async () => {
    container.innerHTML = "";
    try {
      const res = await fetch("/api/?endpoint=rsvp");
      const data = await res.json();
      if (data.success && data.data) {
        data.data.forEach((item) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong>${item.guest_name || ""}</strong></td>
            <td>${item.phone || "-"}</td>
            <td>
              <span class="badge badge--${item.attendance === "hadir" ? "success" : "danger"}">
                ${item.attendance === "hadir" ? "Hadir" : "Tidak"}
              </span>
            </td>
            <td>${item.guest_count || 1} orang</td>
            <td>${item.submitted_at || ""}</td>
            <td>
              <button class="btn btn--danger btn-delete-rsvp" data-id="${item.id}">Hapus</button>
            </td>
          `;
          container.appendChild(tr);
        });

        container.querySelectorAll(".btn-delete-rsvp").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            showConfirmDialog("Hapus entri konfirmasi RSVP tamu ini?", async () => {
              try {
                const res = await fetch(`/api/?endpoint=rsvp&id=${id}`, {
                  method: "DELETE",
                });
                const data = await res.json();
                if (data.success) {
                  showNotification("RSVP berhasil dihapus.", "success");
                  loadRSVP();
                } else {
                  showNotification(data.error || "Gagal menghapus.", "error");
                }
              } catch {
                showNotification("Gagal menghubungi server.", "error");
              }
            });
          });
        });
      }
    } catch {
      showNotification("Gagal memuat data RSVP.", "error");
    }
  };

  await loadRSVP();

  if (btnExport) {
    btnExport.addEventListener("click", () => {
      window.location.href = "/api/?endpoint=rsvp&action=export";
    });
  }
}

// ---------------------------------------------------------------------------
// Modul: Buku Tamu / Ucapan
// ---------------------------------------------------------------------------
async function initGuestbook() {
  const container = document.getElementById("guestbook-items-container");
  if (!container) return;

  const loadGuestbook = async () => {
    container.innerHTML = "";
    try {
      const res = await fetch("/api/?endpoint=guestbook");
      const data = await res.json();
      if (data.success && data.data) {
        data.data.forEach((item) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td><strong>${item.sender_name || ""}</strong></td>
            <td>${item.message || ""}</td>
            <td>${item.submitted_at || ""}</td>
            <td>
              <button class="btn btn--danger btn-delete-guestbook" data-id="${item.id}">Hapus</button>
            </td>
          `;
          container.appendChild(tr);
        });

        container.querySelectorAll(".btn-delete-guestbook").forEach((btn) => {
          btn.addEventListener("click", () => {
            const id = btn.dataset.id;
            showConfirmDialog("Hapus ucapan tamu ini?", async () => {
              try {
                const res = await fetch(`/api/?endpoint=guestbook&id=${id}`, {
                  method: "DELETE",
                });
                const data = await res.json();
                if (data.success) {
                  showNotification("Ucapan berhasil dihapus.", "success");
                  loadGuestbook();
                } else {
                  showNotification(data.error || "Gagal menghapus.", "error");
                }
              } catch {
                showNotification("Gagal menghubungi server.", "error");
              }
            });
          });
        });
      }
    } catch {
      showNotification("Gagal memuat buku tamu.", "error");
    }
  };

  await loadGuestbook();
}

// ---------------------------------------------------------------------------
// Modul: Musik
// ---------------------------------------------------------------------------
async function initMusic() {
  const activeMusicName = document.getElementById("active-music-name");
  const btnDelete = document.getElementById("btn-delete-music");
  const form = document.getElementById("music-upload-form");

  if (!activeMusicName) return;

  let activeMusicId = null;

  const loadMusic = async () => {
    activeMusicName.textContent = "Tidak ada musik latar aktif.";
    btnDelete.style.display = "none";
    try {
      const res = await fetch("/api/?endpoint=content");
      const data = await res.json();
      if (data.success && data.data.music) {
        activeMusicId = data.data.music.id;
        activeMusicName.innerHTML = `ðŸŽµ <strong>${data.data.music.original_name || "Musik Latar Aktif"}</strong>`;
        btnDelete.style.display = "inline-flex";
      }
    } catch {
      showNotification("Gagal memuat track musik.", "error");
    }
  };

  await loadMusic();

  if (btnDelete) {
    btnDelete.addEventListener("click", () => {
      if (!activeMusicId) return;
      showConfirmDialog("Hapus musik latar belakang aktif saat ini?", async () => {
        try {
          const res = await fetch(`/api/?endpoint=music&id=${activeMusicId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (data.success) {
            showNotification("Musik latar berhasil dihapus.", "success");
            activeMusicId = null;
            loadMusic();
          } else {
            showNotification(data.error || "Gagal menghapus musik.", "error");
          }
        } catch {
          showNotification("Gagal menghubungi server.", "error");
        }
      });
    });
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const musicInput = document.getElementById("music-file");

      if (musicInput.files.length === 0) {
        showNotification("Pilih file MP3 atau OGG terlebih dahulu.", "error");
        return;
      }

      const file = musicInput.files[0];
      const allowedTypes = ["audio/mpeg", "audio/ogg", "audio/mp3"];
      if (!allowedTypes.includes(file.type) && !file.name.endsWith(".mp3") && !file.name.endsWith(".ogg")) {
        showNotification("Format file harus MP3 atau OGG.", "error");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showNotification("Ukuran file maksimal 10 MB.", "error");
        return;
      }

      const formData = new FormData();
      formData.append("music", file);
      formData.append("csrf_token", csrfToken);

      try {
        const res = await fetch("/api/?endpoint=music", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          showNotification("Musik latar berhasil diunggah.", "success");
          form.reset();
          loadMusic();
        } else {
          showNotification(data.error || "Gagal mengunggah musik.", "error");
        }
      } catch {
        showNotification("Koneksi gagal saat mengunggah musik.", "error");
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Modul: Pengaturan Umum (Settings)
// ---------------------------------------------------------------------------
async function initSettings() {
  const form = document.getElementById("settings-form");
  if (!form) return;

  // Muat data awal settings
  try {
    const res = await fetch("/api/?endpoint=content");
    const data = await res.json();
    if (data.success && data.data.settings) {
      const { opening_text, couple_hashtag, website_title } = data.data.settings;
      document.getElementById("settings-opening-text").value = opening_text || "";
      document.getElementById("settings-hashtag").value = couple_hashtag || "";
      document.getElementById("settings-title").value = website_title || "";
    }
  } catch {
    showNotification("Gagal memuat pengaturan umum.", "error");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const openingText = document.getElementById("settings-opening-text").value.trim();
    const hashtag = document.getElementById("settings-hashtag").value.trim();
    const title = document.getElementById("settings-title").value.trim();

    if (openingText.length > 500) {
      showNotification("Teks pembuka maksimal 500 karakter.", "error");
      return;
    }
    if (hashtag.length > 100) {
      showNotification("Hashtag maksimal 100 karakter.", "error");
      return;
    }
    if (title.length > 200) {
      showNotification("Judul website maksimal 200 karakter.", "error");
      return;
    }

    const payload = {
      opening_text: openingText,
      couple_hashtag: hashtag,
      website_title: title,
      csrf_token: csrfToken,
    };

    try {
      const res = await fetch("/api/?endpoint=settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        showNotification("Pengaturan berhasil disimpan.", "success");
      } else {
        showNotification(data.error || "Gagal menyimpan pengaturan.", "error");
      }
    } catch {
      showNotification("Koneksi gagal saat menyimpan pengaturan.", "error");
    }
  });
}

// ---------------------------------------------------------------------------
// Inisialisasi DOMContentLoaded
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // Cek otentikasi
  await checkSession();

  // Load CSRF Token
  await fetchCsrfToken();

  // Setup header / sidebar interactions
  initSidebarToggle();

  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();
      handleLogout();
    });
  }

  // Router sederhana berdasarkan path file html
  const path = window.location.pathname;

  // Highlight menu aktif di sidebar
  document.querySelectorAll(".admin-nav__item").forEach((item) => {
    const href = item.getAttribute("href");
    if (href && (path.endsWith(href) || (href === "index.html" && (path.endsWith("admin/") || path.endsWith("admin"))))) {
      item.classList.add("active");
    }
  });

  if (path.endsWith("login.html")) {
    initLogin();
  } else if (path.endsWith("index.html") || path.endsWith("admin/") || path.endsWith("admin")) {
    initDashboard();
  } else if (path.endsWith("couple.html")) {
    initCouple();
  } else if (path.endsWith("events.html")) {
    initEvents();
  } else if (path.endsWith("gallery.html")) {
    initGallery();
  } else if (path.endsWith("love-story.html")) {
    initLoveStory();
  } else if (path.endsWith("envelope.html")) {
    initEnvelope();
  } else if (path.endsWith("rsvp.html")) {
    initRSVP();
  } else if (path.endsWith("guestbook.html")) {
    initGuestbook();
  } else if (path.endsWith("music.html")) {
    initMusic();
  } else if (path.endsWith("settings.html")) {
    initSettings();
  }
});


