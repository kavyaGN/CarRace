# Deploy the Browser Game

The playable browser version is in the `web/` folder.

## GitHub Pages

1. Push this project to GitHub.
2. Open the repository on GitHub.
3. Go to Settings > Pages.
4. Under "Build and deployment", choose "Deploy from a branch".
5. Select your branch, usually `main`.
6. Select folder `/web`.
7. Click Save.

GitHub will give you a link like:

```text
https://your-username.github.io/your-repo-name/
```

Share that link with your friends.

## Test Locally

Open `web/index.html` in your browser, or serve the folder with:

```bash
cd web
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```
