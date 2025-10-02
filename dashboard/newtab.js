// ===== CONSTANTS =====
const API = {
  BASE: "https://api-proxy-server-nidhi2026-shizues-projects.vercel.app/api",
  ENDPOINTS: {
    WALLPAPER: "/dailyWallpaper",
    QUOTE: "/dailyQuote"
  }
};

const DEFAULTS = {
  WALLPAPER: "https://w.wallhaven.cc/full/x1/wallhaven-x1v86z.jpg",
  QUOTE: {
    quote: "So we don't forget when we wake up. Let's write our names on each other.",
    character: "Taki Tachibana",
    anime: "Your Name"
  }
};

const STORAGE_KEYS = {
  FAVORITES: 'savedFavorites',
  CATEGORY: 'selectedCategory',
  TIME_FORMAT: 'is24Hour'
};

const CONFIG = {
  MAX_LINKS: 15,
  CLOCK_UPDATE_INTERVAL: 1000,
  TRANSITION_DELAY: 30
};

const TIME = {
  DAYS: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
  MONTHS: ["Jan", "Feb", "March", "Apr", "May", "June", "July", "Aug", "Sept", "Oct", "Nov", "Dec"]
};

// ===== UTILITIES =====
class Utilities {
  static preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(url);
      img.onerror = reject;
    });
  }

  static getStorage(key) {
    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => resolve(result[key]));
    });
  }

  static setStorage(key, value) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: value }, resolve);
    });
  }

  static getFaviconUrl(url) {
    try {
      const urlObject = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=256`;
    } catch {
      return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"%3E%3Cdefs%3E%3Cstyle%3E.a%7Bfill:none;%7D.b%7Bfill:%23ffffff;opacity:0.6;%7D%3C/style%3E%3C/defs%3E%3Crect class="a" width="24" height="24"%3E%3C/rect%3E%3Cpath class="b" d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2ZM18.36,6.21l-3.21,3.21.36.36a.5.5,0,0,1,0,.71l-.71.71a.5.5,0,0,1-.71,0l-.36-.36-3.21,3.21a9.9,9.9,0,0,1-3.61-3.61l3.21-3.21-.36-.36a.5.5,0,0,1,0-.71l.71-.71a.5.5,0,0,1,.71,0l.36.36,3.21-3.21A10,10,0,0,1,12,2Z"%3E%3C/path%3E%3Cpath fill="%234A90E2" d="M12,2A10,10,0,1,0,22,12,10,10,0,0,0,12,2Zm5.71,6L14,11.71,10.29,8l-.71.71L12.59,13H11v2h2v-2h2v-2h2Z"%3E%3C/path%3E%3C/svg%3E';
    }
  }

  static ensureUrlProtocol(url) {
    return url.match(/^(f|ht)tps?:\/\//i) ? url : `https://${url}`;
  }
}

