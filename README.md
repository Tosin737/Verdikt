# Verdikt

An agentic dispute-resolution layer for on-chain communities, built on
GenLayer's Intelligent Contracts. This demo covers Case Type No. 001 —
bounty verification.

```
verdikt/
  contracts/
    bounty_verifier.py   # the Intelligent Contract (Python, runs in GenVM)
  scripts/
    deploy.mjs            # deploys the contract via genlayer-js
  frontend/
    index.html             # landing page + live case panel
    app.js                  # wires the panel to the deployed contract
  package.json
```

## 1. Install dependencies

```bash
npm install
```

## 2. Get a testnet account

Create a GenLayer Studio account and grab a funded testnet private key
from the faucet: https://studio.genlayer.com

## 3. Deploy the contract

```bash
GENLAYER_PK=0xyourtestnetprivatekey npm run deploy
```

This prints a deployed contract address. Copy it.

## 4. Wire up the frontend

Open `frontend/app.js` and paste the address in:

```js
const CONTRACT_ADDRESS = "0xPASTE_YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

## 5. Serve the frontend

`app.js` uses ES module imports, so it needs to be served over HTTP —
opening `index.html` directly with `file://` won't work.

```bash
npm run serve
```

Then open the URL it prints (usually `http://localhost:3000`).

## 6. Try it

1. Click **Connect demo wallet** — this creates a throwaway signing
   account in the browser and logs its address to the console. Fund it
   from the same Studio faucet so it can pay for transactions.
2. Fill in the case form: a spec, a link to the submitted work (a real
   PR or page the validators can actually fetch and read), a claimant
   address, and a payout amount in wei.
3. Click **File case** — this sends a real `file_case` transaction and
   escrows the payout in the contract.
4. Click **Resolve case** — this triggers `resolve_case`. Validators
   fetch the linked evidence, reason over it against the spec, and
   reach consensus through GenLayer's Optimistic Democracy. The panel
   reflects the real on-chain verdict once it lands — approve releases
   the payout automatically, reject does not.

## Notes

- The demo signer created by "Connect demo wallet" is for testing
  only — swap it for a real wallet connector before this goes anywhere
  near production funds.
- `gl.eq_principle.prompt_non_comparative` is used because approving a
  bounty is a subjective judgment call, not something with one exactly
  reproducible output — validators just need to agree on the
  substance of the verdict, not the exact wording of their reasoning.
- Case Types No. 002 (Moderation Appeal) and No. 003 (Reputation
  Dispute) follow the same pattern: new evidence, new prompt, same
  file → resolve → verdict flow.
