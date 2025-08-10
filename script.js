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
    const generateStandardKnockoutBtn = document.getElementById('generate-standard-knockout-btn');
    const generateRandomKnockoutBtn = document.getElementById('generate-random-knockout-btn');
    const knockoutStageDiv = document.getElementById('knockout-stage');
    
    let localPlayers = [], localTeams = [], localRoundRobinMatches = [], localKnockoutMatches = [];

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
    window.deletePlayer = async (id) => { if (confirm('Eliminare questo giocatore?')) await db.collection('players').doc(id).delete(); };

    // --- SEZIONE SQUADRE ---
    createTeamsBtn.addEventListener("click", async () => {
        const strong = localPlayers.filter(p => p.skill === 'top_player');
        const weak = localPlayers.filter(p => p.skill === 'player');
        if (strong.length === 0 || strong.length !== weak.length) return alert('Numero di "Top Player" e "Player" non valido!');
        if (confirm("Sei sicuro? Le squadre e le partite esistenti verranno cancellate.")) {
            await Promise.all([deleteCollection("teams"), deleteCollection("roundRobinMatches"), deleteCollection("knockoutMatches")]);
            strong.sort(() => .5 - Math.random());
            weak.sort(() => .5 - Math.random());
            for (let i = 0; i < strong.length; i++) await db.collection("teams").add({ name: `Squadra ${i + 1}`, player1: strong[i], player2: weak[i] });
        }
    });
    window.updateTeamName = async (id, name) => await db.collection('teams').doc(id).update({ name });

    // --- SEZIONE GIRONI ---
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

    // --- FASE FINALE (CON SCELTA DEL METODO) ---
    const generateKnockoutMatches = async (isRandom) => {
        const numQualifiers = 4;
        const standings = calculateStandings(localTeams, localRoundRobinMatches);
        if (standings.length < numQualifiers) return alert(`Servono almeno ${numQualifiers} squadre per le semifinali.`);
        
        const message = isRandom 
            ? "Generare le semifinali con sorteggio CASUALE tra le prime 4?"
            : "Generare le semifinali STANDARD (1ª vs 4ª e 2ª vs 3ª)?";
        if (!confirm(message)) return;

        await deleteCollection('knockoutMatches');
        
        let qualified = standings.slice(0, numQualifiers);
        if (isRandom) {
            qualified.sort(() => 0.5 - Math.random());
        }

        const batch = db.batch();
        const sf1Ref = db.collection('knockoutMatches').doc();
        batch.set(sf1Ref, { round: 1, matchIndex: 0, teamA: qualified[0], teamB: qualified[3], scoreA: null, scoreB: null, id: sf1Ref.id });
        
        const sf2Ref = db.collection('knockoutMatches').doc();
        batch.set(sf2Ref, { round: 1, matchIndex: 1, teamA: qualified[1], teamB: qualified[2], scoreA: null, scoreB: null, id: sf2Ref.id });

        await batch.commit();
        alert('Tabellone semifinali generato!');
    };

    generateStandardKnockoutBtn.addEventListener('click', () => generateKnockoutMatches(false));
    generateRandomKnockoutBtn.addEventListener('click', () => generateKnockoutMatches(true));
    
    window.updateKnockoutScore = async (id, team, score) => await db.collection('knockoutMatches').doc(id).update({ [team === 'A' ? 'scoreA' : 'scoreB']: parseInt(score) || null });

    // --- FUNZIONI DI RENDER E CALCOLO ---
    function renderPlayers(){playersList.innerHTML="";localPlayers.forEach(e=>{const t=document.createElement("div");t.className="player-item";const l=e.skill==="top_player"?"Top Player":"Player";t.innerHTML=`<img src="${e.photo||"https://via.placeholder.com/50"}" alt="${e.name}"><span>${e.name} (${l})</span><button class="btn-danger" onclick="deletePlayer('${e.id}')">X</button>`,playersList.appendChild(t)})}
    function renderTeams(){teamsList.innerHTML="";localTeams.forEach(t=>{const l=document.createElement("div");l.className="team-item",l.innerHTML=`<input type="text" class="team-name-input" value="${t.name}" onchange="updateTeamName('${t.id}', this.value)"><span class="team-players">${t.player1.name} & ${t.player2.name}</span>`,teamsList.appendChild(l)})}
    function renderRoundRobinMatches(){roundRobinMatchesDiv.innerHTML="";localRoundRobinMatches.forEach(e=>{const t=document.createElement("div");t.className="match-item",t.innerHTML=`<span>${e.teamA.name}</span><input type="number" value="${e.scoreA??""}" onchange="updateScore('${e.id}', 'A', this.value)"><span class="vs">vs</span><input type="number" value="${e.scoreB??""}" onchange="updateScore('${e.id}', 'B', this.value)"><span>${e.teamB.name}</span>`,roundRobinMatchesDiv.appendChild(t)})}
    function renderKnockoutBracket(){knockoutStageDiv.innerHTML="";if(0===localKnockoutMatches.length)return;const e=localKnockoutMatches.filter(e=>1===e.round).sort((e,t)=>e.matchIndex-t.matchIndex),t=e[0],l=e[1];let a='<div class="knockout-round"><h3>Semifinali</h3>';t&&(a+=createMatchupHTML(t)),l&&(a+=createMatchupHTML(l)),a+="</div>";const n=t&&null!==t.scoreA&&null!==t.scoreB?t.scoreA>t.scoreB?t.teamA:t.teamB:null,c=l&&null!==l.scoreA&&null!==l.scoreB?l.scoreA>l.scoreB?l.teamA:l.teamB:null;let o='<div class="knockout-round"><h3>Finale</h3>',r=localKnockoutMatches.find(e=>2===e.round);n&&c&&!r&&(r={round:2,matchIndex:0,teamA:n,teamB:c,scoreA:null,scoreB:null},db.collection("knockoutMatches").add(r).then(e=>db.collection("knockoutMatches").doc(e.id).update({id:e.id}))),o+=r?createMatchupHTML(r):createMatchupHTML({teamA:{name:"Da definire"},teamB:{name:"Da definire"}}),o+="</div>",knockoutStageDiv.innerHTML=a+o}
    function createMatchupHTML(e){const t=e.id||"",l=e.scoreA??"",a=e.scoreB??"",n=null!==e.scoreA&&l>a,c=null!==e.scoreB&&a>l;return`<div class="knockout-matchup"><div class="knockout-team team-a ${n?"winner":""}"><span class="team-name-knockout">${e.teamA.name}</span></div><input type="number" class="score-knockout" value="${l}" ${t?`onchange="updateKnockoutScore('${t}', 'A', this.value)"`:"disabled"}><span class="knockout-vs">vs</span><input type="number" class="score-knockout" value="${a}" ${t?`onchange="updateKnockoutScore('${t}', 'B', this.value)"`:"disabled"}><div class="knockout-team team-b ${c?"winner":""}"><span class="team-name-knockout">${e.teamB.name}</span></div></div>`}
    function calculateStandings(e,t){if(!e||0===e.length)return[];const l=e.map(e=>({...e,punti:0,v:0,p:0,s:0,gf:0,gs:0,tieBreakerWin:!1}));return t.forEach(e=>{if(null!==e.scoreA&&null!==e.scoreB){const t=l.find(t=>t.id===e.teamA.id),a=l.find(t=>t.id===e.teamB.id);t&&a&&(t.gf+=e.scoreA,t.gs+=e.scoreB,a.gf+=e.scoreB,a.gs+=e.scoreA,e.scoreA>e.scoreB?(t.punti+=3,t.v++,a.s++):e.scoreB>e.scoreA?(a.punti+=3,a.v++,t.s++):(t.punti+=1,a.punti+=1,t.p++,a.p++))}}),l.sort((e,l)=>{if(e.punti!==l.punti)return l.punti-e.punti;const a=t.find(t=>(t.teamA.id===e.id&&t.teamB.id===l.id)||(t.teamA.id===l.id&&t.teamB.id===e.id));if(a&&a.scoreA!==a.scoreB)return(a.teamA.id===e.id&&a.scoreA>a.scoreB)||(a.teamB.id===e.id&&a.scoreB>a.scoreA)?(e.tieBreakerWin=!0,-1):(l.tieBreakerWin=!0,1);const n=e.gf-e.gs,c=l.gf-l.gs;return n!==c?c-n:l.gf-e.gf})}
    calculateStandingsBtn.addEventListener("click",()=>renderStandingsTable(calculateStandings(localTeams,localRoundRobinMatches)));
    function renderStandingsTable(e){let t=`<h3>Classifica Completa</h3><table><thead><tr><th>Pos</th><th>Squadra</th><th>Pt</th><th>V</th><th>P</th><th>S</th><th>GF</th><th>GS</th><th>DR</th></tr></thead><tbody>`;e.forEach((e,l)=>{t+=`<tr><td>${l+1}</td><td>${e.name} ${e.tieBreakerWin?"*":""}</td><td>${e.punti}</td><td>${e.v}</td><td>${e.p}</td><td>${e.s}</td><td>${e.gf}</td><td>${e.gs}</td><td>${e.gf-e.gs}</td></tr>`}),standingsTableDiv.innerHTML=t+"</tbody></table>"}
    function updateLiveLeaderboard(e){const t=document.getElementById("live-leaderboard"),l=document.getElementById("top-teams-list"),a=document.getElementById("bottom-teams-list");if(0===e.length)return void(t.style.display="none");t.style.display="block",l.innerHTML="",a.innerHTML="";const n=4;e.slice(0,n).forEach((e,t)=>{l.innerHTML+=`<li><span><span class="team-pos">${t+1}.</span> ${e.name} ${e.tieBreakerWin?'<span class="tie-breaker-star">*</span>':""}</span><span class="team-points">${e.punti} Pt</span></li>`}),e.slice(n).forEach((e,t)=>{a.innerHTML+=`<li><span><span class="team-pos">${n+t+1}.</span> ${e.name}</span><span class="team-points">${e.punti} Pt</span></li>`})}
    
    // --- GESTIONE DATI IN TEMPO REALE ---
    db.collection("players").onSnapshot(e=>{localPlayers=e.docs.map(e=>({id:e.id,...e.data()})),renderPlayers()});
    db.collection("teams").onSnapshot(e=>{localTeams=e.docs.map(e=>({id:e.id,...e.data()})),renderTeams(),updateLiveLeaderboard(calculateStandings(localTeams,localRoundRobinMatches))});
    db.collection("roundRobinMatches").onSnapshot(e=>{localRoundRobinMatches=e.docs.map(e=>({id:e.id,...e.data()})),renderRoundRobinMatches(),updateLiveLeaderboard(calculateStandings(localTeams,localRoundRobinMatches))});
    db.collection("knockoutMatches").onSnapshot(e=>{localKnockoutMatches=e.docs.map(e=>({id:e.id,...e.data()})).sort((e,t)=>e.round-t.round||e.matchIndex-t.matchIndex),renderKnockoutBracket()});

    // --- PANNELLO ADMIN ---
    async function deleteCollection(e){const t=db.batch(),l=await db.collection(e).get();l.docs.forEach(e=>t.delete(e.ref));try{await t.commit()}catch(e){console.error("Errore durante l'eliminazione:",e)}}
    document.getElementById("reset-teams-btn").addEventListener("click",async()=>{confirm("Sei sicuro? Cancellerà squadre e partite.")&&await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])});
    document.getElementById("reset-tournament-btn").addEventListener("click",async()=>{confirm("Sei sicuro? Manterrà solo i giocatori.")&&await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])});
    document.getElementById("reset-all-btn").addEventListener("click",async()=>{confirm("ATTENZIONE! Sei sicuro di CANCELLARE TUTTO?")&&await Promise.all([deleteCollection("players"),deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])});

    // --- UTILITY ---
    const toBase64=e=>new Promise((t,l)=>{const a=new FileReader;a.readAsDataURL(e),a.onload=()=>t(a.result),a.onerror=l});
    document.getElementById("player-photo").addEventListener("change",e=>{document.getElementById("file-name").textContent=e.target.files[0]?.name||"Nessuna foto selezionata"});
});