// ===== WALLPAPER MANAGER =====
class WallpaperManager {
  static async setWallpaper(url) {
    const bg = document.getElementById('bg');
    await Utilities.preloadImage(url);
    bg.style.backgroundImage = `url(${url})`;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        bg.classList.add('loaded');
        setTimeout(() => document.body.classList.add('content-visible'), CONFIG.TRANSITION_DELAY);
      });
    });
  }

  static async getWallpaper(query = "ghibli") {
    try {
      const res = await fetch(`${API.BASE}${API.ENDPOINTS.WALLPAPER}?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      await this.setWallpaper(data.url);

      const srcLinkBtn = document.getElementById('srcLinkBtn');
      const imgLinkBtn = document.getElementById('imgLinkBtn');
      const srcLink = document.getElementById('srcViewHeader');
      
      if (!data.source) {
        srcLink.style.display = "none";
      } else {
        srcLinkBtn.href = data.source;
        srcLink.style.display = "flex";
      }
      imgLinkBtn.href = data.page;
    } catch (err) {
      await this.setWallpaper(DEFAULTS.WALLPAPER);
    }
  }
}

// ===== QUOTE MANAGER =====
class QuoteManager {
  static async getAnimeQuote() {
    try {
      const res = await fetch(`${API.BASE}${API.ENDPOINTS.QUOTE}`);
      const data = await res.json();
      this.displayQuote(data);
    } catch (err) {
      this.displayQuote(DEFAULTS.QUOTE);
    }
  }

  static displayQuote(data) {
    const quoteElement = document.getElementById("quote");
    const truncatedQuote = data.content.length > 100 ? 
      data.content.slice(0, 100) + "..." : data.content;
    
    quoteElement.innerText = `"${truncatedQuote}"`;
    quoteElement.style.cursor = "pointer";

    this.setupModal(data.content);
    document.getElementById("character").innerText = `— ${data.character} (${data.anime})`;
  }

  static setupModal(fullQuote) {
    const modal = document.getElementById("quoteModal");
    const fullQuoteElement = document.getElementById("fullQuote");
    const closeModal = document.getElementById("closeModal");

    document.getElementById("quote").addEventListener("click", () => {
      fullQuoteElement.innerText = fullQuote;
      modal.classList.add("show");
    });

    closeModal.addEventListener("click", () => modal.classList.remove("show"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("show");
    });
  }
}

// ===== CLOCK MANAGER =====
class ClockManager {
  static is24Hour = true;

  static async initialize() {
    this.is24Hour = await Utilities.getStorage(STORAGE_KEYS.TIME_FORMAT) ?? true;
    this.updateClock();
    setInterval(() => this.updateClock(), CONFIG.CLOCK_UPDATE_INTERVAL);
    
    document.querySelector(".clock-time").addEventListener("click", () => {
      this.is24Hour = !this.is24Hour;
      Utilities.setStorage(STORAGE_KEYS.TIME_FORMAT, this.is24Hour);
      this.updateClock();
    });
  }

  static updateClock() {
    const now = new Date();
    document.getElementById("time").innerText = this.formatTime(now);
    document.getElementById("date").innerText = this.formatDate(now);
    document.getElementById("msg").innerText = this.getGreeting(now.getHours());
  }

  static formatTime(now) {
    let hours = now.getHours();
    let minutes = now.getMinutes().toString().padStart(2, '0');
    
    if (!this.is24Hour) {
      const ampm = hours >= 12 ? ' PM' : ' AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes}${ampm}`;
    }
    
    return `${hours.toString().padStart(2, '0')}:${minutes}`;
  }

  static formatDate(now) {
    return `${TIME.DAYS[now.getDay()]} ${TIME.MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getUTCFullYear()}`;
  }

  static getGreeting(hour) {
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 17) return "Good Afternoon";
    if (hour >= 17 && hour < 21) return "Good Evening";
    return "Good Night";
  }
}

// ===== FAVORITES MANAGER =====
class FavoritesManager {
  static async renderFavorites() {
    const grid = document.getElementById('favoritesGrid');
    const favorites = await this.getFavorites();

    if (favorites.length === 0) {
      grid.innerHTML = '<p style="color:#aaa;text-align:center;">No links yet. Click "+" to add one.</p>';
      return;
    }

    grid.innerHTML = favorites.map((item, index) => `
      <div class="favorite-item-wrapper" data-index="${index}">
        <a href="${item.url}" target="_blank" class="favorite-item">
          <img src="${Utilities.getFaviconUrl(item.url)}" alt="${item.title}">
          <div class="link-title" title="${item.title}">${item.title}</div>
        </a>
        <button class="context-menu-btn" data-index="${index}">
          <i class="fa-solid fa-ellipsis"></i>
        </button>
      </div>
    `).join('');

    this.attachContextMenuListeners();
  }

  static async getFavorites() {
    const result = await Utilities.getStorage(STORAGE_KEYS.FAVORITES);
    return result || [];
  }

  static async saveFavorites(favorites) {
    await Utilities.setStorage(STORAGE_KEYS.FAVORITES, favorites);
  }

