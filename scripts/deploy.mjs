// Deploys contracts/bounty_verifier.py to GenLayer Studio's testnet
// (studionet). Swap `studionet` for `localnet` if you're running the
// local simulator instead (npm install -g genlayer && genlayer up).
//
// Usage:
//   GENLAYER_PK=0xyourtestnetprivatekey node scripts/deploy.mjs

import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { readFileSync } from "fs";

const PRIVATE_KEY = process.env.GENLAYER_PK;

if (!PRIVATE_KEY) {
  console.error("Set GENLAYER_PK to a funded testnet private key first.");
  process.exit(1);
}

async function main() {
  const account = createAccount(PRIVATE_KEY);
  const client = createClient({ chain: studionet, account });

  // Required once per network before contracts can be deployed/called.
  await client.initializeConsensusSmartContract();

  const code = readFileSync(
    new URL("../contracts/bounty_verifier.py", import.meta.url),
    "utf-8"
  );

  const hash = await client.deployContract({
    code,
    args: [],
    leaderOnly: false,
  });

  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 50,
    interval: 5000,
  });

  const address = receipt.data?.contract_address;
  console.log("Deployed BountyVerifier at:", address);
  console.log("Paste this into frontend/app.js as CONTRACT_ADDRESS.");
}

main().catch((err) => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
