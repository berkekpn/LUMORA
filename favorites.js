/*  
  🔹 Movie Explorer — Core Script
  🔹 Author: Berke Kapan
  🔹 GitHub: https://github.com/berkekpn
  ---
  Notes: Reactive UI, TMDB API integration, localStorage state engine,
         clean functions & modular architecture.
*/


// =========================
// TMDB CONFIG
// =========================
const TMDB_API_KEY = "52f9e1f172c0dbd3b26926d9e5a915c6";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

// Ana sayfayla AYNI key
const FAVORITES_KEY = "movie_explorer_favorites";
const WATCHLIST_KEY = "movie_explorer_watchlist";
const WATCHED_KEY = "movie_explorer_watched";

// DOM
const statusEl = document.getElementById("status");
const loader = document.getElementById("loader");
const moviesGrid = document.getElementById("movies-grid");
const sectionTitleEl = document.getElementById("section-title");
const backdropEl = document.getElementById("backdrop");

const favSortSelect = document.getElementById("fav-sort");
const favProgressText = document.getElementById("fav-progress-text");
const favProgressFill = document.getElementById("fav-progress-fill");

let favMovies = [];
let favOrderMap = new Map();

// =========================
// TEMA & SCROLL PROGRESS
// =========================
const THEME_KEY = "movie_explorer_theme";

function applyTheme(theme) {
  const root = document.documentElement;
  const icon = document.querySelector(".theme-toggle-icon");
  root.setAttribute("data-theme", theme);
  if (icon) {
    icon.textContent = theme === "light" ? "☀️" : "🌙";
  }
}

function initThemeToggle() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(saved);

  const btn = document.getElementById("theme-toggle");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

function initScrollProgress() {
  const bar = document.getElementById("scroll-progress");
  if (!bar) return;

  function update() {
    const docHeight = document.body.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
    bar.style.width = `${progress}%`;
  }

  window.addEventListener("scroll", update);
  window.addEventListener("resize", update);
  update();
}

// =========================
// HELPERS
// =========================
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}

