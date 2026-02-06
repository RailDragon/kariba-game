import random


class KaribaGame:
    def __init__(self, player_names):
        self.cards = [i for i in range(1, 9)] * 8  # 1~8번 카드 각 8장씩
        random.shuffle(self.cards)

        self.board = {i: 0 for i in range(1, 9)}  # 보드 위 각 숫자별 카드 개수
        self.players = {name: {'hand': [], 'score': 0} for name in player_names}
        self.deck = self.cards

        # 초기 카드 분배 (각 5장씩)
        for _ in range(5):
            for p in self.players:
                self.players[p]['hand'].append(self.deck.pop())

    def play_card(self, player_name, card_value, count):
        player = self.players[player_name]

        # 1. 손패에서 카드 제거 및 보드에 추가
        for _ in range(count):
            player['hand'].remove(card_value)
        self.board[card_value] += count

        captured_cards = 0
        # 2. 3장 이상 쌓였을 때 승리 판정
        if self.board[card_value] >= 3:
            captured_cards = self.check_capture(card_value)
            player['score'] += captured_cards

        # 3. 카드 보충
        for _ in range(count):
            if self.deck:
                player['hand'].append(self.deck.pop())

        return captured_cards

    def check_capture(self, card_value):
        # 쥐(1)가 코끼리(8)를 잡는 특수 규칙
        if card_value == 1:
            if self.board[8] > 0:
                count = self.board[8]
                self.board[8] = 0
                return count

        # 일반 규칙: 자신보다 낮은 숫자 중 가장 가까운 숫자를 잡음
        for target in range(card_value - 1, 0, -1):
            if self.board[target] > 0:
                count = self.board[target]
                self.board[target] = 0
                return count
        return 0