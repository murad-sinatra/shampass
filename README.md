# ShamPass

Mobile-first booking for intercity buses in Syria. Search a route such as Damascus to Swida, pick a departure, choose a seat (economy, comfort, or premium — each seat has its own fare), pay with ShamCash, Visa, or Mastercard, and board with a QR ticket.

This is a demo. Checkout never contacts a bank or ShamCash, and nothing is charged. Tickets stay in this browser.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints. The dev server listens on port 5173.

```bash
npm run check
npm run build
```

## Stack

React 19, TypeScript, and Vite. Interface components come from [mors-component-library](https://github.com/murad-sinatra/mors-component-library). The package exports a built `dist/` that is not in the Git tree, and npm’s Git installer honors the `files` list, so the dependency is the source tarball for commit `0a2163e`. `vite.config.ts` resolves the public entry to that source.

Sample card numbers for the demo form: Visa `4242 4242 4242 4242`, Mastercard `5555 5555 5555 4444`. Any future expiry and any 3-digit CVC. ShamCash accepts a Syrian mobile (`09xxxxxxxx`) and any 6-digit code.
