/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable no-use-before-define */
/* eslint-disable no-console */

const SQUARE = {
  '-2': { color: 'darkred', validSquareColor: 'salmon', direction: 1 },
  '-1': { color: 'red', validSquareColor: 'salmon', direction: 1 },
  0: { color: 'transparent', validSquareColor: 'transparent', direction: 0 },
  1: { color: 'blue', validSquareColor: 'lightblue', direction: -1 },
  2: { color: 'darkblue', validSquareColor: 'lightblue', direction: -1 },
}

const TURN_STATES = {
  selectPiece: 'Select a piece',
  moveTo: 'Where would you like to move the piece',
}
const INITIAL_BOARD_SIZE = 6

/* ----- state variables ----- */
let squares = []
let canMoves = []
let validMovesSquares = []
let playerTurn
let pieceSelected
let pieceSelectedSaved
let pieceSelectedMove
// let pieceSelectedMoveSaved
let turnState
let winner
let canJumpAgain
let numPlayers
let whoWentFirst
let boardRows
let boardColumns
let boardSize
let initialPieces
let opponent
let networkOpponent
let firstNetworkMove

/* ----- cached elements  ----- */
const messageEl = document.getElementById('message')
const message2El = document.getElementById('message2')
const boardEl = document.getElementById('board')
let piecesEl = []
// const buttonsEl = document.querySelector('#buttons')
const twoPlayerBtnEl = document.querySelector('#twoplayer')
const singlePlayerBtnEl = document.querySelector('#playcomputer')
const networkBtnEl = document.querySelector('#network')
const playAgainBtnEl = document.querySelector('#playagain')

const boardSizeSliderContainerEL = document.querySelector('.slidecontainer')
const boardSizeSliderEL = document.querySelector('#myRange')
const boardSizeTextEL = document.querySelector('#boardSizeText')
const titleEl = document.querySelector('#title')

/* ----- socket -----*/
let ws
let wsMessage
// let wsMessages = 'Dope<br/>'
// let wsMessageCnt = 0

const wsGetMessage = () => wsMessage
const wsSetMessage = (msg) => {
  wsMessage = msg
}

const setupWS = async () => {
  ws = new WebSocket('ws://localhost:8082')
  // console.log('before wait')
  // eslint-disable-next-line no-await-in-loop
  while (ws.readyState !== 1) await sleep(100)
  console.log('after wait')

  ws.onopen = () => {
    // console.log('Connected to Server')
    // wsMessages += 'connected<br/>'
    render()
  }

  ws.onmessage = ({ data }) => {
    // console.log('data', data)
    wsMessage = JSON.parse(data)
    // wsMessages += `YOU: ${data}<br/>`
    render()
  }

  ws.onclose = () => {
    ws = null
  }
}

const wsSendMessageNoReply = (message) => {
  wsSendMessage(message)
}

const wsSendMessageWaitReply = async (message) => {
  wsMessage = ''
  wsSendMessage(message)
  // eslint-disable-next-line no-await-in-loop
  while (!wsMessage) await sleep(100)
  return wsMessage
}

const wsSendMessage = (message) => {
  if (ws) {
    ws.send(JSON.stringify(message))
    // wsMessages += `ME: ${++wsMessageCnt}, ${message}<br/>`
    render()
  }
}

/* ----- WebRTC ----- */
/* server */
let webRTCLocalConnection
let webRTCLocalCandidate
let webRTCLocalDataChannel
let webRTCLocalMessage

const webRTCLocalGetMessage = () => webRTCLocalMessage
const webRTCLocalSetMessage = (msg) => {
  webRTCLocalMessage = msg
}

const setupLocalRTC = async () => {
  webRTCLocalConnection = new RTCPeerConnection()

  webRTCLocalDataChannel = webRTCLocalConnection.createDataChannel('channel')

  webRTCLocalDataChannel.onmessage = (event) => {
    // console.log('RTC got message', event.data)
    webRTCLocalMessage = JSON.parse(event.data)
  }

  webRTCLocalDataChannel.onopen = () => {
    console.log('RTC connection open')
  }

  webRTCLocalConnection.onicecandidate = () => {
    webRTCLocalCandidate = webRTCLocalConnection.localDescription
    // console.log('New ICE candidate SDP', webRTCLocalCandidate)
  }

  await webRTCLocalConnection
    .createOffer()
    .then((offer) => webRTCLocalConnection.setLocalDescription(offer))
    .then(() => console.log('local offer set successfully!'))
}

