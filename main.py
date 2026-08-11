"""
Car Racing Game
---------------
A simple arcade-style car racing game built with Pygame.

Controls:
    LEFT / RIGHT arrow keys (or A / D) - steer
    SPACE                               - jump over a nearby car
    UP / DOWN arrow keys (or W / S)    - speed up / brake
    P                                   - pause
    R                                   - restart after game over
    ESC                                 - quit

Requirements:
    pip install pygame

Run:
    python car_racing_game.py
"""

import pygame
import random
import sys

pygame.init()

WIDTH, HEIGHT = 500, 700
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Car Racing Game")
clock = pygame.time.Clock()
FPS = 60

# Colors
GRAY = (60, 60, 60)
DARK_GRAY = (40, 40, 40)
WHITE = (255, 255, 255)
YELLOW = (240, 220, 60)
RED = (220, 40, 40)
BLUE = (40, 120, 220)
GREEN = (40, 200, 100)
BLACK = (10, 10, 10)
WINDOW_BLUE = (150, 210, 245)
HEADLIGHT = (255, 245, 170)
TAIL_LIGHT = (185, 25, 35)

# Road geometry
ROAD_WIDTH = 540
ROAD_LEFT = (WIDTH - ROAD_WIDTH) // 2
ROAD_RIGHT = ROAD_LEFT + ROAD_WIDTH
LANE_COUNT = 5
LANE_WIDTH = ROAD_WIDTH // LANE_COUNT

CAR_WIDTH, CAR_HEIGHT = 56, 90
JUMP_UNLOCK_SCORE = 2000

font_big = pygame.font.SysFont("arial", 48, bold=True)
font_med = pygame.font.SysFont("arial", 28, bold=True)
font_small = pygame.font.SysFont("arial", 20)


def lane_center_x(lane_index):
    return ROAD_LEFT + LANE_WIDTH * lane_index + LANE_WIDTH // 2


class Car:
    """Player-controlled car."""

    def __init__(self):
        self.width = CAR_WIDTH
        self.height = CAR_HEIGHT
        self.x = WIDTH // 2 - self.width // 2
        self.y = HEIGHT - self.height - 30
        self.speed_x = 0
        self.max_speed_x = 7
        self.jump_timer = 0
        self.jump_duration = 60
        self.jump_cooldown = 0
        self.jump_cooldown_duration = 45

    def rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def start_jump(self, can_jump=True):
        if can_jump and self.jump_timer == 0 and self.jump_cooldown == 0:
            self.jump_timer = self.jump_duration
            self.jump_cooldown = self.jump_duration + self.jump_cooldown_duration

    def is_airborne(self):
        return self.jump_timer > 0

    def jump_progress(self):
        if self.jump_timer == 0:
            return 0
        elapsed = self.jump_duration - self.jump_timer
        midpoint = self.jump_duration / 2
        return max(0, 1 - abs(elapsed - midpoint) / midpoint)

    def update(self, keys):
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.speed_x = -self.max_speed_x
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.speed_x = self.max_speed_x
        else:
            self.speed_x = 0

        self.x += self.speed_x
        self.x = max(ROAD_LEFT + 5, min(self.x, ROAD_RIGHT - self.width - 5))
        if self.jump_timer > 0:
            self.jump_timer -= 1
        if self.jump_cooldown > 0:
            self.jump_cooldown -= 1

    def draw(self, surface):
        jump = self.jump_progress()
        if jump:
            shadow_w = int(self.width * (1.35 - jump * 0.55))
            shadow_h = int(14 - jump * 8)
            shadow_x = int(self.x + self.width / 2 - shadow_w / 2)
            shadow_y = int(self.y + self.height + 4)
            pygame.draw.ellipse(surface, (5, 5, 5), (shadow_x, shadow_y, shadow_w, shadow_h))

        scale = 1 + jump * 0.55
        draw_w = int(self.width * scale)
        draw_h = int(self.height * scale)
        draw_x = int(self.x + self.width / 2 - draw_w / 2)
        draw_y = int(self.y - jump * 95 + self.height / 2 - draw_h / 2)
        draw_car(surface, draw_x, draw_y, draw_w, draw_h, BLUE)

        if jump:
            arc_y = int(self.y - jump * 90)
            pygame.draw.arc(surface, WHITE, (self.x - 13, arc_y, self.width + 26, 42), 3.35, 6.08, 3)


