import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const SESSION_PROFILE_KEY = "golfly_profile_id";

const state = {
  profile: null,
  seasons: [],
  players: [],
  selectedSeason: "default",
  activeTab: "leaderboard",
};

const els = {
  appLayout: document.getElementById("appLayout"),
  authPanel: document.getElementById("authPanel"),
  loginForm: document.getElementById("loginForm"),
  surname: document.getElementById("surname"),
  pincode: document.getElementById("pincode"),
  logoutBtn: document.getElementById("logoutBtn"),
  leaderboardTabBtn: document.getElementById("leaderboardTabBtn"),
  adminTabBtn: document.getElementById("adminTabBtn"),
  leaderboardTab: document.getElementById("leaderboardTab"),
  openMatchModalBtn: document.getElementById("openMatchModalBtn"),
  seasonSelect: document.getElementById("seasonSelect"),
  seasonLabel: document.getElementById("seasonLabel"),
  statsGrid: document.getElementById("statsGrid"),
  leaderboardBody: document.getElementById("leaderboardBody"),
  leaderboardCards: document.getElementById("leaderboardCards"),
  toast: document.getElementById("toast"),
  adminSection: document.getElementById("adminSection"),
  seasonForm: document.getElementById("seasonForm"),
  seasonName: document.getElementById("seasonName"),
  seasonStart: document.getElementById("seasonStart"),
  seasonEnd: document.getElementById("seasonEnd"),
  createUserForm: document.getElementById("createUserForm"),
  newUserFirstName: document.getElementById("newUserFirstName"),
  newUserSurname: document.getElementById("newUserSurname"),
  newUserPincode: document.getElementById("newUserPincode"),
  newUserRole: document.getElementById("newUserRole"),
  defaultSeasonForm: document.getElementById("defaultSeasonForm"),
  defaultSeasonSelect: document.getElementById("defaultSeasonSelect"),
  matchModal: document.getElementById("matchModal"),
  closeMatchModalBtn: document.getElementById("closeMatchModalBtn"),
  matchForm: document.getElementById("matchForm"),
  matchSeason: document.getElementById("matchSeason"),
  matchDate: document.getElementById("matchDate"),
  matchCourse: document.getElementById("matchCourse"),
  matchStatus: document.getElementById("matchStatus"),
  addPlayerRowBtn: document.getElementById("addPlayerRowBtn"),
  playerRows: document.getElementById("playerRows"),
};

function toast(message, isError = false) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  els.toast.classList.toggle("error", isError);
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => {
    els.toast.classList.remove("show");
  }, 2800);
}

function fullName(profile) {
  if (!profile) return "Unknown";
  if (profile.first_name) return `${profile.first_name} ${profile.surname}`;
  return profile.surname;
}

function setAuthUiSignedIn(signedIn) {
  els.authPanel.classList.toggle("hidden", signedIn);
  els.appLayout.classList.toggle("auth-hidden", signedIn);
  els.logoutBtn.classList.toggle("hidden", !signedIn);
  els.openMatchModalBtn.disabled = !signedIn;
}

function setActiveTab(tabName) {
  state.activeTab = tabName;
  const isAdminTab = tabName === "admin";

  els.leaderboardTabBtn.classList.toggle("active", !isAdminTab);
  els.adminTabBtn.classList.toggle("active", isAdminTab);
  els.leaderboardTab.classList.toggle("hidden", isAdminTab);

  const isAdmin = state.profile?.role === "admin";
  const showAdminSection = isAdmin && isAdminTab;
  els.adminSection.classList.toggle("hidden", !showAdminSection);
}

function renderSeasons() {
  const seasonOptions = [
    `<option value="default">Default season</option>`,
    ...state.seasons.map((s) => `<option value="${s.id}">${s.name}</option>`),
  ];

  els.seasonSelect.innerHTML = seasonOptions.join("");
  els.defaultSeasonSelect.innerHTML = state.seasons
    .map((s) => `<option value="${s.id}">${s.name}</option>`)
    .join("");
  els.matchSeason.innerHTML = state.seasons
    .map((s) => `<option value="${s.id}">${s.name}</option>`)
    .join("");

  els.seasonSelect.value = state.selectedSeason;
}

