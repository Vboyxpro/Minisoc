const SUPABASE_URL = "https://sftfopnzbjfftcntoxkf.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_aFFtz1WWywHOqwO0pw9I8w_KY5PtTvE";
const supabase = {
    async request(endpoint, method, options) {
        var url = SUPABASE_URL + "/rest/v1/" + endpoint;
        var headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": "Bearer " + SUPABASE_KEY,
            "Content-Type": "application/json"
        };
        if (options && options.headers) {
            for (var h in options.headers) { headers[h] = options.headers[h]; }
        }
        var config = { method: method, headers: headers };
        if (options && options.body) config.body = JSON.stringify(options.body);
        
        var res = await fetch(url, config);
        if (!res.ok) {
            var errData = await res.json().catch(function() { return {}; });
            throw new Error(errData.message || res.statusText);
        }
        if (method === "DELETE" || method === "PATCH") return [];
        return res.json().catch(function() { return []; });
    },
    from(table) {
        return {
            select: async function(fields, filters) {
                var query = table + "?select=" + (fields || "*");
                if (filters && filters.eq) {
                    for (var key in filters.eq) {
                        query += "&" + key + "=eq." + encodeURIComponent(filters.eq[key]);
                    }
                }
                try {
                    var data = await supabase.request(query, "GET");
                    return { data: data, error: null };
                } catch (error) {
                    return { data: null, error: error };
                }
            },
            insert: async function(body) {
                try {
                    var data = await supabase.request(table, "POST", {
                        body: body,
                        headers: { "Prefer": "return=representation" }
                    });
                    return { data: data, error: null };
                } catch (error) {
                    return { data: null, error: error };
                }
            },
            delete: async function(filters) {
                var query = table + "?";
                if (filters && filters.eq) {
                    for (var key in filters.eq) {
                        query += key + "=eq." + encodeURIComponent(filters.eq[key]);
                    }
                }
                try {
                    var data = await supabase.request(query, "DELETE");
                    return { data: data, error: null };
                } catch (error) {
                    return { data: null, error: error };
                }
            },
            update: async function(body, filters) {
                var query = table + "?";
                if (filters && filters.eq) {
                    for (var key in filters.eq) {
                        query += key + "=eq." + encodeURIComponent(filters.eq[key]);
                    }
                }
                try {
                    var data = await supabase.request(query, "PATCH", { body: body });
                    return { data: data, error: null };
                } catch (error) {
                    return { data: null, error: error };
                }
            }
        };
    }
};

var currentUser = localStorage.getItem("social_user") || null;
var isLoginMode = true;

const authContainer = document.getElementById("auth-container");
const mainContainer = document.getElementById("main-container");
const authForm = document.getElementById("auth-form");
const authTitle = document.getElementById("auth-title");
const authBtn = document.getElementById("auth-btn");
const toggleLink = document.getElementById("toggle-link");
const userDisplay = document.getElementById("user-display");
const logoutBtn = document.getElementById("logout-btn");
const submitPostBtn = document.getElementById("submit-post-btn");
const postContent = document.getElementById("post-content");
const feed = document.getElementById("feed");

function init() {
    if (currentUser) {
        showMainPage();
    } else {
        showAuthPage();
    }
}

function showMainPage() {
    authContainer.classList.add("hidden");
    mainContainer.classList.remove("hidden");
    userDisplay.textContent = currentUser;
    loadPosts();
}

function showAuthPage() {
    authContainer.classList.remove("hidden");
    mainContainer.classList.add("hidden");
}

function setupToggleListener() {
    var currentLink = document.getElementById("toggle-link");
    if (currentLink) {
        currentLink.addEventListener("click", function() {
            isLoginMode = !isLoginMode;
            authTitle.textContent = isLoginMode ? "Bejelentkezés" : "Regisztráció";
            authBtn.textContent = isLoginMode ? "Belépés" : "Regisztráció";
            document.getElementById("toggle-auth").innerHTML = isLoginMode ? 
                'Nincs még fiókod? <span id="toggle-link">Regisztráció</span>' : 
                'Már van fiókod? <span id="toggle-link">Bejelentkezés</span>';
            setupToggleListener();
        });
    }
}

if (toggleLink) {
    toggleLink.addEventListener("click", function() {
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? "Bejelentkezés" : "Regisztráció";
        authBtn.textContent = isLoginMode ? "Belépés" : "Regisztráció";
        document.getElementById("toggle-auth").innerHTML = isLoginMode ? 
            'Nincs még fiókod? <span id="toggle-link">Regisztráció</span>' : 
            'Már van fiókod? <span id="toggle-link">Bejelentkezés</span>';
        setupToggleListener();
    });
}