class Enemy:
    """Oncoming traffic car."""

    def __init__(self, speed):
        self.width = CAR_WIDTH
        self.height = CAR_HEIGHT
        lane = random.randint(0, LANE_COUNT - 1)
        self.x = lane_center_x(lane) - self.width // 2
        self.y = -self.height - random.randint(0, 200)
        self.speed = speed
        self.color = random.choice([RED, GREEN, YELLOW, (200, 100, 220)])

    def rect(self):
        return pygame.Rect(self.x, self.y, self.width, self.height)

    def update(self):
        self.y += self.speed

    def draw(self, surface):
        draw_car(surface, self.x, self.y, self.width, self.height, self.color)


def draw_car(surface, x, y, w, h, color):
    x, y, w, h = int(x), int(y), int(w), int(h)

    tire_w = 9
    tire_h = 18
    tire_positions = (
        (x - 5, y + 13),
        (x + w - 4, y + 13),
        (x - 5, y + h - tire_h - 13),
        (x + w - 4, y + h - tire_h - 13),
    )
    for tire_x, tire_y in tire_positions:
        pygame.draw.rect(surface, BLACK, (tire_x, tire_y, tire_w, tire_h), border_radius=4)
        pygame.draw.rect(surface, (45, 45, 45), (tire_x + 2, tire_y + 3, tire_w - 4, tire_h - 6), border_radius=3)

    shadow = pygame.Rect(x + 3, y + 4, w, h)
    pygame.draw.rect(surface, (20, 20, 20), shadow, border_radius=13)

    body = pygame.Rect(x, y, w, h)
    pygame.draw.rect(surface, color, body, border_radius=13)
    pygame.draw.rect(surface, BLACK, body, width=2, border_radius=13)

    hood = pygame.Rect(x + 6, y + 5, w - 12, 18)
    pygame.draw.rect(surface, lighten_color(color, 30), hood, border_radius=8)
    pygame.draw.line(surface, darken_color(color, 35), (x + 9, y + 25), (x + w - 9, y + 25), 2)

    windshield = pygame.Rect(x + 9, y + 28, w - 18, 16)
    cabin = pygame.Rect(x + 7, y + 39, w - 14, 23)
    rear_window = pygame.Rect(x + 10, y + 58, w - 20, 13)
    pygame.draw.rect(surface, WINDOW_BLUE, windshield, border_radius=5)
    pygame.draw.rect(surface, darken_color(color, 18), cabin, border_radius=6)
    pygame.draw.rect(surface, WINDOW_BLUE, rear_window, border_radius=4)
    pygame.draw.line(surface, WHITE, (x + 12, y + 31), (x + w - 14, y + 40), 2)

    left_window = pygame.Rect(x + 8, y + 45, 8, 12)
    right_window = pygame.Rect(x + w - 16, y + 45, 8, 12)
    pygame.draw.rect(surface, WINDOW_BLUE, left_window, border_radius=3)
    pygame.draw.rect(surface, WINDOW_BLUE, right_window, border_radius=3)

    grille = pygame.Rect(x + 14, y + 3, w - 28, 5)
    pygame.draw.rect(surface, (35, 35, 35), grille, border_radius=2)
    pygame.draw.circle(surface, HEADLIGHT, (x + 9, y + 9), 4)
    pygame.draw.circle(surface, HEADLIGHT, (x + w - 9, y + 9), 4)

    pygame.draw.rect(surface, TAIL_LIGHT, (x + 6, y + h - 9, 9, 5), border_radius=2)
    pygame.draw.rect(surface, TAIL_LIGHT, (x + w - 15, y + h - 9, 9, 5), border_radius=2)
    pygame.draw.rect(surface, darken_color(color, 30), (x + 15, y + h - 15, w - 30, 5), border_radius=2)


def lighten_color(color, amount):
    return tuple(min(255, channel + amount) for channel in color)


def darken_color(color, amount):
    return tuple(max(0, channel - amount) for channel in color)


