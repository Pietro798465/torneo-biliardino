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

    // --- GESTIONE INIZIALE E AUDIO (AL PRIMO CLICK) ---
    const startScreen = document.getElementById('start-screen');
    const splashScreen = document.getElementById('splash-screen');
    const logoSound = document.getElementById('logo-sound');
    const backgroundMusic = document.getElementById('background-music');

    startScreen.addEventListener('click', () => {
        // 1. Nasconde la schermata "Clicca per iniziare"
        startScreen.style.display = 'none';

        // 2. Mostra lo splash screen con il logo (l'animazione CSS parte)
        splashScreen.style.display = 'flex';

        // 3. Fa partire il suono del logo
        if (logoSound) {
            logoSound.volume = 0.5;
            logoSound.play().catch(e => console.error("Audio logo bloccato", e));
        }
    }, { once: true }); // L'evento si attiva una sola volta

    // 4. Quando il suono del logo finisce, fa partire la musica di sottofondo
    if (logoSound) {
        logoSound.onended = () => {
            if (backgroundMusic) {
                backgroundMusic.volume = 0.2;
                backgroundMusic.play().catch(e => console.error("Musica di sottofondo bloccata", e));
            }
        };
    }

    // 5. Nasconde definitivamente lo splash screen dopo l'animazione
    splashScreen.addEventListener('animationend', () => {
        splashScreen.style.display = 'none';
    });
    // --- FINE GESTIONE INIZIALE ---


    // --- RIFERIMENTI HTML E VARIABILI GLOBALI ---
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
        const name = document.getElementById('player-name').value;
        const skill = document.getElementById('player-skill').value;
        const photoInput = document.getElementById('player-photo');
        const photoBase64 = photoInput.files[0] ? await toBase64(photoInput.files[0]) : null;
        
        await db.collection('players').add({ name, skill, photo: photoBase64 });
        playerForm.reset();
        document.getElementById('file-name').textContent = 'Nessuna foto selezionata';
    });
    
    function renderPlayers() {
        playersList.innerHTML = '';
        localPlayers.forEach(player => {
            const div = document.createElement('div');
            div.className = 'player-item';
            div.innerHTML = `<img src="${player.photo || 'https://via.placeholder.com/50'}" alt="${player.name}"><span>${player.name} (${player.skill})</span><button class="btn-danger" onclick="deletePlayer('${player.id}')">X</button>`;
            playersList.appendChild(div);
        });
    }

    window.deletePlayer = async (id) => {
        if (confirm('Eliminare questo giocatore?')) {
            await db.collection('players').doc(id).delete();
        }
    };

    // --- SEZIONE SQUADRE ---
    createTeamsBtn.addEventListener('click', async () => {
        const strong = localPlayers.filter(p => p.skill === 'forte');
        const weak = localPlayers.filter(p => p.skill === 'scarso');
        if (strong.length === 0 || strong.length !== weak.length) {
            return alert('Numero di giocatori "forti" e "scarsi" non è valido o è zero!');
        }
        if (confirm('Sei sicuro? Le squadre e le partite esistenti verranno cancellate.')) {
            await Promise.all([deleteCollection('teams'), deleteCollection('roundRobinMatches')]);
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
            const div = document.createElement('div');
            div.className = 'team-item';
            div.innerHTML = `<input type="text" class="team-name-input" value="${team.name}" onchange="updateTeamName('${team.id}', this.value)"><span>${team.player1.name} & ${team.player2.name}</span>`;
            teamsList.appendChild(div);
        });
    }

    window.updateTeamName = async (id, name) => await db.collection('teams').doc(id).update({ name });

    // --- SEZIONE GIRONI ---
    generateRoundRobinBtn.addEventListener('click', async () => {
        if (localTeams.length < 2) return alert("Crea almeno 2 squadre prima di generare le partite!");
        
        await deleteCollection('roundRobinMatches');
        let teams = [...localTeams];
        if (teams.length % 2 !== 0) teams.push({ id: 'BYE' });
        
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                if (teams[i].id !== 'BYE' && teams[j].id !== 'BYE') {
                    await db.collection('roundRobinMatches').add({ teamA: teams[i], teamB: teams[j], scoreA: null, scoreB: null });
                }
            }
        }
        alert('Calendario generato con successo!');
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

    // --- GESTIONE CLASSIFICHE ---
    function calculateStandings(teams, matches) {
        if (!teams || teams.length === 0) return [];
        const standings = teams.map(t => ({ ...t, punti: 0, v: 0, p: 0, s: 0, gf: 0, gs: 0 }));
        matches.forEach(m => {
            if (m.scoreA === null || m.scoreB === null) return;
            const tA = standings.find(t => t.id === m.teamA.id);
            const tB = standings.find(t => t.id === m.teamB.id);
            if (!tA || !tB) return;

            tA.gf += m.scoreA; tA.gs += m.scoreB;
            tB.gf += m.scoreB; tB.gs += m.scoreA;

            if (m.scoreA > m.scoreB) { tA.punti += 3; tA.v++; tB.s++; }
            else if (m.scoreB > m.scoreA) { tB.punti += 3; tB.v++; tA.s++; }
            else { tA.punti += 1; tB.punti += 1; tA.p++; tB.p++; }
        });
        return standings.sort((a, b) => b.punti - a.punti || (b.gf - b.gs) - (a.gf - a.gs) || b.gf - a.gf);
    }

    calculateStandingsBtn.addEventListener('click', () => renderStandingsTable(calculateStandings(localTeams, localRoundRobinMatches)));

    function renderStandingsTable(standings) {
        let html = `<h3>Classifica Completa</h3><table><thead><tr><th>Pos</th><th>Squadra</th><th>Pt</th><th>V</th><th>P</th><th>S</th><th>GF</th><th>GS</th><th>DR</th></tr></thead><tbody>`;
        standings.forEach((t, i) => {
            html += `<tr><td>${i + 1}</td><td>${t.name}</td><td>${t.punti}</td><td>${t.v}</td><td>${t.p}</td><td>${t.s}</td><td>${t.gf}</td><td>${t.gs}</td><td>${t.gf - t.gs}</td></tr>`;
        });
        standingsTableDiv.innerHTML = html + '</tbody></table>';
    }

    function updateLiveLeaderboard(standings) {
        const lb = document.getElementById('live-leaderboard');
        if (standings.length === 0) { lb.style.display = 'none'; return; }
        
        lb.style.display = 'block';
        const topList = document.getElementById('top-teams-list');
        const bottomList = document.getElementById('bottom-teams-list');
        topList.innerHTML = '';
        bottomList.innerHTML = '';

        standings.slice(0, 3).forEach((t, i) => {
            topList.innerHTML += `<li><span><span class="team-pos">${i + 1}.</span> ${t.name}</span><span class="team-points">${t.punti} Pt</span></li>`;
        });
        if (standings.length > 3) {
            standings.slice(-3).reverse().forEach((t, i) => {
                bottomList.innerHTML += `<li><span><span class="team-pos">${standings.length - i}.</span> ${t.name}</span><span class="team-points">${t.punti} Pt</span></li>`;
            });
        }
    }
    
    // --- GESTIONE DATI IN TEMPO REALE CON FIREBASE ---
    db.collection('players').onSnapshot(snap => {
        localPlayers = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderPlayers();
    });
    db.collection('teams').onSnapshot(snap => {
        localTeams = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderTeams();
        updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches));
    });
    db.collection('roundRobinMatches').onSnapshot(snap => {
        localRoundRobinMatches = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderRoundRobinMatches();
        updateLiveLeaderboard(calculateStandings(localTeams, localRoundRobinMatches));
    });

    // --- PANNELLO DI CONTROLLO ADMIN ---
    async function deleteCollection(collectionName) {
        const batch = db.batch();
        const snapshot = await db.collection(collectionName).get();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }

    document.getElementById('reset-teams-btn').addEventListener('click', async () => {
        if (confirm('Sei sicuro? Cancellerà squadre e partite.')) {
            await Promise.all([deleteCollection('teams'), deleteCollection('roundRobinMatches')]);
        }
    });
    document.getElementById('reset-tournament-btn').addEventListener('click', async () => {
        if (confirm('Sei sicuro? Manterrà solo i giocatori.')) {
            await Promise.all([deleteCollection('teams'), deleteCollection('roundRobinMatches')]);
        }
    });
    document.getElementById('reset-all-btn').addEventListener('click', async () => {
        if (confirm('ATTENZIONE! Sei sicuro di CANCELLARE TUTTO? L\'azione è irreversibile.')) {
            await Promise.all([deleteCollection('players'), deleteCollection('teams'), deleteCollection('roundRobinMatches')]);
        }
    });

    // --- FUNZIONI UTILITY ---
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
    document.getElementById('player-photo').addEventListener('change', (e) => {
        document.getElementById('file-name').textContent = e.target.files[0]?.name || 'Nessuna foto selezionata';
    });
});