  static attachContextMenuListeners() {
    document.querySelectorAll('.context-menu-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.showContextMenu(e.currentTarget.getAttribute('data-index'), e.currentTarget.getBoundingClientRect());
      });
    });

    // Fixed: Use arrow function to maintain 'this' context
    document.addEventListener('click', (e) => this.closeContextMenuGlobally(e));
  }

  static showContextMenu(index, rect) {
    this.closeContextMenu();
    const menu = document.getElementById('contextMenu');
    
    // Set up menu actions
    menu.querySelector('#menuDelete').onclick = () => { 
      this.deleteFavorite(index); 
      this.closeContextMenu(); 
    };
    
    menu.querySelector('#menuEdit').onclick = () => { 
      this.editFavorite(index); 
      this.closeContextMenu(); 
    };

    // Position menu
    menu.style.top = `${rect.top + rect.height + 5}px`;
    menu.style.left = `${rect.left - menu.offsetWidth + rect.width}px`;
    menu.classList.add('visible');
    menu.setAttribute('data-active-index', index);
  }

  static closeContextMenu() {
    const menu = document.getElementById('contextMenu');
    menu.classList.remove('visible');
    menu.removeAttribute('data-active-index');
  }

  static closeContextMenuGlobally(e) {
    const menu = document.getElementById('contextMenu');
    if (menu.classList.contains('visible') && 
        !menu.contains(e.target) && 
        !e.target.closest('.context-menu-btn')) {
      this.closeContextMenu();
    }
  }

  static async deleteFavorite(indexToDelete) {
    const favorites = await this.getFavorites();
    favorites.splice(indexToDelete, 1);
    await this.saveFavorites(favorites);
    await this.renderFavorites();
  }

  static async editFavorite(indexToEdit) {
    const favorites = await this.getFavorites();
    const linkToEdit = favorites[indexToEdit];
    
    if (linkToEdit) {
      document.getElementById('linkTitle').value = linkToEdit.title;
      document.getElementById('linkUrl').value = linkToEdit.url;
      document.getElementById('newLinkForm').setAttribute('data-editing-index', indexToEdit);
      UI.showAddForm(true);
    }
  }

  static async handleFormSubmission(title, url) {
    const form = document.getElementById('newLinkForm');
    const indexToEdit = form.getAttribute('data-editing-index');
    const favorites = await this.getFavorites();
    const newLinkData = { 
      title: title.trim(), 
      url: Utilities.ensureUrlProtocol(url.trim()) 
    };

    if (indexToEdit !== null && indexToEdit !== undefined) {
      // Edit existing link
      favorites[parseInt(indexToEdit, 10)] = newLinkData;
    } else {
      // Add new link
      if (favorites.length >= CONFIG.MAX_LINKS) return;
      favorites.push(newLinkData);
    }

    await this.saveFavorites(favorites);
    form.reset();
    form.removeAttribute('data-editing-index');
    UI.showLinksView();
  }
}

// ===== UI CONTROLLER =====
class UI {
  static initializeEventListeners() {
    // Category selection
    const categoryOptions = document.querySelectorAll(".category-option");
    categoryOptions.forEach(option => {
      option.addEventListener("click", () => this.handleCategoryChange(option));
    });

    // Favorites panel
    const linksOpenBtn = document.getElementById('linksOpenBtn');
    const addLinkBtn = document.getElementById('addLinkBtn');
    const backToLinksBtn = document.getElementById('backToLinksBtn');
    const newLinkForm = document.getElementById('newLinkForm');

    linksOpenBtn.addEventListener('click', this.toggleLinksPopup);
    addLinkBtn.addEventListener('click', (e) => { e.preventDefault(); this.showAddForm(); });
    backToLinksBtn.addEventListener('click', (e) => { e.preventDefault(); this.showLinksView(); });
    newLinkForm.addEventListener('submit', this.handleFormSubmit);

    // Wallpaper panel
    const bgOpenBtn = document.getElementById('bgOpenBtn');
    bgOpenBtn.addEventListener('click', this.toggleImgLinksPopup);

    // Close popups when clicking outside
    document.addEventListener('click', this.handleOutsideClick);
  }

  static async handleCategoryChange(option) {
    document.querySelectorAll(".category-option").forEach(o => o.classList.remove("active"));
    option.classList.add("active");

    const selectedCategory = option.dataset.query;
    await Utilities.setStorage(STORAGE_KEYS.CATEGORY, selectedCategory);

    document.getElementById("bg").classList.remove("loaded");
    document.body.classList.remove("content-visible");
    await WallpaperManager.getWallpaper(selectedCategory);
  }

