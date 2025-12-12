// =========================
// TMDB CONFIG
// =========================
const TMDB_API_KEY = "52f9e1f172c0dbd3b26926d9e5a915c6";
const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";

// =========================
// DOM ELEMENTLERİ
// =========================

// Filtreler
const genreSelect = document.getElementById("genre-select");
const yearFromInput = document.getElementById("year-from");
const yearToInput = document.getElementById("year-to");
const ratingMinInput = document.getElementById("rating-min");

// Autocomplete
const suggestionsEl = document.getElementById("search-suggestions");

// Arama / temel UI
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const statusEl = document.getElementById("status");
const loader = document.getElementById("loader");
const moviesGrid = document.getElementById("movies-grid");
const paginationEl = document.getElementById("pagination");
const prevBtn = document.getElementById("prev-page");
const nextBtn = document.getElementById("next-page");
const pageInfo = document.getElementById("page-info");
const backdropEl = document.getElementById("backdrop");
const sectionTitleEl = document.getElementById("section-title");

// Search history
const searchHistoryContainer = document.getElementById("search-history");
const searchHistoryList = document.getElementById("search-history-list");
const clearHistoryBtn = document.getElementById("clear-history");

// Detay panel
const detailPanel = document.getElementById("detail-panel");
const detailOverlay = document.getElementById("detail-overlay");
const detailCloseBtn = document.getElementById("detail-close");
const detailPoster = document.getElementById("detail-poster");
const detailTitle = document.getElementById("detail-title");
const detailMeta = document.getElementById("detail-meta");
const detailGenres = document.getElementById("detail-genres");
const detailRating = document.getElementById("detail-rating");
const detailRuntime = document.getElementById("detail-runtime");
const detailLang = document.getElementById("detail-lang");
const detailOverview = document.getElementById("detail-overview");
const detailCast = document.getElementById("detail-cast");
const detailTmdbLink = document.getElementById("detail-tmdb-link");
const detailFavBtn = document.getElementById("detail-favorite");
const detailWatchlistBtn = document.getElementById("detail-watchlist");
const detailWatchedBtn = document.getElementById("detail-watched");
const detailRecWrap = document.getElementById("detail-recommendations");
const detailRecList = document.getElementById("detail-rec-list");

// Theme / scroll
const THEME_KEY = "movie_explorer_theme";

// Spider canvas
const spiderCanvas = document.getElementById("spider-canvas");
const spiderCtx = spiderCanvas ? spiderCanvas.getContext("2d") : null;

// =========================
// STATE
// =========================
let currentPage = 1;
let totalPages = 1;
let currentQuery = "";
let currentSort = "popularity.desc";
let isFetchingMore = false;
let showingTrending = true;

let allGenres = [];
let suggestionTimer = null;

// localStorage keys
const FAVORITES_KEY = "movie_explorer_favorites";
const HISTORY_KEY = "movie_explorer_history";
const WATCHLIST_KEY = "movie_explorer_watchlist";
const WATCHED_KEY = "movie_explorer_watched";

// =========================
// TEMA & SCROLL PROGRESS
// =========================

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
// FAVORILER / LISTELER
// =========================
function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFavorites(favs) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
}

function isFavorite(id) {
  const favs = getFavorites();
  return favs.includes(id);
}

function toggleFavorite(id) {
  const favs = getFavorites();
  const index = favs.indexOf(id);
  if (index === -1) favs.push(id);
  else favs.splice(index, 1);
  saveFavorites(favs);
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
  return getList(key).includes(id);
}

function isInWatchlist(id) {
  return isInList(WATCHLIST_KEY, id);
}
function isWatched(id) {
  return isInList(WATCHED_KEY, id);
}

// =========================
// SEARCH HISTORY
// =========================
function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function addToHistory(query) {
  if (!query) return;
  const history = getHistory();
  const existingIndex = history.indexOf(query);
  if (existingIndex !== -1) history.splice(existingIndex, 1);
  history.unshift(query);
  if (history.length > 8) history.pop();
  saveHistory(history);
  renderHistory();
}

