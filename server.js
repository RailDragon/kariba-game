const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

let gameState = {
    status: 'LOBBY',
    board: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
    players: {},
    playerOrder: [],
    turnIndex: 0,
    deck: [],
    winner: null,
    lastPlay: null
};

function initDeck() {
    let cards = [];
    for (let i = 1; i <= 8; i++) {
        for (let j = 0; j < 8; j++) cards.push(i);
    }
    return cards.sort(() => Math.random() - 0.5);
}

function resetGame() {
    gameState = {
        status: 'LOBBY',
        board: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 },
        players: {},
        playerOrder: [],
        turnIndex: 0,
        deck: [],
        winner: null,
        lastPlay: null
    };
}

io.on('connection', (socket) => {
    socket.on('join', (name) => {
        if (gameState.status !== 'LOBBY') return;
        gameState.players[socket.id] = { name, hand: [], score: 0, capturedCards: [] };
        gameState.playerOrder.push(socket.id);
        io.emit('updateState', gameState);
    });

    socket.on('startGame', () => {
        if (gameState.playerOrder.length < 2) return;
        gameState.status = 'PLAYING';
        gameState.deck = initDeck();
        gameState.playerOrder.forEach(id => {
            gameState.players[id].hand = gameState.deck.splice(0, 5);
        });
        io.emit('updateState', gameState);
    });

    socket.on('playCard', ({ cardValue, count }) => {
        if (gameState.status !== 'PLAYING' || socket.id !== gameState.playerOrder[gameState.turnIndex]) return;
        const player = gameState.players[socket.id];
        const actualCount = player.hand.filter(c => c === cardValue).length;
        if (count < 1 || count > actualCount) return;

        // 카드 제출
        for(let i=0; i<count; i++) {
            player.hand.splice(player.hand.indexOf(cardValue), 1);
        }
        gameState.board[cardValue] += count;
        gameState.lastPlay = { name: player.name, cardValue, count };

        // 획득 로직
        if (gameState.board[cardValue] >= 3) {
            let target = -1;
            if (cardValue === 1 && gameState.board[8] > 0) target = 8;
            else {
                for (let i = cardValue - 1; i >= 1; i--) {
                    if (gameState.board[i] > 0) { target = i; break; }
                }
            }
            if (target !== -1) {
                const capturedCount = gameState.board[target];
                player.score += (target * capturedCount);
                for(let i=0; i<capturedCount; i++) player.capturedCards.push(target);
                gameState.board[target] = 0;
            }
        }

        // 카드 보충 (덱이 있을 때만)
        while (player.hand.length < 5 && gameState.deck.length > 0) {
            player.hand.push(gameState.deck.pop());
        }

        // [수정된 종료 조건] 덱이 0장이고 + 누군가 손패를 다 썼을 때
        if (gameState.deck.length === 0 && player.hand.length === 0) {
            gameState.status = 'FINISHED';
            let max = -1;
            gameState.playerOrder.forEach(id => {
                if(gameState.players[id].score > max) {
                    max = gameState.players[id].score;
                    gameState.winner = gameState.players[id].name;
                }
            });
        } else {
            gameState.turnIndex = (gameState.turnIndex + 1) % gameState.playerOrder.length;
        }
        io.emit('updateState', gameState);
    });

    socket.on('passTurn', () => {
        if (gameState.status !== 'PLAYING' || socket.id !== gameState.playerOrder[gameState.turnIndex]) return;
        gameState.turnIndex = (gameState.turnIndex + 1) % gameState.playerOrder.length;
        io.emit('updateState', gameState);
    });

    socket.on('resetGame', () => {
        resetGame();
        io.emit('updateState', gameState);
    });

    socket.on('disconnect', () => {
        if (gameState.status === 'LOBBY') {
            gameState.playerOrder = gameState.playerOrder.filter(id => id !== socket.id);
            delete gameState.players[socket.id];
        }
        io.emit('updateState', gameState);
    });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));