const webRTCLocalSetRemoteDescriptionRTC = (webRTCRemoteCandidate) => {
  // console.log('in setRemoteDescriptionRTC', webRTCRemoteCandidate)
  webRTCLocalConnection.setRemoteDescription(webRTCRemoteCandidate)
}

const webRTCLocalSendData = (data) => {
  webRTCLocalDataChannel.send(JSON.stringify(data))
}

/* remote */
let webRTCRemoteConnect
let webRTCRemoteCandidate
let webRTCRemoteDataChannel
let webRTCRemoteMessage

const webRTCRemoteGetMessage = () => webRTCRemoteMessage
const webRTCRemoteSetMessage = (msg) => {
  webRTCRemoteMessage = msg
}

const setupRemoteRTC = async (webRTCLocalOffer) => {
  // console.log('webRTCLocalOffer', webRTCLocalOffer)
  webRTCRemoteConnect = new RTCPeerConnection()

  webRTCRemoteConnect.onicecandidate = () => {
    webRTCRemoteCandidate = webRTCRemoteConnect.localDescription
    // console.log('New ICE remote candidate SDP', webRTCRemoteCandidate)
  }

  webRTCRemoteConnect.ondatachannel = (event) => {
    webRTCRemoteDataChannel = event.channel
    webRTCRemoteDataChannel.onmessage = (e) => {
      // console.log('remote data', JSON.parse(e.data))
      webRTCRemoteMessage = JSON.parse(e.data)
    }
    webRTCRemoteDataChannel.onopen = () => {
      console.log('remote connection open')
      // webRTCRemoteSendData('from remote')
    }
  }

  // remoteConnect
  //   .setRemoteDescription(webRTCLocalOffer)
  //   .then((answer) => console.log('remote offer set'))
  await webRTCRemoteConnect.setRemoteDescription(webRTCLocalOffer)
  console.log('remote offer set')

  // remoteConnect
  //   .createAnswer()
  //   .then((answer) => remoteConnect.setLocalDescription(answer))
  //   .then((answer) => console.log('remote answer create'))
  const answer = await webRTCRemoteConnect.createAnswer()
  await webRTCRemoteConnect.setLocalDescription(answer)
  console.log('remote answer create')

  // signal webRTCRemoteCandidate to local connection
  // remoteConnect.dataChannel.send(JSON.stringify("hi"))
}
const webRTCRemoteSendData = (data) => {
  webRTCRemoteDataChannel.send(JSON.stringify(data))
}

let genericSendDataNoReply = wsSendMessageNoReply
let genericGetMessage = wsGetMessage
let genericSetMessage = wsSetMessage

/* ----- event listeners ----- */

boardSizeSliderEL.oninput = () => {
  // console.log('oninput', boardSizeSliderEL.value)
  boardSizeTextEL.innerHTML = `Board Size ${boardSizeSliderEL.value}`
}
boardSizeSliderEL.onchange = () => {
  // console.log('onchange', boardSizeSliderEL.value)
  boardSizeTextEL.innerHTML = `Board Size ${boardSizeSliderEL.value}`
  boardRows =
    boardSizeSliderEL.value % 2
      ? boardSizeSliderEL.value + 1
      : boardSizeSliderEL.value
  initializeGame()
}

singlePlayerBtnEl.addEventListener('click', () => {
  setOrientation(0)
  numPlayers = 1
  opponent = 1
  networkOpponent = false
  play()
  checkIfComputersTurn()
})

twoPlayerBtnEl.addEventListener('click', () => {
  setOrientation(90)
  numPlayers = 2
  opponent = 1
  networkOpponent = false
  play()
})

