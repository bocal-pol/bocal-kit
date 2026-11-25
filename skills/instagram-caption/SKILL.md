---
name: instagram-caption
description: "Write the Instagram caption: the line that survives the '... more' cut, the body, the single ask, the search terms and the hashtags, then lint it before it goes out. Use when the user says 'write the caption', 'caption this', 'what do I put in the description', has a reel or carousel ready and needs the text, or asks about hashtags."
model: claude-sonnet-5-5
user-invocable: true
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# instagram-caption

> Adapted from [instagram-agent-skill](https://github.com/Jakeschincariol/instagram-agent-skill) by Jake Schincariol (MIT licence) — see `CREDITS.md`.

One tool lives in this folder and it runs:

```bash
python3 ~/.claude/skills/instagram-caption/caption.py caption.txt
python3 ~/.claude/skills/instagram-caption/caption.py caption.txt --keywords "client proposals,agency pricing"
```

It prints the caption the way the feed prints it: the first 125 characters
(upstream finding, 2026; verify) in a box, everything else behind the tap. Read
that box before you read anything else you wrote.

## First, decide which job this caption has

This is the decision that ruins captions when it is skipped.

**Job A: the video already hooked them.** A Reel carries its own hook in the
first two seconds, spoken and on screen. The caption is not a second hook and
competing with the video is how you lose both. Its job is the ask, the context
that makes the ask make sense, and the words people search.

**Job B: the caption is the content.** A photo, a single image, a carousel
cover that opens a loop. Here line one is the hook and it works exactly like a
Reel hook: concrete, short, and cut off at a cliff rather than mid-clause.

Ask which one you are writing. If the user has a Reel with a strong hook,
write A and say why.

## The shape

```
Line 1      125 characters of visible space. Job A: the ask, plainly.
            Job B: the hook.
            Never a greeting, never a hashtag, never an emoji as the first
            character.
Body        short paragraphs, one line of white space between each. Two to six
            of them. This is where the search terms live.
The ask     one. Comment a keyword, save it, or DM. One.
Hashtags    up to five, on their own line at the bottom, or none.
```

Limit is 2,200 characters and almost nothing needs 2,200. A caption that earns
the tap and then delivers 600 characters beats one that delivers 1,800.

## Hashtags, honestly

Hashtags are topic labels, not a reach lever. Use five at most (upstream
finding, 2026; verify), specific to the post, and no generic tags.

If the user has a block of twenty saved in their notes app, that block is dead
weight and the linter will fail it.

`#viral`, `#fyp`, `#explorepage`, `#foryou` describe nothing. Cut them.

## Search terms matter more than hashtags now

Instagram search reads the caption text. So the phrase the user wants to be
found for goes in the caption as a phrase a human would type, in a sentence
that reads normally. "Client proposals" as words in line three, not
"#clientproposals" in a block at the bottom.

Ask for two or three of those terms, then pass them to the linter:

```bash
python3 ~/.claude/skills/instagram-caption/caption.py draft.txt --keywords "client proposals,agency pricing"
```

## Rules

- **No link in the caption.** Captions are not clickable. A URL in the body is
  dead text that says "I do not use this platform". Bio or DM.
- **One ask.** Two asks is the same as none. `caption.py` counts them.
- **The keyword ask needs a keyword people can type.** One word, no spaces, no
  emoji, and say it out loud in the video too. `Comment CONTRACT` works.
  `Comment "the contract guide"` does not.
- **Write the first comment separately** if there is a link. Say so in the
  receipt.
- **Emoji as punctuation, not decoration.** The linter flags anything over
  4 per 100 characters.
- **Alt text is worth 20 seconds.** For carousels and photos, write it. It is
  read by screen readers and by Instagram.

## Optional input (scheduled task or orchestrator)

If the topic, the voice and the constraints are already in the request, ask no question and write no file outside the reply unless the request says so.
If the script is not reachable (scheduled task in the cloud), apply the rules by hand and say the lint result is estimated, not computed.
Otherwise run the normal workflow below.

## The loop

1. Decide Job A or Job B and say which.
2. Draft it.
3. Call the `instagram-humanizer` skill on it. Captions are short, so slop is
   louder here than anywhere else in the pack.
4. Run `caption.py` with the user's search terms. Fix every FAIL. Decide on
   every WARN out loud rather than silently.
5. Print the copy-ready block, then the receipt:

```
CAPTION READY
job:        A - the reel carries the hook
visible:    118 of 125 characters used before the cut
ask:        one, comment CONTRACT
hashtags:   3
search:     "client proposals" in line 3, "agency pricing" in line 5
linter:     READY
```

Nothing is posted. The user pastes it.
