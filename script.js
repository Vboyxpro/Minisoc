const SUPABASE_URL = "https://sftfopnzbjfftcntoxkf.supabase.co";
const SUPABASE_KEY = "sb_publishable_aFFtz1WWywHOqwO0pw9I8w_KY5PtTvE";

// Hagyományos hálózati kliens trükkös karakterek nélkül
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

            await supabase.from('users').insert([{ username: username, password: password }]);
            alert("Sikeres regisztráció! Most már beléphetsz.");
            isLoginMode = true;
            authTitle.textContent = "Bejelentkezés";
            authBtn.textContent = "Belépés";
            document.getElementById("toggle-auth").innerHTML = 'Nincs még fiókod? <span id="toggle-link">Regisztráció</span>';
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
    feed.innerHTML = "<p>Bejegyzések betöltése...</p>";

    try {
        var resPosts = await supabase.from('posts').select('*');
        var resLikes = await supabase.from('post_likes').select('*');
        var posts = resPosts.data;
        var allLikes = resLikes.data;
        
        if (!posts) {
            feed.innerHTML = "<p style='text-align:center; color:#65676b;'>Nincs még bejegyzés.</p>";
            return;
        }

        posts.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
        feed.innerHTML = "";

        if (posts.length === 0) {
            feed.innerHTML = "<p style='text-align:center; color:#65676b;'>Nincs még bejegyzés.</p>";
            return;
        }

        for (var i = 0; i < posts.length; i++) {
            (function() {
                var post = posts[i];
                var postCard = document.createElement("div");
                postCard.className = "card post-card";
                var date = new Date(post.created_at).toLocaleString('hu-HU');
                
                var hasLiked = false;
                if (allLikes) {
                    for (var j = 0; j < allLikes.length; j++) {
                        if (allLikes[j].post_id === post.id && allLikes[j].username === currentUser) {
                            hasLiked = true;
                            break;
                        }
                    }
                }
                var likeBtnText = hasLiked ? "❤️ Kedvelve" : "🤍 Kedvelem";

                var isMyPost = (post.username === currentUser);
var deleteBtnHtml = isMyPost ? 'Törlés' : '';var htmlContent = '';htmlContent += '';htmlContent += '@' + post.username + '';htmlContent += '';htmlContent += '' + date + '';htmlContent += deleteBtnHtml;htmlContent += '';htmlContent += '' + post.content + '';htmlContent += '';htmlContent += '';htmlContent += likeBtnText + ' (' + (post.likes || 0) + ')';htmlContent += '';htmlContent += '';htmlContent += 'Hozzászólások';htmlContent += 'Betöltés...';htmlContent += '';htmlContent += '';htmlContent += 'Küldés';htmlContent += '';postCard.innerHTML = htmlContent;feed.appendChild(postCard);var btnElement = document.getElementById("btn-" + post.id);if (btnElement) {btnElement.addEventListener('click', function() { window.sendComment(post.id); });}var likeElement = document.getElementById("like-" + post.id);if (likeElement) {likeElement.addEventListener('click', function() { window.toggleLike(post.id, post.likes || 0, hasLiked); });}if (isMyPost) {var delElement = document.getElementById("delete-" + post.id);if (delElement) {delElement.addEventListener('click', function() { window.deletePost(post.id); });}}loadComments(post.id);})();}} catch (err) {feed.innerHTML = "Hiba történt a hírfolyam betöltésekor.";}}window.toggleLike = async function(postId, currentLikes, hasLiked) {if (hasLiked) return;try {await supabase.from('post_likes').insert([{ post_id: postId, username: currentUser }]);await supabase.from('posts').update({ likes: currentLikes + 1 }, { eq: { id: postId } });loadPosts();} catch (err) {console.error(err);}};window.deletePost = async function(postId) {if (!confirm("Biztosan törölni szeretnéd ezt a bejegyzést?")) return;try {await supabase.from('posts').delete({ eq: { id: postId } });loadPosts();} catch (err) {alert("Nem sikerült a poszt törlése.");}};async function loadComments(postId) {var commentsList = document.getElementById("comments-" + postId);if (!commentsList) return;try {var res = await supabase.from('comments').select('*');var comments = res.data;if (!comments) {commentsList.innerHTML = "Nincs még hozzászólás.";return;}var filteredComments = comments.filter(function(c) { return c.post_id === postId; });filteredComments.sort(function(a, b) { return new Date(a.created_at) - new Date(b.created_at); });commentsList.innerHTML = filteredComments.length === 0 ? "Nincs még hozzászólás." : "";filteredComments.forEach(function(comment) {var commentDiv = document.createElement("div");commentDiv.className = "comment-item";commentDiv.innerHTML = "@" + comment.username + ": " + comment.content;commentsList.appendChild(commentDiv);});} catch (err) {commentsList.innerHTML = "";}}window.sendComment = async function(postId) {var input = document.getElementById("input-" + postId);if (!input) return;var text = input.value.trim();if (!text) return;try {await supabase.from('comments').insert([{ post_id: postId, username: currentUser, content: text }]);input.value = "";loadComments(postId);} catch (err) {alert("Hiba a komment elküldésekor.");}};