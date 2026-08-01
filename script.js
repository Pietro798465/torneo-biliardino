document.addEventListener('DOMContentLoaded', () => {

    // =============================================================================
    // == CONFIGURAZIONE FIREBASE                                                 ==
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
    const leaderboard = document.getElementById('live-leaderboard');
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
    startScreen?.addEventListener('click', () => {
        startScreen.style.display = 'none';
        if (splashScreen) splashScreen.style.display = 'flex';
        logoSound?.play().catch(e => console.error(e));
    }, { once: true });
    logoSound?.addEventListener('ended', () => backgroundMusic?.play().catch(e => console.error(e)));
    splashScreen?.addEventListener('animationend', () => splashScreen.style.display = 'none');

    // --- FUNZIONE COMPRESSIONE BLINDATA (CON TIMEOUT DI SICUREZZA) ---
    const compressImage = (file) => new Promise((resolve) => {
        if (!file) return resolve(null);
        
        // Se il caricamento impiega più di 2.5 secondi, prosegui senza foto per evitare blocchi
        const timer = setTimeout(() => {
            console.warn("Elaborazione foto scaduta, proseguo senza foto.");
            resolve(null);
        }, 2500);

        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    clearTimeout(timer);
                    try {
                        const canvas = document.createElement('canvas');
                        const MAX_SIZE = 150; // Miniatura 150x150 px super leggera
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > MAX_SIZE) {
                                height = Math.round(height * (MAX_SIZE / width));
                                width = MAX_SIZE;
                            }
                        } else {
                            if (height > MAX_SIZE) {
                                width = Math.round(width * (MAX_SIZE / height));
                                height = MAX_SIZE;
                            }
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.5));
                    } catch (err) {
                        resolve(null);
                    }
                };
                img.onerror = () => { clearTimeout(timer); resolve(null); };
            };
            reader.onerror = () => { clearTimeout(timer); resolve(null); };
        } catch (err) {
            clearTimeout(timer);
            resolve(null);
        }
    });

    document.getElementById("player-photo")?.addEventListener("change", e => {
        const nameSpan = document.getElementById("file-name");
        if (nameSpan) nameSpan.textContent = e.target.files[0]?.name || "Nessuna foto selezionata";
    });

    const photoHTML = p => `<img src="${p?.photo || 'https://placehold.co/50x50/cccccc/ffffff?text=?'}" alt="${p?.name || ''}" class="player-photo-icon">`;

    // --- FUNZIONI DI RENDER ---
    function renderPlayers() {
        if (!playersList) return;
        playersList.innerHTML = "";
        localPlayers.forEach(p => {
            const div = document.createElement("div");
            div.className = "player-item";
            div.innerHTML = `${photoHTML(p)}<span>${p.name || 'Senza Nome'} (${p.skill === 'top_player' ? 'Top Player' : 'Player'})</span><button class="btn-danger" onclick="deletePlayer('${p.id}')">X</button>`;
            playersList.appendChild(div);
        });
    }
    
    function renderTeams() {
        if (!teamsList) return;
        teamsList.innerHTML = "";
        localTeams.forEach(t => {
            const div = document.createElement("div");
            div.className = "team-item";
            div.innerHTML = `<input type="text" class="team-name-input" value="${t.name}" onchange="updateTeamName('${t.id}',this.value)"><div class="team-player-box">${photoHTML(t.player1)} ${t.player1?.name || ''}</div><div class="team-player-box">${photoHTML(t.player2)} ${t.player2?.name || ''}</div>`;
            teamsList.appendChild(div);
        });
    }
    
    function renderRoundRobinMatches() {
        if (!roundRobinMatchesDiv) return;
        roundRobinMatchesDiv.innerHTML = "";
        localRoundRobinMatches.forEach(m => {
            const div = document.createElement("div");
            div.className = "match-item";
            div.innerHTML = createMatchupHTML(m, false);
            roundRobinMatchesDiv.appendChild(div);
        });
    }
    
    function renderKnockoutBracket() {
        if (!knockoutStageDiv) return;
        knockoutStageDiv.innerHTML = "";
        if (localKnockoutMatches.length === 0) return;
        
        let html = '<div class="knockout-round"><h3>Semifinali</h3>';
        localKnockoutMatches.filter(m => m.round === 1).sort((a,b)=>a.matchIndex-b.matchIndex).forEach(sf => {
            html += createMatchupHTML(sf, true);
        });
        html += '</div>';

        const semifinals = localKnockoutMatches.filter(m => m.round === 1);
        const winner1 = semifinals[0] && semifinals[0].scoreA !== null && semifinals[0].scoreB !== null ? (semifinals[0].scoreA > semifinals[0].scoreB ? semifinals[0].teamA : semifinals[0].teamB) : null;
        const winner2 = semifinals[1] && semifinals[1].scoreA !== null && semifinals[1].scoreB !== null ? (semifinals[1].scoreA > semifinals[1].scoreB ? semifinals[1].teamA : semifinals[1].teamB) : null;
        
        html += '<div class="knockout-round"><h3>Finale</h3>';
        let finalMatch = localKnockoutMatches.find(m => m.round === 2);
        
        if (winner1 && winner2 && !finalMatch) {
            finalMatch = { round: 2, matchIndex: 0, teamA: winner1, teamB: winner2, scoreA: null, scoreB: null };
            db.collection("knockoutMatches").add(finalMatch).then(ref => db.collection("knockoutMatches").doc(ref.id).update({ id: ref.id }));
        }
        
        const finalData = finalMatch ? finalMatch : { teamA: { name: "Da definire", player1: {}, player2: {} }, teamB: { name: "Da definire", player1: {}, player2: {} } };
        html += createMatchupHTML(finalData, true);
        html += '</div>';
        
        knockoutStageDiv.innerHTML = html;
    }

    function createMatchupHTML(m, isKnockout = false) {
        const id = m.id || "", sA = m.scoreA ?? "", sB = m.scoreB ?? "";
        const wA = m.scoreA !== null && sA > sB, wB = m.scoreB !== null && sB > sA;
        const cA = wA ? 'winner' : (wB ? 'loser' : '');
        const cB = wB ? 'winner' : (wA ? 'loser' : '');
        const updateFn = isKnockout ? 'updateKnockoutScore' : 'updateScore';

        const desktopHTML = `<div class="match-item-desktop"><div class="team-info team-a">${photoHTML(m.teamA?.player1)}${photoHTML(m.teamA?.player2)}<span>${m.teamA?.name || 'TBD'}</span></div><div class="score-inputs"><input type="number" class="score-input ${cA}" value="${sA}" ${id ? `onchange="${updateFn}('${id}','A',this.value)"` : "disabled"}><span class="vs">vs</span><input type="number" class="score-input ${cB}" value="${sB}" ${id ? `onchange="${updateFn}('${id}','B',this.value)"` : "disabled"}></div><div class="team-info team-b"><span>${m.teamB?.name || 'TBD'}</span>${photoHTML(m.teamB?.player2)}${photoHTML(m.teamB?.player1)}</div></div>`;
        const mobileHTML = `<div class="match-item-mobile"><div class="match-row"><div class="team-details">${photoHTML(m.teamA?.player1)}${photoHTML(m.teamA?.player2)}<span>${m.teamA?.name || 'TBD'}</span></div><input type="number" class="score-input ${cA}" value="${sA}" ${id ? `onchange="${updateFn}('${id}','A',this.value)"` : "disabled"}></div><div class="vs-mobile">vs</div><div class="match-row"><div class="team-details">${photoHTML(m.teamB?.player1)}${photoHTML(m.teamB?.player2)}<span>${m.teamB?.name || 'TBD'}</span></div><input type="number" class="score-input ${cB}" value="${sB}" ${id ? `onchange="${updateFn}('${id}','B',this.value)"` : "disabled"}></div></div>`;
        
        return isKnockout ? `<div class="match-item">${desktopHTML}${mobileHTML}</div>` : desktopHTML + mobileHTML;
    }

    // --- CONTROLLO PASSWORD ---
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

    // --- AGGIUNTA GIOCATORE CON GESTIONE ERRORI BLAINDATA ---
    playerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = playerForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const name = document.getElementById('player-name').value.trim();
            const skill = document.getElementById('player-skill').value;
            const photoInput = document.getElementById('player-photo');
            
            let photoBase64 = null;
            if (photoInput && photoInput.files && photoInput.files[0]) {
                photoBase64 = await compressImage(photoInput.files[0]);
            }

            await db.collection('players').add({
                name: name,
                skill: skill,
                photo: photoBase64
            });

            playerForm.reset();
            const fileNameSpan = document.getElementById('file-name');
            if (fileNameSpan) fileNameSpan.textContent = 'Nessuna foto selezionata';
            alert(`Giocatore "${name}" registrato con successo!`);
        } catch (err) {
            console.error("Errore salvataggio giocatore:", err);
            alert("Errore durante il salvataggio: " + err.message);
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });

    window.deletePlayer = (id) => {
        executeAdminAction('Sei sicuro di voler eliminare questo giocatore?', async () => {
            await db.collection('players').doc(id).delete();
        });
    };

    createTeamsBtn?.addEventListener("click", () => {
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
    
    generateRoundRobinBtn?.addEventListener("click", () => {
        executeAdminAction("Sei sicuro di voler generare i gironi?", async () => {
            if (localTeams.length < 2) return alert("Crea almeno 2 squadre!");
            await deleteCollection("roundRobinMatches");
            let teams = [...localTeams];
            if (teams.length % 2 !== 0) teams.push({ id: "BYE" });
            for (let i = 0; i < teams.length; i++) for (let j = i + 1; j < teams.length; j++) if (teams[i].id !== "BYE" && teams[j].id !== "BYE") await db.collection("roundRobinMatches").add({ teamA: teams[i], teamB: teams[j], scoreA: null, scoreB: null });
            alert("Calendario generato!");
            if (standingsSection) standingsSection.style.display = "block";
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

    generateStandardKnockoutBtn?.addEventListener('click', () => generateKnockoutMatches(false));
    generateRandomKnockoutBtn?.addEventListener('click', () => generateKnockoutMatches(true));
    window.updateKnockoutScore = async (id, team, score) => { await db.collection('knockoutMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null }); };

    // --- GESTIONE CLASSIFICHE ---
    function calculateStandings(teams, matches) {
        if (!teams || teams.length === 0) return [];
        const standings = teams.map(t => ({...t, vittorie: 0, gf: 0, gs: 0, tieBreakerWin: false}));
        matches.forEach(m => {
            if (m.scoreA === null || m.scoreB === null) return;
            const tA = standings.find(t => t.id === m.teamA.id), tB = standings.find(t => t.id === m.teamB.id);
            if (!tA || !tB) return;
            tA.gf += +m.scoreA; tA.gs += +m.scoreB;
            tB.gf += +m.scoreB; tB.gs += +m.scoreA;
            if (+m.scoreA > +m.scoreB) tA.vittorie += 1;
            else if (+m.scoreB > +m.scoreA) tB.vittorie += 1;
        });
        return standings.sort((a, b) => {
            if (a.vittorie !== b.vittorie) return b.vittorie - a.vittorie;
            const h2h = matches.find(m => (m.teamA.id === a.id && m.teamB.id === b.id) || (m.teamA.id === b.id && m.teamB.id === a.id));
            if (h2h && h2h.scoreA !== h2h.scoreB) {
                if ((h2h.teamA.id === a.id && +h2h.scoreA > +h2h.scoreB) || (h2h.teamB.id === a.id && +h2h.scoreB > +h2h.scoreA)) { a.tieBreakerWin = true; return -1; }
                b.tieBreakerWin = true; return 1;
            }
            const gda = a.gf - a.gs, gdb = b.gf - b.gs;
            if (gda !== gdb) return gdb - gda;
            return b.gf - a.gf;
        });
    }
    
    function updateStandingsDisplay(standings) {
        if (!standingsSection) return;
        if (standings.length === 0 || localRoundRobinMatches.length === 0) {
            standingsSection.style.display = 'none';
            return;
        }
        standingsSection.style.display = 'block';
        let tableHTML = `<h3 class="standings-title">🏆 CLASSIFICA GIRONI 🏆</h3><table class="standings-table"><thead><tr><th>Pos</th><th>Squadra</th><th>Vittorie</th><th>GF</th><th>GS</th><th>DR</th></tr></thead><tbody>`;
        standings.forEach((s, i) => {
            tableHTML += `<tr><td>${i + 1}</td><td>${s.name} ${s.tieBreakerWin ? '<span class="tie-breaker-star">*</span>' : ''}</td><td>${s.vittorie}</td><td>${s.gf}</td><td>${s.gs}</td><td>${s.gf - s.gs}</td></tr>`;
        });
        tableHTML += '</tbody></table>';
        standingsSection.innerHTML = tableHTML;
        
        if (leaderboard) {
            leaderboard.innerHTML = `<div id="leaderboard-toggle">🏆</div>` + tableHTML;
            leaderboard.querySelector('#leaderboard-toggle')?.addEventListener('click', () => leaderboard.classList.toggle('visible'));
        }
    }
    
    // --- GESTIONE DATI IN TEMPO REALE ---
    db.collection("players").onSnapshot(s => { localPlayers = s.docs.map(d => ({id: d.id, ...d.data()})); renderPlayers(); });
    db.collection("teams").onSnapshot(s => { localTeams = s.docs.map(d => ({id: d.id, ...d.data()})); renderTeams(); updateStandingsDisplay(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("roundRobinMatches").onSnapshot(s => { localRoundRobinMatches = s.docs.map(d => ({id: d.id, ...d.data()})); renderRoundRobinMatches(); updateStandingsDisplay(calculateStandings(localTeams, localRoundRobinMatches)); });
    db.collection("knockoutMatches").onSnapshot(s => { localKnockoutMatches = s.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => a.round - b.round || a.matchIndex - b.matchIndex); renderKnockoutBracket(); });

    // --- PANNELLO ADMIN (PROTETTO DA PASSWORD) ---
    async function deleteCollection(name) {
        const batch = db.batch();
        const snapshot = await db.collection(name).get();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        try { await batch.commit(); } catch (e) { console.error("Errore eliminazione:", e); }
    }
    document.getElementById("reset-teams-btn")?.addEventListener("click", () => executeAdminAction("Sei sicuro? Cancellerà squadre e partite.", async () => await Promise.all([deleteCollection("teams"), deleteCollection("roundRobinMatches"), deleteCollection("knockoutMatches")])));
    document.getElementById("reset-tournament-btn")?.addEventListener("click", () => executeAdminAction("Sei sicuro? Manterrà solo i giocatori.", async () => await Promise.all([deleteCollection("teams"), deleteCollection("roundRobinMatches"), deleteCollection("knockoutMatches")])));
    document.getElementById("reset-all-btn")?.addEventListener("click", () => executeAdminAction("ATTENZIONE! Sei sicuro di CANCELLARE TUTTO?", async () => await Promise.all([deleteCollection("players"), deleteCollection("teams"), deleteCollection("roundRobinMatches"), deleteCollection("knockoutMatches")])));
});
