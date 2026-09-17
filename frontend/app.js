// Live wiring for Verdikt's case panel. Uses genlayer-js from a CDN so
// this runs with zero build step — good for a hackathon demo. For a
// production build, `npm install genlayer-js` and import it normally
// through your bundler instead.

import { createClient, createAccount } from "https://esm.sh/genlayer-js";
import { studionet } from "https://esm.sh/genlayer-js/chains";

// ---- CONFIG -----------------------------------------------------------
// Paste the address you got from deploying the contract here.
const CONTRACT_ADDRESS = "0x7344342e5313c3A6dde0DD8D9236D62283CCC193";
// -------------------------------------------------------------------

let account = null;
let client = null;
let currentCaseId = null;

const els = {
  connectBtn: document.getElementById("connect-btn"),
  connectStatus: document.getElementById("connect-status"),
  copyBtn: document.getElementById("copy-address-btn"),
  panel: document.getElementById("case-panel"),
  form: document.getElementById("file-case-form"),
  specInput: document.getElementById("spec-input"),
  urlInput: document.getElementById("url-input"),
  claimantInput: document.getElementById("claimant-input"),
  payoutInput: document.getElementById("payout-input"),
  statusEl: document.getElementById("case-status"),
  titleEl: document.getElementById("case-title-text"),
  descEl: document.getElementById("case-desc-text"),
  resolveBtn: document.getElementById("resolve-btn"),
  validatorEls: [...document.querySelectorAll(".v-mark")],
  stampEl: document.getElementById("stamp"),
  newCaseBtn: document.getElementById("new-case-btn"),
};

function setPanelState(state) {
  els.panel.classList.remove("state-idle", "state-filed", "state-resolved");
  els.panel.classList.add(`state-${state}`);
}

function genCaseId() {
  return "case-" + Date.now();
}

const DEMO_PRIVATE_KEY = "0x9ca5a3023309c79fb164e11e71746eed5a952ea3ae757a0073529fb0781bcc09";

async function connect() {
  account = createAccount(DEMO_PRIVATE_KEY);
  client = createClient({ chain: studionet, account });

  els.connectStatus.textContent = `Connected as ${account.address.slice(0, 6)}…${account.address.slice(-4)}`;
  els.connectBtn.disabled = true;
  els.form.querySelector("button[type=submit]").disabled = false;

  els.copyBtn.style.display = "inline-block";
  els.copyBtn.dataset.address = account.address;

  console.log(
    "Demo account created. Fund it from the GenLayer Studio faucet to actually send transactions:",
    account.address
  );
}

async function fileCase({ spec, submissionUrl, claimant, payoutWei }) {
  const caseId = genCaseId();
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "file_case",
    args: [caseId, spec, submissionUrl, claimant],
    value: BigInt(payoutWei || 0),
  });
  await client.waitForTransactionReceipt({
    hash,
    status: "ACCEPTED",
    retries: 50,
    interval: 3000,
  });
  return caseId;
}

async function resolveCase(caseId) {
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: "resolve_case",
    args: [caseId],
    value: 0n,
  });
  // FINALIZED because we actually need the validator-consensus result,
  // not just the leader's initial proposal.
  await client.waitForTransactionReceipt({
    hash,
    status: "FINALIZED",
    retries: 100,
    interval: 5000,
  });
}

async function getCase(caseId) {
  const raw = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: "get_case",
    args: [caseId],
  });
  return JSON.parse(raw);
}

// ---- Event wiring -------------------------------------------------

els.connectBtn.addEventListener("click", connect);

els.copyBtn.addEventListener("click", async () => {
  const address = els.copyBtn.dataset.address;
  if (!address) return;

  try {
    await navigator.clipboard.writeText(address);
    const original = els.copyBtn.textContent;
    els.copyBtn.textContent = "Copied!";
    setTimeout(() => { els.copyBtn.textContent = original; }, 1500);
  } catch (err) {
    console.error("Copy failed:", err);
  }
});

els.form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!client) return;

  els.statusEl.textContent = "FILING…";
  els.validatorEls.forEach((v) => v.classList.remove("checked"));
  els.stampEl.style.display = "none";
  els.newCaseBtn.style.display = "none";

  try {
    currentCaseId = await fileCase({
      spec: els.specInput.value,
      submissionUrl: els.urlInput.value,
      claimant: els.claimantInput.value,
      payoutWei: els.payoutInput.value,
    });

    els.titleEl.textContent = `Case No. ${currentCaseId}`;
    els.descEl.textContent = "Claim: does the submission meet the agreed spec?";
    els.statusEl.textContent = "FILED — READY FOR REVIEW";
    setPanelState("filed");
  } catch (err) {
    console.error(err);
    els.statusEl.textContent = "ERROR — SEE CONSOLE";
  }
});

els.resolveBtn.addEventListener("click", async () => {
  if (!currentCaseId) return;

  els.statusEl.textContent = "VALIDATORS REVIEWING…";
  els.resolveBtn.disabled = true;

  try {
    await resolveCase(currentCaseId);

    // Reveal checkmarks as we confirm each part of the real result —
    // purely a UX staggering, the underlying data is already final.
    for (const v of els.validatorEls) {
      await new Promise((r) => setTimeout(r, 350));
      v.classList.add("checked");
    }

    const caseData = await getCase(currentCaseId);
    const approved = caseData.verdict === "approve";

    els.statusEl.textContent = `RESOLVED — ${caseData.verdict.toUpperCase()}`;
    els.stampEl.textContent = approved
      ? "VERDICT REACHED — RELEASE PAYMENT"
      : "VERDICT REACHED — CLAIM REJECTED";
    els.stampEl.classList.toggle("stamp-approve", approved);
    els.stampEl.classList.toggle("stamp-reject", !approved);
    els.stampEl.style.display = "block";
    els.stampEl.title = caseData.reasoning;

    setPanelState("resolved");
    els.newCaseBtn.style.display = "block";
  } catch (err) {
    console.error(err);
    els.statusEl.textContent = "ERROR — SEE CONSOLE";
  } finally {
    els.resolveBtn.disabled = false;
  }
});

els.newCaseBtn.addEventListener("click", () => {
  currentCaseId = null;
  els.form.reset();
  els.validatorEls.forEach((v) => v.classList.remove("checked"));
  els.stampEl.style.display = "none";
  els.stampEl.classList.remove("stamp-approve", "stamp-reject");
  els.newCaseBtn.style.display = "none";
  els.statusEl.textContent = "NO ACTIVE CASE";
  setPanelState("idle");
});