function clearHistory() {
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

function renderHistory() {
  const history = getHistory();
  if (!history.length) {
    searchHistoryContainer.classList.add("hidden");
    searchHistoryList.innerHTML = "";
    return;
  }

  searchHistoryContainer.classList.remove("hidden");
  searchHistoryList.innerHTML = history
    .map(
      (q) =>
        `<button type="button" class="search-history-chip" data-query="${q}">
          ${q}
        </button>`
    )
    .join("");
}

// =========================
// UI HELPERS
// =========================
function showLoader() {
  if (loader) loader.classList.remove("hidden");
}

function hideLoader() {
  if (loader) loader.classList.add("hidden");
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

// =========================
// GENRE + FİLTRE
// =========================
async function loadGenres() {
  if (!genreSelect) return;
  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: "tr-TR"
    });
    const res = await fetch(`${TMDB_BASE_URL}/genre/movie/list?${params}`);
    const data = await res.json();
    allGenres = data.genres || [];
    genreSelect.innerHTML =
      `<option value="">Hepsi</option>` +
      allGenres.map((g) => `<option value="${g.id}">${g.name}</option>`).join("");
  } catch (err) {
    console.error("Tür listesi alınamadı", err);
  }
}

function applyFilters(movies) {
  const genreId = genreSelect?.value || "";
  const yearFrom = yearFromInput?.value ? parseInt(yearFromInput.value) : null;
  const yearTo = yearToInput?.value ? parseInt(yearToInput.value) : null;
  const ratingMin = ratingMinInput?.value
    ? parseFloat(ratingMinInput.value)
    : null;

  return movies.filter((m) => {
    // yıl
    if (yearFrom || yearTo) {
      const y = m.release_date ? parseInt(m.release_date.slice(0, 4)) : null;
      if (yearFrom && (!y || y < yearFrom)) return false;
      if (yearTo && (!y || y > yearTo)) return false;
    }

    // rating
    if (ratingMin != null && ratingMin > 0) {
      if ((m.vote_average || 0) < ratingMin) return false;
    }

    // tür
    if (genreId) {
      if (!m.genre_ids || !m.genre_ids.includes(Number(genreId))) {
        return false;
      }
    }

    return true;
  });
}

// Filtre değişince trendleri/aramayı yeniden çek
function initFilters() {
  function refetchWithFilters() {
    if (currentQuery) {
      currentPage = 1;
      fetchMoviesPage({ append: false });
    } else {
      loadTrending();
    }
  }

  [genreSelect, yearFromInput, yearToInput, ratingMinInput]
    .filter(Boolean)
    .forEach((el) => {
      el.addEventListener("change", refetchWithFilters);
      el.addEventListener("input", () => {
        clearTimeout(el._filterTimer);
        el._filterTimer = setTimeout(refetchWithFilters, 300);
      });
    });
}

// =========================
// DİNAMİK ARKAPLAN
// =========================
function updateBackdrop(movie) {
  if (!backdropEl || !movie) return;

  const path = movie.backdrop_path || movie.poster_path;
  if (!path) {
    backdropEl.classList.remove("backdrop--visible");
    return;
  }

  const imageUrl = `${TMDB_BACKDROP_BASE}${path}`;
  backdropEl.style.backgroundImage = `
    linear-gradient(rgba(5, 7, 15, 0.96), rgba(5, 7, 15, 0.97)),
    url("${imageUrl}")
  `;
  backdropEl.classList.add("backdrop--visible");
}

// =========================
// SIRALAMA (CLIENT-SIDE)
// =========================
function sortMovies(movies, sortBy) {
  const sorted = [...movies];

  switch (sortBy) {
    case "vote_average.desc":
      sorted.sort((a, b) => (b.vote_average || 0) - (a.vote_average || 0));
      break;

    case "release_date.desc":
      sorted.sort((a, b) => {
        const da = a.release_date ? new Date(a.release_date) : 0;
        const db = b.release_date ? new Date(b.release_date) : 0;
        return db - da;
      });
      break;

    case "popularity.desc":
    default:
      sorted.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
      break;
  }

  return sorted;
}

