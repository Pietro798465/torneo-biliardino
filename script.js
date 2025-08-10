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

    // --- SEZIONE FASE FINALE ---
    generateKnockoutBtn.addEventListener('click', async () => {
        const numQualifiers = parseInt(document.getElementById('num-qualifiers').value);
        if (numQualifiers < 2 || (numQualifiers & (numQualifiers - 1)) !== 0) return alert("Il numero di squadre qualificate deve essere una potenza di 2 (es. 2, 4, 8...).");
        const standings = calculateStandings(localTeams, localRoundRobinMatches);
        if (standings.length < numQualifiers) return alert(`Non ci sono abbastanza squadre per qualificarne ${numQualifiers}.`);
        if (!confirm(`Generare la fase finale con ${numQualifiers} squadre? Le partite finali esistenti verranno cancellate.`)) return;
        await deleteCollection('knockoutMatches');
        const qualifiedTeams = standings.slice(0, numQualifiers);
        const batch = db.batch();
        for (let i = 0; i < numQualifiers / 2; i++) {
            const matchRef = db.collection('knockoutMatches').doc();
            batch.set(matchRef, {round: 1, matchIndex: i, teamA: qualifiedTeams[i], teamB: qualifiedTeams[numQualifiers - 1 - i], scoreA: null, scoreB: null, id: matchRef.id});
        }
        await batch.commit();
        alert('Tabellone della fase finale generato!');
    });
    window.updateKnockoutScore = async(id, team, score)=>{const docRef=db.collection("knockoutMatches").doc(id),match=(await docRef.get()).data(),isFinalMatch=!localKnockoutMatches.some(m=>m.round===match.round+1);await docRef.update({[team==="A"?"scoreA":"scoreB"]:parseInt(score)||null});const newScoreA="A"===team?parseInt(score):match.scoreA,newScoreB="B"===team?parseInt(score):match.scoreB;if(!isFinalMatch&&null!=newScoreA&&null!=newScoreB){const nextRound=match.round+1,nextMatchIndex=Math.floor(match.matchIndex/2),winner=newScoreA>newScoreB?match.teamA:match.teamB,isTeamA=match.matchIndex%2==0;let nextMatch=localKnockoutMatches.find(m=>m.round===nextRound&&m.matchIndex===nextMatchIndex);nextMatch?await db.collection("knockoutMatches").doc(nextMatch.id).update({[isTeamA?"teamA":"teamB"]:winner}):(nextMatch={round:nextRound,matchIndex:nextMatchIndex,teamA:isTeamA?winner:null,teamB:isTeamA?null:winner,scoreA:null,scoreB:null},await db.collection("knockoutMatches").add(nextMatch))}};
    
    // --- FUNZIONI DI RENDER E CALCOLO ---
    function renderPlayers(){playersList.innerHTML="";localPlayers.forEach(e=>{const t=document.createElement("div");t.className="player-item",t.innerHTML=`<img src="${e.photo||"https://via.placeholder.com/50"}" alt="${e.name}"><span>${e.name} (${e.skill})</span><button class="btn-danger" onclick="deletePlayer('${e.id}')">X</button>`,playersList.appendChild(t)})}
    function renderTeams(){teamsList.innerHTML="";localTeams.forEach(t=>{const l=document.createElement("div");l.className="team-item",l.innerHTML=`<input type="text" class="team-name-input" value="${t.name}" onchange="updateTeamName('${t.id}', this.value)"><span>${t.player1.name} & ${t.player2.name}</span>`,teamsList.appendChild(l)})}
    function renderRoundRobinMatches(){roundRobinMatchesDiv.innerHTML="";localRoundRobinMatches.forEach(e=>{const t=document.createElement("div");t.className="match-item",t.innerHTML=`<span>${e.teamA.name}</span><input type="number" value="${e.scoreA??""}" onchange="updateScore('${e.id}', 'A', this.value)"><span class="vs">vs</span><input type="number" value="${e.scoreB??""}" onchange="updateScore('${e.id}', 'B', this.value)"><span>${e.teamB.name}</span>`,roundRobinMatchesDiv.appendChild(t)})}
    function renderKnockoutBracket(){knockoutStageDiv.innerHTML="";if(0===localKnockoutMatches.length)return;const e={};localKnockoutMatches.forEach(t=>{e[t.round]||(e[t.round]=[]),e[t.round].push(t)});let t=0;e[1]&&e[1].forEach(()=>{t++});const l=t>0?Math.log2(2*t):0;for(let a=1;a<=l;a++){const n=document.createElement("div");n.className="round";const c=a===l?"Finale":a===l-1?"Semifinali":a===l-2?"Quarti":`Turno ${a}`;n.innerHTML=`<h3>${c}</h3>`;for(let o=0;o<Math.pow(2,l-a);o++){const r=(e[a]||[]).find(e=>e.matchIndex===o),d=document.createElement("div");d.className="matchup",r?(d.innerHTML=`<div class="team ${r.scoreA>r.scoreB?"winner":""}"><span class="team-name">${r.teamA?r.teamA.name:"-"}</span><input type="number" class="score" value="${r.scoreA??""}" onchange="updateKnockoutScore('${r.id}', 'A', this.value)"></div><div class="team ${r.scoreB>r.scoreA?"winner":""}"><span class="team-name">${r.teamB?r.teamB.name:"-"}</span><input type="number" class="score" value="${r.scoreB??""}" onchange="updateKnockoutScore('${r.id}', 'B', this.value)"></div>`):(d.innerHTML='<div class="team"><span class="team-name">Da definire</span></div><div class="team"><span class="team-name">Da definire</span></div>'),n.appendChild(d)}knockoutStageDiv.appendChild(n)}}
    
    // --- NUOVA FUNZIONE DI CALCOLO CLASSIFICA CON SCONTRI DIRETTI ---
    function calculateStandings(teams, matches) {
        if (!teams || teams.length === 0) return [];
        const standings = teams.map(t => ({...t, punti: 0, v: 0, p: 0, s: 0, gf: 0, gs: 0, tieBreakerWin: false}));
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

        return standings.sort((a, b) => {
            if (a.punti !== b.punti) return b.punti - a.punti;

            // Logica Scontro Diretto (si applica solo se i punti sono uguali)
            const headToHead = matches.find(m => 
                (m.teamA.id === a.id && m.teamB.id === b.id) || (m.teamA.id === b.id && m.teamB.id === a.id)
            );

            if (headToHead && headToHead.scoreA !== null && headToHead.scoreA !== headToHead.scoreB) {
                if ((headToHead.teamA.id === a.id && headToHead.scoreA > headToHead.scoreB) || (headToHead.teamB.id === a.id && headToHead.scoreB > headToHead.scoreA)) {
                    a.tieBreakerWin = true; return -1; // 'a' vince e va prima
                }
                b.tieBreakerWin = true; return 1; // 'b' vince e va prima
            }

            // Fallback su differenza reti e gol fatti
            const goalDiffA = a.gf - a.gs;
            const goalDiffB = b.gf - b.gs;
            if (goalDiffA !== goalDiffB) return goalDiffB - goalDiffA;
            return b.gf - a.gf;
        });
    }

    calculateStandingsBtn.addEventListener("click",()=>renderStandingsTable(calculateStandings(localTeams,localRoundRobinMatches)));
    function renderStandingsTable(e){let t=`<h3>Classifica Completa</h3><table><thead><tr><th>Pos</th><th>Squadra</th><th>Pt</th><th>V</th><th>P</th><th>S</th><th>GF</th><th>GS</th><th>DR</th></tr></thead><tbody>`;e.forEach((e,l)=>{t+=`<tr><td>${l+1}</td><td>${e.name} ${e.tieBreakerWin?'*':''}</td><td>${e.punti}</td><td>${e.v}</td><td>${e.p}</td><td>${e.s}</td><td>${e.gf}</td><td>${e.gs}</td><td>${e.gf-e.gs}</td></tr>`}),standingsTableDiv.innerHTML=t+"</tbody></table>"}
    function updateLiveLeaderboard(e){const t=document.getElementById("live-leaderboard");if(0===e.length)return void(t.style.display="none");t.style.display="block";const l=document.getElementById("top-teams-list"),a=document.getElementById("bottom-teams-list");l.innerHTML="",a.innerHTML="",e.slice(0,3).forEach((e,t)=>{l.innerHTML+=`<li><span><span class="team-pos">${t+1}.</span> ${e.name} ${e.tieBreakerWin?'<span class="tie-breaker-star">*</span>':''}</span><span class="team-points">${e.punti} Pt</span></li>`}),e.length>3&&e.slice(-3).reverse().forEach((t,l)=>{a.innerHTML+=`<li><span><span class="team-pos">${e.length-l}.</span> ${t.name}</span><span class="team-points">${t.punti} Pt</span></li>`})}
    
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
