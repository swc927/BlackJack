const balanceEl = document.getElementById("balance");
const deckSelect = document.getElementById("deckCount");
const topUpBtn = document.getElementById("topUp");
const betInput = document.getElementById("betAmount");
const betPlus = document.getElementById("betPlus");
const betMinus = document.getElementById("betMinus");
const dealBtn = document.getElementById("dealBtn");
const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");
const doubleBtn = document.getElementById("doubleBtn");
const newRoundBtn = document.getElementById("newRoundBtn");
const dealerCardsEl = document.getElementById("dealerCards");
const playerCardsEl = document.getElementById("playerCards");
const dealerTotalEl = document.getElementById("dealerTotal");
const playerTotalEl = document.getElementById("playerTotal");
const msgEl = document.getElementById("message");
const sfxToggle = document.getElementById("sfxToggle");

const sfx = {
  flip: document.getElementById("sfx-flip"),
  chip: document.getElementById("sfx-chip"),
  win: document.getElementById("sfx-win"),
};

// Overlay elements
const overlay = document.getElementById("resultOverlay");
const overlayBtn = document.getElementById("overlayBtn");
const resultTitleEl = document.getElementById("resultTitle");
const resultSubEl = document.getElementById("resultSub");

function showOverlay(kind, title, sub) {
  resultTitleEl.textContent = title;
  resultSubEl.textContent = sub || "";
  overlay.classList.remove("hidden");
  // pulse effect for wins
  if (kind === "win") {
    resultTitleEl.classList.add("pulse");
    burstChips(16);
  } else {
    resultTitleEl.classList.remove("pulse");
  }
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

function burstChips(n) {
  const card = document.querySelector(".result-card");
  if (!card) return;
  const rect = card.getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const dot = document.createElement("div");
    dot.className = "chip-confetti";
    // random horizontal offset within card width
    const x = Math.random() * rect.width - rect.width / 2;
    dot.style.setProperty("--x", fpx(x));
    dot.style.left = "50%";
    dot.style.top = "20%";
    card.appendChild(dot);
    setTimeout(() => dot.remove(), 1200);
  }
}

function fpx(v) {
  return v.toFixed(1) + "px";
}

if (overlayBtn) {
  overlayBtn.addEventListener("click", () => {
    hideOverlay();
    newRound();
  });
}

let balance = 1000;
let shoe = [];
let discard = [];
let playerHand = [];
let dealerHand = [];
let bet = 50;
let roundOver = false;
let canDouble = false;
let holeCardEl = null;
let holeCard = null;

const suits = ["♠", "♥", "♦", "♣"];
const ranks = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

function saveState() {
  localStorage.setItem(
    "bj_swc_state",
    JSON.stringify({
      balance,
      deckCount: Number(deckSelect.value),
      bet: Number(betInput.value),
    })
  );
}
function loadState() {
  try {
    const raw = localStorage.getItem("bj_swc_state");
    if (!raw) return;
    const st = JSON.parse(raw);
    if (typeof st.balance === "number") balance = st.balance;
    if (typeof st.deckCount === "number")
      deckSelect.value = String(st.deckCount);
    if (typeof st.bet === "number") betInput.value = st.bet;
  } catch (e) {}
}

function formatMoney(n) {
  return "$ " + n.toLocaleString("en-SG");
}

function updateUI() {
  balanceEl.textContent = formatMoney(balance);
  dealerTotalEl.textContent = handValue(dealerHand, false);
  playerTotalEl.textContent = handValue(playerHand, true);
  saveState();
}

function playSfx(name) {
  if (!sfxToggle.checked) return;
  try {
    const src = sfx[name];
    if (!src) return;
    // clone to allow overlapping sounds
    const clone = src.cloneNode(true);
    clone.volume = src.volume;
    clone.play().catch(() => {});
  } catch (e) {}
}

function cardValue(rank) {
  if (rank === "A") return 11;
  if (["K", "Q", "J"].includes(rank)) return 10;
  return Number(rank);
}