// =========================
// KART OLUŞTURMA & RENDER
// =========================
function createMovieCard(movie) {
  const poster = movie.poster_path
    ? `${TMDB_IMAGE_BASE}${movie.poster_path}`
    : "https://placehold.co/500x750?text=No+Image";

  const year = movie.release_date?.slice(0, 4) || "—";
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : "—";
  const lang = movie.original_language?.toUpperCase() || "?";

  return `
    <article class="movie-card" data-id="${movie.id}">
      <div class="movie-poster-wrapper">
        <img 
          src="${poster}" 
          alt="${movie.title}" 
          class="movie-poster" 
          loading="lazy" 
        />
        <div class="movie-rating-badge">
          ⭐ <span>${rating}</span>
        </div>
      </div>
      <div class="movie-body">
        <h3 class="movie-title">${movie.title}</h3>
        <div class="movie-meta">
          <span>${year}</span>
          <span>${lang}</span>
        </div>
        <p class="movie-overview">${truncate(movie.overview)}</p>
        <div class="movie-actions">
          <button class="movie-link-btn" data-id="${movie.id}">Detay</button>
          <div class="movie-actions-right">
            <button class="favorite-btn" data-id="${movie.id}">
              <span class="favorite-icon">♡</span>
            </button>
            <button class="watchlist-btn" data-id="${movie.id}" title="Sonra izle">
              ⏱
            </button>
            <button class="watched-btn" data-id="${movie.id}" title="İzledim">
              ✔
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function updateFavoriteButton(btn, id) {
  const icon = btn.querySelector(".favorite-icon");

  if (isFavorite(id)) {
    if (icon) icon.textContent = "❤";
    btn.classList.add("favorite-active");
  } else {
    if (icon) icon.textContent = "♡";
    btn.classList.remove("favorite-active");
  }
}

function updateWatchlistButton(btn, id) {
  btn.classList.toggle("active", isInWatchlist(id));
}

function updateWatchedButton(btn, id) {
  btn.classList.toggle("active", isWatched(id));
}

function renderMovies(movies, { append = false } = {}) {
  if (!append) {
    moviesGrid.innerHTML = "";
  }

  if (!movies || movies.length === 0) {
    if (!append) {
      moviesGrid.innerHTML =
        `<p class="status-message">Sonuç bulunamadı.</p>`;
      if (paginationEl) paginationEl.classList.add("hidden");
    }
    return;
  }

  const html = movies.map(createMovieCard).join("");
  moviesGrid.insertAdjacentHTML("beforeend", html);

  // state sync
  movies.forEach((m) => {
    const favBtn = moviesGrid.querySelector(`.favorite-btn[data-id="${m.id}"]`);
    const wlBtn = moviesGrid.querySelector(`.watchlist-btn[data-id="${m.id}"]`);
    const wBtn = moviesGrid.querySelector(`.watched-btn[data-id="${m.id}"]`);
    if (favBtn) updateFavoriteButton(favBtn, m.id);
    if (wlBtn) updateWatchlistButton(wlBtn, m.id);
    if (wBtn) updateWatchedButton(wBtn, m.id);
  });

  updatePagination();
}

// Skeleton kartlar
function renderSkeleton(count = 8) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(`
      <article class="skeleton-card">
        <div class="skeleton-poster"></div>
        <div class="skeleton-line skeleton-long"></div>
        <div class="skeleton-line skeleton-short"></div>
        <div class="skeleton-line skeleton-medium"></div>
      </article>
    `);
  }
  moviesGrid.innerHTML = items.join("");
  if (paginationEl) paginationEl.classList.add("hidden");
}

// =========================
// FAVORI BUTONLARI & HEART BURST
// =========================
function playFavoriteBurst(button) {
  const rect = button.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  for (let i = 0; i < 6; i++) {
    const heart = document.createElement("span");
    heart.className = "heart-burst";
    heart.textContent = "❤";

    const dx = (Math.random() - 0.5) * 80;
    const dy = -Math.random() * 80 - 10;

    heart.style.left = `${cx}px`;
    heart.style.top = `${cy}px`;
    heart.style.setProperty("--dx", `${dx}px`);
    heart.style.setProperty("--dy", `${dy}px`);

    document.body.appendChild(heart);

    setTimeout(() => {
      heart.remove();
    }, 700);
  }
}

// Delegation – kart içi clickler
moviesGrid.addEventListener("click", (e) => {
  const favBtn = e.target.closest(".favorite-btn");
  const watchBtn = e.target.closest(".watchlist-btn");
  const watchedBtn = e.target.closest(".watched-btn");
  const detailBtn = e.target.closest(".movie-link-btn");

  if (favBtn) {
    const id = Number(favBtn.dataset.id);
    if (!id) return;
    toggleFavorite(id);
    updateFavoriteButton(favBtn, id);
    if (isFavorite(id)) playFavoriteBurst(favBtn);
    return;
  }

  if (watchBtn) {
    const id = Number(watchBtn.dataset.id);
    if (!id) return;
    toggleInList(WATCHLIST_KEY, id);
    updateWatchlistButton(watchBtn, id);
    return;
  }

  if (watchedBtn) {
    const id = Number(watchedBtn.dataset.id);
    if (!id) return;
    toggleInList(WATCHED_KEY, id);
    updateWatchedButton(watchedBtn, id);
    return;
  }

  if (detailBtn) {
    const id = Number(detailBtn.dataset.id);
    if (!id) return;
    openMovieDetail(id);
    return;
  }

  const card = e.target.closest(".movie-card");
  if (card && !detailBtn && !favBtn && !watchBtn && !watchedBtn) {
    const id = Number(card.dataset.id);
    if (!id) return;
    openMovieDetail(id);
  }
});

// =========================
// SAYFALAMA
// =========================
function updatePagination() {
  if (!paginationEl) return;

  if (totalPages <= 1) {
    paginationEl.classList.add("hidden");
    return;
  }

  paginationEl.classList.remove("hidden");
  pageInfo.textContent = `Sayfa ${currentPage} / ${totalPages}`;
  prevBtn.disabled = currentPage === 1;
  nextBtn.disabled = currentPage === totalPages;
}

// =========================
// TRENDING
// =========================
async function loadTrending() {
  showingTrending = true;

  if (sectionTitleEl) {
    sectionTitleEl.textContent = "Bugün trend olan filmler";
  }

  setStatus("Trendler yükleniyor...", "info");
  showLoader();
  renderSkeleton();

  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: "tr-TR"
    });

    const res = await fetch(`${TMDB_BASE_URL}/trending/movie/day?${params}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.status_message || "Trendler alınamadı.");

    const movies = sortMovies(data.results || [], "popularity.desc");
    const filtered = applyFilters(movies);
    renderMovies(filtered, { append: false });

    if (filtered.length > 0) {
      updateBackdrop(filtered[0]);
    }

    setStatus("Bugün trend olan filmler listelendi.", "success");
    totalPages = 1;
    currentPage = 1;
    if (paginationEl) paginationEl.classList.add("hidden");
  } catch (err) {
    console.error(err);
    setStatus("Trendler alınırken hata: " + err.message, "error");
  } finally {
    hideLoader();
  }
}