  static handleFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('linkTitle').value;
    const url = document.getElementById('linkUrl').value;
    FavoritesManager.handleFormSubmission(title, url);
  }

  static handleOutsideClick(event) {
    const favoritesPanel = document.querySelector('.favorites-panel');
    const wallpaperPanel = document.querySelector('.wallpaper-panel');
    const contextMenu = document.getElementById('contextMenu');
    const linksPopup = document.getElementById('linksPopup');
    const linksImgPopup = document.getElementById('linksImgPopup');

    if (!favoritesPanel.contains(event.target) && linksPopup.classList.contains('visible') && !contextMenu.contains(event.target)) {
      linksPopup.classList.remove('visible');
      document.querySelector('.favorites-header').classList.remove("active");
    }

    if (!wallpaperPanel.contains(event.target) && linksImgPopup.classList.contains('visible')) {
      linksImgPopup.classList.remove('visible');
      document.querySelector('.wallpaper-footer').classList.remove("active");
    }
  }

  static toggleLinksPopup() {
    const header = document.querySelector('.favorites-header');
    const popup = document.getElementById('linksPopup');
    const isVisible = popup.classList.toggle('visible');
    
    header.classList.toggle('active', isVisible);
    if (isVisible) UI.showLinksView();
  }

  static toggleImgLinksPopup() {
    const header = document.querySelector('.wallpaper-footer');
    const popup = document.getElementById('linksImgPopup');
    const isVisible = popup.classList.toggle('visible');
    
    header.classList.toggle('active', isVisible);
    if (isVisible) UI.showImgLinksView();
  }

  static showLinksView() {
    document.getElementById('linksViewHeader').style.display = 'flex';
    document.getElementById('favoritesGrid').style.display = 'grid';
    document.getElementById('addLinkForm').style.display = 'none';
    FavoritesManager.renderFavorites();
  }

  static showImgLinksView() {
    document.getElementById('linksImgViewHeader').style.display = 'flex';
  }

  static async showAddForm(isEdit = false) {
    document.getElementById('linksViewHeader').style.display = 'none';
    document.getElementById('favoritesGrid').style.display = 'none';
    document.getElementById('addLinkForm').style.display = 'block';

    const formHeaderSpan = document.getElementById('createLinkText');
    const submitButton = document.getElementById('submitLinkBtn');
    
    if (isEdit) {
      formHeaderSpan.innerText = 'Editing Link';
      submitButton.innerText = 'Update';
    } else {
      formHeaderSpan.innerText = 'Creating a link';
      submitButton.innerText = 'Add';
      document.getElementById('newLinkForm').reset();
      document.getElementById('newLinkForm').removeAttribute('data-editing-index');
      await this.checkMaxLinks();
    }
  }

  static async checkMaxLinks() {
    const favorites = await FavoritesManager.getFavorites();
    const isMax = favorites.length >= CONFIG.MAX_LINKS;
    const form = document.getElementById('newLinkForm');
    const warning = document.getElementById('maxLinkWarning');

    form.style.opacity = isMax ? '0.5' : '1';
    document.getElementById('linkTitle').disabled = isMax;
    document.getElementById('linkUrl').disabled = isMax;
    document.getElementById('submitLinkBtn').disabled = isMax;

    if (isMax) {
      warning.className = 'max-links-warning';
      warning.innerText = `⚠️ Max ${CONFIG.MAX_LINKS} links reached. Delete one to add another.`;
    } else {
      warning.className = '';
      warning.innerText = '';
    }
  }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', async () => {
  // Initialize clock
  await ClockManager.initialize();

  // Initialize category
  let savedCategory = await Utilities.getStorage(STORAGE_KEYS.CATEGORY) || "ghibli";
  document.querySelectorAll(".category-option").forEach(o => o.classList.remove("active"));
  const activeOption = Array.from(document.querySelectorAll(".category-option")).find(o => o.dataset.query === savedCategory);
  if (activeOption) activeOption.classList.add("active");

  // Load initial data
  await WallpaperManager.getWallpaper(savedCategory);
  await QuoteManager.getAnimeQuote();
  await FavoritesManager.renderFavorites();

  // Initialize UI
  UI.initializeEventListeners();
});