class Game:
    def __init__(self):
        self.reset()

    def reset(self):
        self.player = Car()
        self.enemies = []
        self.road_scroll = 0
        self.base_speed = 6
        self.spawn_timer = 0
        self.spawn_interval = 70
        self.score = 0
        self.game_over = False
        self.paused = False

    def difficulty_speed(self):
        return self.base_speed + self.score // 300

    def spawn_enemy(self):
        self.spawn_timer += 1
        interval = max(28, self.spawn_interval - self.score // 40)
        if self.spawn_timer >= interval:
            self.spawn_timer = 0
            self.enemies.append(Enemy(self.difficulty_speed()))

    def update(self, keys):
        if self.game_over or self.paused:
            return

        self.player.update(keys)
        self.road_scroll = (self.road_scroll + self.difficulty_speed()) % 40
        self.spawn_enemy()

        for enemy in self.enemies:
            enemy.update()
        self.enemies = [e for e in self.enemies if e.y < HEIGHT + 100]

        self.score += 1

        if not self.player.is_airborne():
            player_rect = self.player.rect()
            for enemy in self.enemies:
                if player_rect.colliderect(enemy.rect()):
                    self.game_over = True
                    break

    def draw_road(self, surface):
        surface.fill((30, 130, 60))  # grass
        pygame.draw.rect(surface, GRAY, (ROAD_LEFT, 0, ROAD_WIDTH, HEIGHT))
        # road edges
        pygame.draw.rect(surface, WHITE, (ROAD_LEFT - 6, 0, 6, HEIGHT))
        pygame.draw.rect(surface, WHITE, (ROAD_RIGHT, 0, 6, HEIGHT))
        # lane markings
        for lane in range(1, LANE_COUNT):
            x = ROAD_LEFT + lane * LANE_WIDTH
            y = -40 + self.road_scroll
            while y < HEIGHT:
                pygame.draw.rect(surface, YELLOW, (x - 3, y, 6, 24))
                y += 40

    def draw_hud(self, surface):
        score_text = font_med.render(f"Score: {self.score}", True, WHITE)
        surface.blit(score_text, (14, 14))
        speed_text = font_small.render(f"Speed: {self.difficulty_speed()}", True, WHITE)
        surface.blit(speed_text, (14, 48))
        if self.score < JUMP_UNLOCK_SCORE:
            jump_label = f"Jump unlocks at {JUMP_UNLOCK_SCORE}"
            jump_color = YELLOW
        elif self.player.jump_cooldown == 0:
            jump_label = "Jump: READY"
            jump_color = GREEN
        else:
            jump_label = "Jump: WAIT"
            jump_color = YELLOW
        jump_text = font_small.render(jump_label, True, jump_color)
        surface.blit(jump_text, (14, 72))

    def draw(self, surface):
        self.draw_road(surface)
        self.player.draw(surface)
        for enemy in self.enemies:
            enemy.draw(surface)
        self.draw_hud(surface)

        if self.paused:
            self.draw_center_text(surface, "PAUSED", "Press P to resume")
        if self.game_over:
            self.draw_center_text(surface, "GAME OVER", "Press R to restart")

    def draw_center_text(self, surface, title, subtitle):
        overlay = pygame.Surface((WIDTH, HEIGHT), pygame.SRCALPHA)
        overlay.fill((0, 0, 0, 160))
        surface.blit(overlay, (0, 0))

        title_surf = font_big.render(title, True, WHITE)
        surface.blit(title_surf, title_surf.get_rect(center=(WIDTH // 2, HEIGHT // 2 - 20)))

        sub_surf = font_small.render(subtitle, True, WHITE)
        surface.blit(sub_surf, sub_surf.get_rect(center=(WIDTH // 2, HEIGHT // 2 + 24)))


def main():
    game = Game()

    while True:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    pygame.quit()
                    sys.exit()
                if event.key == pygame.K_p and not game.game_over:
                    game.paused = not game.paused
                if event.key == pygame.K_r and game.game_over:
                    game.reset()
                if event.key == pygame.K_SPACE and not game.game_over and not game.paused:
                    game.player.start_jump(game.score >= JUMP_UNLOCK_SCORE)

        keys = pygame.key.get_pressed()
        game.update(keys)
        game.draw(screen)

        pygame.display.flip()
        clock.tick(FPS)


if __name__ == "__main__":
    main()