authForm.addEventListener("submit", async function(e) {
    e.preventDefault();
    var username = document.getElementById("username").value.trim();
    var password = document.getElementById("password").value;

    try {
        if (isLoginMode) {
            var res = await supabase.from('users').select('*');
            var user = null;
            if (res.data) {
                for (var i = 0; i < res.data.length; i++) {
                    if (res.data[i].username === username && res.data[i].password === password) {
                        user = res.data[i];
                        break;
                    }
                }
            }

            if (user) {
                currentUser = username;
                localStorage.setItem("social_user", currentUser);
                showMainPage();
                authForm.reset();
            } else {
                alert("Hibás felhasználónév vagy jelszó!");
            }
        } else {
            var resEx = await supabase.from('users').select('*');
            var exists = false;
            if (resEx.data) {
                for (var i = 0; i < resEx.data.length; i++) {
                    if (resEx.data[i].username === username) { exists = true; break; }
                }
            }

            if (exists) {
                alert("Ez a felhasználónév már foglalt!");
                return;
            }

            var regRes = await supabase.from('users').insert([{ username: username, password: password }]);
            if (regRes.error) {
                alert("Hiba történt a regisztráció során.");
                return;
            }

            alert("Sikeres regisztráció! Most már beléphetsz.");
            isLoginMode = true;
            authTitle.textContent = "Bejelentkezés";
            authBtn.textContent = "Belépés";
            document.getElementById("toggle-auth").innerHTML = 'Nincs még fiókod? <span id="toggle-link">Regisztráció</span>';
            authForm.reset();
            setupToggleListener();
        }
    } catch (err) {
        alert("Adatbázis hiba történt.");
    }
});

logoutBtn.addEventListener("click", function() {
    currentUser = null;
    localStorage.removeItem("social_user");
    showAuthPage();
});

submitPostBtn.addEventListener("click", async function() {
    var text = postContent.value.trim();
    if (!text) return;

    try {
        await supabase.from('posts').insert([{ username: currentUser, content: text }]);
        postContent.value = "";
        loadPosts();
    } catch (err) {
        alert("Nem sikerült a poszt mentése.");
    }
});

async function loadPosts() {
    if (!feed) return;
    feed.innerHTML = "<p>Bejegyzések betöltése...</p>";
    try {
        var res = await supabase.from('posts').select('*');
        feed.innerHTML = "";
        
        if (res.data && res.data.length > 0) {
            res.data.sort(function(a, b) { return b.id - a.id; });

            for (var i = 0; i < res.data.length; i++) {
                var post = res.data[i];
                var dateStr = post.created_at ? new Date(post.created_at).toLocaleString('hu-HU') : new Date().toLocaleString('hu-HU');
                
                var postDiv = document.createElement("div");
                postDiv.className = "post";
                postDiv.id = "post-main-box-" + post.id;
                
                postDiv.innerHTML = 
                    '<div class="post-header">' +
                        '<span class="post-user">@' + post.username + '</span>' +
                        '<span class="post-date">' + dateStr + '</span>' +
                    '</div>' +
                    '<div class="post-text">' + post.content + '</div>' +
                    '<div class="post-actions">' +
                        (post.username === currentUser ? '<button class="delete-btn" onclick="deletePost(' + post.id + ')">🗑️ Törlés</button>' : '') +
                    '</div>' +
                    '<div class="comment-section">' +
                        '<div class="comment-input-container">' +
                            '<input type="text" id="comment-in-' + post.id + '" placeholder="Hozzászólás írása...">' +
                            '<button onclick="addComment(' + post.id + ')">Küldés</button>' +
'' +'' +'';feed.appendChild(postDiv);loadComments(post.id);}} else {feed.innerHTML = "Még nincsenek bejegyzések.";}} catch (err) {feed.innerHTML = "Nem sikerült betölteni a bejegyzéseket.";}}async function deletePost(postId) {if (!confirm("Biztosan törölni szeretnéd ezt a posztot?")) return;try {await supabase.from('posts').delete({ eq: { id: postId } });loadPosts();} catch (err) {alert("Nem sikerült törölni a posztot.");}}async function loadComments(postId) {var listContainer = document.getElementById("comments-list-" + postId);if (!listContainer) {var postBox = document.getElementById("post-main-box-" + postId);if (postBox) {var cSection = postBox.querySelector('.comment-section');if (cSection) {listContainer = document.createElement("div");listContainer.className = "comments-list";listContainer.id = "comments-list-" + postId;cSection.appendChild(listContainer);}}}if (!listContainer) return;try {var res = await supabase.from('comments').select('*');listContainer.innerHTML = "";if (res.data && res.data.length > 0) {for (var i = 0; i < res.data.length; i++) {var c = res.data[i];if (Number(c.post_id) === Number(postId)) {var cDiv = document.createElement("div");cDiv.className = "comment";cDiv.innerHTML = '@' + c.username + ':' + c.content;listContainer.appendChild(cDiv);}}}} catch (e) {console.log("Komment hiba");}}async function addComment(postId) {var input = document.getElementById("comment-in-" + postId);if (!input || !input.value.trim()) return;try {await supabase.from('comments').insert([{ post_id: postId, username: currentUser, content: input.value.trim() }]);input.value = "";loadComments(postId);} catch (err) {alert("Hiba a hozzászólás küldésekor.");}}window.addComment = addComment;window.deletePost = deletePost;init();
