# Contributing

Thanks for helping improve Frontend Design Ultra.

## What Makes A Good Contribution

- A rule that changes agent behavior.
- A clearer routing decision.
- A better output contract.
- A stronger accessibility, performance, mobile, or evidence gate.
- A smaller wording that preserves or improves behavior.

## What To Avoid

- Generic frontend advice.
- Long essays.
- Repeated rules already covered by the dispatcher.
- Tool-specific instructions that fail when the tool is unavailable.
- Aesthetic rules that weaken accessibility, performance, or responsiveness.

## Pull Request Checklist

- The installable skill still validates.
- Public docs do not expose private construction notes.
- New rules are specific, actionable, and worth their tokens.
- Examples use realistic frontend requests.
- Any new reference file is lazy-loaded by a clear routing rule.

## Validation

Run the Codex skill validator against the installable folder:

```powershell
python "$env:USERPROFILE\.codex\skills\.system\skill-creator\scripts\quick_validate.py" ".\frontend-design-ultra"
```