function renderStats(rows) {
  const totalRounds = rows.reduce((acc, r) => acc + (r.rounds_played || 0), 0);
  const totalWins = rows.reduce((acc, r) => acc + (r.wins || 0), 0);
  const totalPoints = rows.reduce((acc, r) => acc + (r.total_stableford_points || 0), 0);
  const avgPoints = rows.length ? Math.round(totalPoints / rows.length) : 0;

  const cards = [
    { label: "Players", value: rows.length },
    { label: "Rounds Logged", value: totalRounds },
    { label: "Wins Tracked", value: totalWins },
    { label: "Avg Stableford", value: avgPoints },
  ];

  els.statsGrid.innerHTML = cards
    .map(
      (c) => `<article class="stat"><p class="label">${c.label}</p><p class="value">${c.value}</p></article>`
    )
    .join("");
}

function renderLeaderboard(rows) {
  if (!rows.length) {
    els.leaderboardBody.innerHTML = `<tr><td colspan="7">No leaderboard data yet.</td></tr>`;
    els.leaderboardCards.innerHTML = `<article class="mobile-card">No leaderboard data yet.</article>`;
    renderStats([]);
    return;
  }

  const rankedRows = [...rows].sort((a, b) => {
    if (b.total_stableford_points !== a.total_stableford_points) {
      return b.total_stableford_points - a.total_stableford_points;
    }
    if (b.wins !== a.wins) {
      return b.wins - a.wins;
    }
    return a.total_net_score - b.total_net_score;
  });

  els.leaderboardBody.innerHTML = rankedRows
    .map(
      (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${r.player_name}</td>
        <td>${r.total_stableford_points}</td>
        <td>${r.total_gross_score}</td>
        <td>${r.total_net_score}</td>
        <td>${r.wins}</td>
        <td>${r.rounds_played}</td>
      </tr>`
    )
    .join("");

  els.leaderboardCards.innerHTML = rankedRows
    .map(
      (r, i) => `
      <article class="mobile-card">
        <strong>#${i + 1} ${r.player_name}</strong>
        <p class="muted">Stableford ${r.total_stableford_points} | Wins ${r.wins}</p>
        <p class="muted">Gross ${r.total_gross_score} | Net ${r.total_net_score} | Rounds ${r.rounds_played}</p>
      </article>`
    )
    .join("");

  renderStats(rankedRows);
}

async function loadSeasons() {
  const { data, error } = await supabase
    .from("seasons")
    .select("id, name, start_date, end_date, is_default")
    .order("start_date", { ascending: false });

  if (error) throw error;
  state.seasons = data || [];
  renderSeasons();

  const defaultSeason = state.seasons.find((s) => s.is_default);
  if (defaultSeason && state.selectedSeason === "default") {
    els.seasonLabel.textContent = `Current season: ${defaultSeason.name}`;
    els.defaultSeasonSelect.value = String(defaultSeason.id);
  }
}

async function loadPlayers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, surname, is_active")
    .eq("is_active", true)
    .order("surname", { ascending: true });

  if (error) throw error;
  state.players = data || [];
}

async function loadProfile() {
  const profileId = localStorage.getItem(SESSION_PROFILE_KEY);
  if (!profileId) {
    state.profile = null;
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, surname, role, is_active")
    .eq("id", profileId)
    .single();

  if (error || !data || !data.is_active) {
    localStorage.removeItem(SESSION_PROFILE_KEY);
    state.profile = null;
    els.adminTabBtn.classList.add("hidden");
    els.adminSection.classList.add("hidden");
    return;
  }

  state.profile = data;
  const isAdmin = data.role === "admin";
  els.adminTabBtn.classList.toggle("hidden", !isAdmin);
}

async function loadLeaderboard() {
  if (state.selectedSeason === "default") {
    const { data, error } = await supabase
      .from("v_default_season_leaderboard")
      .select("player_id, first_name, surname, total_stableford_points, total_gross_score, total_net_score, rounds_played, wins");

    if (error) throw error;
    const rows = (data || []).map((r) => ({
      ...r,
      player_name: r.first_name ? `${r.first_name} ${r.surname}` : r.surname,
    }));
    renderLeaderboard(rows);
    return;
  }

  const selectedSeasonId = Number(state.selectedSeason);
  const { data, error } = await supabase
    .from("v_season_leaderboard")
    .select("season_id, player_id, total_stableford_points, total_gross_score, total_net_score, rounds_played, wins")
    .eq("season_id", selectedSeasonId);

  if (error) throw error;

  const playerIds = (data || []).map((x) => x.player_id);
  if (!playerIds.length) {
    renderLeaderboard([]);
    return;
  }

  const { data: profileRows, error: profileErr } = await supabase
    .from("profiles")
    .select("id, first_name, surname")
    .in("id", playerIds);

  if (profileErr) throw profileErr;

  const profileById = new Map((profileRows || []).map((p) => [p.id, p]));
  const rows = (data || []).map((r) => {
    const p = profileById.get(r.player_id);
    return {
      ...r,
      player_name: p ? fullName(p) : "Unknown",
    };
  });

  const season = state.seasons.find((s) => s.id === selectedSeasonId);
  els.seasonLabel.textContent = season ? `Selected season: ${season.name}` : "Selected season";

  renderLeaderboard(rows);
}

function playerOptionMarkup(selected = "") {
  return state.players
    .map((p) => {
      const label = p.first_name ? `${p.first_name} ${p.surname}` : p.surname;
      const isSelected = selected === p.id ? "selected" : "";
      return `<option value="${p.id}" ${isSelected}>${label}</option>`;
    })
    .join("");
}

function addPlayerRow(rowData = {}) {
  const row = document.createElement("div");
  row.className = "player-row";

  row.innerHTML = `
    <div class="row-head">
      <strong>Player Entry</strong>
      <button type="button" class="btn btn-ghost remove-player">Remove</button>
    </div>
    <label>
      Player
      <select class="player-id" required>
        <option value="">Select player</option>
        ${playerOptionMarkup(rowData.player_id || "")}
      </select>
    </label>
    <label>
      Handicap
      <input class="handicap" type="number" min="0" max="54" step="0.1" required value="${rowData.handicap || ""}" />
    </label>
    <label>
      Gross
      <input class="gross" type="number" min="40" max="200" required value="${rowData.gross_score || ""}" />
    </label>
    <label>
      Net
      <input class="net" type="number" min="20" max="200" required value="${rowData.net_score || ""}" />
    </label>
    <label>
      Stableford
      <input class="stableford" type="number" min="0" max="72" required value="${rowData.stableford_points || ""}" />
    </label>
  `;

  row.querySelector(".remove-player").addEventListener("click", () => {
    row.remove();
  });

  els.playerRows.appendChild(row);
}

function readPlayerRows() {
  const rows = Array.from(els.playerRows.querySelectorAll(".player-row"));
  return rows.map((row) => ({
    player_id: row.querySelector(".player-id").value,
    handicap: Number(row.querySelector(".handicap").value),
    gross_score: Number(row.querySelector(".gross").value),
    net_score: Number(row.querySelector(".net").value),
    stableford_points: Number(row.querySelector(".stableford").value),
  }));
}

function resetMatchForm() {
  els.matchForm.reset();
  els.playerRows.innerHTML = "";
  addPlayerRow();

  const defaultSeason = state.seasons.find((s) => s.is_default);
  if (defaultSeason) {
    els.matchSeason.value = String(defaultSeason.id);
  }

  const today = new Date().toISOString().slice(0, 10);
  els.matchDate.value = today;
}

async function createSeason(event) {
  event.preventDefault();
  if (!state.profile) return;

  const payload = {
    name: els.seasonName.value.trim(),
    start_date: els.seasonStart.value,
    end_date: els.seasonEnd.value,
    created_by: state.profile.id,
  };

  const { error } = await supabase.from("seasons").insert(payload);
  if (error) {
    toast(error.message, true);
    return;
  }

  els.seasonForm.reset();
  toast("Season created.");
  await loadSeasons();
}

async function createUser(event) {
  event.preventDefault();
  if (!state.profile || state.profile.role !== "admin") {
    toast("Only admins can create users.", true);
    return;
  }

  const payload = {
    id: crypto.randomUUID(),
    first_name: els.newUserFirstName.value.trim() || null,
    surname: els.newUserSurname.value.trim(),
    pincode: els.newUserPincode.value,
    role: els.newUserRole.value,
    is_active: true,
    created_by: state.profile.id,
  };

  const { error } = await supabase.from("profiles").insert(payload);
  if (error) {
    toast(error.message, true);
    return;
  }

  els.createUserForm.reset();
  toast("User created.");
  await loadPlayers();
  await loadLeaderboard();
}

async function setDefaultSeason(event) {
  event.preventDefault();
  const seasonId = Number(els.defaultSeasonSelect.value);
  if (!seasonId) return;

  const off = await supabase.from("seasons").update({ is_default: false }).neq("id", seasonId);
  if (off.error) {
    toast(off.error.message, true);
    return;
  }

  const on = await supabase.from("seasons").update({ is_default: true }).eq("id", seasonId);
  if (on.error) {
    toast(on.error.message, true);
    return;
  }

  toast("Default season updated.");
  state.selectedSeason = "default";
  await loadSeasons();
  await loadLeaderboard();
}

async function createMatch(event) {
  event.preventDefault();

  if (!state.profile) {
    toast("Please sign in first.", true);
    return;
  }

  const playerRows = readPlayerRows();
  if (!playerRows.length || playerRows.some((r) => !r.player_id)) {
    toast("Add at least one valid player row.", true);
    return;
  }

  const uniqueCount = new Set(playerRows.map((p) => p.player_id)).size;
  if (uniqueCount !== playerRows.length) {
    toast("Duplicate players are not allowed in one match.", true);
    return;
  }

  const matchPayload = {
    season_id: Number(els.matchSeason.value),
    played_on: els.matchDate.value,
    course_name: els.matchCourse.value.trim(),
    status: els.matchStatus.value,
    created_by: state.profile.id,
  };

  const { data: match, error: matchError } = await supabase
    .from("matches")
    .insert(matchPayload)
    .select("id")
    .single();

  if (matchError) {
    toast(matchError.message, true);
    return;
  }

  const payload = playerRows.map((r) => ({
    match_id: match.id,
    player_id: r.player_id,
    handicap: r.handicap,
    gross_score: r.gross_score,
    net_score: r.net_score,
    stableford_points: r.stableford_points,
  }));

  const { error: playersError } = await supabase.from("match_players").insert(payload);
  if (playersError) {
    toast(playersError.message, true);
    return;
  }

  toast("Match saved.");
  els.matchModal.close();
  resetMatchForm();
  await loadLeaderboard();
}

async function login(event) {
  event.preventDefault();

  const surname = els.surname.value.trim();
  const pincode = els.pincode.value;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, first_name, surname, role, is_active")
    .eq("surname", surname)
    .eq("pincode", pincode)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    toast(error?.message || "Invalid surname or pincode.", true);
    return;
  }

  localStorage.setItem(SESSION_PROFILE_KEY, data.id);
  state.profile = data;
  await afterProfileChanged();
  els.loginForm.reset();
  toast("Signed in.");
}

async function logout() {
  localStorage.removeItem(SESSION_PROFILE_KEY);
  state.profile = null;
  state.activeTab = "leaderboard";
  setAuthUiSignedIn(false);
  els.adminTabBtn.classList.add("hidden");
  setActiveTab("leaderboard");
  els.adminSection.classList.add("hidden");
  toast("Signed out.");
}

async function afterProfileChanged() {
  setAuthUiSignedIn(Boolean(state.profile));
  const isAdmin = state.profile?.role === "admin";
  els.adminTabBtn.classList.toggle("hidden", !isAdmin);

  if (!isAdmin && state.activeTab === "admin") {
    setActiveTab("leaderboard");
  } else {
    setActiveTab(state.activeTab);
  }

  await loadSeasons();
  await loadPlayers();
  await loadLeaderboard();
}

function bindEvents() {
  els.loginForm.addEventListener("submit", login);
  els.logoutBtn.addEventListener("click", logout);
  els.leaderboardTabBtn.addEventListener("click", () => setActiveTab("leaderboard"));
  els.adminTabBtn.addEventListener("click", () => setActiveTab("admin"));

  els.seasonSelect.addEventListener("change", async (event) => {
    state.selectedSeason = event.target.value;
    if (state.selectedSeason === "default") {
      const defaultSeason = state.seasons.find((s) => s.is_default);
      els.seasonLabel.textContent = defaultSeason ? `Current season: ${defaultSeason.name}` : "Current Season";
    }
    await loadLeaderboard();
  });

  els.seasonForm.addEventListener("submit", createSeason);
  els.createUserForm.addEventListener("submit", createUser);
  els.defaultSeasonForm.addEventListener("submit", setDefaultSeason);

  els.openMatchModalBtn.addEventListener("click", () => {
    resetMatchForm();
    els.matchModal.showModal();
  });

  els.closeMatchModalBtn.addEventListener("click", () => {
    els.matchModal.close();
  });

  els.addPlayerRowBtn.addEventListener("click", () => {
    addPlayerRow();
  });

  els.matchForm.addEventListener("submit", createMatch);
}

async function init() {
  bindEvents();
  setActiveTab("leaderboard");

  const today = new Date().toISOString().slice(0, 10);
  els.matchDate.value = today;

  try {
    await loadProfile();
    if (state.profile) {
      await afterProfileChanged();
    } else {
      await loadSeasons();
      await loadLeaderboard();
      setAuthUiSignedIn(false);
    }
  } catch (error) {
    toast(error.message || "Initialization failed", true);
  }
}

init();
