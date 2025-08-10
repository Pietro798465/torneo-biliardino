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
        startScreen.style.display = 'none';
        splashScreen.style.display = 'flex';
        if (logoSound) {
            logoSound.volume = 0.5;
            logoSound.play().catch(e => console.error("Audio logo bloccato", e));
        }
    }, { once: true });

    if (logoSound) {
        logoSound.onended = () => {
            if (backgroundMusic) {
                backgroundMusic.volume = 0.2;
                backgroundMusic.play().catch(e => console.error("Musica di sottofondo bloccata", e));
            }
        };
    }
    
    splashScreen.addEventListener('animationend', () => {
        splashScreen.style.display = 'none';
    });


    // --- RIFERIMENTI HTML E VARIABILI GLOBALI ---
    const playerForm = document.getElementById('player-form');
    const playersList = document.getElementById('players-list');
    const createTeamsBtn = document.getElementById('create-teams-btn');
    const teamsList = document.getElementById('teams-list');
    const generateRoundRobinBtn = document.getElementById('generate-round-robin-btn');
    const roundRobinMatchesDiv = document.getElementById('round-robin-matches');
    const calculateStandingsBtn = document.getElementById('calculate-standings-btn');
    const standingsTableDiv = document.getElementById('standings-table');
    const generateKnockoutBtn = document.getElementById('generate-knockout-btn');
    const knockoutStageDiv = document.getElementById('knockout-stage');
    
    let localPlayers = [], localTeams = [], localRoundRobinMatches = [], localKnockoutMatches = [];

    // --- SEZIONE GIOCATORI ---
    playerForm.addEventListener('submit', async(e)=>{e.preventDefault();const[t,l,a]=[document.getElementById("player-name").value,document.getElementById("player-skill").value,document.getElementById("player-photo")],n=a.files[0]?await toBase64(a.files[0]):null;await db.collection("players").add({name:t,skill:l,photo:n}),playerForm.reset(),document.getElementById("file-name").textContent="Nessuna foto selezionata"});
    window.deletePlayer=async e=>{confirm("Eliminare questo giocatore?")&&await db.collection("players").doc(e).delete()};
    
    // --- SEZIONE SQUADRE ---
    createTeamsBtn.addEventListener("click",async()=>{const e=localPlayers.filter(e=>"forte"===e.skill),t=localPlayers.filter(e=>"scarso"===e.skill);if(0===e.length||e.length!==t.length)return alert('Numero di "forti" e "scarsi" non valido!');if(confirm("Sei sicuro? Le squadre e le partite esistenti verranno cancellate.")){await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")]),e.sort(()=>.5-Math.random()),t.sort(()=>.5-Math.random());for(let l=0;l<e.length;l++)await db.collection("teams").add({name:`Squadra ${l+1}`,player1:e[l],player2:t[l]})}});
    window.updateTeamName=async(e,t)=>{await db.collection("teams").doc(e).update({name:t})};

    // --- SEZIONE GIRONI ---
    generateRoundRobinBtn.addEventListener("click",async()=>{if(localTeams.length<2)return alert("Crea almeno 2 squadre!");await deleteCollection("roundRobinMatches");let e=[...localTeams];e.length%2!=0&&e.push({id:"BYE"});for(let t=0;t<e.length;t++)for(let l=t+1;l<e.length;l++)"BYE"!==e[t].id&&"BYE"!==e[l].id&&await db.collection("roundRobinMatches").add({teamA:e[t],teamB:e[l],scoreA:null,scoreB:null});alert("Calendario generato!"),calculateStandingsBtn.style.display="block"});
    window.updateScore=async(e,t,l)=>{await db.collection("roundRobinMatches").doc(e).update({[("A"===t?"scoreA":"scoreB")]:parseInt(l)||null})};

    // --- NUOVA SEZIONE FASE FINALE (con logica aggiornata) ---
    generateKnockoutBtn.addEventListener('click', async () => {
        const numQualifiers = 4; // Fisso a 4 squadre per le semifinali
        document.getElementById('num-qualifiers').value = 4; // Aggiorna il campo visivo
        
        const standings = calculateStandings(localTeams, localRoundRobinMatches);
        if (standings.length < numQualifiers) return alert(`Non ci sono abbastanza squadre per le semifinali (servono almeno ${numQualifiers}).`);
        if (!confirm(`Generare le semifinali? Le partite finali esistenti verranno cancellate.`)) return;
        
        await deleteCollection('knockoutMatches');
        
        const qualified = standings.slice(0, numQualifiers);
        const batch = db.batch();

        // Semifinale 1: 1a vs 4a
        const sf1Ref = db.collection('knockoutMatches').doc();
        batch.set(sf1Ref, { round: 1, matchIndex: 0, teamA: qualified[0], teamB: qualified[3], scoreA: null, scoreB: null, id: sf1Ref.id });
        
        // Semifinale 2: 2a vs 3a
        const sf2Ref = db.collection('knockoutMatches').doc();
        batch.set(sf2Ref, { round: 1, matchIndex: 1, teamA: qualified[1], teamB: qualified[2], scoreA: null, scoreB: null, id: sf2Ref.id });

        await batch.commit();
        alert('Tabellone delle semifinali generato!');
    });
    
    window.updateKnockoutScore = async (id, team, score) => {
        await db.collection('knockoutMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null });
    };
    
    // --- FUNZIONI DI RENDER E CALCOLO ---
    function renderPlayers(){playersList.innerHTML="";localPlayers.forEach(e=>{const t=document.createElement("div");t.className="player-item",t.innerHTML=`<img src="${e.photo||"https://via.placeholder.com/50"}" alt="${e.name}"><span>${e.name} (${e.skill})</span><button class="btn-danger" onclick="deletePlayer('${e.id}')">X</button>`,playersList.appendChild(t)})}
    function renderTeams(){teamsList.innerHTML="";localTeams.forEach(t=>{const l=document.createElement("div");l.className="team-item",l.innerHTML=`<input type="text" class="team-name-input" value="${t.name}" onchange="updateTeamName('${t.id}', this.value)"><span>${t.player1.name} & ${t.player2.name}</span>`,teamsList.appendChild(l)})}
    function renderRoundRobinMatches(){roundRobinMatchesDiv.innerHTML="";localRoundRobinMatches.forEach(e=>{const t=document.createElement("div");t.className="match-item",t.innerHTML=`<span>${e.teamA.name}</span><input type="number" value="${e.scoreA??""}" onchange="updateScore('${e.id}', 'A', this.value)"><span class="vs">vs</span><input type="number" value="${e.scoreB??""}" onchange="updateScore('${e.id}', 'B', this.value)"><span>${e.teamB.name}</span>`,roundRobinMatchesDiv.appendChild(t)})}
    
    // --- NUOVO RENDER PER IL TABELLONE FINALE ---
    function renderKnockoutBracket() {
        knockoutStageDiv.innerHTML = '';
        if (localKnockoutMatches.length === 0) return;

        // Semifinali
        const semifinals = localKnockoutMatches.filter(m => m.round === 1).sort((a,b) => a.matchIndex - b.matchIndex);
        const sf1 = semifinals[0], sf2 = semifinals[1];
        
        let sfHTML = '<div class="knockout-round"><h3>Semifinali</h3>';
        if (sf1) sfHTML += createMatchupHTML(sf1);
        if (sf2) sfHTML += createMatchupHTML(sf2);
        sfHTML += '</div>';
        
        // Finale
        const winnerSf1 = sf1 && sf1.scoreA !== null && sf1.scoreB !== null ? (sf1.scoreA > sf1.scoreB ? sf1.teamA : sf1.teamB) : null;
        const winnerSf2 = sf2 && sf2.scoreA !== null && sf2.scoreB !== null ? (sf2.scoreA > sf2.scoreB ? sf2.teamA : sf2.teamB) : null;
        
        let finalHTML = '<div class="knockout-round"><h3>Finale</h3>';
        let finalMatch = localKnockoutMatches.find(m => m.round === 2);
        
        if (winnerSf1 && winnerSf2 && !finalMatch) {
            finalMatch = { round: 2, matchIndex: 0, teamA: winnerSf1, teamB: winnerSf2, scoreA: null, scoreB: null };
            db.collection("knockoutMatches").add(finalMatch).then(docRef => db.collection("knockoutMatches").doc(docRef.id).update({id: docRef.id}));
        }
        
        finalHTML += finalMatch ? createMatchupHTML(finalMatch) : createMatchupHTML({teamA: {name: 'Da definire'}, teamB: {name: 'Da definire'}});
        finalHTML += '</div>';

        knockoutStageDiv.innerHTML = sfHTML + finalHTML;
    }

    function createMatchupHTML(match) {
        const id = match.id || '';
        const scoreA = match.scoreA ?? '';
        const scoreB = match.scoreB ?? '';
        const isWinnerA = match.scoreA !== null && scoreA > scoreB;
        const isWinnerB = match.scoreB !== null && scoreB > scoreA;

        return `
            <div class="knockout-matchup">
                <div class="knockout-team team-a ${isWinnerA ? 'winner' : ''}">
                    <span class="team-name-knockout">${match.teamA.name}</span>
                </div>
                <input type="number" class="score-knockout" value="${scoreA}" ${id ? `onchange="updateKnockoutScore('${id}', 'A', this.value)"` : 'disabled'}>
                <span class="knockout-vs">vs</span>
                <input type="number" class="score-knockout" value="${scoreB}" ${id ? `onchange="updateKnockoutScore('${id}', 'B', this.value)"` : 'disabled'}>
                <div class="knockout-team team-b ${isWinnerB ? 'winner' : ''}">
                    <span class="team-name-knockout">${match.teamB.name}</span>
                </div>
            </div>`;
    }

    // --- NUOVA FUNZIONE DI CALCOLO CLASSIFICA CON SCONTRI DIRETTI ---
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
            const headToHead = matches.find(m => (m.teamA.id === a.id && m.teamB.id === b.id) || (m.teamA.id === b.id && m.teamB.id === a.id));
            if (headToHead && headToHead.scoreA !== headToHead.scoreB) {
                if ((headToHead.teamA.id === a.id && headToHead.scoreA > headToHead.scoreB) || (headToHead.teamB.id === a.id && headToHead.scoreB > headToHead.scoreA)) { a.tieBreakerWin = true; return -1; }
                b.tieBreakerWin = true; return 1;
            }
            const goalDiffA = a.gf - a.gs, goalDiffB = b.gf - b.gs;
            if (goalDiffA !== goalDiffB) return goalDiffB - goalDiffA;
            return b.gf - a.gf;
        });
    }

    calculateStandingsBtn.addEventListener("click",()=>renderStandingsTable(calculateStandings(localTeams,localRoundRobinMatches)));
    function renderStandingsTable(e){let t=`<h3>Classifica Completa</h3><table><thead><tr><th>Pos</th><th>Squadra</th><th>Pt</th><th>V</th><th>P</th><th>S</th><th>GF</th><th>GS</th><th>DR</th></tr></thead><tbody>`;e.forEach((e,l)=>{t+=`<tr><td>${l+1}</td><td>${e.name} ${e.tieBreakerWin?'*':''}</td><td>${e.punti}</td><td>${e.v}</td><td>${e.p}</td><td>${e.s}</td><td>${e.gf}</td><td>${e.gs}</td><td>${e.gf-e.gs}</td></tr>`}),standingsTableDiv.innerHTML=t+"</tbody></table>"}
    
    // --- NUOVA CLASSIFICA LIVE ---
    function updateLiveLeaderboard(standings) {
        const lb = document.getElementById('live-leaderboard'), topList = document.getElementById('top-teams-list'), bottomList = document.getElementById('bottom-teams-list');
        if (standings.length === 0) return lb.style.display = 'none';
        lb.style.display = 'block'; topList.innerHTML = ''; bottomList.innerHTML = '';
        
        const qualificationZone = 4;
        standings.slice(0, qualificationZone).forEach((t, i) => {
            topList.innerHTML += `<li><span><span class="team-pos">${i + 1}.</span> ${t.name} ${t.tieBreakerWin ? '<span class="tie-breaker-star">*</span>':''}</span><span class="team-points">${t.punti} Pt</span></li>`;
        });
        standings.slice(qualificationZone).forEach((t, i) => {
            bottomList.innerHTML += `<li><span><span class="team-pos">${qualificationZone + i + 1}.</span> ${t.name}</span><span class="team-points">${t.punti} Pt</span></li>`;
        });
    }
    
    // --- GESTIONE DATI IN TEMPO REALE ---
    db.collection("players").onSnapshot(e=>{localPlayers=e.docs.map(e=>({id:e.id,...e.data()})),renderPlayers()});
    db.collection("teams").onSnapshot(e=>{localTeams=e.docs.map(e=>({id:e.id,...e.data()})),renderTeams(),updateLiveLeaderboard(calculateStandings(localTeams,localRoundRobinMatches))});
    db.collection("roundRobinMatches").onSnapshot(e=>{localRoundRobinMatches=e.docs.map(e=>({id:e.id,...e.data()})),renderRoundRobinMatches(),updateLiveLeaderboard(calculateStandings(localTeams,localRoundRobinMatches))});
    db.collection("knockoutMatches").onSnapshot(e=>{localKnockoutMatches=e.docs.map(e=>({id:e.id,...e.data()})).sort((a,b)=>a.round-b.round||a.matchIndex-b.matchIndex),renderKnockoutBracket()});

    // --- PANNELLO ADMIN ---
    async function deleteCollection(e){const t=db.batch(),l=await db.collection(e).get();l.docs.forEach(e=>t.delete(e.ref));try{await t.commit()}catch(e){console.error("Errore durante l'eliminazione:",e)}}
    document.getElementById("reset-teams-btn").addEventListener("click",async()=>{confirm("Sei sicuro? Cancellerà squadre e partite.")&&await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])});
    document.getElementById("reset-tournament-btn").addEventListener("click",async()=>{confirm("Sei sicuro? Manterrà solo i giocatori.")&&await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])});
    document.getElementById("reset-all-btn").addEventListener("click",async()=>{confirm("ATTENZIONE! Sei sicuro di CANCELLARE TUTTO?")&&await Promise.all([deleteCollection("players"),deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])});

    // --- UTILITY ---
    const toBase64=e=>new Promise((t,l)=>{const a=new FileReader;a.readAsDataURL(e),a.onload=()=>t(a.result),a.onerror=l});
    document.getElementById("player-photo").addEventListener("change",e=>{document.getElementById("file-name").textContent=e.target.files[0]?.name||"Nessuna foto selezionata"});
});