// =========================
// ANA ARAMA FONKSİYONU
// =========================
async function fetchMoviesPage({ append = false } = {}) {
  if (!currentQuery) {
    await loadTrending();
    return;
  }

  if (!append) {
    showLoader();
  }

  setStatus("Filmler aranıyor...", "info");

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query: currentQuery,
    language: "tr-TR",
    page: currentPage.toString(),
    include_adult: "false"
  });

  try {
    const res = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`);
    const data = await res.json();

    if (!res.ok || data.success === false) {
      throw new Error(data.status_message || "Bilinmeyen bir hata oluştu.");
    }

    showingTrending = false;
    if (sectionTitleEl) {
      sectionTitleEl.textContent = `"${currentQuery}" arama sonuçları`;
    }

    totalPages = data.total_pages || 1;
    currentPage = data.page || 1;

    const sortedResults = sortMovies(data.results || [], currentSort);
    const filtered = applyFilters(sortedResults);
    renderMovies(filtered, { append });

    if (!append && filtered.length > 0) {
      updateBackdrop(filtered[0]);
    }

    setStatus(
      `"${currentQuery}" için ${data.total_results} sonuç bulundu. (Sayfa ${currentPage}/${totalPages})`,
      "success"
    );
  } catch (err) {
    console.error(err);
    setStatus("Hata: " + err.message, "error");
    if (!append) {
      moviesGrid.innerHTML = "";
      if (paginationEl) paginationEl.classList.add("hidden");
    }
  } finally {
    hideLoader();
    isFetchingMore = false;
  }
}

// =========================
// INFINITE SCROLL
// =========================
function handleScroll() {
  if (!currentQuery) return; // sadece arama sonuçlarında
  if (isFetchingMore) return;
  if (currentPage >= totalPages) return;

  const threshold = 400;
  const scrollPos = window.innerHeight + window.scrollY;
  const docHeight = document.body.offsetHeight;

  if (scrollPos >= docHeight - threshold) {
    isFetchingMore = true;
    currentPage++;
    fetchMoviesPage({ append: true });
  }
}

window.addEventListener("scroll", handleScroll);

// =========================
// AUTOCOMPLETE
// =========================
function hideSuggestions() {
  if (!suggestionsEl) return;
  suggestionsEl.classList.add("hidden");
  suggestionsEl.innerHTML = "";
}

function renderSuggestions(results) {
  if (!suggestionsEl) return;
  if (!results.length) {
    hideSuggestions();
    return;
  }

  const html = results
    .slice(0, 6)
    .map((m) => {
      const year = m.release_date ? m.release_date.slice(0, 4) : "";
      return `
        <button type="button" class="search-suggestion-item" data-title="${m.title}">
          ${m.title}
          <span>${year}</span>
        </button>
      `;
    })
    .join("");

  suggestionsEl.innerHTML = html;
  suggestionsEl.classList.remove("hidden");
}

async function fetchSuggestions(query) {
  if (!query || query.length < 2) {
    hideSuggestions();
    return;
  }

  const params = new URLSearchParams({
    api_key: TMDB_API_KEY,
    query,
    language: "tr-TR",
    page: "1",
    include_adult: "false"
  });

  try {
    const res = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`);
    const data = await res.json();
    if (!res.ok || data.success === false) throw new Error();
    renderSuggestions(data.results || []);
  } catch {
    hideSuggestions();
  }
}

