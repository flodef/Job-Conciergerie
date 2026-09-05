# Release Process

Steps to trigger a production release:

1. **Commit & push changes to `dev`**
   ```sh
   git add -A
   git commit -m "<your message>"
   git push origin dev
   ```

2. **Merge `dev` into `main` and push**
   ```sh
   git checkout main
   git merge dev
   git push origin main
   ```

3. **Switch back to `dev`**
   ```sh
   git checkout dev
   ```

> The version bump and build check happen automatically via the pre-commit hook.
