# Cursor Project Instructions for cf-simple-agent

## Project Configuration

- When initializing new Cloudflare Worker projects with recent versions of Wrangler, expect the configuration file to be `wrangler.jsonc`, not `wrangler.toml`. Check for `.jsonc` first.
- When using Cloudflare Workers AI, prefer the native `env.AI` binding directly in the worker code instead of installing and importing the deprecated `@cloudflare/ai` SDK package.
- When using the Shadcn CLI, the correct package name is `shadcn`, not `shadcn-ui`. Use `npx shadcn@latest ...`.
- When testing local development servers (e.g., `wrangler dev`, `npm run dev`), start the server in the background and immediately verify the relevant URL using the browser navigation tool.

## CI/CD and Dependency Management

### Package Management Best Practices

1. **Dependencies Setup**
   - Always add ALL required dependencies upfront before setting up CI/CD
   - Run `npm install` immediately after modifying `package.json`
   - Always commit `package.json` and `package-lock.json` together
   - Verify all scripts locally before committing

2. **Script Requirements**
   - Define all npm scripts before creating GitHub Actions workflows
   - Required scripts for CI/CD:
     - `format`: Run prettier to format code
     - `format:check`: Check code formatting without modifying
     - `build`: Build the project
     - `test`: Run test suite
     - `deploy`: Deploy to Cloudflare Workers

3. **CI/CD Setup Order**
   - Set up and verify all dependencies first
   - Test all npm scripts locally
   - Create GitHub Actions workflow
   - Test complete workflow locally before pushing
   - Add required GitHub secrets (e.g., CLOUDFLARE_API_TOKEN)

4. **Common Issues Prevention**
   - Always verify `package-lock.json` is in sync before CI/CD
   - Run `npm ci` locally to test clean installs
   - Check formatting with `npm run format:check` before commits
   - Use `prettier --write` for initial codebase formatting

## Path Handling in Cursor

### Important Notes

1. **Absolute vs Relative Paths**
   - Always use absolute paths for file operations in subdirectories
   - Relative paths resolve to workspace root, not current directory
   - Current working directory (cd) does not affect path resolution

2. **File Operations Best Practices**
   - Use absolute paths for precise file location control
   - Include full path from workspace root
   - Verify paths before file operations

3. **Examples**
   ```bash
   # Working in /Users/admin/Work/awesome/awesome-cf/
   edit_file("test.txt")                    # Creates in /Users/admin/Work/
   edit_file("./test.txt")                  # Creates in /Users/admin/Work/
   edit_file("/Users/admin/Work/test.txt")  # Creates exactly where specified
   ```

### Directory Structure
- Keep CI/CD configuration in `.github/workflows/`
- Maintain development configuration in `.cursorconfig/`
- Store project documentation in appropriate locations 