// --- AZIONI PRINCIPALI DEI PULSANTI ---
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
