document.addEventListener('DOMContentLoaded', () => {

    // =============================================================================
    // == CONFIGURAZIONE FIREBASE (NON MODIFICARE)                                ==
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

    // Inizializzazione di Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // =============================================================================
    // == RIFERIMENTI AGLI ELEMENTI HTML                                          ==
    // =============================================================================
    const startScreen = document.getElementById('start-screen');
    const splashScreen = document.getElementById('splash-screen');
    const logoSound = document.getElementById('logo-sound');
    const backgroundMusic = document.getElementById('background-music');
    const leaderboard = document.getElementById('live-leaderboard');
    const leaderboardToggle = document.getElementById('leaderboard-toggle');
    const playerForm = document.getElementById('player-form');
    const playersList = document.getElementById('players-list');
    const createTeamsBtn = document.getElementById('create-teams-btn');
    const teamsList = document.getElementById('teams-list');
    const generateRoundRobinBtn = document.getElementById('generate-round-robin-btn');
    const roundRobinMatchesDiv = document.getElementById('round-robin-matches');
    const calculateStandingsBtn = document.getElementById('calculate-standings-btn');
    const standingsTableDiv = document.getElementById('standings-table');
    const generateStandardKnockoutBtn = document.getElementById('generate-standard-knockout-btn');
    const generateRandomKnockoutBtn = document.getElementById('generate-random-knockout-btn');
    const knockoutStageDiv = document.getElementById('knockout-stage');
    
    // Variabili globali
    let localPlayers = [], localTeams = [], localRoundRobinMatches = [], localKnockoutMatches = [];

    // --- GESTIONE INIZIALE E AUDIO ---
    startScreen.addEventListener('click', () => {
        startScreen.style.display = 'none';
        splashScreen.style.display = 'flex';
        if (logoSound) logoSound.play().catch(e => console.error("Audio logo bloccato", e));
    }, { once: true });

    if (logoSound) {
        logoSound.addEventListener('ended', () => {
            if (backgroundMusic) backgroundMusic.play().catch(e => console.error("Musica di sottofondo bloccata", e));
        });
    }
    
    splashScreen.addEventListener('animationend', () => {
        splashScreen.style.display = 'none';
    });
    
    leaderboardToggle.addEventListener('click', () => {
        leaderboard.classList.toggle('visible');
    });

    // --- FUNZIONI UTILITY ---
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
    document.getElementById("player-photo").addEventListener("change", e => {
        document.getElementById("file-name").textContent = e.target.files[0]?.name || "Nessuna foto selezionata";
    });
    const photoHTML = player => `<img src="${player?.photo || 'https://via.placeholder.com/50'}" alt="${player?.name || ''}" class="player-photo-icon">`;

    // --- FUNZIONI DI RENDER ---
    function renderPlayers() {
        playersList.innerHTML = "";
        localPlayers.forEach(p => {
            const div = document.createElement("div");
            div.className = "player-item";
            const skillText = p.skill === "top_player" ? "Top Player" : "Player";
            div.innerHTML = `${photoHTML(p)}<span>${p.name} (${skillText})</span><button class="btn-danger" onclick="deletePlayer('${p.id}')">X</button>`;
            playersList.appendChild(div);
        });
    }

    function renderTeams() {
        teamsList.innerHTML = "";
        localTeams.forEach(t => {
            const div = document.createElement("div");
            div.className = "team-item";
            div.innerHTML = `<input type="text" class="team-name-input" value="${t.name}" onchange="updateTeamName('${t.id}', this.value)"><div class="team-player-box">${photoHTML(t.player1)} ${t.player1.name}</div><div class="team-player-box">${photoHTML(t.player2)} ${t.player2.name}</div>`;
            teamsList.appendChild(div);
        });
    }
    
    function renderRoundRobinMatches() {
        roundRobinMatchesDiv.innerHTML = "";
        localRoundRobinMatches.forEach(m => {
            const div = document.createElement("div");
            div.className = "match-item";
            const sA = m.scoreA ?? '', sB = m.scoreB ?? '';
            let cA = '', cB = '';
            if (sA !== '' && sB !== '') { if (+sA > +sB) { cA = 'winner'; cB = 'loser'; } else if (+sB > +sA) { cB = 'winner'; cA = 'loser'; } }
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
        const finalMatch = localKnockoutMatches.find(m => m.round === 2) || {teamA: {name: 'Da definire'}, teamB: {name: 'Da definire'}};
        html += createMatchupHTML(finalMatch);
        html += '</div>';
        knockoutStageDiv.innerHTML = html;
    }

    function createMatchupHTML(m) {
        const sA = m.scoreA ?? '', sB = m.scoreB ?? '';
        const wA = m.scoreA !== null && sA > sB, wB = m.scoreB !== null && sB > sA;
        const html = `<div class="match-row"><div class="team-details">${photoHTML(m.teamA?.player1)}${photoHTML(m.teamA?.player2)}<span>${m.teamA?.name || 'TBD'}</span></div><input type="number" class="score-input ${wA ? 'winner' : (wB ? 'loser' : '')}" value="${sA}" ${m.id ? `onchange="updateKnockoutScore('${m.id}','A',this.value)"` : "disabled"}></div><div class="vs-mobile">vs</div><div class="match-row"><div class="team-details">${photoHTML(m.teamB?.player1)}${photoHTML(m.teamB?.player2)}<span>${m.teamB?.name || 'TBD'}</span></div><input type="number" class="score-input ${wB ? 'winner' : (wA ? 'loser' : '')}" value="${sB}" ${m.id ? `onchange="updateKnockoutScore('${m.id}','B',this.value)"` : "disabled"}></div>`;
        return `<div class="knockout-matchup">${html}</div>`;
    }
    
    // --- GESTIONE CLASSIFICHE ---
    function calculateStandings(teams, matches) { /*...*/ } // Logica invariata
    calculateStandingsBtn.addEventListener("click", () => renderStandingsTable(calculateStandings(localTeams, localRoundRobinMatches)));
    function renderStandingsTable(standings) { /*...*/ } // Logica invariata
    function updateLiveLeaderboard(standings) { /*...*/ } // Logica invariata

    // --- AZIONI PRINCIPALI DEI PULSANTI ---
    playerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('player-name').value;
        const skill = document.getElementById('player-skill').value;
        const photoInput = document.getElementById('player-photo');
        const photoBase64 = photoInput.files[0] ? await toBase64(photoInput.files[0]) : null;
        await db.collection('players').add({ name, skill, photo: photoBase64 });
        playerForm.reset();
        document.getElementById('file-name').textContent = 'Nessuna foto selezionata';
    });

    window.deletePlayer = async (id) => {
        if (confirm('Eliminare questo giocatore?')) await db.collection('players').doc(id).delete();
    };

    createTeamsBtn.addEventListener("click", async () => {
        const strong = localPlayers.filter(p => p.skill === 'top_player');
        const weak = localPlayers.filter(p => p.skill === 'player');
        if (strong.length !== weak.length || strong.length === 0) {
            return alert(`Errore: il numero di "Top Player" (${strong.length}) e "Player" (${weak.length}) deve essere uguale e maggiore di zero.`);
        }
        if (confirm("Sei sicuro? Le squadre e le partite esistenti verranno cancellate.")) {
            await Promise.all([deleteCollection("teams"), deleteCollection("roundRobinMatches"), deleteCollection("knockoutMatches")]);
            strong.sort(() => .5 - Math.random());
            weak.sort(() => .5 - Math.random());
            for (let i = 0; i < strong.length; i++) await db.collection("teams").add({ name: `Squadra ${i + 1}`, player1: strong[i], player2: weak[i] });
        }
    });

    window.updateTeamName = async (id, name) => await db.collection('teams').doc(id).update({ name });

    generateRoundRobinBtn.addEventListener("click", async () => {
        if (localTeams.length < 2) return alert("Crea almeno 2 squadre!");
        await deleteCollection("roundRobinMatches");
        let teams = [...localTeams];
        if (teams.length % 2 !== 0) teams.push({ id: "BYE" });
        for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) if (teams[i].id !== "BYE" && teams[j].id !== "BYE") await db.collection("roundRobinMatches").add({ teamA: teams[i], teamB: teams[j], scoreA: null, scoreB: null });
        alert("Calendario generato!");
        calculateStandingsBtn.style.display = "block";
    });
    
    window.updateScore = async (id, team, score) => await db.collection('roundRobinMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null });
    
    const generateKnockoutMatches = async (isRandom) => { /*...*/ }; // Logica invariata
    generateStandardKnockoutBtn.addEventListener('click', () => generateKnockoutMatches(false));
    generateRandomKnockoutBtn.addEventListener('click', () => generateKnockoutMatches(true));
    window.updateKnockoutScore = async (id, team, score) => await db.collection('knockoutMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null });
    
    // --- GESTIONE DATI IN TEMPO REALE ---
    db.collection("players").onSnapshot(s => { localPlayers = s.docs.map(d => ({id: d.id, ...d.data()})); renderPlayers(); });
    db.collection("teams").onSnapshot(s => { localTeams = s.docs.map(d => ({id: d.id, ...d.data()})); renderTeams(); updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("roundRobinMatches").onSnapshot(s => { localRoundRobinMatches = s.docs.map(d => ({id: d.id, ...d.data()})); renderRoundRobinMatches(); updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("knockoutMatches").onSnapshot(s => { localKnockoutMatches = s.docs.map(d => ({id: d.id, ...d.data()})); renderKnockoutBracket(); });

    // --- PANNELLO ADMIN ---
    async function deleteCollection(name) { /*...*/ } // Logica invariata
    document.getElementById("reset-teams-btn").addEventListener("click", async () => { /*...*/ });
    document.getElementById("reset-tournament-btn").addEventListener("click", async () => { /*...*/ });
    document.getElementById("reset-all-btn").addEventListener("click", async () => { /*...*/ });
});
