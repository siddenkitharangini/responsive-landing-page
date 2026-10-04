(() => {
  "use strict";

  const WINNING_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  const SCORE_STORAGE_KEY = "tic-tac-toe-scores";
  const boardElement = document.querySelector("#game-board");
  const winningLineOverlay = document.querySelector("#winning-line-overlay");
  const winningLineElement = document.querySelector("#winning-line");
  const cells = Array.from(document.querySelectorAll(".cell"));
  const modeButtons = Array.from(document.querySelectorAll("[data-mode]"));
  const modeTrigger = document.querySelector("#mode-menu-button");
  const modeMenu = document.querySelector("#mode-menu");
  const scoreElements = {
    X: document.querySelector("#score-x"),
    O: document.querySelector("#score-o"),
    draw: document.querySelector("#score-draw"),
  };
  const statusMark = document.querySelector("#status-mark");
  const statusTitle = document.querySelector("#status-title");
  const statusDescription = document.querySelector("#status-description");
  const currentSymbol = document.querySelector("#current-symbol");
  const currentName = document.querySelector("#current-name");
  const playerOLabel = document.querySelector("#player-o-label");
  const roundState = document.querySelector(".round-state");

  let board = Array(9).fill("");
  let currentPlayer = "X";
  let mode = "two-player";
  let isGameOver = false;
  let isComputerThinking = false;
  let computerTimer = null;
  let winningCombination = null;
  const scores = loadScores();
  const winningLineClasses = {
    "0,1,2": "row-top",
    "3,4,5": "row-middle",
    "6,7,8": "row-bottom",
    "0,3,6": "column-left",
    "1,4,7": "column-middle",
    "2,5,8": "column-right",
    "0,4,8": "diagonal-main",
    "2,4,6": "diagonal-reverse",
  };

  function loadScores() {
    const defaults = { X: 0, O: 0, draw: 0 };
    const savedScores = sessionStorage.getItem(SCORE_STORAGE_KEY);

    if (!savedScores) {
      return defaults;
    }

    try {
      const parsedScores = JSON.parse(savedScores);
      return {
        X: Number.isSafeInteger(parsedScores.X) && parsedScores.X >= 0 ? parsedScores.X : 0,
        O: Number.isSafeInteger(parsedScores.O) && parsedScores.O >= 0 ? parsedScores.O : 0,
        draw: Number.isSafeInteger(parsedScores.draw) && parsedScores.draw >= 0 ? parsedScores.draw : 0,
      };
    } catch (error) {
      console.error("Unable to read saved Tic-Tac-Toe scores.", error);
      return defaults;
    }
  }

  function saveScores() {
    sessionStorage.setItem(SCORE_STORAGE_KEY, JSON.stringify(scores));
  }

  function updateScores() {
    scoreElements.X.textContent = String(scores.X);
    scoreElements.O.textContent = String(scores.O);
    scoreElements.draw.textContent = String(scores.draw);
  }

  function updateModeButtons() {
    modeButtons.forEach((button) => {
      const selected = button.dataset.mode === mode;
      if (button.classList.contains("mode-tab")) {
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", String(selected));
      }
    });
    playerOLabel.textContent = mode === "computer" ? "Computer" : "Player O";
  }

  function setStatus(mark, title, description) {
    statusMark.textContent = mark;
    statusMark.classList.toggle("mark-o", mark === "O");
    statusMark.classList.toggle("mark-draw", mark === "—");
    statusTitle.textContent = title;
    statusDescription.textContent = description;
  }

  function updateRoundPanel() {
    currentSymbol.textContent = isGameOver ? (getWinner() || "—") : currentPlayer;
    currentSymbol.classList.toggle("symbol-o", !isGameOver && currentPlayer === "O");
    currentSymbol.classList.toggle("symbol-draw", isGameOver && !getWinner());

    if (!isGameOver) {
      currentName.textContent = mode === "computer" && currentPlayer === "O"
        ? "Computer"
        : `Player ${currentPlayer}`;
      roundState.innerHTML = '<span class="round-state-dot"></span> In play';
      return;
    }

    const winner = getWinner();
    currentName.textContent = winner
      ? (mode === "computer" && winner === "O" ? "Computer wins" : `Player ${winner} wins`)
      : "Round complete";
    roundState.innerHTML = '<span class="round-state-dot"></span> Complete';
  }

  function getWinner(position = board) {
    for (const line of WINNING_LINES) {
      const [first, second, third] = line;
      if (position[first] && position[first] === position[second] && position[first] === position[third]) {
        return position[first];
      }
    }
    return null;
  }

  function updateBoard() {
    cells.forEach((cell, index) => {
      const mark = board[index];
      if (cell.textContent !== mark) {
        cell.replaceChildren();
        if (mark) {
          const symbol = document.createElement("span");
          symbol.textContent = mark;
          cell.append(symbol);
        }
      }
      cell.classList.toggle("mark-x", mark === "X");
      cell.classList.toggle("mark-o", mark === "O");
      cell.classList.toggle("is-winner", Boolean(winningCombination && winningCombination.includes(index)));
      cell.disabled = Boolean(mark) || isGameOver || isComputerThinking;
      cell.setAttribute(
        "aria-label",
        `Row ${Math.floor(index / 3) + 1}, column ${(index % 3) + 1}, ${mark || "empty"}`,
      );
    });

    boardElement.setAttribute(
      "aria-label",
      isComputerThinking ? "Tic-Tac-Toe board, computer is thinking" : "Tic-Tac-Toe board",
    );
    updateWinningLine();
  }

  function updateWinningLine() {
    const directionClasses = Object.values(winningLineClasses);
    if (!winningCombination) {
      winningLineOverlay.classList.remove("is-visible", "winner-x", "winner-o", ...directionClasses);
      return;
    }

    const [firstIndex, , lastIndex] = winningCombination;
    const boardRect = boardElement.getBoundingClientRect();
    const firstRect = cells[firstIndex].getBoundingClientRect();
    const lastRect = cells[lastIndex].getBoundingClientRect();
    const scale = 1000 / boardRect.width;

    winningLineElement.setAttribute(
      "x1",
      String((firstRect.left + firstRect.width / 2 - boardRect.left) * scale),
    );
    winningLineElement.setAttribute(
      "y1",
      String((firstRect.top + firstRect.height / 2 - boardRect.top) * scale),
    );
    winningLineElement.setAttribute(
      "x2",
      String((lastRect.left + lastRect.width / 2 - boardRect.left) * scale),
    );
    winningLineElement.setAttribute(
      "y2",
      String((lastRect.top + lastRect.height / 2 - boardRect.top) * scale),
    );
    winningLineOverlay.classList.remove(...directionClasses);
    winningLineOverlay.classList.add(
      winningLineClasses[winningCombination.join(",")],
      board[winningCombination[0]] === "X" ? "winner-x" : "winner-o",
    );
    winningLineOverlay.classList.add("is-visible");
  }

  function render() {
    updateBoard();
    updateScores();
    updateRoundPanel();
  }

  function finishRound(winner) {
    isGameOver = true;
    isComputerThinking = false;
    winningCombination = winner
      ? WINNING_LINES.find(([first, second, third]) =>
        board[first] && board[first] === board[second] && board[first] === board[third],
      )
      : null;

    if (winner) {
      scores[winner] += 1;
      const winnerName = mode === "computer" && winner === "O" ? "Computer" : `Player ${winner}`;
      setStatus(winner, `${winnerName} Wins!`, "Three in a row. A brilliant finish.");
    } else {
      scores.draw += 1;
      setStatus("—", "It's a Draw!", "No squares left. Ready for another round?");
    }

    saveScores();
    render();
  }

  function playMove(index) {
    if (
      isGameOver ||
      isComputerThinking ||
      board[index] ||
      (mode === "computer" && currentPlayer === "O")
    ) {
      return;
    }

    board[index] = currentPlayer;
    const winner = getWinner();

    if (winner) {
      finishRound(winner);
      return;
    }

    if (board.every(Boolean)) {
      finishRound(null);
      return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";
    render();

    if (mode === "computer" && currentPlayer === "O") {
      scheduleComputerMove();
      return;
    }

    setStatus(currentPlayer, `Player ${currentPlayer}'s turn`, "Choose an open square to make your move.");
  }

  function scheduleComputerMove() {
    isComputerThinking = true;
    setStatus("O", "Computer's turn", "The computer is thinking through its next move.");
    render();

    computerTimer = window.setTimeout(() => {
      computerTimer = null;
      if (isGameOver || mode !== "computer" || currentPlayer !== "O") {
        return;
      }

      const move = findBestMove();
      if (move === -1) {
        finishRound(null);
        return;
      }

      isComputerThinking = false;
      board[move] = "O";
      const winner = getWinner();

      if (winner) {
        finishRound(winner);
      } else if (board.every(Boolean)) {
        finishRound(null);
      } else {
        currentPlayer = "X";
        setStatus("X", "Player X's turn", "Choose an open square to make your move.");
        render();
      }
    }, 500);
  }

  function findBestMove() {
    let bestScore = -Infinity;
    let bestMove = -1;

    board.forEach((cell, index) => {
      if (cell) {
        return;
      }

      board[index] = "O";
      const score = minimax(board, 0, false);
      board[index] = "";

      if (score > bestScore) {
        bestScore = score;
        bestMove = index;
      }
    });

    return bestMove;
  }

  function minimax(position, depth, isMaximizing, alpha = -Infinity, beta = Infinity) {
    const winner = getWinner(position);
    if (winner === "O") {
      return 10 - depth;
    }
    if (winner === "X") {
      return depth - 10;
    }
    if (position.every(Boolean)) {
      return 0;
    }

    if (isMaximizing) {
      let bestScore = -Infinity;
      for (let index = 0; index < position.length; index += 1) {
        if (position[index]) {
          continue;
        }
        position[index] = "O";
        bestScore = Math.max(bestScore, minimax(position, depth + 1, false, alpha, beta));
        position[index] = "";
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) {
          break;
        }
      }
      return bestScore;
    }

    let bestScore = Infinity;
    for (let index = 0; index < position.length; index += 1) {
      if (position[index]) {
        continue;
      }
      position[index] = "X";
      bestScore = Math.min(bestScore, minimax(position, depth + 1, true, alpha, beta));
      position[index] = "";
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) {
        break;
      }
    }
    return bestScore;
  }

  function startNewGame() {
    window.clearTimeout(computerTimer);
    computerTimer = null;
    board = Array(9).fill("");
    currentPlayer = "X";
    isGameOver = false;
    isComputerThinking = false;
    winningCombination = null;
    setStatus("X", "Player X's turn", "Choose an open square to make your move.");
    render();
  }

  function selectMode(nextMode) {
    if (nextMode !== "two-player" && nextMode !== "computer") {
      return;
    }
    if (mode === nextMode) {
      closeModeMenu();
      return;
    }

    mode = nextMode;
    updateModeButtons();
    closeModeMenu();
    startNewGame();
  }

  function closeModeMenu() {
    modeMenu.hidden = true;
    modeTrigger.setAttribute("aria-expanded", "false");
  }

  cells.forEach((cell) => {
    cell.addEventListener("click", () => playMove(Number(cell.dataset.cell)));
  });

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => selectMode(button.dataset.mode));
  });

  modeTrigger.addEventListener("click", () => {
    const isExpanded = modeTrigger.getAttribute("aria-expanded") === "true";
    modeTrigger.setAttribute("aria-expanded", String(!isExpanded));
    modeMenu.hidden = isExpanded;
  });

  modeMenu.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode]");
    if (button) {
      selectMode(button.dataset.mode);
    }
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".mode-picker")) {
      closeModeMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modeMenu.hidden) {
      closeModeMenu();
      modeTrigger.focus();
    }
  });

  window.addEventListener("resize", updateWinningLine);
  document.querySelector("#new-game").addEventListener("click", startNewGame);
  document.querySelector("#reset-score").addEventListener("click", () => {
    scores.X = 0;
    scores.O = 0;
    scores.draw = 0;
    saveScores();
    startNewGame();
  });

  updateModeButtons();
  setStatus("X", "Player X's turn", "Choose an open square to make your move.");
  render();
})();