networkBtnEl.addEventListener('click', async () => {
  setOrientation(0)
  if (!ws) {
    await setupWS()
  }
  numPlayers = 1
  networkOpponent = true
  let reply = await wsSendMessageWaitReply({ request: 'Are you master' })
  // console.log('reply', reply)

  // console.log('after are you master', reply)
  if (reply.request === 'Are you master') {
    opponent = 1
    // playerTurn = -1
    // console.log('master', playerTurn)
    // eslint-disable-next-line no-shadow

    setupLocalRTC()
    // console.log(
    //   'before waiting for webRTCLocalCandidate',
    //   `"${webRTCLocalCandidate}"`
    // )
    // eslint-disable-next-line no-await-in-loop
    while (!webRTCLocalCandidate) await sleep(100)
    // console.log(
    //   'after waiting for webRTCLocalCandidate',
    //   `"${webRTCLocalCandidate}"`
    // )
    wsMessage = ''
    reply = await wsSendMessageWaitReply({
      request: 'Yes I am master',
      turn: playerTurn,
      webRTCLocalCandidate,
    })

    // console.log('After Yes I am master', reply)
    // console.log('webRTCRemoteCandidate', reply.webRTCRemoteCandidate)
    webRTCLocalSetRemoteDescriptionRTC(reply.webRTCRemoteCandidate)
    genericSendDataNoReply = webRTCLocalSendData
    genericGetMessage = webRTCLocalGetMessage
    genericSetMessage = webRTCLocalSetMessage

    play()
    // console.log(`opponent ${opponent} ${playerTurn}`)
  } else if (reply.request === 'Yes I am master') {
    // console.log('Yes', reply.turn, playerTurn, reply.webRTCLocalCandidate)
    // playerTurn = reply.turn
    // console.log('webRTCLocalCandidate', reply.webRTCLocalCandidate)

    await setupRemoteRTC(reply.webRTCLocalCandidate)

    console.log('before webRTCRemoteCandidate', webRTCRemoteCandidate)
    // eslint-disable-next-line no-await-in-loop
    while (!webRTCRemoteCandidate) await sleep(100)
    console.log('after webRTCRemoteCandidate', webRTCRemoteCandidate)

    wsSendMessageNoReply({
      request: 'webRTCRemoteCandidate',
      webRTCRemoteCandidate,
    })
    genericSendDataNoReply = webRTCRemoteSendData
    genericGetMessage = webRTCRemoteGetMessage
    genericSetMessage = webRTCRemoteSetMessage

    setOrientation(180)
    genericSetMessage('')

    play()
    opponent = -1
    console.log(`opponent ${opponent} ${playerTurn}`)
    firstNetworkMove = true
    checkIfComputersTurn()
  } else {
    console.log('error reply from network', reply)
  }
})

playAgainBtnEl.addEventListener('click', () => {
  play()
  checkIfComputersTurn()
})

boardEl.addEventListener('click', (evt) => {
  // Obtain index of square
  const sqrIdx = piecesEl.indexOf(evt.target)
  // Guards
  if (
    // Didn't click <div> in grid
    sqrIdx === -1 ||
    // Game over
    winner ||
    // didn't select single player or 2 player
    !numPlayers
  )
    return

  if (turnState === 'moveTo') {
    const jumpPieces = selectedMoveToValid(
      validMovesSquares[pieceSelected],
      sqrIdx
    )
    if (jumpPieces) {
      pieceSelectedMove = sqrIdx
      pieceSelectedSaved = pieceSelected
      movePiece(sqrIdx)
      return
      // eslint-disable-next-line no-else-return
    } else {
      // this should never occur
      console.log('moveTo try again, invalid move', sqrIdx)
    }
  }

  if (canMoves[sqrIdx] === playerTurn || canMoves[sqrIdx] === playerTurn * 2) {
    if (!canJumpAgain) {
      // can only change current piece if not in a double jump move
      if (pieceSelected === sqrIdx) {
        pieceSelected = null
        turnState = 'selectPiece'
      } else {
        pieceSelected = sqrIdx
        turnState = 'moveTo'
      }
    }
  }

  findWinner()
  render()
})

