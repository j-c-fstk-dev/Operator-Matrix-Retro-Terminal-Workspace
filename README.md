# OPERATOR // MATRIX RETRO TERMINAL WORKSPACE

🇧🇷 [Leia em português](README.pt-BR.md)

> **A personal project workspace that looks like a green-phosphor terminal (#22c55e). Keyboard-first (Vim/Linux style), global Quick-Find, local-first storage, optional cloud sync through Supabase, file attachments, and installable as a PWA.**

---

## ⚡ Overview

**Operator** is a personal workspace for developers, infrastructure engineers and anyone who lives in Linux/Unix and wants a fast, clean interface with nothing in the way of getting things done.

It borrows the look of 90s monochrome CRT monitors and terminals, and it works **local-first**: your projects, tasks with `#tags`, architecture notes, code snippets and attachments are saved in the browser's `localStorage`. It works offline and without an account.

When you want the same workspace on your computer and your phone, **sign in with email/password or Google**: projects then sync with a **Supabase** database (Postgres with Row Level Security) and files go to **Supabase Storage**. Without Supabase configured, the app stays 100% local.

---

## 🚀 Features

### 1. 🟢 Monochrome Matrix look & CRT terminal
- **8 terminal colors**: Matrix (green, default), Aqua, Deep Blue, Purple, Neon Pink, Red, Amber and Mono, picked in **Preferences > Terminal Color**. Each theme recomputes the whole palette in OKLCH and keeps the original contrast.
- **Digital rain (Matrix Rain)** in the background, drawn on a fast Canvas, with an opacity slider and an instant toggle.
- **CRT scanlines** that mimic an old green-phosphor monitor.
- **Terminal sound**: beeps and mechanical clicks synthesized live with the **Web Audio API** (no audio files to download).
- **Monospaced fonts and blinking cursors** for that real Unix terminal feel.
- **English and Portuguese**: the app opens in your browser's language (Portuguese for `pt-*`, English for everything else). Switch in **Preferences > Language** or with `lang en` / `lang pt` in the prompt. Sample projects you haven't edited switch language too.

### 2. 📁 Projects & tasks
- **Tasks and subtasks**: add tasks with nested checklists, technical notes and priority levels (`CRIT`, `MED`, `LOW`).
- **Color-coded `#tags`**: tags like `#api`, `#docker`, `#security`, `#infra` and `#db` get a terminal color picked from a hash, so the same tag always has the same color.
- **Quick filters**: show *All*, *Pending* or *Done* tasks, or click any tag to filter instantly.
- **Technical notes & code snippets**: keep architecture notes and terminal commands or code, copied to the clipboard in one click.
- **Block tabs**: *All Blocks*, *Tasks*, *Notes*, *Snippets* and *Files*.

### 3. ☁️ Account & cloud sync (Supabase), optional
- **Email/password or Google (OAuth) sign-in** from the `[SIGN IN]` button or the `login` command in the prompt (`Ctrl+K`).
- **Merge without data loss**: when you sign in, local and cloud projects are merged one project at a time, and the most recently edited version wins. On the first sign-in, local projects are uploaded to the account; untouched sample projects are not uploaded to an account that already has data.
- **Persistent offline queue**: every create, edit or delete goes into a queue saved on the device. Offline, changes wait and go out on their own when the connection comes back, even after the app is closed.
- **Batched uploads**: typing is grouped and sent 1.5s after the last keystroke (at most every 10s) instead of one request per key.
- **Automatic retry**: if Supabase fails, the top button shows `Sync failed (N)`, your data stays saved locally and the app retries with growing delays.
- **Cross-device updates**: when you come back to the tab or reconnect, the app pulls changes made on your other devices. Deletes are synced too.
- **Safe account switching**: if someone else signs in on the same device, the previous account's local data is not uploaded to the new account.
- **Visible status**: the top button shows `Cloud OK`, `Syncing...`, `Pending (N)` or `Sync failed (N)`.
- **Manual upload**: the upload button in the account dialog forces every project to the cloud.
- **Per-user isolation**: the `projects` table uses Row Level Security, so each user only reads and changes their own projects.

> ℹ️ Merging is per project: if two devices edit the **same project** before syncing, the latest edit of that whole project wins.

### 4. 📎 Attachments, media & code files (Files tab)
- **Any format**: drag and drop or pick images, videos, PDFs, code files (`.ts`, `.py`, `.json`, `.sql`, `Dockerfile`, etc.), text and archives.
- **Type filters**: *All*, *Images*, *Videos*, *PDFs* and *Code/Text*.
- **Built-in viewers**:
  - **Images**: thumbnails with a full-size lightbox.
  - **Videos**: built-in player.
  - **PDFs**: open or download in one click.
  - **Code & text**: inspector with a monospaced preview and a copy button.
- **Hybrid storage**:
  - **Signed in + bucket set up**: the file goes to the private `project-attachments` bucket in Supabase Storage and shows up on all your devices (cloud badge on the card), up to 50 MB per file.
  - **Signed out, offline or no bucket**: the file is saved locally in this browser (amber *"this device only"* badge), up to 2 MB per file.
- **One-click upload of local files**: when some attachments only live on this device, a notice appears with a `SYNC TO CLOUD` button that uploads them once you sign in.
- **Metadata saved twice**: the attachment list is stored in the `attachments` column and also embedded in the project's notes, so attachments sync even on databases created before that column existed.

> ⚠️ Local files live in `localStorage`, which only holds a few MB per site. Use Supabase Storage for videos and big files.

### 5. ⌨️ Keyboard-first navigation (Vim & Linux)
Run everything without leaving the keyboard:

| Key / shortcut | What it does | Linux / Git analogy |
| :--- | :--- | :--- |
| **`?`** or **`F1`** | Opens the **system manual (`MAN OPERATOR`)** | `man operator` / `:help` |
| **`T`** | Focuses the **new task** field | `touch task.md` |
| **`J` / `K`** (or arrows) | Moves between tasks | Vim cursor `j`/`k` |
| **`X`** or **`Space`** | Checks / unchecks the selected task | `git commit -m "done"` |
| **`Delete`** | Deletes the selected task | `git rm` |
| **`1, 2, 3, 4, 5`** | Switches tabs (*All*, *Tasks*, *Notes*, *Snippets*, *Files*) | i3 / tmux workspaces |
| **`N`** | Creates a new project | `git init <proj>` |
| **`M`** | Copies the active project as **Markdown** | `git log > README.md` |
| **`Ctrl + S`** | Forces a save of the local cache (`localStorage`) | `sync` |
| **`Ctrl + K`** | Opens the **CLI command prompt & Quick-Find** | Terminal / shell |
| **`B`** | Turns the digital rain on / off | Background toggle |
| **`S`** | Turns terminal sound on / off | Audio bell toggle |
| **`Esc`** | Closes dialogs or leaves text fields | Vim `<Esc>` / `:q` |

### 6. 🔍 Quick-Find in the command prompt (`Cmd+K` / `Ctrl+K`)
- **Searches everything at once**: task titles, `#tags`, subtasks, and project names, categories and descriptions.
- **Jumps straight to the task**: pick a task in the results (click or `Enter`) and the workspace opens its project, scrolls to it and highlights it with a phosphor glow.
- **Commands you can run**:
  - `git checkout <name>` (or `switch <name>`): switches to that project.
  - `git init <name>` (or `new <name>`): creates a project with that title.
  - `git commit`, `export` or `md`: copies the project as Markdown.
  - `git status` (or `status`): shows done and pending task counts.
  - `+ <task> #tag` (or `task: <task>`): adds a quick task with tags.
  - `#<tag>`: filters tasks across every project by tag.
  - `login`, `signin`, `cloud` or `logout`: opens the account / sync dialog.
  - `pwa` or `install`: installs the app on the device.
  - `man`, `help`, `:help` or `?`: opens the manual.
  - `lang en` or `lang pt` (also `language`): switches the interface language.

### 7. 💾 Backup & migration (.JSON)
- **One-click download**: a file with every project, task, tag, note, attachment metadata and preference (e.g. `operator_backup_2026-10-05.json`).
- **Restore on another device**: upload the `.json` and choose **Replace everything** or **Merge with current**. It is written to `localStorage` right away and, if you are signed in, the imported projects are also uploaded to the cloud.
- Works without an account: it's how you move data between devices without Supabase.

### 8. 📱 Installable PWA (offline & standalone)
- **Native install**: install on Android, Windows, macOS and Linux from the `[Install App]` button or the browser menu. When the browser doesn't offer automatic install, the button shows the right steps for each browser (Chrome, Edge, Samsung Internet, Firefox and Safari on iPhone/iPad) and warns you when the link was opened inside apps like Instagram or Facebook, which can't install PWAs.
- **Standalone window**: runs without the URL bar, with its own icon on the home screen or desktop.
- **Automatic updates**: when the app opens and whenever it comes back to the screen, it checks for a new version and reloads by itself. The running version (commit · date) is shown at the bottom of the Manual and Preferences.
- **Works offline**: assets, fonts and scripts are cached. An amber `OFFLINE MODE` badge appears when the connection drops, and the app keeps running on the local cache.

### 9. 📄 Markdown export
- One click on **`Export MD`** (or the `M` key) turns the active project's tasks, notes and snippets into clean Markdown on your clipboard, ready to become a `README.md` or GitHub docs.

---

## 🛠️ Tech stack

- **Framework**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler & dev server**: [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Optional backend**: [Supabase](https://supabase.com) (Auth, Postgres with RLS and Storage) via `@supabase/supabase-js`
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Workbox)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Audio**: Web Audio API with a custom oscillator synth (no external assets)
- **Canvas animation**: HTML5 Canvas for the Matrix digital rain
- **Languages**: typed dictionaries in `src/i18n` (Portuguese and English, no extra library)
- **Tests**: native Node.js assert + tsx runner

---

## 📦 Install and run locally

### Requirements
- Node.js 20.19 or newer (required by Vite 8)
- npm (or bun / pnpm)

### 1. Clone the repository
```bash
git clone https://github.com/j-c-fstk-dev/Operator-Matrix-Retro-Terminal-Workspace.git
cd Operator-Matrix-Retro-Terminal-Workspace
```

### 2. Install dependencies
```bash
npm install
```

### 3. (Optional) Configure Supabase
Copy the example file and fill in the keys (see [Supabase setup](#️-supabase-setup-auth-database--storage)):
```bash
cp .env.example .env
```
Without these variables, the app runs 100% locally.

### 4. Start the dev server
```bash
npm run dev
```
The app runs at `http://localhost:3000`.

### 5. Type-check and run the tests
```bash
npm run lint   # type check with tsc
npm test       # automated test suite
```

### 6. Build for production
```bash
npm run build
npm run preview   # optional: try the build locally
```
The static files ready to deploy go to `/dist`.

---

## 🌐 Deploying (Netlify, Vercel or GitHub Pages)

Operator is a **static SPA (single page application)**, so any static host works, including free tiers. `public/_redirects` already sends every route to `index.html` on Netlify.

### On Netlify
1. Connect the Git repository, or drag the `dist` folder produced by `npm run build`.
2. Build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
3. If you use Supabase, add these under **Site configuration > Environment variables**:
   - `VITE_SUPABASE_URL`: your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: your Supabase public `anon` key

> `VITE_*` variables are baked into the bundle at build time. After adding or changing them, deploy again.

---

## 🗄️ Supabase setup (auth, database & storage)

[Supabase](https://supabase.com) is optional. Without the variables, the app keeps working 100% locally (offline).

### 1. Create the project and database

1. **Create a free project on [Supabase](https://supabase.com)**.
2. Open **Project Settings > API** and copy:
   - `Project URL`
   - `anon public key`
3. Open the **SQL Editor**, paste `supabase/schema.sql` and click **RUN**. The script creates the `projects` table (with the `attachments` column), turns on **Row Level Security** so each user only sees their own projects, and adds the indexes. It is safe to run again to migrate older databases.
4. Add the variables to your local `.env` or to Netlify:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key"
   ```
5. Done. Click `[SIGN IN]` in the app, create an account and your projects start syncing.

### 2. Turn on Google sign-in (OAuth)

1. In **Supabase**, go to **Authentication** > **Providers** > **Google** and enable it.
2. Copy the **Callback URL (for OAuth)** shown there (e.g. `https://<your-project>.supabase.co/auth/v1/callback`).
3. In the [Google Cloud Console](https://console.cloud.google.com/):
   - Create or pick a project.
   - Set up the **OAuth consent screen** (type *External*).
   - Go to **Credentials** > **Create Credentials** > **OAuth client ID** > type **Web application**.
   - Under **Authorized redirect URIs**, add the URL you copied from Supabase.
   - Copy the generated **Client ID** and **Client Secret**.
4. Back in the Google provider in Supabase, paste the **Client ID** and **Client Secret** and click **Save**.
5. In **Authentication** > **URL Configuration**, add your site URL (e.g. `https://your-app.netlify.app`) and, for development, `http://localhost:3000` under **Redirect URLs**. After signing in, Google sends you back to the origin where the app is open.

### 3. Turn on file uploads (Supabase Storage)

1. In the **SQL Editor**, paste `supabase/storage.sql` and click **RUN**. The script creates the **private** `project-attachments` bucket with a 50 MB per-file limit and the policies that let each user reach only their own folder. If the bucket already exists as public, it becomes private.
2. Done. Files open through **temporary signed links** (valid for 1 hour and renewed automatically), created only for their owner.

> If the bucket or policies are missing, the app saves the file locally (up to 2 MB) and you can upload it later with `SYNC TO CLOUD`.

**Size limits**: up to 50 MB per file in the cloud (the Supabase free plan maximum) and up to 2 MB per file kept on the device only.

Files are stored in the bucket as `<user_id>/<project_id>/<timestamp>_<file-name>`.

---

## 🛰️ Landing page (`landing/`)

A static page (HTML, CSS and JS with no build step) with a working Ctrl+K prompt, the 8 themes, the Matrix rain and the Sync Pro waitlist. The design plan and checks are in `landing/DESIGN.md`.

Two languages: English at the root (`/`) and Portuguese at `/pt/`. Browsers set to Portuguese are redirected to `/pt/`, and the EN/PT switch at the top remembers the choice.

### Publish on Netlify (second site, same repository)

1. In Netlify: **Add new site > Import an existing project** and pick this repository.
2. Set **Base directory** to `landing`. Everything else comes from `landing/netlify.toml` (build `node build-config.mjs`, publish the folder itself, security headers).
3. Under **Site configuration > Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as the app).
4. In Supabase, run `supabase/waitlist.sql` in the SQL Editor. Sign-ups show up in **Table Editor > waitlist**.

Without the variables, the page still works and the waitlist says it is turned off.

---

## 📂 Project structure

```
├── public/
│   ├── _redirects                 # SPA route fallback for Netlify
│   └── icon.svg, pwa-*.png, ...   # PWA icons, favicon and apple-touch-icon
├── scripts/
│   └── generate-png-icons.js      # Generates the PWA PNG icons
├── landing/                       # Static landing page (see landing/DESIGN.md)
├── supabase/
│   ├── schema.sql                 # projects table, RLS and indexes
│   ├── storage.sql                # Private attachments bucket and access policies
│   └── waitlist.sql               # Sync Pro waitlist (INSERT only with the public key)
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx          # Sign-in (email/password and Google) and project upload
│   │   ├── BackupModal.tsx        # Backup center, JSON download and upload
│   │   ├── CommandPalette.tsx     # CLI command prompt (Ctrl+K) & Quick-Find
│   │   ├── ManualModal.tsx        # Full manual of shortcuts and commands (man)
│   │   ├── MatrixRainCanvas.tsx   # Matrix digital rain canvas in the background
│   │   ├── OfflineIndicator.tsx   # Offline mode notice
│   │   ├── ProjectAttachments.tsx # Files tab: upload, viewers and attachment sync
│   │   ├── ProjectWorkspace.tsx   # Main project panel with tasks and tabs
│   │   ├── PWAInstallButton.tsx   # PWA install button and per-browser guide
│   │   ├── SettingsModal.tsx      # Preferences: color, language, rain, sound, reset
│   │   └── Sidebar.tsx            # Retro sidebar with projects and controls
│   ├── data/
│   │   ├── initialData.ts         # Sample projects (Portuguese) and untouched-sample detection
│   │   └── initialData.en.ts      # Sample projects in English (same ids)
│   ├── hooks/
│   │   ├── useOnlineStatus.ts     # Online/offline detection
│   │   └── usePWAInstall.ts       # Captures the PWA install prompt
│   ├── i18n/
│   │   ├── pt.ts / en.ts          # Interface text in Portuguese and English (same keys)
│   │   ├── index.tsx              # useT(), getT(), browser language detection
│   │   └── Rich.tsx               # Bold text and icons inside translated sentences
│   ├── lib/
│   │   ├── appInfo.ts             # Source code link and license shown in the app
│   │   └── supabase.ts            # Supabase client (off without environment variables)
│   ├── pwa/
│   │   └── installPrompt.ts       # Early install prompt capture and browser detection
│   ├── services/
│   │   ├── attachmentUrls.ts      # Temporary signed URLs for attachments
│   │   ├── storageService.ts      # Attachment upload/removal with local fallback
│   │   └── supabaseService.ts     # Project CRUD and mapping in Postgres
│   ├── sync/
│   │   ├── merge.ts               # Local vs cloud merge without data loss (pure function)
│   │   ├── syncState.ts           # Offline queue and sync metadata
│   │   └── useCloudSync.ts        # Batched uploads, retries and cross-device updates
│   ├── theme/
│   │   ├── themes.ts              # Color themes and OKLCH conversion
│   │   ├── basePalette.ts         # Base Matrix theme shades (generated)
│   │   └── palette.css            # Default --t-<hex> CSS variables (generated)
│   ├── utils/
│   │   ├── audio.ts               # Web Audio synth for sound feedback
│   │   └── tagColors.ts           # Deterministic terminal colors for #tags
│   ├── types.ts                   # TypeScript types
│   ├── App.tsx                    # Root component, global state, sync and shortcuts
│   └── main.tsx                   # App entry point
├── tests/
│   └── suite.test.ts              # Automated test suite
├── index.html                     # HTML entry with PWA meta tags
├── vite.config.ts                 # Vite, Tailwind and PWA config
└── package.json                   # Dependencies and scripts
```

### Adding or changing text

Every piece of interface text lives in `src/i18n/pt.ts` and `src/i18n/en.ts`. `en.ts` is typed against `pt.ts`, so a missing key or a different parameter fails `npm run lint`, and the test suite checks both files have the same shape. In components use `const t = useT()`; outside React (sync and storage messages) use `getT()`.

---

## 🔒 Privacy & security

- **Local mode (signed out)**: no project data or file leaves your browser.
- **Storage full warning**: if the browser's `localStorage` fills up, the app tells you instead of failing silently.
- **Cloud mode (signed in)**: projects live in your Supabase project, protected by Row Level Security (each user only reaches their own rows).
- **Private attachments**: the `project-attachments` bucket is private. Files only open through temporary links (1 hour) created for the account owner.
- **Your data is yours**: download a `.json` backup at any time to keep custody of your information.

---

## 📄 License

Released under the **GNU Affero General Public License v3.0** (`AGPL-3.0-only`). See [LICENSE](LICENSE).

In short:
- You can use, study, change and host Operator, including for yourself or your company.
- If you distribute a modified version **or offer it as a service over the internet**, you must make the source code of those changes available under the same license.
- The app links to its source code in Preferences and in the Manual, as required by section 13 of the AGPL.
