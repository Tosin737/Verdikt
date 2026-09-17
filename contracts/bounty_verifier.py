# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json


@gl.evm.contract_interface
class _Recipient:
    class View:
        pass

    class Write:
        pass


class BountyVerifier(gl.Contract):
    cases: TreeMap[str, str]

    def __init__(self):
        self.cases = TreeMap()

    @gl.public.write.payable
    def file_case(self, case_id: str, spec: str, submission_url: str, claimant: Address):
        case = {
            "spec": spec,
            "submission_url": submission_url,
            "claimant": claimant.as_hex,
            "payout_amount": gl.message.value,
            "status": "filed",
            "verdict": None,
            "reasoning": None,
        }
        self.cases[case_id] = json.dumps(case)

    @gl.public.write
    def resolve_case(self, case_id: str):
        case = json.loads(self.cases[case_id])
        assert case["status"] == "filed", "Case already resolved"

        spec = case["spec"]
        submission_url = case["submission_url"]

        def judge():
            evidence = gl.nondet.web.render(submission_url, mode="text")
            return json.dumps({"spec": spec, "evidence": evidence})

        raw = gl.eq_principle.prompt_non_comparative(
            judge,
            task=(
                'Based on the input JSON containing "spec" and "evidence", '
                'decide whether the evidence satisfies the spec closely enough '
                'to approve payment. Respond ONLY with JSON in this exact '
                'format: {"verdict": "approve" or "reject", "reasoning": '
                '"one or two sentences"}'
            ),
            criteria="""
                The output is valid JSON with a "verdict" field that is
                exactly "approve" or "reject", and a "reasoning" field.
                The verdict genuinely reflects whether the evidence
                satisfies the spec — be strict but fair.
            """,
        )
        verdict_data = json.loads(raw)

        case["status"] = "resolved"
        case["verdict"] = verdict_data["verdict"]
        case["reasoning"] = verdict_data["reasoning"]
        self.cases[case_id] = json.dumps(case)

        if verdict_data["verdict"] == "approve":
            _Recipient(Address(case["claimant"])).emit_transfer(value=case["payout_amount"])

    @gl.public.view
    def get_case(self, case_id: str) -> str:
        return self.cases[case_id]