function buildShoe(decks) {
  const arr = [];
  for (let d = 0; d < decks; d++) {
    for (const s of suits) {
      for (const r of ranks) {
        arr.push({ rank: r, suit: s, value: cardValue(r) });
      }
    }
  }
  return arr;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function needShuffle() {
  return shoe.length < 20; // reshuffle when low
}

function freshShoe() {
  const d = Number(deckSelect.value);
  shoe = shuffle(buildShoe(d));
  discard = [];
}

function makeCardEl(card, faceDown = false) {
  const root = document.createElement("div");
  root.className = "card" + (faceDown ? "" : " flipped");

  const inner = document.createElement("div");
  inner.className = "inner";
  root.appendChild(inner);

  const face = document.createElement("div");
  face.className = "face";
  const pip = document.createElement("div");
  pip.className = "pip";
  const red = card.suit === "♥" || card.suit === "♦";
  if (red) pip.classList.add("red");
  pip.textContent = card.suit;
  // corners
  const tl = document.createElement("div");
  tl.className = "corner tl" + (red ? " red" : "");
  tl.textContent = card.rank + "\n" + card.suit;
  const br = document.createElement("div");
  br.className = "corner br" + (red ? " red" : "");
  br.textContent = card.rank + "\n" + card.suit;

  face.appendChild(pip);
  face.appendChild(tl);
  face.appendChild(br);

  const back = document.createElement("div");
  back.className = "back";

  inner.appendChild(face);
  inner.appendChild(back);

  return root;
}

function dealOne(toEl, toHand, faceDown = false) {
  if (needShuffle()) freshShoe();
  const card = shoe.pop();
  toHand.push(card);
  const el = makeCardEl(card, faceDown);
  toEl.appendChild(el);

  // flip timing for flourish
  setTimeout(() => {
    playSfx("flip");
    if (!faceDown) {
      el.classList.add("flipped");
    } else {
      holeCardEl = el;
      holeCard = card;
    }
  }, 80);
}

function handValue(hand, revealAcesFlexible) {
  // Aces as 11 then drop to 1 if bust
  let total = 0;
  let aces = 0;
  for (const c of hand) {
    total += c.value;
    if (c.rank === "A") aces++;
  }
  while (total > 21 && aces > 0) {
    total -= 10; // treat one ace as 1 instead of 11
    aces--;
  }
  return total;
}

function clearHands() {
  dealerHand.length = 0;
  playerHand.length = 0;
  dealerCardsEl.innerHTML = "";
  playerCardsEl.innerHTML = "";
  dealerTotalEl.textContent = "0";
  playerTotalEl.textContent = "0";
  holeCardEl = null;
  holeCard = null;
}

function setButtons(state) {
  // state: idle, playing, finished
  if (state === "idle") {
    dealBtn.disabled = false;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    doubleBtn.disabled = true;
    newRoundBtn.disabled = true;
  } else if (state === "playing") {
    dealBtn.disabled = true;
    hitBtn.disabled = false;
    standBtn.disabled = false;
    doubleBtn.disabled = !canDouble;
    newRoundBtn.disabled = true;
  } else if (state === "finished") {
    dealBtn.disabled = true;
    hitBtn.disabled = true;
    standBtn.disabled = true;
    doubleBtn.disabled = true;
    newRoundBtn.disabled = false;
  }
}

function resultMessage(txt, colour = "") {
  msgEl.textContent = txt;
  msgEl.classList.remove("big");
  if (colour === "good") {
    msgEl.style.color = "var(--good)";
  } else if (colour === "bad") {
    msgEl.style.color = "var(--bad)";
  } else {
    msgEl.style.color = "var(--muted)";
  }
}

function revealHoleCard() {
  if (holeCardEl) {
    setTimeout(() => {
      holeCardEl.classList.add("flipped");
      playSfx("flip");
    }, 300);
  }
}

function hasBlackjack(hand) {
  return hand.length === 2 && handValue(hand, true) === 21;
}

function payout(mult) {
  const won = Math.round(bet * mult);
  balance += won;
  updateUI();
  if (won > 0) playSfx("win");
}

function startRound() {
  roundOver = false;
  canDouble = true;
  clearHands();
  bet = Math.max(10, Math.floor(Number(betInput.value) || 10));
  betInput.value = bet;

  if (bet > balance) {
    resultMessage("Bet exceeds balance. Top up or lower bet.");
    setButtons("idle");
    return;
  }

  // take bet
  balance -= bet;
  updateUI();
  playSfx("chip");
  resultMessage("Dealing cards...");
  setButtons("playing");

  // initial deal
  setTimeout(() => dealOne(playerCardsEl, playerHand, false), 120);
  setTimeout(() => dealOne(dealerCardsEl, dealerHand, false), 280);
  setTimeout(() => dealOne(playerCardsEl, playerHand, false), 440);
  setTimeout(() => dealOne(dealerCardsEl, dealerHand, true), 600);

  setTimeout(() => {
    updateUI();
    // check for blackjacks
    const playerBJ = hasBlackjack(playerHand);
    const dealerBJ = hasBlackjack(dealerHand);
    if (playerBJ || dealerBJ) {
      revealHoleCard();
      endRoundImmediateBlackjack(playerBJ, dealerBJ);
      return;
    }
    resultMessage("Your move.");
  }, 900);
}

function endRoundImmediateBlackjack(playerBJ, dealerBJ) {
  setTimeout(() => {
    const p = handValue(playerHand, true);
    const d = handValue(dealerHand, true);
    if (playerBJ && dealerBJ) {
      resultMessage("Push. Bet returned.");
      payout(1);
      showOverlay("push", "Push", "Both have blackjack");
    } else if (playerBJ) {
      resultMessage("Blackjack. You win one point five times.", "good");
      payout(2.5);
      showOverlay("win", "Blackjack", "Pays three to two");
    } else if (dealerBJ) {
      resultMessage("Dealer blackjack. You lose.", "bad");
      showOverlay("lose", "Dealer blackjack", "House takes the hand");
    }
    setButtons("finished");
  }, 700);
}

function playerHit() {
  canDouble = false;
  dealOne(playerCardsEl, playerHand, false);
  setTimeout(() => {
    const p = handValue(playerHand, true);
    updateUI();
    if (p > 21) {
      resultMessage("Bust. You lose.", "bad");
      setButtons("finished");
      roundOver = true;
    }
  }, 220);
}

function playerStand() {
  canDouble = false;
  // reveal dealer
  revealHoleCard();
  // dealer draws to 17
  setTimeout(() => dealerPlay(), 600);
}

function dealerPlay() {
  const loop = () => {
    const d = handValue(dealerHand, true);
    updateUI();
    if (d < 17) {
      dealOne(dealerCardsEl, dealerHand, false);
      setTimeout(loop, 450);
    } else {
      finishRound();
    }
  };
  loop();
}

function finishRound() {
  const p = handValue(playerHand, true);
  const d = handValue(dealerHand, true);

  if (d > 21) {
    resultMessage("Dealer bust. You win.", "good");
    msgEl.classList.add("big");
    payout(2);
    showOverlay("win", "You win", "Dealer bust");
  } else if (p > d) {
    resultMessage("You win.", "good");
    msgEl.classList.add("big");
    payout(2);
    showOverlay("win", "You win", "Beats the dealer");
  } else if (p < d) {
    resultMessage("You lose.", "bad");
    msgEl.classList.add("big");
    showOverlay("lose", "You lose", "Better luck next hand");
  } else {
    resultMessage("Push. Bet returned.");
    msgEl.classList.add("big");
    payout(1);
    showOverlay("push", "Push", "Bet returned");
  }
  setButtons("finished");
  roundOver = true;
}

function playerDouble() {
  if (!canDouble) return;
  if (balance < bet) {
    resultMessage("Insufficient balance to double.");
    return;
  }
  // take extra bet
  balance -= bet;
  bet = bet * 2;
  betInput.value = bet;
  updateUI();
  playSfx("chip");
  resultMessage("Double. One card then stand.");
  // deal one card then stand
  dealOne(playerCardsEl, playerHand, false);
  setTimeout(() => {
    const p = handValue(playerHand, true);
    updateUI();
    if (p > 21) {
      resultMessage("Bust. You lose.", "bad");
      setButtons("finished");
      roundOver = true;
      return;
    }
    playerStand();
  }, 320);
}

function newRound() {
  setButtons("idle");
  resultMessage("Place your bet and press Deal");
  clearHands();
}

function adjustBet(delta) {
  const v = Math.max(10, Math.floor(Number(betInput.value || 10) + delta));
  betInput.value = v;
}

topUpBtn.addEventListener("click", () => {
  balance += 1000000;
  updateUI();
  playSfx("chip");
  resultMessage("Balance topped up by 1 million. Hi, millionaire 😝!");
});
betPlus.addEventListener("click", () => adjustBet(10));
betMinus.addEventListener("click", () => adjustBet(-10));
betInput.addEventListener("change", () => {
  let v = Math.max(10, Math.floor(Number(betInput.value) || 10));
  betInput.value = v;
});

dealBtn.addEventListener("click", startRound);
hitBtn.addEventListener("click", playerHit);
standBtn.addEventListener("click", playerStand);
doubleBtn.addEventListener("click", playerDouble);
newRoundBtn.addEventListener("click", newRound);

deckSelect.addEventListener("change", () => {
  freshShoe();
  resultMessage("New shoe prepared.");
});

// When round finishes, enable New round button
const observer = new MutationObserver(() => {
  if (roundOver) {
    newRoundBtn.disabled = false;
  }
});
observer.observe(document.body, { subtree: true, childList: true });

function init() {
  loadState();
  updateUI();
  freshShoe();
  setButtons("idle");
  resultMessage("Place your bet and press Deal");
}
init();
