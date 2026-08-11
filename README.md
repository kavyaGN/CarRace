# Car Racing Game

A simple arcade-style top-down car racing game built with Pygame. Dodge
oncoming traffic on a 3-lane road — the longer you survive, the faster
and more crowded the road gets.

## Setup

```bash
pip install -r requirements.txt
```

## Run

```bash
python main.py
```

## Controls

| Key                     | Action        |
|--------------------------|---------------|
| Left / Right, A / D      | Steer         |
| P                         | Pause/resume  |
| R                         | Restart (after game over) |
| Esc                       | Quit          |

## Project structure

```
car_racing_game/
├── main.py           # Game source code
├── requirements.txt  # Python dependencies
└── README.md
```

## Ideas for extending

- Add power-ups (shields, slow-motion, score multipliers)
- Save/load a high score to a local file
- Add sound effects and background music
- Swap the drawn-rectangle cars for sprite images