if (input) {
  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (suggestionTimer) clearTimeout(suggestionTimer);
    suggestionTimer = setTimeout(() => fetchSuggestions(q), 250);
  });

  input.addEventListener("blur", () => {
    setTimeout(hideSuggestions, 150);
  });
}

if (suggestionsEl) {
  suggestionsEl.addEventListener("click", (e) => {
    const item = e.target.closest(".search-suggestion-item");
    if (!item) return;
    const title = item.dataset.title;
    if (!title) return;
    input.value = title;
    currentQuery = title;
    currentPage = 1;
    currentSort = sortSelect.value;
    hideSuggestions();
    fetchMoviesPage({ append: false });
  });
}

// =========================
// DETAY PANELİ
// =========================
function openDetailPanel() {
  if (!detailPanel) return;
  detailPanel.classList.remove("hidden");
  detailPanel.classList.add("show");
  document.body.style.overflow = "hidden";
}

function closeDetailPanel() {
  if (!detailPanel) return;
  detailPanel.classList.remove("show");
  detailPanel.classList.add("hidden");
  document.body.style.overflow = "";
}

async function openMovieDetail(id) {
  if (!detailPanel || !id) return;

  openDetailPanel();

  detailPanel.dataset.currentId = String(id);

  detailTitle.textContent = "Yükleniyor...";
  detailMeta.textContent = "";
  detailOverview.textContent = "";
  detailCast.textContent = "";
  detailGenres.textContent = "";
  detailRecWrap.classList.add("hidden");
  detailRecList.innerHTML = "";
  detailPoster.src = "";

  try {
    const params = new URLSearchParams({
      api_key: TMDB_API_KEY,
      language: "tr-TR",
      append_to_response: "credits,recommendations"
    });

    const res = await fetch(`${TMDB_BASE_URL}/movie/${id}?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.status_message || "Film detayı alınamadı.");

    detailTitle.textContent = data.title;

    const year = data.release_date
      ? new Date(data.release_date).getFullYear()
      : "—";
    const countries =
      data.production_countries
        ?.map((c) => c.iso_3166_1)
        .join(", ") || "";
    detailMeta.textContent = `${year} • ${
      data.original_title || ""
    }${countries ? " • " + countries : ""}`;

    if (data.genres?.length) {
      detailGenres.textContent =
        "Türler: " + data.genres.map((g) => g.name).join(", ");
    } else {
      detailGenres.textContent = "";
    }

    const rating = data.vote_average ? data.vote_average.toFixed(1) : "—";
    detailRating.textContent = `IMDB: ${rating}`;
    detailRuntime.textContent = data.runtime ? `${data.runtime} dk` : "Süre bilgisi yok";
    detailLang.textContent = data.original_language
      ? data.original_language.toUpperCase()
      : "";

    detailOverview.textContent =
      data.overview || "Bu film için açıklama bulunamadı.";

    const cast = data.credits?.cast?.slice(0, 8).map((c) => c.name) || [];
    detailCast.textContent = cast.length
      ? "Oyuncular: " + cast.join(", ")
      : "";

    const posterPath = data.poster_path || data.backdrop_path;
    if (posterPath) {
      detailPoster.src = `${TMDB_IMAGE_BASE}${posterPath}`;
      detailPoster.alt = data.title;
    }

    detailTmdbLink.href = `https://www.themoviedb.org/movie/${data.id}`;

    // Benzer filmler
    const recs = data.recommendations?.results || [];
    if (recs.length) {
      detailRecList.innerHTML = recs
        .slice(0, 6)
        .map((m) => {
          const y = m.release_date ? m.release_date.slice(0, 4) : "";
          const r = m.vote_average ? m.vote_average.toFixed(1) : "—";
          return `
            <button type="button" class="detail-rec-item" data-id="${m.id}">
              <span>${m.title}</span>
              <span>${y} • ${r}</span>
            </button>
          `;
        })
        .join("");
      detailRecWrap.classList.remove("hidden");
    } else {
      detailRecWrap.classList.add("hidden");
    }

    // buton state
    const isFav = isFavorite(data.id);
    const isWl = isInWatchlist(data.id);
    const isW = isWatched(data.id);

    if (detailFavBtn) detailFavBtn.classList.toggle("active", isFav);
    if (detailWatchlistBtn) detailWatchlistBtn.classList.toggle("active", isWl);
    if (detailWatchedBtn) detailWatchedBtn.classList.toggle("active", isW);
  } catch (err) {
    console.error(err);
    detailTitle.textContent = "Hata";
    detailOverview.textContent = err.message;
  }
}

if (detailCloseBtn) {
  detailCloseBtn.addEventListener("click", closeDetailPanel);
}
if (detailOverlay) {
  detailOverlay.addEventListener("click", closeDetailPanel);
}
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && detailPanel && detailPanel.classList.contains("show")) {
    closeDetailPanel();
  }
});

