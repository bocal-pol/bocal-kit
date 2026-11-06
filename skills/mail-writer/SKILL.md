---
name: mail-writer
description: Writing professional emails in a formal/administrative register — hierarchy, suppliers, colleagues, partners. Formal / neutral / urgent registers depending on context.
model: claude-sonnet-5
user-invocable: true
aliases: []
argument-hint: "[email subject]"
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# Mail Writer — Writing Professional Emails

Writes professional emails adapted to context (generic formal/administrative register by default, adjustable).

## Phase 0 — Scoping

1. Recipient (hierarchy / supplier / colleague / external partner)
2. Subject in one sentence
3. Tone (formal / neutral / direct / urgent)
4. Key points to include
5. Expected action (for info / reply / approval / action)

## Opening formulas

| Recipient | Formula |
|---|---|
| Hierarchy (Director, department head) | "Dear [Title]," |
| Colleague (same level) | "Dear colleague," |
| Supplier | "Dear Sir or Madam," |
| Informal technical | "Hi [First name]," |

## Structure

```
Subject: [...]

[Opening formula],

[Context in 1-2 sentences]

[Body — structured points, max 3 paragraphs]

[Expected action — precise, with a deadline if applicable]

[Closing formula]

[Signature]
```

## Closing formulas

| Register | Formula |
|---|---|
| Formal hierarchy | "Please accept, [Title], my respectful regards." |
| Standard formal | "Looking forward to your response, kind regards." |
| Neutral | "Best regards," |
| Urgent | "Thank you for your attention to this request," |

## Optional save

`documents/mails/YYYY-MM-DD_[short-subject].md`
