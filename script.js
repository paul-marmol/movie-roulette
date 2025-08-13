import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, get } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCK_gNMX_8QyXP7V-PYI4eQMQXFsYTmbQo",
  authDomain: "paulmarmol-34a32.firebaseapp.com",
  databaseURL: "https://paulmarmol-34a32-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "paulmarmol-34a32",
  storageBucket: "paulmarmol-34a32.firebasestorage.app",
  messagingSenderId: "988753913124",
  appId: "1:988753913124:web:db9961c90a0d52ee597fb1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch(error => {
  console.error("Erreur lors de la configuration de la persistance:", error);
});

// DOM Elements
const authSection = document.getElementById("authSection");
const appSection = document.getElementById("appSection");
const loginButton = document.getElementById("loginButton");
const logoutButton = document.getElementById("logoutButton");
const movieInput = document.getElementById("movieInput");
const addButton = document.getElementById("addButton");
const movieList = document.getElementById("movieList");
const pickButton = document.getElementById("pickButton");
const pickedMovie = document.getElementById("pickedMovie");
const feedback = document.getElementById("feedback");

// Login
loginButton.addEventListener("click", () => {
  const email = document.getElementById("emailInput").value.trim();
  const password = document.getElementById("passwordInput").value.trim();
  if (!email || !password) {
    alert("Merci de remplir email et mot de passe.");
    return;
  }
  signInWithEmailAndPassword(auth, email, password)
    .catch(err => alert("Connexion échouée : " + err.message));
});

// Logout
logoutButton.addEventListener("click", () => {
  signOut(auth);
});

// Activer/Désactiver bouton Ajouter selon input
movieInput.addEventListener("input", () => {
  addButton.disabled = movieInput.value.trim() === "";
});

// Ajouter un film
addButton.addEventListener("click", () => addMovie(movieInput.value));
movieInput.addEventListener("keypress", e => {
  if (e.key === "Enter" && !addButton.disabled) addMovie(movieInput.value);
});

// Choisir un film aléatoire
pickButton.addEventListener("click", pickRandomMovie);

// Surveiller état de connexion
onAuthStateChanged(auth, (user) => {
  if (user) {
    authSection.style.display = "none";
    appSection.style.display = "block";
    addButton.disabled = movieInput.value.trim() === "";
    loadMovies(true);
  } else {
    authSection.style.display = "block";
    appSection.style.display = "none";
    addButton.disabled = true;
    movieList.innerHTML = "";
  }
});

function addMovie(title) {
  if (!title.trim()) return;
  const moviesRef = ref(db, "movies");
  const newMovieRef = push(moviesRef);
  set(newMovieRef, { title: title.trim() }).then(() => {
    movieInput.value = "";
    addButton.disabled = true;
    showFeedback("✔️ Film ajouté !", true);
  }).catch(() => {
    showFeedback("❌ Erreur lors de l'ajout.", false);
  });
}

function loadMovies(editable = false) {
  const moviesRef = ref(db, "movies");
  onValue(moviesRef, (snapshot) => {
    movieList.innerHTML = "";
    const data = snapshot.val();
    if (data) {
      Object.entries(data)
        .sort((a, b) => a[1].title.localeCompare(b[1].title))
        .forEach(([key, movie]) => {
          const li = document.createElement("li");
          li.textContent = movie.title;
          if (editable) {
            const delBtn = document.createElement("button");
            delBtn.textContent = "✖";
            delBtn.title = "Supprimer le film";
            delBtn.addEventListener("click", () => {
              set(ref(db, `movies/${key}`), null);
            });
            li.appendChild(delBtn);
          }
          movieList.appendChild(li);
        });
    }
  });
}

function pickRandomMovie() {
  if (pickButton.disabled) return;
  pickButton.disabled = true;

  const moviesRef = ref(db, "movies");
  get(moviesRef).then((snapshot) => {
    const data = snapshot.val();
    if (!data) {
      pickButton.disabled = false;
      return;
    }

    const movies = Object.values(data).map(m => m.title);
    if (movies.length === 0) {
      pickButton.disabled = false;
      return;
    }

    const wrapper = document.getElementById("rouletteWrapper");
    if (!wrapper) {
      console.error("Element #rouletteWrapper manquant.");
      pickButton.disabled = false;
      return;
    }

    wrapper.innerHTML = "";

    const visibleItems = 3;
    const centerOffset = Math.floor(visibleItems / 2);
    const cycles = 3;

    const extendedList = [];
    for (let i = 0; i < cycles; i++) extendedList.push(...movies);
    extendedList.push(...movies.slice(0, visibleItems)); // Buffer

    extendedList.forEach(title => {
      const div = document.createElement("div");
      div.className = "roulette-item";
      div.textContent = title;
      wrapper.appendChild(div);
    });

    setTimeout(() => {
      const item = wrapper.querySelector(".roulette-item");
      const itemHeight = item?.offsetHeight || 38;

      const targetInOriginal = Math.floor(Math.random() * movies.length);
      const targetIndex = (cycles - 1) * movies.length + targetInOriginal;

      // Nouvelle ligne : forcer un déplacement qui tombe pile sur un multiple
      let translateY = (targetIndex - centerOffset) * itemHeight;
      translateY = Math.round(translateY / itemHeight) * itemHeight;

      const maxTranslateY = (extendedList.length - visibleItems) * itemHeight;
      const finalTranslateY = Math.min(translateY, maxTranslateY);

      const pixelsPerSecond = 800;
      const duration = finalTranslateY / pixelsPerSecond;

      wrapper.style.transition = "none";
      wrapper.style.transform = "translateY(0px)";
      void wrapper.offsetHeight;

      wrapper.style.transition = `transform ${duration}s cubic-bezier(0.33, 1, 0.68, 1)`;
      wrapper.style.transform = `translateY(-${finalTranslateY}px)`;

      wrapper.addEventListener("transitionend", function handler() {
        wrapper.removeEventListener("transitionend", handler);

        const items = wrapper.querySelectorAll(".roulette-item");
        items.forEach(item => item.classList.remove("center", "highlight"));

        const highlightIndex = Math.round(finalTranslateY / itemHeight) + centerOffset;
        const selected = items[highlightIndex];
        if (selected) {
          selected.classList.add("center", "highlight");
        }

        pickButton.disabled = false;
      });
    }, 0);
  }).catch((err) => {
    console.error("Erreur lors de la récupération des films :", err);
    pickButton.disabled = false;
  });
}


function showFeedback(message, success = true) {
  feedback.textContent = message;
  feedback.style.color = success ? "#00ff9d" : "#ff5555";
  setTimeout(() => feedback.textContent = "", 3000);
}
