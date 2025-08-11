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
    // ... (il resto dei riferimenti non cambia)
    const teamsList = document.getElementById('teams-list');
    const roundRobinMatchesDiv = document.getElementById('round-robin-matches');
    const knockoutStageDiv = document.getElementById('knockout-stage');
    
    let localPlayers = [], localTeams = [], localRoundRobinMatches = [], localKnockoutMatches = [];

    // --- FUNZIONI UTILITY ---
    const toBase64 = f => new Promise((res, rej) => { const r = new FileReader(); r.readAsDataURL(f); r.onload = () => res(r.result); r.onerror = rej; });
    document.getElementById("player-photo").addEventListener("change", e => { document.getElementById("file-name").textContent = e.target.files[0]?.name || "Nessuna foto selezionata" });
    const photoHTML = (player) => `<img src="${player && player.photo ? player.photo : 'https://via.placeholder.com/50'}" alt="${player ? player.name : ''}" class="player-photo-icon">`;

    // --- SEZIONI GIOCATORI, SQUADRE, GIRONI E FASE FINALE (Logica non cambia, la lascio compatta) ---
    playerForm.addEventListener('submit', async(e)=>{e.preventDefault();const[t,l,a]=[document.getElementById("player-name").value,document.getElementById("player-skill").value,document.getElementById("player-photo")],n=a.files[0]?await toBase64(a.files[0]):null;await db.collection("players").add({name:t,skill:l,photo:n}),playerForm.reset(),document.getElementById("file-name").textContent="Nessuna foto selezionata"});
    window.deletePlayer=async e=>{confirm("Eliminare questo giocatore?")&&await db.collection("players").doc(e).delete()};
    createTeamsBtn.addEventListener("click",async()=>{const e=localPlayers.filter(e=>"top_player"===e.skill),t=localPlayers.filter(e=>"player"===e.skill);if(e.length!==t.length||0===e.length)return alert(`Errore: il numero di "Top Player" (${e.length}) e "Player" (${t.length}) deve essere uguale e maggiore di zero.`);if(confirm("Sei sicuro? Le squadre e le partite esistenti verranno cancellate.")){await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")]),e.sort(()=>.5-Math.random()),t.sort(()=>.5-Math.random());for(let l=0;l<e.length;l++)await db.collection("teams").add({name:`Squadra ${l+1}`,player1:e[l],player2:t[l]})}});
    window.updateTeamName=async(e,t)=>{await db.collection("teams").doc(e).update({name:t})};
    generateRoundRobinBtn.addEventListener("click",async()=>{if(localTeams.length<2)return alert("Crea almeno 2 squadre!");await deleteCollection("roundRobinMatches");let e=[...localTeams];e.length%2!=0&&e.push({id:"BYE"});for(let t=0;t<e.length;t++)for(let l=t+1;l<e.length;l++)"BYE"!==e[t].id&&"BYE"!==e[l].id&&await db.collection("roundRobinMatches").add({teamA:e[t],teamB:e[l],scoreA:null,scoreB:null});alert("Calendario generato!"),calculateStandingsBtn.style.display="block"});
    window.updateScore=async(e,t,l)=>{await db.collection("roundRobinMatches").doc(e).update({[("A"===t?"scoreA":"scoreB")]:parseInt(l)||null})};
    const generateKnockoutMatches=async e=>{const t=4,l=calculateStandings(localTeams,localRoundRobinMatches);if(l.length<t)return alert(`Servono almeno ${t} squadre per le semifinali.`);const a=e?"Generare semifinali con sorteggio CASUALE?":"Generare semifinali STANDARD (1ªvs4ª, 2ªvs3ª)?";if(!confirm(a))return;await deleteCollection("knockoutMatches");let n=l.slice(0,t);e&&n.sort(()=>.5-Math.random());const c=db.batch(),o=db.collection("knockoutMatches").doc();c.set(o,{round:1,matchIndex:0,teamA:n[0],teamB:n[3],scoreA:null,scoreB:null,id:o.id});const r=db.collection("knockoutMatches").doc();c.set(r,{round:1,matchIndex:1,teamA:n[1],teamB:n[2],scoreA:null,scoreB:null,id:r.id}),await c.commit(),alert("Tabellone semifinali generato!")};
    generateStandardKnockoutBtn.addEventListener("click",()=>generateKnockoutMatches(!1));
    generateRandomKnockoutBtn.addEventListener("click",()=>generateKnockoutMatches(!0));
    window.updateKnockoutScore=async(e,t,l)=>{await db.collection("knockoutMatches").doc(e).update({[("A"===t?"scoreA":"scoreB")]:parseInt(l)||null})};

    // --- FUNZIONI DI RENDER (con il nuovo layout gironi) ---
    function renderPlayers(){playersList.innerHTML="";localPlayers.forEach(p=>{const d=document.createElement("div");d.className="player-item";const s=p.skill==="top_player"?"Top Player":"Player";d.innerHTML=`<img src="${p.photo||"https://via.placeholder.com/40x40"}" alt="${p.name}"><span>${p.name} (${s})</span><button class="btn-danger" onclick="deletePlayer('${p.id}')">X</button>`,playersList.appendChild(d)})}
    function renderTeams(){teamsList.innerHTML="";localTeams.forEach(t=>{const d=document.createElement("div");d.className="team-item";d.innerHTML=`<input type="text" class="team-name-input" value="${t.name}" onchange="updateTeamName('${t.id}',this.value)"><div class="team-player-box">${photoHTML(t.player1)} ${t.player1.name}</div><div class="team-player-box">${photoHTML(t.player2)} ${t.player2.name}</div>`,teamsList.appendChild(d)})}
    
    // NUOVA FUNZIONE RENDER GIRONI
    function renderRoundRobinMatches() {
        roundRobinMatchesDiv.innerHTML = "";
        localRoundRobinMatches.forEach(m => {
            const div = document.createElement("div");
            div.className = "match-item";
            const sA=m.scoreA??'',sB=m.scoreB??'';let cA='',cB='';if(sA!==''&&sB!==''){if(+sA>+sB){cA='winner';cB='loser'}else if(+sB>+sA){cB='winner';cA='loser'}}
            
            // Struttura HTML per entrambe le visualizzazioni (Desktop/Mobile)
            // Sarà il CSS a decidere quale mostrare
            div.innerHTML = `
                <!-- Versione Desktop -->
                <div class="team-info team-a">${photoHTML(m.teamA.player1)}${photoHTML(m.teamA.player2)}<span>${m.teamA.name}</span></div>
                <div class="score-inputs">
                    <input type="number" class="score-input ${cA}" value="${sA}" onchange="updateScore('${m.id}','A',this.value)">
                    <span class="vs">vs</span>
                    <input type="number" class="score-input ${cB}" value="${sB}" onchange="updateScore('${m.id}','B',this.value)">
                </div>
                <div class="team-info team-b"><span>${m.teamB.name}</span>${photoHTML(m.teamB.player2)}${photoHTML(m.teamB.player1)}</div>
                
                <!-- Versione Mobile (il CSS gestirà la visibilità) -->
                <div class="match-row"><div class="team-details">${photoHTML(m.teamA.player1)}${photoHTML(m.teamA.player2)}<span>${m.teamA.name}</span></div><input type="number" class="score-input ${cA}" value="${sA}" onchange="updateScore('${m.id}','A',this.value)"></div>
                <div class="vs-mobile">vs</div>
                <div class="match-row"><div class="team-details">${photoHTML(m.teamB.player1)}${photoHTML(m.teamB.player2)}<span>${m.teamB.name}</span></div><input type="number" class="score-input ${cB}" value="${sB}" onchange="updateScore('${m.id}','B',this.value)"></div>
            `;
            roundRobinMatchesDiv.appendChild(div);
        });
    }

    function renderKnockoutBracket(){knockoutStageDiv.innerHTML="";if(localKnockoutMatches.length===0)return;const s=localKnockoutMatches.filter(m=>m.round===1).sort((a,b)=>a.matchIndex-b.matchIndex),m1=s[0],m2=s[1];let html='<div class="knockout-round"><h3>Semifinali</h3>';m1&&(html+=createMatchupHTML(m1)),m2&&(html+=createMatchupHTML(m2)),html+="</div>";const w1=m1&&m1.scoreA!==null&&m1.scoreB!==null?(m1.scoreA>m1.scoreB?m1.teamA:m1.teamB):null,w2=m2&&m2.scoreA!==null&&m2.scoreB!==null?(m2.scoreA>m2.scoreB?m2.teamA:m2.teamB):null;html+='<div class="knockout-round"><h3>Finale</h3>';let finalMatch=localKnockoutMatches.find(m=>m.round===2);w1&&w2&&!finalMatch&&(finalMatch={round:2,matchIndex:0,teamA:w1,teamB:w2,scoreA:null,scoreB:null},db.collection("knockoutMatches").add(finalMatch).then(ref=>db.collection("knockoutMatches").doc(ref.id).update({id:ref.id}))),html+=finalMatch?createMatchupHTML(finalMatch):createMatchupHTML({teamA:{name:"Da definire",player1:{},player2:{}},teamB:{name:"Da definire",player1:{},player2:{}}}),html+="</div>",knockoutStageDiv.innerHTML=html}
    function createMatchupHTML(m){const id=m.id||"",sA=m.scoreA??"",sB=m.scoreB??"",wA=m.scoreA!==null&&sA>sB,wB=m.scoreB!==null&&sB>sA;return`<div class="knockout-matchup"><div class="knockout-team team-a ${wA?"winner":""}"><span class="team-name-knockout">${photoHTML(m.teamA.player1)}${photoHTML(m.teamA.player2)}${m.teamA.name}</span></div><input type="number" class="score-knockout" value="${sA}" ${id?`onchange="updateKnockoutScore('${id}','A',this.value)"`:"disabled"}><span class="knockout-vs">vs</span><input type="number" class="score-knockout" value="${sB}" ${id?`onchange="updateKnockoutScore('${id}','B',this.value)"`:"disabled"}><div class="knockout-team team-b ${wB?"winner":""}"><span class="team-name-knockout">${m.teamB.name}${photoHTML(m.teamB.player2)}${photoHTML(m.teamB.player1)}</span></div></div>`}
    
    // --- GESTIONE CLASSIFICHE E DATI IN TEMPO REALE (invariato) ---
    function calculateStandings(e,t){if(!e||0===e.length)return[];const l=e.map(e=>({...e,punti:0,v:0,p:0,s:0,gf:0,gs:0,tieBreakerWin:!1}));return t.forEach(e=>{if(null!==e.scoreA&&null!==e.scoreB){const t=l.find(t=>t.id===e.teamA.id),a=l.find(t=>t.id===e.teamB.id);t&&a&&(t.gf+=e.scoreA,t.gs+=e.scoreB,a.gf+=e.scoreB,a.gs+=e.scoreA,e.scoreA>e.scoreB?(t.punti+=3,t.v++,a.s++):e.scoreB>e.scoreA?(a.punti+=3,a.v++,t.s++):(t.punti+=1,a.punti+=1,t.p++,a.p++))}}),l.sort((e,l)=>{if(e.punti!==l.punti)return l.punti-e.punti;const a=t.find(t=>(t.teamA.id===e.id&&t.teamB.id===l.id)||(t.teamA.id===l.id&&t.teamB.id===e.id));if(a&&a.scoreA!==a.scoreB)return(a.teamA.id===e.id&&a.scoreA>a.scoreB)||(a.teamB.id===e.id&&a.scoreB>a.scoreA)?(e.tieBreakerWin=!0,-1):(l.tieBreakerWin=!0,1);const n=e.gf-e.gs,c=l.gf-l.gs;return n!==c?c-n:l.gf-e.gf})}
    calculateStandingsBtn.addEventListener("click",()=>renderStandingsTable(calculateStandings(localTeams,localRoundRobinMatches)));
    function renderStandingsTable(standings){let html=`<h3>Classifica Completa</h3><table><thead><tr><th>Pos</th><th>Squadra</th><th>Pt</th><th>V</th><th>P</th><th>S</th><th>GF</th><th>GS</th><th>DR</th></tr></thead><tbody>`;standings.forEach((s,i)=>{html+=`<tr><td>${i+1}</td><td>${s.name} ${s.tieBreakerWin?"*":""}</td><td>${s.punti}</td><td>${s.v}</td><td>${s.p}</td><td>${s.s}</td><td>${s.gf}</td><td>${s.gs}</td><td>${s.gf-s.gs}</td></tr>`}),standingsTableDiv.innerHTML=html+"</tbody></table>"}
    function updateLiveLeaderboard(standings){const lb=document.getElementById("live-leaderboard"),topList=document.getElementById("top-teams-list"),bottomList=document.getElementById("bottom-teams-list");if(standings.length===0)return lb.style.display="none";lb.style.display="block",topList.innerHTML="",bottomList.innerHTML="";const qz=4;standings.slice(0,qz).forEach((s,i)=>{topList.innerHTML+=`<li><span><span class="team-pos">${i+1}.</span> ${s.name} ${s.tieBreakerWin?'<span class="tie-breaker-star">*</span>':""}</span><span class="team-points">${s.punti} Pt</span></li>`}),standings.slice(qz).forEach((s,i)=>{bottomList.innerHTML+=`<li><span><span class="team-pos">${qz+i+1}.</span> ${s.name}</span><span class="team-points">${s.punti} Pt</span></li>`})}
    db.collection("players").onSnapshot(s=>{localPlayers=s.docs.map(d=>({id:d.id,...d.data()})),renderPlayers()});
    db.collection("teams").onSnapshot(s=>{localTeams=s.docs.map(d=>({id:d.id,...d.data()}));renderTeams();updateLiveLeaderboard(calculateStandings(localTeams,localRoundRobinMatches))});
    db.collection("roundRobinMatches").onSnapshot(s=>{localRoundRobinMatches=s.docs.map(d=>({id:d.id,...d.data()}));renderRoundRobinMatches();updateLiveLeaderboard(calculateStandings(localTeams,localRoundRobinMatches))});
    db.collection("knockoutMatches").onSnapshot(s=>{localKnockoutMatches=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.round-b.round||a.matchIndex-b.matchIndex);renderKnockoutBracket()});
    async function deleteCollection(name){const batch=db.batch(),snapshot=await db.collection(name).get();snapshot.docs.forEach(doc=>batch.delete(doc.ref));try{await batch.commit()}catch(e){console.error("Errore eliminazione:",e)}}
    document.getElementById("reset-teams-btn").addEventListener("click",async()=>{confirm("Sei sicuro? Cancellerà squadre e partite.")&&await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])});
    document.getElementById("reset-tournament-btn").addEventListener("click",async()=>{confirm("Sei sicuro? Manterrà solo i giocatori.")&&await Promise.all([deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])});
    document.getElementById("reset-all-btn").addEventListener("click",async()=>{confirm("ATTENZIONE! Sei sicuro di CANCELLARE TUTTO?")&&await Promise.all([deleteCollection("players"),deleteCollection("teams"),deleteCollection("roundRobinMatches"),deleteCollection("knockoutMatches")])});
});
