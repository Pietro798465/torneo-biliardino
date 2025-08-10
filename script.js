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

    // --- NUOVA GESTIONE INIZIALE E AUDIO ---
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
    // --- FINE NUOVA GESTIONE ---


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

    // --- FUNZIONI PRINCIPALI (le lascio compatte perché non sono cambiate) ---
    playerForm.addEventListener('submit', async(e)=>{e.preventDefault();const[t,l,a]=[document.getElementById("player-name").value,document.getElementById("player-skill").value,document.getElementById("player-photo")],n=a.files[0]?await toBase64(a.files[0]):null;await db.collection("players").add({name:t,skill:l,photo:n}),playerForm.reset(),document.getElementById("file-name").textContent="Nessuna foto selezionata"});function renderPlayers(){playersList.innerHTML="",localPlayers.forEach(e=>{const t=document.createElement("div");t.className="player-item",t.innerHTML=`<img src="${e.photo||"https://via.placeholder.com/50"}" alt="${e.name}"><span>${e.name} (${e.skill})</span><button class="btn-danger" onclick="deletePlayer('${e.id}')">X</button>`,playersList.appendChild(t)})}window.deletePlayer=async e=>{confirm("Eliminare questo giocatore?")&&await db.collection("players").doc(e).delete()},createTeamsBtn.addEventListener("click",async()=>{const e=localPlayers.filter(e=>"forte"===e.skill),t=localPlayers.filter(e=>"scarso"===e.skill);if(0===e.length||e.length!==t.length)return alert('Numero di "forti" e "scarsi" non valido!');if(confirm("Sei sicuro? Le squadre e le partite esistenti verranno cancellate.")){await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches")]),e.sort(()=>.5-Math.random()),t.sort(()=>.5-Math.random());for(let l=0;l<e.length;l++)await db.collection("teams").add({name:`Squadra ${l+1}`,player1:e[l],player2:t[l]})}}),window.updateTeamName=async(e,t)=>{await db.collection("teams").doc(e).update({name:t})},generateRoundRobinBtn.addEventListener("click",async()=>{if(localTeams.length<2)return alert("Crea almeno 2 squadre!");await deleteCollection("roundRobinMatches");let e=[...localTeams];e.length%2!=0&&e.push({id:"BYE"});for(let t=0;t<e.length;t++)for(let l=t+1;l<e.length;l++)"BYE"===e[t].id||"BYE"===e[l].id||await db.collection("roundRobinMatches").add({teamA:e[t],teamB:e[l],scoreA:null,scoreB:null});alert("Calendario generato!"),calculateStandingsBtn.style.display="block"}),window.updateScore=async(e,t,l)=>{await db.collection("roundRobinMatches").doc(e).update({[("A"===t?"scoreA":"scoreB")]:parseInt(l)||null})},calculateStandingsBtn.addEventListener("click",()=>renderStandingsTable(calculateStandings(localTeams,localRoundRobinMatches)));function renderStandingsTable(e){let t=`<h3>Classifica Completa</h3><table><tr><th>Pos</th><th>Squadra</th><th>Pt</th><th>V</th><th>P</th><th>S</th><th>GF</th><th>GS</th><th>DR</th></tr>`;e.forEach((e,l)=>{t+=`<tr><td>${l+1}</td><td>${e.name}</td><td>${e.punti}</td><td>${e.v}</td><td>${e.p}</td><td>${e.s}</td><td>${e.gf}</td><td>${e.gs}</td><td>${e.gf-e.gs}</td></tr>`}),standingsTableDiv.innerHTML=t+"</table>"}function updateLiveLeaderboard(e){const t=document.getElementById("live-leaderboard");if(0===e.length)return void(t.style.display="none");t.style.display="block";const l=document.getElementById("top-teams-list"),a=document.getElementById("bottom-teams-list");l.innerHTML="",a.innerHTML="",e.slice(0,3).forEach((e,t)=>{l.innerHTML+=`<li><span><span class="team-pos">${t+1}.</span> ${e.name}</span><span class="team-points">${e.punti} Pt</span></li>`}),e.length>3&&e.slice(-3).reverse().forEach((t,l)=>{a.innerHTML+=`<li><span><span class="team-pos">${e.length-l}.</span> ${t.name}</span><span class="team-points">${t.punti} Pt</span></li>`})}db.collection("players").onSnapshot(e=>{localPlayers=e.docs.map(e=>({id:e.id,...e.data()})),renderPlayers()}),db.collection("teams").onSnapshot(e=>{localTeams=e.docs.map(e=>({id:e.id,...e.data()})),(e=>{teamsList.innerHTML="",e.forEach(e=>{const t=document.createElement("div");t.className="team-item",t.innerHTML=`<input type="text" class="team-name-input" value="${e.name}" onchange="updateTeamName('${e.id}', this.value)"><span>${e.player1.name} & ${e.player2.name}</span>`,teamsList.appendChild(t)})})(localTeams),updateLiveLeaderboard(calculateStandings(localTeams,localRoundRobinMatches))}),db.collection("roundRobinMatches").onSnapshot(e=>{localRoundRobinMatches=e.docs.map(e=>({id:e.id,...e.data()})),(e=>{roundRobinMatchesDiv.innerHTML="",e.forEach(e=>{const t=document.createElement("div");t.className="match-item",t.innerHTML=`<span>${e.teamA.name}</span><input type="number" value="${e.scoreA??""}" onchange="updateScore('${e.id}', 'A', this.value)"><span class="vs">vs</span><input type="number" value="${e.scoreB??""}" onchange="updateScore('${e.id}', 'B', this.value)"><span>${e.teamB.name}</span>`,roundRobinMatchesDiv.appendChild(t)})})(localRoundRobinMatches),updateLiveLeaderboard(calculateStandings(localTeams,localRoundRobinMatches))});async function deleteCollection(e){const t=db.batch(),l=await db.collection(e).get();l.docs.forEach(e=>t.delete(e.ref)),await t.commit()}document.getElementById("reset-teams-btn").addEventListener("click",async()=>{confirm("Sei sicuro? Cancellerà squadre e partite.")&&await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches")])}),document.getElementById("reset-tournament-btn").addEventListener("click",async()=>{confirm("Sei sicuro? Manterrà solo i giocatori.")&&await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches")])}),document.getElementById("reset-all-btn").addEventListener("click",async()=>{confirm("ATTENZIONE! Sei sicuro di CANCELLARE TUTTO?")&&await Promise.all([deleteCollection("players"),deleteCollection("teams"),deleteCollection("roundRobinMatches")])});const toBase64=e=>new Promise((t,l)=>{const a=new FileReader;a.readAsDataURL(e),a.onload=()=>t(a.result),a.onerror=l});document.getElementById("player-photo").addEventListener("change",e=>{document.getElementById("file-name").textContent=e.target.files[0]?.name||"Nessuna foto selezionata"});function calculateStandings(e,t){if(!e||0===e.length)return[];const l=e.map(e=>({...e,punti:0,v:0,p:0,s:0,gf:0,gs:0}));return t.forEach(e=>{if(null!==e.scoreA&&null!==e.scoreB){const t=l.find(t=>t.id===e.teamA.id),a=l.find(t=>t.id===e.teamB.id);t&&(a&&(t.gf+=e.scoreA,t.gs+=e.scoreB,a.gf+=e.scoreB,a.gs+=e.scoreA,e.scoreA>e.scoreB?(t.punti+=3,t.v++,a.s++):e.scoreB>e.scoreA?(a.punti+=3,a.v++,t.s++):(t.punti+=1,a.punti+=1,t.p++,a.p++)))}),l.sort((e,t)=>t.punti-e.punti||t.gf-t.gs-(e.gf-e.gs)||t.gf-e.gf)}

});