const setOrientation = (degrees) => {
  boardEl.style.webkitTransform = `rotate(${degrees}deg)`
  boardEl.style.msTransform = `rotate(${degrees}deg)`
  boardEl.style.transform = `rotate(${degrees}deg)`
}

const selectedMoveToValid = (validMovesArray, moveLocation) => {
  for (const validMove of validMovesArray) {
    if (validMove.move === moveLocation) {
      return validMove.jumpPieces
    }
  }
  return false
}

const movePiece = (sqrIdx) => {
  let justKinged = false
  let justJumpedPiece = false

  // move piece
  squares[sqrIdx].piece = squares[pieceSelected].piece
  // check if piece should be kinged
  if (
    Math.abs(squares[sqrIdx].piece) === 1 &&
    (sqrIdx < boardColumns || sqrIdx >= boardColumns * (boardRows - 1))
  ) {
    squares[sqrIdx].piece = squares[pieceSelected].piece * 2
    justKinged = true
  }

  squares[pieceSelected].piece = 0

  // take piece
  // if (Math.abs(pieceSelected - sqrIdx) > (COLUMNS + 1))
  //     squares[(pieceSelected + sqrIdx) / 2].piece = 0
  let jumpPieces
  for (const validMoveSquare of validMovesSquares[pieceSelected]) {
    if (validMoveSquare.move === sqrIdx) jumpPieces = validMoveSquare.jumpPieces
  }

  jumpPieces.forEach((pieceToJump) => {
    squares[pieceToJump].piece = 0
    justJumpedPiece = true
  })

  findValidMoves()
  canJumpAgain = false
  if (justJumpedPiece && !justKinged) {
    // determine if player can jump another piece
    const nextValidMoves = validMovesSquares[sqrIdx]
    for (const nextValidMove of nextValidMoves) {
      if (nextValidMove.jumpPieces.length > 0) {
        canJumpAgain = true
        break
      }
    }
  }
  if (!canJumpAgain) {
    playerTurn *= -1
    pieceSelected = null
    turnState = 'selectPiece'
  } else {
    pieceSelected = sqrIdx
  }
  findValidMoves()
  findWinner()
  checkIfComputersTurn()
  render()
}

