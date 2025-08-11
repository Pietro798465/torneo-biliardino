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
        logoSound?.play().catch(e => console.error(e));
    }, { once: true });
    logoSound?.addEventListener('ended', () => backgroundMusic?.play().catch(e => console.error(e)));
    splashScreen.addEventListener('animationend', () => splashScreen.style.display = 'none');
    
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
        return `<div class="knockout-matchup"><div class="knockout-team team-a ${wA ? "winner" : ""}"><span class="team-name-knockout">${photoHTML(m.teamA?.player1)}${photoHTML(m.teamA?.player2)}${m.teamA?.name || 'TBD'}</span></div><input type="number" class="score-knockout" value="${sA}" ${m.id ? `onchange="updateKnockoutScore('${m.id}','A',this.value)"` : "disabled"}><span class="knockout-vs">vs</span><input type="number" class="score-knockout" value="${sB}" ${m.id ? `onchange="updateKnockoutScore('${m.id}','B',this.value)"` : "disabled"}><div class="knockout-team team-b ${wB ? "winner" : ""}"><span class="team-name-knockout">${m.teamB?.name || 'TBD'}${photoHTML(m.teamB?.player2)}${photoHTML(m.teamB?.player1)}</span></div></div>`;
    }

    // --- GESTIONE CLASSIFICHE ---
    function calculateStandings(teams, matches) {
        if (!teams || teams.length === 0) return [];
        const standings = teams.map(t => ({...t, punti: 0, v: 0, p: 0, s: 0, gf: 0, gs: 0, tieBreakerWin: false}));
        matches.forEach(m => {
            if (m.scoreA === null || m.scoreB === null) return;
            const tA = standings.find(t => t.id === m.teamA.id), tB = standings.find(t => t.id === m.teamB.id);
            if (!tA || !tB) return;
            tA.gf += m.scoreA; tA.gs += m.scoreB; tB.gf += m.scoreB; tB.gs += m.scoreA;
            if (m.scoreA > m.scoreB) { tA.punti += 3; tA.v++; tB.s++; }
            else if (m.scoreB > m.scoreA) { tB.punti += 3; tB.v++; tA.s++; }
            else { tA.punti += 1; tB.punti += 1; tA.p++; tB.p++; }
        });
        return standings.sort((a, b) => {
            if (a.punti !== b.punti) return b.punti - a.punti;
            const h2h = matches.find(m => (m.teamA.id === a.id && m.teamB.id === b.id) || (m.teamA.id === b.id && m.teamB.id === a.id));
            if (h2h && h2h.scoreA !== h2h.scoreB) {
                if ((h2h.teamA.id === a.id && h2h.scoreA > h2h.scoreB) || (h2h.teamB.id === a.id && h2h.scoreB > h2h.scoreA)) { a.tieBreakerWin = true; return -1; }
                b.tieBreakerWin = true; return 1;
            }
            const gda = a.gf - a.gs, gdb = b.gf - b.gs;
            return gda !== gdb ? gdb - gda : b.gf - a.gf;
        });
    }
    
    calculateStandingsBtn.addEventListener("click", () => renderStandingsTable(calculateStandings(localTeams, localRoundRobinMatches)));
    
    function renderStandingsTable(standings) {
        let html = `<h3>Classifica Completa</h3><table><thead><tr><th>Pos</th><th>Squadra</th><th>Pt</th><th>V</th><th>P</th><th>S</th><th>GF</th><th>GS</th><th>DR</th></tr></thead><tbody>`;
        standings.forEach((s, i) => {
            html += `<tr><td>${i + 1}</td><td>${s.name} ${s.tieBreakerWin ? "*" : ""}</td><td>${s.punti}</td><td>${s.v}</td><td>${s.p}</td><td>${s.s}</td><td>${s.gf}</td><td>${s.gs}</td><td>${s.gf - s.gs}</td></tr>`;
        });
        standingsTableDiv.innerHTML = html + "</tbody></table>";
    }

    function updateLiveLeaderboard(standings) {
        const topList = document.getElementById("top-teams-list");
        const bottomList = document.getElementById("bottom-teams-list");
        if (!topList || !bottomList) return;
        topList.innerHTML = "";
        bottomList.innerHTML = "";
        const qz = 4;
        standings.slice(0, qz).forEach((s, i) => {
            topList.innerHTML += `<li><span><span class="team-pos">${i + 1}.</span> ${s.name} ${s.tieBreakerWin ? '<span class="tie-breaker-star">*</span>' : ""}</span><span class="team-points">${s.punti} Pt</span></li>`;
        });
        standings.slice(qz).forEach((s, i) => {
            bottomList.innerHTML += `<li><span><span class="team-pos">${qz + i + 1}.</span> ${s.name}</span><span class="team-points">${s.punti} Pt</span></li>`;
        });
    }

    // --- AZIONI DEI PULSANTI ---
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
        if (confirm('Eliminare questo giocatore?')) {
            await db.collection('players').doc(id).delete();
        }
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
            for (let i = 0; i < strong.length; i++) {
                await db.collection("teams").add({ name: `Squadra ${i + 1}`, player1: strong[i], player2: weak[i] });
            }
        }
    });
    
    window.updateTeamName = async (id, name) => {
        await db.collection('teams').doc(id).update({ name });
    };
    
    generateRoundRobinBtn.addEventListener("click", async () => {
        if (localTeams.length < 2) return alert("Crea almeno 2 squadre!");
        await deleteCollection("roundRobinMatches");
        let teams = [...localTeams];
        if (teams.length % 2 !== 0) teams.push({ id: "BYE" });
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                if (teams[i].id !== "BYE" && teams[j].id !== "BYE") {
                    await db.collection("roundRobinMatches").add({ teamA: teams[i], teamB: teams[j], scoreA: null, scoreB: null });
                }
            }
        }
        alert("Calendario generato!");
        calculateStandingsBtn.style.display = "block";
    });
    
    window.updateScore = async (id, team, score) => {
        await db.collection('roundRobinMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null });
    };
    
    generateStandardKnockoutBtn.addEventListener('click', () => generateKnockoutMatches(false));
    generateRandomKnockoutBtn.addEventListener('click', () => generateKnockoutMatches(true));
    
    window.updateKnockoutScore = async (id, team, score) => {
        await db.collection('knockoutMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null });
    };

    // --- GESTIONE DATI IN TEMPO REALE ---
    db.collection("players").onSnapshot(s => { localPlayers = s.docs.map(d => ({id: d.id, ...d.data()})); renderPlayers(); });
    db.collection("teams").onSnapshot(s => { localTeams = s.docs.map(d => ({id: d.id, ...d.data()})); renderTeams(); updateLiveLeaderboard(calculate