if (detailRecList) {
  detailRecList.addEventListener("click", (e) => {
    const btn = e.target.closest(".detail-rec-item");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (!id) return;
    openMovieDetail(id);
  });
}

if (detailFavBtn) {
  detailFavBtn.addEventListener("click", () => {
    const id = Number(detailPanel?.dataset.currentId);
    if (!id) return;
    toggleFavorite(id);
    const isFav = isFavorite(id);
    detailFavBtn.classList.toggle("active", isFav);
    const cardBtn = moviesGrid.querySelector(`.favorite-btn[data-id="${id}"]`);
    if (cardBtn) updateFavoriteButton(cardBtn, id);
  });
}

if (detailWatchlistBtn) {
  detailWatchlistBtn.addEventListener("click", () => {
    const id = Number(detailPanel?.dataset.currentId);
    if (!id) return;
    toggleInList(WATCHLIST_KEY, id);
    const state = isInWatchlist(id);
    detailWatchlistBtn.classList.toggle("active", state);
  });
}

if (detailWatchedBtn) {
  detailWatchedBtn.addEventListener("click", () => {
    const id = Number(detailPanel?.dataset.currentId);
    if (!id) return;
    toggleInList(WATCHED_KEY, id);
    const state = isWatched(id);
    detailWatchedBtn.classList.toggle("active", state);
  });
}