/* ----- functions ----- */
function sleep(ms) {
  // eslint-disable-next-line no-promise-executor-return
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const capitalizeFirstLetter = (string) =>
  string.charAt(0).toUpperCase() + string.slice(1)

const getSquareIdx = (row, col) => row * boardColumns + col

const getRowColumn = (squareIdx) => [
  Math.floor(squareIdx / boardColumns),
  squareIdx % boardColumns,
]

const isKing = (piece) => Math.abs(piece) === 2

const initializeModel = () => {
  if (!whoWentFirst) {
    whoWentFirst = -1
    boardRows = INITIAL_BOARD_SIZE
  }
  boardColumns = boardRows
  boardSize = boardRows * boardColumns
  initialPieces = Math.floor((boardRows / 2 - 1) * (boardColumns / 2))

  // whoWentFirst *= -1 // swap who goes first
  // playerTurn = whoWentFirst
  playerTurn = -1
  pieceSelected = null
  turnState = 'selectPiece'
  winner = 0
  canJumpAgain = false
  squares = []
  opponent = 1

  for (let elIdx = 0; elIdx < boardSize; elIdx++) {
    squares[elIdx] = {}
    squares[elIdx].piece = 0
    squares[elIdx].row = Math.floor(elIdx / boardColumns)
    squares[elIdx].column = elIdx % boardRows
    // create array of 4 diagonals, top left, top right, bottom left, bottom right
    // top left
    const diagonals = []
    // upper left
    if (squares[elIdx].row === 0) diagonals.push(-1)
    else if (squares[elIdx].column === 0) diagonals.push(-1)
    else
      diagonals.push(
        getSquareIdx(squares[elIdx].row - 1, squares[elIdx].column - 1)
      )
    // upper right
    if (squares[elIdx].row === 0) diagonals.push(-1)
    else if (squares[elIdx].column === boardColumns - 1) diagonals.push(-1)
    else
      diagonals.push(
        getSquareIdx(squares[elIdx].row - 1, squares[elIdx].column + 1)
      )
    // lower left
    if (squares[elIdx].row === boardRows - 1) diagonals.push(-1)
    else if (squares[elIdx].column === 0) diagonals.push(-1)
    else
      diagonals.push(
        getSquareIdx(squares[elIdx].row + 1, squares[elIdx].column - 1)
      )

    // lower right
    if (squares[elIdx].row === boardRows - 1) diagonals.push(-1)
    else if (squares[elIdx].column === boardColumns - 1) diagonals.push(-1)
    else
      diagonals.push(
        getSquareIdx(squares[elIdx].row + 1, squares[elIdx].column + 1)
      )
    squares[elIdx].diagonals = diagonals
  }
}

const initializeBoard = () => {
  boardEl.innerHTML = ''
  if (boardEl.childElementCount === 0) {
    // only recreate board if it hasn't been done already
    piecesEl = []
    for (let elIdx = 0; elIdx < boardSize; elIdx++) {
      // init dom board
      const divBoardSquareEl = document.createElement('div')
      let color

      if (Math.floor(elIdx / boardColumns) % 2)
        color = elIdx % 2 ? 'white' : 'black'
      else color = elIdx % 2 ? 'black' : 'white'
      divBoardSquareEl.style.backgroundColor = color
      divBoardSquareEl.classList.add('square')

      const divPieceEl = document.createElement('div')
      divPieceEl.classList.add('piece')

      divBoardSquareEl.append(divPieceEl)
      boardEl.appendChild(divBoardSquareEl)

      piecesEl.push(divPieceEl)
    }
  }
}

const initializePieces = () => {
  // place pieces on board
  for (let pieceIdx = 0; pieceIdx < initialPieces; pieceIdx++) {
    const row = Math.floor(pieceIdx / (boardColumns / 2))
    const rowOpponent =
      boardRows - 1 - Math.floor(pieceIdx / (boardColumns / 2))

    let col
    col = (pieceIdx % (boardColumns / 2)) * 2
    let colOpponent = col

    if (row % 2) col++
    if (rowOpponent % 2) colOpponent++

    squares[getSquareIdx(row, col)].piece = 1
    squares[getSquareIdx(rowOpponent, colOpponent)].piece = -1
  }
}

const initializeGame = () => {
  initializeModel()
  initializeBoard()
  initializePieces()
  findValidMoves()
  // checkIfComputersTurn()
  render()
}

const validateSpaceMove = (square, squareIdx, moves) => {
  if (square.piece !== 0) {
    for (
      let diagonolIdx = 0;
      diagonolIdx < square.diagonals.length;
      diagonolIdx++
    ) {
      // const goingTowardOponent =

      if (
        square.diagonals[diagonolIdx] !== -1 &&
        squares[square.diagonals[diagonolIdx]].piece === 0
      ) {
        if (isKing(square.piece)) {
          canMoves[squareIdx] = square.piece
          moves.push({ move: square.diagonals[diagonolIdx], jumpPieces: [] })
        } else {
          // eslint-disable-next-line no-lonely-if
          if (
            (square.piece === -1 &&
              square.diagonals[diagonolIdx] < squareIdx) ||
            (square.piece === 1 && square.diagonals[diagonolIdx] > squareIdx)
          ) {
            canMoves[squareIdx] = square.piece
            moves.push({ move: square.diagonals[diagonolIdx], jumpPieces: [] })
          } else {
            // non-Kings can't go backwards
          }
        }
      }
    }
  }
}

const sameTeam = (teamPiece, pieceToCompare) => teamPiece * pieceToCompare > 0

const validateJumpMove = (square, squareIdx, moves) => {
  const numJumpMoves = {
    '-1': 0,
    1: 0,
  }
  if (square.piece !== 0) {
    for (
      let diagonolIdx = 0;
      diagonolIdx < square.diagonals.length;
      diagonolIdx++
    ) {
      if (
        square.diagonals[diagonolIdx] !== -1 &&
        squares[square.diagonals[diagonolIdx]].piece &&
        !sameTeam(squares[square.diagonals[diagonolIdx]].piece, square.piece)
      ) {
        const possibleJumpSquare = squares[square.diagonals[diagonolIdx]]

        if (
          possibleJumpSquare.diagonals[diagonolIdx] !== -1 &&
          squares[possibleJumpSquare.diagonals[diagonolIdx]].piece === 0
        ) {
          // moves.push(possibleJumpSquare.diagonals[diagonolIdx])
          if (isKing(square.piece)) {
            moves.push({
              move: possibleJumpSquare.diagonals[diagonolIdx],
              jumpPieces: [square.diagonals[diagonolIdx]],
            })
            canMoves[squareIdx] = square.piece
            const key = square.piece > 0 ? 1 : -1
            numJumpMoves[key] += 1
          } else {
            // eslint-disable-next-line no-lonely-if
            if (
              (square.piece === -1 &&
                square.diagonals[diagonolIdx] < squareIdx) ||
              (square.piece === 1 && square.diagonals[diagonolIdx] > squareIdx)
            ) {
              moves.push({
                move: possibleJumpSquare.diagonals[diagonolIdx],
                jumpPieces: [square.diagonals[diagonolIdx]],
              })
              canMoves[squareIdx] = square.piece
              const key = square.piece > 0 ? 1 : -1
              numJumpMoves[key] += 1
            }
          }
        }
      }
    }
  }
  return numJumpMoves
}

const findValidMoves = () => {
  validMovesSquares = Array(squares.length).fill(0)
  canMoves = Array(squares.length).fill(0)
  let totalJumpMoves = 0

  squares.forEach((square, squareIdx) => {
    const moves = []

    const numJumpMoves = validateJumpMove(square, squareIdx, moves)
    totalJumpMoves += numJumpMoves[playerTurn]

    validMovesSquares[squareIdx] = moves
  })
  if (!canJumpAgain && !totalJumpMoves) {
    squares.forEach((square, squareIdx) => {
      const moves = validMovesSquares[squareIdx]

      // if this is a double jump, space moves are not valid moves
      validateSpaceMove(square, squareIdx, moves)
    })
  }
}

const checkIfComputersTurn = () => {
  if (numPlayers === 1 && playerTurn === opponent && !networkOpponent) {
    computerAI()
  } else if (numPlayers === 1 && playerTurn === opponent && networkOpponent) {
    networkPlayer()
  }
}

const networkPlayer = async () => {
  if (!firstNetworkMove) {
    genericSetMessage('')

    genericSendDataNoReply({
      request: 'Move',
      selectedPiece: pieceSelectedSaved,
      moveTo: pieceSelectedMove,
    })
  } else {
    firstNetworkMove = false
  }
  // eslint-disable-next-line no-await-in-loop
  while (!genericGetMessage()) await sleep(100)
  const msg = genericGetMessage()

  // eslint-disable-next-line prefer-destructuring
  pieceSelected = msg.selectedPiece

  render()
  await sleep(1000)

  movePiece(msg.moveTo)
}

const computerAI = async () => {
  // find moves
  const moves = []
  canMoves.forEach((move, moveIdx) => {
    if (sameTeam(opponent, move)) moves.push(moveIdx)
  })

  if (moves.length === 0) return

  // select a random piece to move
  const pickMove = Math.floor(Math.random() * moves.length)
  const computerMovesPiece = moves[pickMove]

  // get all places piece can move
  const placesPieceCanMove = validMovesSquares[computerMovesPiece]

  // select a random move for piece
  const moveTo = Math.floor(Math.random() * placesPieceCanMove.length)

  titleEl.innerHTML = `Moved piece ${getRowColumn(
    computerMovesPiece
  )} moveTo ${getRowColumn(placesPieceCanMove[moveTo].move)}`
  await sleep(1000)
  pieceSelected = computerMovesPiece
  render()
  await sleep(1000)

  movePiece(placesPieceCanMove[moveTo].move)

  // turn = turn * -1
  // squares[computerMovesPiece].piece = 0;
  // squares[placesPieceCanMove[moveTo].move].piece = COMPUTER_TURN

  // findValidMoves()
  // findWinner()
}

const play = () => {
  initializeGame()
}

const findWinner = () => {
  let positive = 0
  let negative = 0
  squares.forEach((square) => {
    if (square.piece > 0) positive++
    else if (square.piece < 0) negative++
  })
  if (positive === 0) winner = 1
  else if (negative === 0) winner = -1

  // check for ties
  let canMovePositive = 0
  let canMoveNegative = 0
  canMoves.forEach((move) => {
    if (move > 0) canMovePositive++
    else if (move < 0) canMoveNegative++
  })
  if (canMoveNegative === 0 && canMovePositive === 0) winner = 'T'
}

const renderBoard = () => {
  boardEl.style.gridTemplateColumns = `repeat(${boardColumns}, 9vmin)`
  boardEl.style.gridTemplateRows = `repeat(${boardRows}, 9vmin)`
}

const renderMessages = () => {
  if (!numPlayers) {
    message2El.innerHTML = `Single or Two Player?`
  } else if (winner === 'T') {
    titleEl.innerHTML = 'Checkers'
    messageEl.innerHTML = `Tie game!`
    message2El.innerHTML = `Click 'Play Again'`
  } else if (winner === 0) {
    const formatColor = `<span style='color:${
      SQUARE[playerTurn].color
    }'>${capitalizeFirstLetter(SQUARE[playerTurn].color)}</span>`
    if (canJumpAgain) messageEl.innerHTML = `${formatColor}'s Take Another Turn`
    else messageEl.innerHTML = `${formatColor}'s Turn`
    message2El.innerHTML = `${TURN_STATES[turnState]}`
  } else {
    titleEl.innerHTML = 'Checkers'
    messageEl.innerHTML = `Winner ${SQUARE[playerTurn * -1].color}!`
    message2El.innerHTML = `Click 'Play Again'`
  }
  // document.querySelector('#socketMessage').innerHTML = wsMessages
}

const renderPieces = () => {
  squares.forEach((square, sqrIdx) => {
    piecesEl[sqrIdx].style.backgroundColor = SQUARE[square.piece].color

    // Add boarder if it's piece's turn and moveable
    if (
      numPlayers &&
      canMoves[sqrIdx] !== 0 &&
      (canMoves[sqrIdx] === playerTurn || canMoves[sqrIdx] === playerTurn * 2)
    ) {
      piecesEl[sqrIdx].style.border = 'solid 4px green'
      if (sqrIdx === pieceSelected)
        piecesEl[sqrIdx].style.border = 'solid 8px green'
    } else {
      piecesEl[sqrIdx].style.border = ''
    }
  })
}

const renderPossibleMoves = () => {
  if (!numPlayers) return

  // render squares where pieces can move
  squares.forEach((square, sqrIdx) => {
    if (square.piece === playerTurn || square.piece === playerTurn * 2) {
      if (pieceSelected === null || pieceSelected === sqrIdx) {
        validMovesSquares[sqrIdx].forEach((validMove) => {
          piecesEl[validMove.move].style.backgroundColor =
            SQUARE[square.piece].validSquareColor
        })
      }
    }
  })
}

const renderButtons = () => {
  twoPlayerBtnEl.style.display = !numPlayers ? 'block' : 'none'
  singlePlayerBtnEl.style.display = !numPlayers ? 'block' : 'none'
  networkBtnEl.style.display = !numPlayers ? 'block' : 'none'
  playAgainBtnEl.style.display = winner ? 'block' : 'none'

  boardSizeSliderContainerEL.style.display = !numPlayers ? 'block' : 'none'
  boardSizeTextEL.innerHTML = `Board Size ${boardRows}`
  boardSizeSliderEL.value = boardRows
}

const render = () => {
  renderBoard()
  renderMessages()
  renderPieces()
  renderButtons()
  renderPossibleMoves()
}

initializeGame()
