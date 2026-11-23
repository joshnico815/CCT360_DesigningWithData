
const api = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";

let players = [];

const playerGrid = document.getElementById("playerGrid");
const refreshBtn = document.getElementById("refreshBtn");

// Format date
function dateText(date) {
  return new Date(date).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

// Change Game Center status
function updateStatus(status) {
  document.getElementById("gameStatus").textContent = status;

  const dot = document.getElementById("statusDot");

  if (status === "LIVE") {
    dot.className = "status-dot live";
  } else if (status === "UPCOMING") {
    dot.className = "status-dot upcoming";
  } else if (status === "FINAL") {
    dot.className = "status-dot final";
  } else {
    dot.className = "status-dot final";
  }
}

// Load data from ESPN
async function loadData() {
  if (refreshBtn.disabled) return;

  refreshBtn.disabled = true;
  refreshBtn.textContent = "Loading...";

  // Load games
  try {
    const response = await fetch(`${api}/scoreboard?limit=100`);

    if (!response.ok) {
      throw new Error("Scoreboard unavailable");
    }

    const data = await response.json();

    await showGames(data.events || []);

  } catch (error) {
    console.log(error);

    updateStatus("UNAVAILABLE");
    document.getElementById("gameMessage").textContent =
      "Could not load game data.";

    document.getElementById("leagueGames").textContent =
      "Could not load NBA games.";
  }

  // Load Raptors players
  try {
    const response = await fetch(`${api}/teams/tor/roster`);

    if (!response.ok) {
      throw new Error("Roster unavailable");
    }

    const data = await response.json();

    players = (data.athletes || []).flatMap(group =>
      group.items || [group]
    ).filter(player => player.id);

    showPlayers();

  } catch (error) {
    console.log(error);
    playerGrid.textContent = "Could not load players.";
  }

  // Update timestamp
  document.getElementById("lastUpdated").textContent =
    new Date().toLocaleTimeString();

  refreshBtn.disabled = false;
  refreshBtn.textContent = "↻ Refresh";
}

// Display games
async function showGames(games) {

  const torontoGame = games.find(game =>
    game.competitions?.[0]?.competitors?.some(
      team => team.team?.abbreviation === "TOR"
    )
  );

  if (torontoGame) {
    showRaptorsGame(torontoGame);
  } else {
    await loadNextGame();
  }

  const otherGames = games.filter(
    game => game !== torontoGame
  ).slice(0, 9);

  const container = document.getElementById("leagueGames");
  container.innerHTML = "";

  if (otherGames.length === 0) {
    container.textContent = "No NBA games found today.";
    return;
  }

  otherGames.forEach(game => {

    const teams = game.competitions?.[0]?.competitors || [];

    if (teams.length < 2) return;

    const away = teams.find(team =>
      team.homeAway === "away"
    ) || teams[0];

    const home = teams.find(team =>
      team.homeAway === "home"
    ) || teams[1];

    const state = game.status?.type?.state || "pre";

    let status = "UPCOMING";

    if (state === "in") status = "LIVE";
    if (state === "post") status = "FINAL";

    const card = document.createElement("div");
    card.className = "league-card";

    const date = document.createElement("small");
    date.textContent = dateText(game.date);

    const awayRow = document.createElement("div");
    awayRow.className = "league-team";

    const awayName = document.createElement("span");
    awayName.textContent = away.team.abbreviation || "AWAY";

    const awayScore = document.createElement("strong");
    awayScore.textContent = state === "pre" ? "--" : away.score ?? "0";
    awayRow.append(awayName, awayScore);

    const homeRow = document.createElement("div");
    homeRow.className = "league-team";

    const homeName = document.createElement("span");
    homeName.textContent = home.team.abbreviation || "HOME";

    const homeScore = document.createElement("strong");
    homeScore.textContent = state === "pre" ? "--" : home.score ?? "0";
    homeRow.append(homeName, homeScore);

    const gameStatus = document.createElement("div");
    gameStatus.className = "league-status";
    gameStatus.textContent = status;

    card.append(date, awayRow, homeRow, gameStatus);
    container.appendChild(card);
  });
}

// Find next Raptors game
async function loadNextGame() {

  try {
    const response = await fetch(`${api}/teams/tor/schedule`);

    if (!response.ok) {
      throw new Error("Schedule unavailable");
    }

    const data = await response.json();

    const nextGame = (data.events || [])
      .filter(game =>
        new Date(game.date) > new Date()
      )
      .sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      )[0];

    if (nextGame) {
      showRaptorsGame(nextGame);
    } else {
      updateStatus("NO GAME");

      document.getElementById("gameMessage").textContent =
        "No upcoming Raptors game found.";

      updateEnergy("pre", 0, 0);
    }

  } catch (error) {
    console.log(error);
    updateStatus("UNAVAILABLE");

    document.getElementById("gameMessage").textContent =
      "Could not load Raptors schedule.";

    updateEnergy("pre", 0, 0);
  }
}

