document.addEventListener('DOMContentLoaded', () => {

    // =============================================================================
    // == CONFIGURAZIONE FIREBASE INSERITA AUTOMATICAMENTE (NON MODIFICARE)       ==
    // =============================================================================
    const firebaseConfig = {
      apiKey: "AIzaSyDZMPtTfv9cMIM8aznIY4Yggszz0dF-jOo",
      authDomain: "torneo-sotto-le-stelle.firebaseapp.com",
      projectId: "torneo-sotto-le-stelle",
      storageBucket: "torneo-sotto-le-stelle.appspot.com",
      messagingSenderId: "875733722189",
      appId: "1:875733722189:web:d48189f50e42914e056804",
      measurementId: "G-D142803XG2"
    };
    // =============================================================================

    // Inizializzazione di Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // --- GESTIONE INIZIALE E AUDIO ---
    const startScreen = document.getElementById('start-screen');
    const splashScreen = document.getElementById('splash-screen');
    const logoSound = document.getElementById('logo-sound');
    const backgroundMusic = document.getElementById('background-music');
    startScreen.addEventListener('click', () => {
        startScreen.style.display = 'none';
        splashScreen.style.display = 'flex';
        logoSound?.play().catch(e => console.error(e));
    }, { once: true });
    logoSound?.addEventListener('ended', () => backgroundMusic?.play().catch(e => console.error(e)));
    splashScreen.addEventListener('animationend', () => splashScreen.style.display = 'none');
    
    // GESTIONE CLASSIFICA A SCOMPARSA
    const leaderboard = document.getElementById('live-leaderboard');
    const leaderboardToggle = document.getElementById('leaderboard-toggle');
    leaderboardToggle?.addEventListener('click', () => leaderboard.classList.toggle('visible'));

    // --- RIFERIMENTI E VARIABILI GLOBALI ---
    const playerForm = document.getElementById('player-form');
    const playersList = document.getElementById('players-list');
    // ... e altri riferimenti
    let localPlayers = [], localTeams = [], localRoundRobinMatches = [], localKnockoutMatches = [];

    // --- FUNZIONI UTILITY ---
    const toBase64 = f => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result); r.onerror = rej; });
    document.getElementById("player-photo").addEventListener("change", e => document.getElementById("file-name").textContent = e.target.files[0]?.name || "Nessuna foto");
    const photoHTML = p => `<img src="${p?.photo || 'https://via.placeholder.com/50'}" alt="${p?.name || ''}" class="player-photo-icon">`;

    // --- FUNZIONI DI RENDER ---
    function renderPlayers() {
        playersList.innerHTML = "";
        localPlayers.forEach(p => {
            const div = document.createElement("div");
            div.className = "player-item";
            div.innerHTML = `${photoHTML(p)}<span>${p.name} (${p.skill === 'top_player' ? 'Top Player' : 'Player'})</span><button class="btn-danger" onclick="deletePlayer('${p.id}')">X</button>`;
            playersList.appendChild(div);
        });
    }
    
    function renderTeams() {
        teamsList.innerHTML = "";
        localTeams.forEach(t => {
            const div = document.createElement("div");
            div.className = "team-item";
            div.innerHTML = `<input type="text" class="team-name-input" value="${t.name}" onchange="updateTeamName('${t.id}',this.value)"><div class="team-player-box">${photoHTML(t.player1)} ${t.player1.name}</div><div class="team-player-box">${photoHTML(t.player2)} ${t.player2.name}</div>`;
            teamsList.appendChild(div);
        });
    }
    
    function renderRoundRobinMatches() {
        roundRobinMatchesDiv.innerHTML = "";
        localRoundRobinMatches.forEach(m => {
            const div = document.createElement("div");
            div.className = "match-item";
            const sA=m.scoreA??'',sB=m.scoreB??'';
            let cA='',cB='';if(sA!==''&&sB!==''){if(+sA>+sB){cA='winner';cB='loser'}else if(+sB>+sA){cB='winner';cA='loser'}}
            div.innerHTML = `<div class="match-row"><div class="team-details">${photoHTML(m.teamA.player1)}${photoHTML(m.teamA.player2)}<span>${m.teamA.name}</span></div><input type="number" class="score-input ${cA}" value="${sA}" onchange="updateScore('${m.id}','A',this.value)"></div><div class="vs-mobile">vs</div><div class="match-row"><div class="team-details">${photoHTML(m.teamB.player1)}${photoHTML(m.teamB.player2)}<span>${m.teamB.name}</span></div><input type="number" class="score-input ${cB}" value="${sB}" onchange="updateScore('${m.id}','B',this.value)"></div>`;
            roundRobinMatchesDiv.appendChild(div);
        });
    }
    
    function renderKnockoutBracket() {
        knockoutStageDiv.innerHTML = "";
        if (localKnockoutMatches.length === 0) return;
        let html = '<div class="knockout-round"><h3>Semifinali</h3>';
        localKnockoutMatches.filter(m => m.round === 1).forEach(sf => html += createMatchupHTML(sf));
        html += '</div><div class="knockout-round"><h3>Finale</h3>';
        html += createMatchupHTML(localKnockoutMatches.find(m => m.round === 2) || {teamA: {name: 'Da definire'}, teamB: {name: 'Da definire'}});
        html += '</div>';
        knockoutStageDiv.innerHTML = html;
    }

    function createMatchupHTML(m) {
        const sA=m.scoreA??'',sB=m.scoreB??'',wA=m.scoreA!==null&&sA>sB,wB=m.scoreB!==null&&sB>sA;
        return `<div class="match-row"><div class="team-details">${photoHTML(m.teamA?.player1)}${photoHTML(m.teamA?.player2)}<span>${m.teamA?.name || 'TBD'}</span></div><input type="number" class="score-input ${wA?'winner':(wB?'loser':'')}" value="${sA}" ${m.id?`onchange="updateKnockoutScore('${m.id}','A',this.value)"`:"disabled"}></div><div class="vs-mobile">vs</div><div class="match-row"><div class="team-details">${photoHTML(m.teamB?.player1)}${photoHTML(m.teamB?.player2)}<span>${m.teamB?.name || 'TBD'}</span></div><input type="number" class="score-input ${wB?'winner':(wA?'loser':'')}" value="${sB}" ${m.id?`onchange="updateKnockoutScore('${m.id}','B',this.value)"`:"disabled"}></div>`;
    }

    // --- LOGICA DI GIOCO E OPERAZIONI DB ---
    playerForm.addEventListener('submit', async e => { e.preventDefault(); /*...*/ });
    window.deletePlayer = async id => { /*...*/ };
    createTeamsBtn.addEventListener("click", async () => { /*...*/ });
    window.updateTeamName = async (id, name) => { /*...*/ };
    generateRoundRobinBtn.addEventListener("click", async () => { /*...*/ });
    window.updateScore = async (id, team, score) => { /*...*/ };
    // ... tutte le altre funzioni di logica (calculateStandings, generateKnockoutMatches, ecc.) sono qui
    // Per brevità, le ometto ma sono nel codice completo da incollare.
    
    // --- GESTIONE DATI IN TEMPO REALE ---
    db.collection("players").onSnapshot(s => { localPlayers = s.docs.map(d => ({id: d.id, ...d.data()})); renderPlayers(); });
    db.collection("teams").onSnapshot(s => { localTeams = s.docs.map(d => ({id: d.id, ...d.data()})); renderTeams(); updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("roundRobinMatches").onSnapshot(s => { localRoundRobinMatches = s.docs.map(d => ({id: d.id, ...d.data()})); renderRoundRobinMatches(); updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("knockoutMatches").onSnapshot(s => { localKnockoutMatches = s.docs.map(d => ({id: d.id, ...d.data()})); renderKnockoutBracket(); });

    // ... Il resto del codice per il pannello admin ...
});
