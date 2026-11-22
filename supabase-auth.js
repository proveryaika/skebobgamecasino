/* SKEBOB GAME — username/password authentication and cloud saves. */
(function () {
  "use strict";

  const API = "https://ycfxzesdzilywqqeevpz.supabase.co/functions/v1/skebob-auth";
  const SESSION_KEY = "skebobAuthSession";
  const NICK_KEY = "skebobNickname";
  let session = null;
  let ready = false;
  let saveTimer = null;
  let saving = false;
  let saveAgain = false;

  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
    catch (_) { return null; }
  }
  function writeSession(value) {
    session = value;
    try {
      if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
      else localStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }
  async function post(payload, token) {
    const response = await fetch(API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: "Bearer " + token } : {})
      },
      body: JSON.stringify(payload)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Ошибка соединения с сервером");
    return data;
  }
  async function refreshSession() {
    if (!session || !session.refresh_token) throw new Error("Сессия истекла. Войди снова.");
    const data = await post({ mode: "refresh", refresh_token: session.refresh_token });
    writeSession(data.session);
    return session;
  }
  async function authed(payload) {
    if (!session || !session.access_token) throw new Error("Войди в аккаунт.");
    try {
      return await post(payload, session.access_token);
    } catch (error) {
      if (!/сессия|токен|авторизац/i.test(error.message)) throw error;
      await refreshSession();
      return await post(payload, session.access_token);
    }
  }

  function getStateSnapshot() {
    try {
      if (typeof state === "undefined" || !state || typeof state !== "object") return null;
      return JSON.parse(JSON.stringify(state));
    } catch (_) { return null; }
  }
  async function syncSave() {
    if (!ready || !session) return;
    if (saving) { saveAgain = true; return; }
    const snapshot = getStateSnapshot();
    if (!snapshot) return;
    saving = true;
    try {
      await authed({ mode: "save", save: snapshot });
    } catch (error) {
      console.warn("Cloud save failed:", error);
      window.dispatchEvent(new CustomEvent("skebob-save-error", { detail: error.message }));
    } finally {
      saving = false;
      if (saveAgain) {
        saveAgain = false;
        syncSave();
      }
    }
  }
  function queueSave() {
    if (!ready || !session) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(syncSave, 900);
  }
  window.skebobQueueSave = queueSave;

  function showAuth(message) {
    let overlay = document.getElementById("skebobAuthOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "skebobAuthOverlay";
      overlay.style.cssText = "position:fixed;inset:0;z-index:100000;background:rgba(7,4,15,.96);display:flex;align-items:center;justify-content:center;padding:18px;font-family:Arial,sans-serif;color:#fff";
      overlay.innerHTML = `
        <form id="skebobAuthForm" style="width:100%;max-width:390px;background:#191522;border:1px solid #9b63c9;border-radius:20px;padding:24px;box-shadow:0 20px 70px #000">
          <div style="text-align:center;font-size:25px;font-weight:900;color:#e0b8ff;margin-bottom:8px">SKEBOB GAME</div>
          <div style="text-align:center;color:#c9b7d8;font-size:13px;margin-bottom:20px">Аккаунт сохраняет твои звёзды и игровой прогресс</div>
          <div style="display:flex;gap:8px;margin-bottom:14px">
            <button type="button" id="skebobSignupTab" style="flex:1;padding:11px;border-radius:10px;border:1px solid #b77bea;background:#6d3694;color:white;font-weight:800">РЕГИСТРАЦИЯ</button>
            <button type="button" id="skebobLoginTab" style="flex:1;padding:11px;border-radius:10px;border:1px solid #51445e;background:#292230;color:#ddd;font-weight:800">ВХОД</button>
          </div>
          <label for="skebobUsername" style="display:block;font-size:13px;margin:10px 0 5px">Имя пользователя</label>
          <input id="skebobUsername" name="username" required minlength="3" maxlength="20" pattern="[A-Za-z0-9_]{3,20}" autocomplete="username" placeholder="Например, player_01" style="width:100%;box-sizing:border-box;padding:13px;border-radius:10px;border:1px solid #554563;background:#100d16;color:#fff">
          <label for="skebobPassword" style="display:block;font-size:13px;margin:14px 0 5px">Пароль</label>
          <input id="skebobPassword" name="password" required minlength="8" maxlength="72" type="password" autocomplete="new-password" placeholder="Минимум 8 символов" style="width:100%;box-sizing:border-box;padding:13px;border-radius:10px;border:1px solid #554563;background:#100d16;color:#fff">
          <button id="skebobAuthSubmit" type="submit" style="width:100%;margin-top:18px;padding:14px;border:0;border-radius:11px;background:linear-gradient(110deg,#bd7bec,#8144b4);color:#160c20;font-weight:900">СОЗДАТЬ АККАУНТ</button>
          <div id="skebobAuthStatus" role="status" style="min-height:20px;margin-top:12px;text-align:center;color:#ffb3b3;font-size:13px"></div>
          <div style="margin-top:10px;text-align:center;color:#9d91a9;font-size:11px">Только имя пользователя и пароль. Email и телефон не нужны.</div>
        </form>`;
      document.body.appendChild(overlay);
      const form = overlay.querySelector("#skebobAuthForm");
      const signupTab = overlay.querySelector("#skebobSignupTab");
      const loginTab = overlay.querySelector("#skebobLoginTab");
      const submit = overlay.querySelector("#skebobAuthSubmit");
      const status = overlay.querySelector("#skebobAuthStatus");
      let mode = "signup";
      function setMode(next) {
        mode = next;
        const signup = mode === "signup";
        signupTab.style.background = signup ? "#6d3694" : "#292230";
        signupTab.style.borderColor = signup ? "#b77bea" : "#51445e";
        loginTab.style.background = signup ? "#292230" : "#6d3694";
        loginTab.style.borderColor = signup ? "#51445e" : "#b77bea";
        submit.textContent = signup ? "СОЗДАТЬ АККАУНТ" : "ВОЙТИ";
        overlay.querySelector("#skebobPassword").autocomplete = signup ? "new-password" : "current-password";
        status.textContent = "";
      }
      signupTab.addEventListener("click", () => setMode("signup"));
      loginTab.addEventListener("click", () => setMode("login"));
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = overlay.querySelector("#skebobUsername").value.trim().toLowerCase();
        const password = overlay.querySelector("#skebobPassword").value;
        submit.disabled = true;
        submit.textContent = mode === "signup" ? "СОЗДАЁМ..." : "ВХОДИМ...";
        status.style.color = "#d7c7e5";
        status.textContent = "Подключаем аккаунт...";
        try {
          const data = await post({ mode, username, password });
          writeSession(data.session);
          await loadCloudState();
          overlay.remove();
          window.dispatchEvent(new CustomEvent("skebob-auth-ready", { detail: { username, isNewUser: !!data.isNewUser } }));
          queueSave();
        } catch (error) {
          status.style.color = "#ff9b9b";
          status.textContent = error.message || "Не удалось войти";
        } finally {
          submit.disabled = false;
          submit.textContent = mode === "signup" ? "СОЗДАТЬ АККАУНТ" : "ВОЙТИ";
        }
      });
    } else {
      overlay.style.display = "flex";
    }
    const status = overlay.querySelector("#skebobAuthStatus");
    if (message && status) status.textContent = message;
  }

  async function loadCloudState() {
    const data = await authed({ mode: "load" });
    if (typeof state !== "undefined" && state && typeof state === "object") {
      if (data.save && typeof data.save === "object") {
        const remote = data.save;
        state = {
          ...state,
          ...remote,
          balance: Number(remote.balance ?? data.balance) || 0,
          stats: { ...(state.stats || {}), ...(remote.stats || {}) }
        };
      } else {
        state.balance = Number(data.balance) || 0;
      }
      try { localStorage.setItem("skebobSave", JSON.stringify(state)); } catch (_) {}
    }
    if (data.username) {
      try { localStorage.setItem(NICK_KEY, data.username); } catch (_) {}
    }
    ready = true;
    if (typeof window.updateNicknameUI === "function") window.updateNicknameUI();
    if (typeof window.render === "function") window.render();
    return data;
  }

  window.initSupabaseAuth = async function () {
    showAuth();
    session = readSession();
    if (!session || !session.access_token) return;
    try {
      await loadCloudState();
      const overlay = document.getElementById("skebobAuthOverlay");
      if (overlay) overlay.remove();
      window.dispatchEvent(new CustomEvent("skebob-auth-ready"));
    } catch (error) {
      writeSession(null);
      showAuth("Сессия завершилась. Войди снова.");
    }
  };
  window.getNickname = function () {
    try { return localStorage.getItem(NICK_KEY) || "Player"; }
    catch (_) { return "Player"; }
  };
  window.persistNickname = function (value) {
    const clean = String(value || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(clean)) return false;
    try { localStorage.setItem(NICK_KEY, clean); } catch (_) {}
    return true;
  };
  window.skebobChangeNickname = async function () {
    throw new Error("Имя пользователя нельзя изменить после регистрации.");
  };
  window.skebobGetLeaderboard = async function () {
    const data = await authed({ mode: "leaderboard" });
    return data.players || [];
  };
  window.skebobLogout = function () {
    ready = false;
    writeSession(null);
    showAuth("Ты вышел из аккаунта.");
  };
  window.skebobGetMyBadge = async function () { return null; };
  window.skebobShowPendingGlobalAnnouncements = async function () {};
  window.skebobShowPendingNotifications = async function () {};
  window.skebobTrackGameLaunch = async function () { return false; };
  window.skebobCreateStarsInvoice = async function () { throw new Error("Покупки отключены."); };
  window.skebobRefreshAfterStarsPayment = async function () { throw new Error("Покупки отключены."); };

  // Save a snapshot periodically as well as after normal game save() calls.
  window.addEventListener("load", () => setInterval(queueSave, 10000));
})();