// Display Raptors game
function showRaptorsGame(game) {

  const teams = game.competitions?.[0]?.competitors || [];

  const raptors = teams.find(
    team => team.team?.abbreviation === "TOR"
  );

  const opponent = teams.find(
    team => team.team?.abbreviation !== "TOR"
  );

  if (!raptors || !opponent) {
    updateStatus("NO GAME");
    return;
  }

  const state = game.status?.type?.state || "pre";
  const live = state === "in";
  const final = state === "post";

  const torScore = Number(raptors.score) || 0;
  const oppScore = Number(opponent.score) || 0;

  document.getElementById("raptorsScore").textContent =
    live || final ? torScore : "--";

  document.getElementById("opponentScore").textContent =
    live || final ? oppScore : "--";

  document.getElementById("opponentName").textContent =
    opponent.team.displayName || "Opponent";

  document.getElementById("opponentAbbr").textContent =
    opponent.team.abbreviation || "NBA";

  const logo = opponent.team.abbreviation?.toLowerCase() || "nba";

  document.getElementById("opponentLogo").src =
    `https://a.espncdn.com/i/teamlogos/nba/500/${logo}.png`;

  document.getElementById("gameDate").textContent =
    dateText(game.date);

  // Update status and blinking dot
  if (live) {
    updateStatus("LIVE");
  } else if (final) {
    updateStatus("FINAL");
  } else {
    updateStatus("UPCOMING");
  }

  document.getElementById("gameClock").textContent =
    live
      ? (game.status.displayClock || "In progress")
      : dateText(game.date);

  document.getElementById("gamePeriod").textContent =
    live ? "LIVE" : final ? "FINAL SCORE" : "NEXT GAME";

  document.getElementById("gameMessage").textContent =
    live ? "The Raptors are playing!" :
    final ? "Game completed." :
    "The Raptors' next matchup.";

  updateEnergy(state, torScore, oppScore);
}

// Raptors performance meter
function updateEnergy(state, torScore, oppScore) {

  let energy = 25;
  let title = "READY FOR THE GAME";
  let description = "Waiting for the next game.";

  if (state === "in" || state === "post") {

    const difference = torScore - oppScore;

    if (difference > 10) {
      energy = 90;
    } else if (difference >= 0) {
      energy = 65;
    } else if (difference >= -10) {
      energy = 40;
    } else {
      energy = 15;
    }

    if (difference > 0) {
      title = "RAPTORS AHEAD";
    } else if (difference < 0) {
      title = "RAPTORS BEHIND";
    } else {
      title = "TIED GAME";
    }

    description = "Score difference: " + difference;
  }

  document.getElementById("energyBar").style.width =
    energy + "%";

  document.getElementById("energyValue").textContent =
    energy + "%";

  document.getElementById("energyTitle").textContent = title;

  document.getElementById("energyDescription").textContent =
    description;
}

// Display Raptors players
function showPlayers() {

  const filter = document.getElementById("positionFilter").value;

  const filtered = players.filter(player =>
    filter === "all" ||
    (player.position?.abbreviation || "").includes(filter)
  );

  playerGrid.innerHTML = "";

  if (filtered.length === 0) {
    playerGrid.textContent = "No players found.";
    return;
  }

  filtered.forEach(player => {

    const card = document.createElement("div");
    card.className = "player-card";

    const photo = document.createElement("img");

    photo.src = player.headshot?.href ||
      "https://a.espncdn.com/i/teamlogos/nba/500/tor.png";

    photo.alt = player.displayName || "Player";

    const name = document.createElement("h3");
    name.textContent = player.displayName || "Player";

    const info = document.createElement("p");

    info.textContent =
      `#${player.jersey || "--"} · ${player.position?.abbreviation || "NBA"}`;

    const hint = document.createElement("small");
    hint.textContent = "View player →";

    card.append(photo, name, info, hint);

    card.addEventListener("click", function() {
      selectPlayer(player, card);
    });

    playerGrid.appendChild(card);
  });
}

// Player spotlight
function selectPlayer(player, card) {

  document.getElementById("spotlightName").textContent =
    player.displayName || "Player";

  document.getElementById("spotlightDetails").textContent =
    `${player.position?.displayName || "Basketball Player"} · Toronto Raptors`;

  document.getElementById("spotlightNumber").textContent =
    `JERSEY #${player.jersey || "--"}`;

  document.getElementById("spotlightImage").src =
    player.headshot?.href ||
    "https://a.espncdn.com/i/teamlogos/nba/500/tor.png";

  document.querySelectorAll(".player-card").forEach(item => {
    item.classList.remove("selected");
  });

  card.classList.add("selected");

  document.getElementById("spotlight").scrollIntoView({
    behavior: "smooth"
  });
}

// Refresh button
refreshBtn.addEventListener("click", loadData);

// Player filter
document.getElementById("positionFilter").addEventListener(
  "change",
  showPlayers
);

// Load data when website opens
loadData();

// Refresh every minute
setInterval(loadData, 60000);
