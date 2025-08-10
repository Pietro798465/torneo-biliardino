document.addEventListener('DOMContentLoaded', () => {

    // =============================================================================
    // == CONFIGURAZIONE FIREBASE INSERITA AUTOMATICAMENTE (NON MODIFICARE)       ==
    // =============================================================================
    const firebaseConfig = {
      apiKey: "AIzaSyDZMPtTfv9cMIM8aznIY4Yggszz0dF-jOo",
      authDomain: "torneo-sotto-le-stelle.firebaseapp.com",
      projectId: "torneo-sotto-le-stelle",
      storageBucket: "torneo-sotto-le-stelle.appspot.com", // Corretto per la compatibilità
      messagingSenderId: "875733722189",
      appId: "1:875733722189:web:d48189f50e42914e056804",
      measurementId: "G-D142803XG2"
    };
    // =============================================================================


    // Inizializzazione di Firebase
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // --- GESTIONE SCHERMATA DI AVVIO E SUONI ---
    const splashScreen = document.getElementById('splash-screen');
    splashScreen.addEventListener('animationend', () => {
        splashScreen.style.display = 'none';
    });
    
    // Per far partire l'audio, il browser richiede un click dell'utente.
    // Il primo click in qualsiasi punto della pagina attiverà i suoni.
    const enableAudio = () => {
        const logoSound = document.getElementById('logo-sound');
        const music = document.getElementById('background-music');
        
        if (logoSound && logoSound.paused) {
            logoSound.volume = 0.5;
            logoSound.play().catch(e => console.error("Audio logo bloccato:", e));
        }
        document.getElementById('play-btn').addEventListener('click', () => { 
            if (music) {
                music.volume = 0.2; 
                music.play().catch(e => console.error("Audio musica bloccato:", e));
            }
        });
        document.getElementById('pause-btn').addEventListener('click', () => music.pause());
        
        // Rimuove l'evento per non ripeterlo
        document.body.removeEventListener('click', enableAudio);
    };
    document.body.addEventListener('click', enableAudio);


    // --- RIFERIMENTI AGLI ELEMENTI HTML ---
    const playerForm = document.getElementById('player-form');
    const playersList = document.getElementById('players-list');
    const createTeamsBtn = document.getElementById('create-teams-btn');
    const teamsList = document.getElementById('teams-list');
    const generateRoundRobinBtn = document.getElementById('generate-round-robin-btn');
    const roundRobinMatchesDiv = document.getElementById('round-robin-matches');
    const calculateStandingsBtn = document.getElementById('calculate-standings-btn');
    const standingsTableDiv = document.getElementById('standings-table');
    
    let localPlayers = [], localTeams = [], localRoundRobinMatches = [];

    // --- SEZIONE GIOCATORI ---
    playerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const [playerName, playerSkill, playerPhotoInput] = [document.getElementById('player-name').value, document.getElementById('player-skill').value, document.getElementById('player-photo')];
        const file = playerPhotoInput.files[0];
        let photoBase64 = file ? await toBase64(file) : null;
        
        await db.collection('players').add({ name: playerName, skill: playerSkill, photo: photoBase64 });
        playerForm.reset();
        document.getElementById('file-name').textContent = 'Nessuna foto selezionata';
    });
    
    function renderPlayers() {
        playersList.innerHTML = '';
        localPlayers.forEach(player => {
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-item';
            playerDiv.innerHTML = `<img src="${player.photo || 'https://via.placeholder.com/50'}" alt="${player.name}"><span>${player.name} (${player.skill})</span><button class="btn-danger" onclick="deletePlayer('${player.id}')">X</button>`;
            playersList.appendChild(playerDiv);
        });
    }

    window.deletePlayer = async (id) => {
        if (confirm('Sei sicuro di voler eliminare questo giocatore?')) await db.collection('players').doc(id).delete();
    };

    // --- SEZIONE SQUADRE ---
    createTeamsBtn.addEventListener('click', async () => {
        const strong = localPlayers.filter(p => p.skill === 'forte');
        const weak = localPlayers.filter(p => p.skill === 'scarso');
        if (strong.length === 0 || strong.length !== weak.length) return alert('Errore: il numero di giocatori "forti" e "scarsi" deve essere uguale e maggiore di zero!');
        
        if (confirm('Sei sicuro? Questo cancellerà le squadre e le partite esistenti.')) {
            await deleteCollection('teams');
            await deleteCollection('roundRobinMatches');
            strong.sort(() => 0.5 - Math.random());
            weak.sort(() => 0.5 - Math.random());
            for (let i = 0; i < strong.length; i++) {
                await db.collection('teams').add({ name: `Squadra ${i + 1}`, player1: strong[i], player2: weak[i] });
            }
        }
    });
    
    function renderTeams() {
        teamsList.innerHTML = '';
        localTeams.forEach(team => {
            const teamDiv = document.createElement('div');
            teamDiv.className = 'team-item';
            teamDiv.innerHTML = `<input type="text" class="team-name-input" value="${team.name}" onchange="updateTeamName('${team.id}', this.value)"><span>${team.player1.name} & ${team.player2.name}</span>`;
            teamsList.appendChild(teamDiv);
        });
    }

    window.updateTeamName = async (id, newName) => await db.collection('teams').doc(id).update({ name: newName });

    // --- SEZIONE GIRONI ---
    generateRoundRobinBtn.addEventListener('click', async () => {
        if (localTeams.length < 2) return alert("Servono almeno 2 squadre!");
        await deleteCollection('roundRobinMatches');
        let teams = [...localTeams];
        if (teams.length % 2 !== 0) teams.push({ id: 'BYE' });
        
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                if (teams[i].id === 'BYE' || teams[j].id === 'BYE') continue;
                await db.collection('roundRobinMatches').add({ teamA: teams[i], teamB: teams[j], scoreA: null, scoreB: null });
            }
        }
        alert('Calendario generato!');
        calculateStandingsBtn.style.display = 'block';
    });

    function renderRoundRobinMatches() {
        roundRobinMatchesDiv.innerHTML = '';
        localRoundRobinMatches.forEach(m => {
            const div = document.createElement('div');
            div.className = 'match-item';
            div.innerHTML = `<span>${m.teamA.name}</span><input type="number" value="${m.scoreA ?? ''}" onchange="updateScore('${m.id}', 'A', this.value)"><span class="vs">vs</span><input type="number" value="${m.scoreB ?? ''}" onchange="updateScore('${m.id}', 'B', this.value)"><span>${m.teamB.name}</span>`;
            roundRobinMatchesDiv.appendChild(div);
        });
    }

    window.updateScore = async (id, team, score) => await db.collection('roundRobinMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null });

    // --- CLASSIFICHE ---
    function calculateStandings(teams, matches) {
        if (!teams || !matches) return [];
        const standings = teams.map(t => ({...t, punti: 0, v: 0, p: 0, s: 0, gf: 0, gs: 0}));
        matches.forEach(m => {
            if (m.scoreA === null || m.scoreB === null) return;
            const tA = standings.find(t => t.id === m.teamA.id);
            const tB = standings.find(t => t.id === m.teamB.id);
            if (!tA || !tB) return;
            tA.gf += m.scoreA; tA.gs += m.scoreB; tB.gf += m.scoreB; tB.gs += m.scoreA;
            if (m.scoreA > m.scoreB) { tA.punti += 3; tA.v++; tB.s++; }
            else if (m.scoreB > m.scoreA) { tB.punti += 3; tB.v++; tA.s++; }
            else { tA.punti += 1; tB.punti += 1; tA.p++; tB.p++; }
        });
        return standings.sort((a,b) => b.punti - a.punti || (b.gf - b.gs) - (a.gf - a.gs) || b.gf - a.gf);
    }

    calculateStandingsBtn.addEventListener('click', () => renderStandingsTable(calculateStandings(localTeams, localRoundRobinMatches)));

    function renderStandingsTable(standings) {
        let html = `<h3>Classifica Completa</h3><table><tr><th>Pos</th><th>Squadra</th><th>Pt</th><th>V</th><th>P</th><th>S</th><th>GF</th><th>GS</th><th>DR</th></tr>`;
        standings.forEach((t, i) => { html += `<tr><td>${i+1}</td><td>${t.name}</td><td>${t.punti}</td><td>${t.v}</td><td>${t.p}</td><td>${t.s}</td><td>${t.gf}</td><td>${t.gs}</td><td>${t.gf - t.gs}</td></tr>`; });
        standingsTableDiv.innerHTML = html + '</table>';
    }

    function updateLiveLeaderboard(standings) {
        const lb = document.getElementById('live-leaderboard');
        if (standings.length === 0) { lb.style.display = 'none'; return; }
        lb.style.display = 'block';
        const top = document.getElementById('top-teams-list');
        const bottom = document.getElementById('bottom-teams-list');
        top.innerHTML = ''; bottom.innerHTML = '';
        standings.slice(0, 3).forEach((t, i) => top.innerHTML += `<li><span><span class="team-pos">${i+1}.</span> ${t.name}</span><span class="team-points">${t.punti} Pt</span></li>`);
        if (standings.length > 3) standings.slice(-3).reverse().forEach((t, i) => bottom.innerHTML += `<li><span><span class="team-pos">${standings.length - i}.</span> ${t.name}</span><span class="team-points">${t.punti} Pt</span></li>`);
    }
    
    // --- GESTIONE DATI IN TEMPO REALE CON FIREBASE ---
    db.collection('players').onSnapshot(snap => { localPlayers = snap.docs.map(doc => ({id: doc.id, ...doc.data()})); renderPlayers(); });
    db.collection('teams').onSnapshot(snap => { localTeams = snap.docs.map(doc => ({id: doc.id, ...doc.data()})); renderTeams(); updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection('roundRobinMatches').onSnapshot(snap => { localRoundRobinMatches = snap.docs.map(doc => ({id: doc.id, ...doc.data()})); renderRoundRobinMatches(); updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches)); });

    // --- PANNELLO ADMIN ---
    async function deleteCollection(name) {
        const snap = await db.collection(name).get();
        const batch = db.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
    document.getElementById('reset-teams-btn').addEventListener('click', async () => { if (confirm('Sei sicuro? Cancellerà squadre e partite.')) { await deleteCollection('teams'); await deleteCollection('roundRobinMatches'); location.reload(); }});
    document.getElementById('reset-tournament-btn').addEventListener('click', async () => { if (confirm('Sei sicuro? Manterrà solo i giocatori.')) { await deleteCollection('teams'); await deleteCollection('roundRobinMatches'); location.reload(); }});
    document.getElementById('reset-all-btn').addEventListener('click', async () => { if (confirm('ATTENZIONE MASSIMA! Sei sicuro di cancellare TUTTO?')) { await deleteCollection('players'); await deleteCollection('teams'); await deleteCollection('roundRobinMatches'); location.reload(); }});

    // --- UTILITY ---
    const toBase64 = f => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result); r.onerror = rej; });
    document.getElementById('player-photo').addEventListener('change', (e) => { document.getElementById('file-name').textContent = e.target.files[0]?.name || 'Nessuna foto selezionata'; });
});