// =========================
// EVENTLER (FORM, SORT, HISTORY)
// =========================
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const q = input.value.trim();
  if (!q) {
    setStatus("Önce bir arama yaz.", "error");
    return;
  }

  currentQuery = q;
  currentPage = 1;
  currentSort = sortSelect.value;
  addToHistory(q);

  fetchMoviesPage({ append: false });
});

sortSelect.addEventListener("change", () => {
  currentSort = sortSelect.value;
  if (currentQuery) {
    currentPage = 1;
    fetchMoviesPage({ append: false });
  }
});

prevBtn.addEventListener("click", () => {
  if (currentPage > 1) {
    currentPage--;
    fetchMoviesPage({ append: false });
  }
});

nextBtn.addEventListener("click", () => {
  if (currentPage < totalPages) {
    currentPage++;
    fetchMoviesPage({ append: false });
  }
});

clearHistoryBtn.addEventListener("click", () => {
  clearHistory();
});

searchHistoryList.addEventListener("click", (e) => {
  const chip = e.target.closest(".search-history-chip");
  if (!chip) return;
  const q = chip.dataset.query;
  input.value = q;
  currentQuery = q;
  currentPage = 1;
  currentSort = sortSelect.value;
  fetchMoviesPage({ append: false });
});

// =========================
// SPIDER CURSOR BACKGROUND
// =========================
if (spiderCanvas && spiderCtx) {
  function resizeSpiderCanvas() {
    spiderCanvas.width = window.innerWidth;
    spiderCanvas.height = window.innerHeight;
  }

  resizeSpiderCanvas();
  window.addEventListener("resize", resizeSpiderCanvas);

  const mouse = {
    x: window.innerWidth / 2,
    y: window.innerHeight / 2
  };

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  const legs = 10;
  const segments = 18;
  const spider = [];

  for (let i = 0; i < legs; i++) {
    const leg = [];
    for (let j = 0; j < segments; j++) {
      leg.push({ x: mouse.x, y: mouse.y });
    }
    spider.push(leg);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function noise(scale = 1) {
    return (Math.random() - 0.5) * scale;
  }

  function renderSpider() {
    const w = spiderCanvas.width;
    const h = spiderCanvas.height;

    spiderCtx.fillStyle = "rgba(15, 23, 42, 0.22)";
    spiderCtx.fillRect(0, 0, w, h);

    spiderCtx.lineWidth = 1.2;
    spiderCtx.strokeStyle = "rgba(248, 250, 252, 0.55)";
    spiderCtx.lineCap = "round";

    spider.forEach((leg) => {
      leg[0].x = lerp(leg[0].x, mouse.x, 0.25) + noise(2);
      leg[0].y = lerp(leg[0].y, mouse.y, 0.25) + noise(2);

      for (let i = 1; i < leg.length; i++) {
        const prev = leg[i - 1];
        const p = leg[i];
        p.x = lerp(p.x, prev.x, 0.45) + noise(1.4);
        p.y = lerp(p.y, prev.y, 0.45) + noise(1.4);
      }

      spiderCtx.beginPath();
      spiderCtx.moveTo(leg[0].x, leg[0].y);
      for (let i = 1; i < leg.length; i++) {
        spiderCtx.lineTo(leg[i].x, leg[i].y);
      }
      spiderCtx.stroke();
    });

    requestAnimationFrame(renderSpider);
  }

  renderSpider();
}

// =========================
// INITIAL LOAD
// =========================
renderHistory();
setStatus("Film aramak için yukarıya bir şey yaz veya trendleri keşfet.", "info");
loadGenres();
initFilters();
initThemeToggle();
initScrollProgress();
loadTrending();