function getList(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

function saveList(key, arr) {
  localStorage.setItem(key, JSON.stringify(arr));
}

function toggleInList(key, id) {
  const list = getList(key);
  const idx = list.indexOf(id);
  if (idx === -1) list.push(id);
  else list.splice(idx, 1);
  saveList(key, list);
}

function isInList(key, id) {
  const list = getList(key);
  return list.includes(id);
}

// kısayollar
function isInWatchlist(id) {
  return isInList(WATCHLIST_KEY, id);
}
function isWatched(id) {
  return isInList(WATCHED_KEY, id);
}

function showLoader() {
  if (!loader) return;
  loader.classList.remove("hidden");
}
function hideLoader() {
  if (!loader) return;
  loader.classList.add("hidden");
}
function setStatus(msg, type = "info") {
  if (!statusEl) return;
  statusEl.textContent = msg;
  statusEl.className = "status " + type;
}

function truncate(text, max = 220) {
  if (!text) return "Açıklama yok.";
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function updateBackdrop(movie) {
  if (!backdropEl || !movie) return;
  const path = movie.backdrop_path || movie.poster_path;
  if (!path) return;
  const url = `${TMDB_BACKDROP_BASE}${path}`;
  backdropEl.style.backgroundImage = `
    linear-gradient(rgba(5,7,15,.96), rgba(5,7,15,.97)),
    url("${url}")
  `;
  backdropEl.classList.add("backdrop--visible");
}

// =========================
// CARD
// =========================
function createCard(movie) {
  const poster = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : "https://placehold.co/500x750?text=No+Image";

  const year = movie.release_date?.slice(0, 4) || "—";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "—";
  const lang = movie.original_language?.toUpperCase() || "?";

  return `
    <article class="movie-card">
      <div class="movie-poster-wrapper">
        <img src="${poster}" alt="${movie.title}" class="movie-poster" />
        <div class="movie-rating-badge">⭐ <span>${rating}</span></div>
      </div>
      <div class="movie-body">
        <h3 class="movie-title">${movie.title}</h3>
        <div class="movie-meta">
          <span>${year}</span>
          <span>${lang}</span>
        </div>
        <p class="movie-overview">${truncate(movie.overview)}</p>
        <div class="movie-actions">
          <a 
            href="https://www.themoviedb.org/movie/${movie.id}"
            target="_blank"
            rel="noopener noreferrer"
            class="movie-link"
          >
            TMDB'de aç
          </a>
        </div>
      </div>
    </article>
  `;
}

// =========================
// FAVORİ PROGRESS (izledim)
// =========================
function updateFavProgress() {
  if (!favProgressText && !favProgressFill) return;

  const favIds = getFavorites();
  const watchedIds = getList(WATCHED_KEY);
  const watchedFromFav = favIds.filter((id) => watchedIds.includes(id));
  const total = favIds.length || 1;
  const percent = Math.round((watchedFromFav.length / total) * 100);

  if (favProgressText) {
    favProgressText.textContent = `${favIds.length} favoriden ${watchedFromFav.length} tanesini izledin (%${percent}).`;
  }
  if (favProgressFill) {
    favProgressFill.style.width = `${percent}%`;
  }
}

// =========================
// LOAD FAVORITES
// =========================
async function loadFavorites() {
  const ids = getFavorites();

  if (!moviesGrid || !sectionTitleEl) return;

  if (!ids.length) {
    sectionTitleEl.textContent = "Hiç favorin yok";
    moviesGrid.innerHTML = "";
    setStatus("Henüz favorilere film eklemedin.", "info");
    updateFavProgress();
    return;
  }

  // eklenme sırası için index map
  favOrderMap = new Map();
  ids.forEach((id, index) => favOrderMap.set(id, index));

  showLoader();
  setStatus("Favoriler yükleniyor...", "info");

  try {
    const requests = ids.map((id) =>
      fetch(
        `${TMDB_BASE_URL}/movie/${id}?api_key=${TMDB_API_KEY}&language=tr-TR`
      ).then((r) => r.json())
    );

    favMovies = await Promise.all(requests);

    // bozuk dönen olursa filtrele
    favMovies = favMovies.filter((m) => m && m.id);

    if (!favMovies.length) {
      sectionTitleEl.textContent = "Hiç favorin yok";
      moviesGrid.innerHTML = "";
      setStatus("Favorilerin alınamadı veya bulunamadı.", "error");
      updateFavProgress();
      return;
    }

    renderFavMovies();

    if (favMovies[0]) {
      updateBackdrop(favMovies[0]);
    }

    sectionTitleEl.textContent = "Kaydettiğin filmler";
    setStatus(`${favMovies.length} favori film listelendi.`, "success");
    updateFavProgress();
  } catch (err) {
    console.error(err);
    setStatus("Favoriler alınırken hata: " + err.message, "error");
  } finally {
    hideLoader();
  }
}

function renderFavMovies() {
  if (!moviesGrid) return;

  const mode = favSortSelect ? favSortSelect.value : "added";
  const movies = [...favMovies];

  movies.sort((a, b) => {
    switch (mode) {
      case "rating":
        return (b.vote_average || 0) - (a.vote_average || 0);
      case "year": {
        const ya = a.release_date ? parseInt(a.release_date.slice(0, 4)) : 0;
        const yb = b.release_date ? parseInt(b.release_date.slice(0, 4)) : 0;
        return yb - ya;
      }
      case "title":
        return a.title.localeCompare(b.title);
      case "added":
      default:
        return (
          (favOrderMap.get(a.id) ?? 0) - (favOrderMap.get(b.id) ?? 0)
        );
    }
  });

  moviesGrid.innerHTML = movies.map(createCard).join("");
}

// Sort değişince tekrar render
if (favSortSelect) {
  favSortSelect.addEventListener("change", renderFavMovies);
}

// =========================
// INIT
// =========================
initThemeToggle();
initScrollProgress();
loadFavorites();
