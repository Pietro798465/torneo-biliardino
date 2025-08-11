document.addEventListener('DOMContentLoaded', () => {

    // =============================================================================
    // ==    
    window.deletePlayer = async (id) => { if (confirm('Eliminare questo giocatore?')) await db.collection('players').doc(id).delete(); };
    
    createTeamsBtn.addEventListener("click", async CONFIGURAZIONE FIREBASE (NON MODIFICARE)                                ==
    // =============================================================================
    const firebase () => {
        const strong = localPlayers.filter(p => p.skill === 'top_player');
        const weak = localPlayers.filter(p => p.skill === 'player');
        if (strongConfig = {
      apiKey: "AIzaSyDZMPtTfv9cMIM8aznIY.length !== weak.length || strong.length === 0) {
            return alert(`Errore: il4Yggszz0dF-jOo",
      authDomain: "torneo-sotto-le numero di "Top Player" (${strong.length}) e "Player" (${weak.length}) deve essere uguale e maggiore di zero.`);
        }
        if (confirm("Sei sicuro? Le squadre e le partite esistenti verr-stelle.firebaseapp.com",
      projectId: "torneo-sotto-le-stelle",
      storageBucket: "torneo-sotto-le-stelle.appspot.com",
      messagingSenderId: "875733722189",
      appId: "1:875733anno cancellate.")) {
            await Promise.all([deleteCollection("teams"), deleteCollection("roundRobinMatches"), deleteCollection("knockoutMatches")]);
            strong.sort(() => .5 - Math.random());
            weak.722189:web:d48189f50e42914e056804",
      measurementId: "G-D142803XG2sort(() => .5 - Math.random());
            for (let i = 0; i < strong.length; i++) await db.collection("teams").add({ name: `Squadra ${i + 1}`, player1: strong[i], player2: weak[i] });
        }
    });
    
    "
    };

    // Inizializzazione di Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // =============================================================================
    // == RIFERIMENTI Awindow.updateTeamName = async (id, name) => await db.collection('teams').doc(id).update({ name });
    
    generateRoundRobinBtn.addEventListener("click", async () => {
        if (localTeams.length < 2) return alert("Crea almeno 2 squadre!");
        await deleteCollection("roundRobinMatches");
        let teams = [...localTeams];
        if (teams.length % 2 !== GLI ELEMENTI HTML                                          ==
    // =============================================================================
    const startScreen = document0) teams.push({ id: "BYE" });
        for (let i = 0; i.getElementById('start-screen');
    const splashScreen = document.getElementById('splash-screen');
    const logoSound = < teams.length; i++) for (let j = i + 1; j < teams.length; j document.getElementById('logo-sound');
    const backgroundMusic = document.getElementById('background-music');
    const leaderboard =++) if (teams[i].id !== "BYE" && teams[j].id !== "BYE") await db.collection("roundRobinMatches").add({ teamA: teams[i], teamB: teams[j], scoreA: null, scoreB: null });
        alert("Calendario generato!");
        document.getElementById('calculate-standings document.getElementById('live-leaderboard');
    const leaderboardToggle = document.getElementById('leaderboard-toggle');
    const playerForm = document.getElementById('player-form');
    const playersList = document.getElementById('-btn').style.display = "block";
    });
    
    window.updateScore = async (players-list');
    const createTeamsBtn = document.getElementById('create-teams-btn');
    const teamsList = document.getElementById('teams-list');
    const generateRoundRobinBtn = document.getElementById('generate-roundid, team, score) => await db.collection('roundRobinMatches').doc(id).update({ [team ===-robin-btn');
    const roundRobinMatchesDiv = document.getElementById('round-robin-matches');
    const calculateStandingsBtn = document.getElementById('calculate-standings-btn');
    const standingsTableDiv 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null });
    
    const generateKn = document.getElementById('standings-table');
    const generateStandardKnockoutBtn = document.getElementById('generateockoutMatches = async (isRandom) => {
        const numQualifiers = 4;
        const standings-standard-knockout-btn');
    const generateRandomKnockoutBtn = document.getElementById('generate-random-knockout-btn');
    const knockoutStageDiv = document.getElementById('knockout-stage');
 = calculateStandings(localTeams, localRoundRobinMatches);
        if (standings.length < numQualifiers)    
    // Variabili globali
    let localPlayers = [], localTeams = [], localRoundRobinMatches = [], return alert(`Servono almeno ${numQualifiers} squadre per le semifinali.`);
        const message = isRandom ? "Generare semifinali con sorteggio CASUALE?" : "Generare semifinali STANDARD (1ªvs4ª, 2 localKnockoutMatches = [];

    // --- GESTIONE INIZIALE E AUDIO ---
    startScreen.addEventListener('click', () => {
        startScreen.style.display = 'none';
        splashScreen.ªvs3ª)?";
        if (!confirm(message)) return;
        await deleteCollection('knockoutMatches');
        let qualified = standings.slice(0, numQualifiers);
        if (isRandom) qualified.sort(() => 0.5 - Math.random());
        const batch = db.batch();
        const sfstyle.display = 'flex';
        logoSound?.play().catch(e => console.error(e));
    }, { once: true });
    logoSound?.addEventListener('ended', () => backgroundMusic?.play().1Ref = db.collection('knockoutMatches').doc();
        batch.set(sf1Ref, { round: 1, matchIndex: 0, teamA: qualified[0], teamB: qualified[3], scoreA: null, scoreB: null, id: sf1Ref.id });
        const sf2Ref = db.collection('knockcatch(e => console.error(e)));
    splashScreen.addEventListener('animationend', () => splashScreen.style.display = 'none');
    leaderboardToggle?.addEventListener('click', () => leaderboard.classList.toggle('visible'));

    // --- FUNZIONI UTILITY ---
    const toBase64 = f => new Promise((res, rej)outMatches').doc();
        batch.set(sf2Ref, { round: 1, matchIndex: => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res( 1, teamA: qualified[1], teamB: qualified[2], scoreA: null, scoreB: null, id: sf2Ref.id });
        await batch.commit();
        alert('Tabelloner.result); r.onerror = rej; });
    document.getElementById("player-photo").addEventListener("change", e => document.getElementById("file-name").textContent = e.target.files[0]?.name || "Nessuna foto semifinali generato!');
    };
    generateStandardKnockoutBtn.addEventListener('click', () => generateKnockoutMatches(false));
    generateRandomKnockoutBtn.addEventListener('click', () => generateKnock");
    const photoHTML = p => `<img src="${p?.photo || 'https://via.placeholder.com/outMatches(true));
    window.updateKnockoutScore = async (id, team, score) =>50'}" alt="${p?.name || ''}" class="player-photo-icon">`;

    // --- FUNZIONI DI RENDER ---
    function renderPlayers() {
        playersList.innerHTML = "";
        local {
        await db.collection('knockoutMatches').doc(id).update({ [team === 'A' ? 'scorePlayers.forEach(p => {
            const div = document.createElement("div");
            div.className = "player-A' : 'scoreB']: parseInt(score) || null });
        // Logica per creare la finale
        const allMatches = (await db.collection('knockoutMatches').get()).docs.map(d=>d.data());
        const semifinals = allMatches.filter(m => m.round === 1);
        if (semifinals.item";
            div.innerHTML = `${photoHTML(p)}<span>${p.name} (${p.skill === 'top_player' ? 'Top Player' : 'Player'})</span><button class="btn-danger" onclicklength === 2 && semifinals.every(m => m.scoreA !== null && m.scoreB !== null)) {
            if (!allMatches.some(m => m.round === 2)) {
                const winner1="deletePlayer('${p.id}')">X</button>`;
            playersList.appendChild(div);
        });
    }
    
    function renderTeams() {
        teamsList.innerHTML = "";
        localTeams.forEach(t => {
            const div = document.createElement("div");
            div.className = "team-item = semifinals[0].scoreA > semifinals[0].scoreB ? semifinals[0].teamA : semifinals[0].teamB;
                const winner2 = semifinals[1].scoreA > semifinals[1].scoreB ? semifinals";
            div.innerHTML = `<input type="text" class="team-name-input" value="${t.name}" onchange="updateTeamName('${t.id}',this.value)"><div class="team-player-box">${[1].teamA : semifinals[1].teamB;
                const finalMatchRef = db.collection('knockoutMatches').doc();
                await finalMatchRef.set({ round: 2, matchIndex: 0,photoHTML(t.player1)} ${t.player1.name}</div><div class="team-player-box">${photoHTML(t.player2)} ${t.player2.name}</div>`;
            teamsList.appendChild(div);
        });
    }
    
    function renderRoundRobinMatches() {
        roundRobinMatchesDiv.innerHTML = "";
        localRoundRobinMatches.forEach(m => {
            const div = document.createElement("div teamA: winner1, teamB: winner2, scoreA: null, scoreB: null, id: finalMatchRef.id });
            }
        }
    };

    // --- GESTIONE CLASSIFICHE E DATI IN TEMPO REALE ---
    db.collection("players").onSnapshot(s => { localPlayers = s.docs.map(d => ({id: d.id, ...d.data()})); renderPlayers");
            div.className = "match-item";
            const sA = m.scoreA ?? '', sB = m.scoreB ?? '';
            let cA = '', cB = '';
            if (sA !==(); });
    db.collection("teams").onSnapshot(s => { localTeams = s.docs.map(d => ({id: d.id, ...d.data()})); renderTeams(); updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("roundRobinMatches").onSnapshot '' && sB !== '') { if (+sA > +sB) { cA = 'winner'; cB =(s => { localRoundRobinMatches = s.docs.map(d => ({id: d.id, ...d.data()})); renderRoundRobinMatches(); updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("knockoutMatches").onSnapshot(s => { localKnock 'loser'; } else if (+sB > +sA) { cB = 'winner'; cA = 'loser';outMatches = s.docs.map(d => ({id: d.id, ...d.data()})); renderKnockoutBracket(); });
    // ... (Il resto delle funzioni non cambia)
});
