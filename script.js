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
    
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // =============================================================================
    // == RIFERIMENTI AGLI ELEMENTI HTML                                          ==
    // =============================================================================
    const startScreen = document.getElementById('start-screen');
    const splashScreen = document.getElementById('splash-screen');
    const logoSound = document.getElementById('logo-sound');
    const backgroundMusic = document.getElementById('background-music');
    const playerForm = document.getElementById('player-form');
    const playersList = document.getElementById('players-list');
    const createTeamsBtn = document.getElementById('create-teams-btn');
    const teamsList = document.getElementById('teams-list');
    const generateRoundRobinBtn = document.getElementById('generate-round-robin-btn');
    const roundRobinMatchesDiv = document.getElementById('round-robin-matches');
    const standingsSection = document.getElementById('standings-section');
    const generateStandardKnockoutBtn = document.getElementById('generate-standard-knockout-btn');
    const generateRandomKnockoutBtn = document.getElementById('generate-random-knockout-btn');
    const knockoutStageDiv = document.getElementById('knockout-stage');
    
    let localPlayers = [], localTeams = [], localRoundRobinMatches = [], localKnockoutMatches = [];

    // --- GESTIONE INIZIALE E AUDIO ---
    startScreen.addEventListener('click', () => {
        startScreen.style.display = 'none';
        splashScreen.style.display = 'flex';
        logoSound?.play().catch(e => console.error(e));
    }, { once: true });
    logoSound?.addEventListener('ended', () => backgroundMusic?.play().catch(e => console.error(e)));
    splashScreen.addEventListener('animationend', () => splashScreen.style.display = 'none');

    // --- FUNZIONI UTILITY ---
    const toBase64 = f => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result); r.onerror = rej; });
    document.getElementById("player-photo").addEventListener("change", e => document.getElementById("file-name").textContent = e.target.files[0]?.name || "Nessuna foto");
    const photoHTML = p => `<img src="${p?.photo || 'https://via.placeholder.com/50'}" alt="${p?.name || ''}" class="player-photo-icon">`;

    // --- FUNZIONI DI RENDER (invariate) ---
    function renderPlayers() { /*...*/ }
    function renderTeams() { /*...*/ }
    function renderRoundRobinMatches() { /*...*/ }
    function renderKnockoutBracket() { /*...*/ }
    function createMatchupHTML(m) { /*...*/ }
    function calculateStandings(teams, matches){ /*...*/ }
    function updateStandingsDisplay(standings) { /*...*/ }

    // =============================================================================
    // == LOGICA DI GIOCO CON CONTROLLO PASSWORD                                  ==
    // =============================================================================
    const adminPassword = "55555555";

    function executeAdminAction(confirmationMessage, action) {
        const password = prompt("Inserisci la password amministratore:");
        if (password === adminPassword) {
            if (confirm(confirmationMessage)) {
                action();
            }
        } else if (password !== null) {
            alert("Password errata!");
        }
    }

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

    window.deletePlayer = (id) => {
        executeAdminAction('Sei sicuro di voler eliminare questo giocatore?', async () => {
            await db.collection('players').doc(id).delete();
        });
    };

    createTeamsBtn.addEventListener("click", () => {
        executeAdminAction("Sei sicuro? Le squadre e le partite esistenti verranno cancellate.", async () => {
            const strong = localPlayers.filter(p => p.skill === 'top_player');
            const weak = localPlayers.filter(p => p.skill === 'player');
            if (strong.length !== weak.length || strong.length === 0) {
                return alert(`Errore: il numero di "Top Player" (${strong.length}) e "Player" (${weak.length}) deve essere uguale e maggiore di zero.`);
            }
            await Promise.all([deleteCollection("teams"), deleteCollection("roundRobinMatches"), deleteCollection("knockoutMatches")]);
            strong.sort(() => .5 - Math.random());
            weak.sort(() => .5 - Math.random());
            for (let i = 0; i < strong.length; i++) await db.collection("teams").add({ name: `Squadra ${i + 1}`, player1: strong[i], player2: weak[i] });
            alert("Squadre create con successo!");
        });
    });

    window.updateTeamName = async (id, name) => await db.collection('teams').doc(id).update({ name });
    
    generateRoundRobinBtn.addEventListener("click", () => {
        executeAdminAction("Sei sicuro di voler generare i gironi?", async () => {
            if (localTeams.length < 2) return alert("Crea almeno 2 squadre!");
            await deleteCollection("roundRobinMatches");
            let teams = [...localTeams];
            if (teams.length % 2 !== 0) teams.push({ id: "BYE" });
            for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) if (teams[i].id !== "BYE" && teams[j].id !== "BYE") await db.collection("roundRobinMatches").add({ teamA: teams[i], teamB: teams[j], scoreA: null, scoreB: null });
            alert("Calendario generato!");
            standingsSection.style.display = "block";
        });
    });

    window.updateScore = async (id, team, score) => await db.collection('roundRobinMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null });
    
    const generateKnockoutMatches = (isRandom) => {
        const message = isRandom ? "Generare semifinali con sorteggio CASUALE?" : "Generare semifinali STANDARD (1ªvs4ª, 2ªvs3ª)?";
        executeAdminAction(message, async () => {
            const numQualifiers = 4;
            const standings = calculateStandings(localTeams, localRoundRobinMatches);
            if (standings.length < numQualifiers) return alert(`Servono almeno ${numQualifiers} squadre.`);
            await deleteCollection('knockoutMatches');
            let qualified = standings.slice(0, numQualifiers);
            if (isRandom) qualified.sort(() => 0.5 - Math.random());
            const batch = db.batch();
            const sf1Ref = db.collection('knockoutMatches').doc();
            batch.set(sf1Ref, { round: 1, matchIndex: 0, teamA: qualified[0], teamB: qualified[3], scoreA: null, scoreB: null, id: sf1Ref.id });
            const sf2Ref = db.collection('knockoutMatches').doc();
            batch.set(sf2Ref, { round: 1, matchIndex: 1, teamA: qualified[1], teamB: qualified[2], scoreA: null, scoreB: null, id: sf2Ref.id });
            await batch.commit();
            alert('Tabellone generato!');
        });
    };

    generateStandardKnockoutBtn.addEventListener('click', () => generateKnockoutMatches(false));
    generateRandomKnockoutBtn.addEventListener('click', () => generateKnockoutMatches(true));
    window.updateKnockoutScore = async (id, team, score) => { await db.collection('knockoutMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null }); };

    // --- PANNELLO ADMIN (protetto da password) ---
    async function deleteCollection(name){const batch=db.batch(),snapshot=await db.collection(name).get();snapshot.docs.forEach(doc=>batch.delete(doc.ref));try{await batch.commit()}catch(e){console.error("Errore eliminazione:",e)}}
    document.getElementById("reset-teams-btn").addEventListener("click", () => executeAdminAction("Sei sicuro? Cancellerà squadre e partite.", async () => await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])));
    document.getElementById("reset-tournament-btn").addEventListener("click", () => executeAdminAction("Sei sicuro? Manterrà solo i giocatori.", async () => await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])));
    document.getElementById("reset-all-btn").addEventListener("click", () => executeAdminAction("ATTENZIONE! Sei sicuro di CANCELLARE TUTTO?", async () => await Promise.all([deleteCollection("players"),deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])));

    // --- GESTIONE DATI IN TEMPO REALE ---
    db.collection("players").onSnapshot(s => { localPlayers = s.docs.map(d => ({id: d.id, ...d.data()})); renderPlayers(); });
    db.collection("teams").onSnapshot(s => { localTeams = s.docs.map(d => ({id: d.id, ...d.data()})); renderTeams(); updateStandingsDisplay(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("roundRobinMatches").onSnapshot(s => { localRoundRobinMatches = s.docs.map(d => ({id: d.id, ...d.data()})); renderRoundRobinMatches(); updateStandingsDisplay(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("knockoutMatches").onSnapshot(s => { localKnockoutMatches = s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => a.round - b.round || a.matchIndex - b.matchIndex); renderKnockoutBracket(); });
});


