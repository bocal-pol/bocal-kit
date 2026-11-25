---
name: instagram-reel
description: "Write an Instagram Reel from a raw idea: hook options off 26 formulas, spoken script, on-screen text and a timed beat sheet, in the user's own voice and scored before shooting. Use when the user wants a Reel, a short-form video script, a hook or a voiceover, says 'make a reel about X', or is about to record without a first line."
model: claude-sonnet-5-5
user-invocable: true
type: domain
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# instagram-reel

> Adapted from [instagram-agent-skill](https://github.com/Jakeschincariol/instagram-agent-skill) by Jake Schincariol (MIT licence) — see `CREDITS.md`.

Turns one raw idea into a Reel that somebody finishes.

Two tools live in this folder and they both actually run. Use them. Do not
eyeball the hook and do not guess at the length.

```bash
python3 ~/.claude/skills/instagram-reel/hookscore.py hooks.txt              # rank your hook options
python3 ~/.claude/skills/instagram-reel/hookscore.py --hook "one line"      # score a single one
python3 ~/.claude/skills/instagram-reel/beats.py script.txt --target 30     # timed beat sheet before you shoot
```

## Before you write

1. Read `~/.claude/instagram/voice.md` if it exists. That is the user's voice
   profile: how they talk on camera, what they never say, who they are talking
   to. If it does not exist, ask for **three of their own reels**, transcribe or
   read them, infer the voice, and write the file. A script in the wrong voice
   is unusable, because they have to say it out loud.
2. Read `~/.claude/skills/instagram-reel/hooks.json`. 26 formulas, each with a
   template, a filled example, the on-screen version, what it is for, and how it
   gets ruined. Four of them are in there because they kept turning up in real
   hooks, not because they completed a pattern.
3. If the idea is thin, do not pad it. Ask one batched question: what happened,
   to whom, and what did it cost or return. A Reel needs one specific true
   thing. Get it before writing.
4. If `~/.claude/instagram/swipe.md` exists, read it. The `instagram-viral`
   skill writes that file, and it is the user's own evidence about which
   formulas are working in their niche right now. It beats the defaults in this
   file.

## The shape

A Reel is decided in the first two seconds and kept by the next five.

```
0:00 - 0:02   HOOK        the claim. Spoken line and on-screen line, written
                          separately. Motion in the first frame, not a static face.
0:02 - 0:07   THE STAKE   why this matters to the person watching. One line.
0:07 - ...    THE BODY    one idea per beat, and the frame changes every beat.
LAST 3s       THE PAYOFF  deliver what the hook promised, then the single ask.
LAST LINE     THE LOOP    echo one word from the hook so the replay lands clean.
```

Length: 15 to 45 seconds is the working range. Reels run to 3 minutes (upstream
finding, 2026; verify) and almost nobody should use it. Under 7 seconds the loop
counts inflate and nothing else does.

## The loop

**1. Pick three hooks, not one.** Run the idea through `hooks.json`, choose
three formulas that genuinely fit it, and write the spoken line plus the
on-screen line for each. Different formulas, not three rewrites of one.

**2. Score them.** Put the three spoken lines in a file, one per line, and run
`hookscore.py`. Show the user the ranking. If the top one is under 50, you do
not have the hook yet and no amount of editing fixes that.

**3. Write the script** on the winning hook. Plain spoken language, the way the
user actually talks. Contractions. Short lines. No sentence they would have to
rehearse.

**4. Time it.** Run `python3 ~/.claude/skills/instagram-reel/beats.py script.txt --target {length}`.
Fix every flag: a hook past 3 seconds, any beat over 4 seconds, a run of beats
with nothing concrete in them, no loop. Re-run until it is clean.

**5. Humanize it.** Call the `instagram-humanizer` skill on the script before
showing it. A written-sounding line is obvious the moment someone says it out
loud.

**6. Print the block.** The script in a fenced block, the on-screen text as a
separate list with timings, and then:

```
REEL READY
hook:       #3 Nobody Tells You, scored 86 STRONG
length:     28.4s across 9 beats at 165 wpm
on-screen:  6 cards
humanizer:  4 artefacts stripped, human score 81 PASS
caption:    call the instagram-caption skill next

Reply "yes" to log it, or tell me what to change.
```

**7. Never publish.** This skill produces a script. The user shoots it and
posts it. On "yes", append to `~/.claude/instagram/log.md` with the date, the
hook formula used and the first line, so the `instagram-audit` skill has a
history later.

## On-screen text is a separate script

Write it separately, every time. It is read before it is heard.

- **Six words or fewer per card.** It is being read at arm's length by someone
  who is not listening yet.
- **The hook card is up at frame 1**, not after a beat of silence.
- **Keep it inside the safe zone.** On a 1080x1920 frame, nothing above y=230
  or below y=1440, and keep the right 230 pixels clear. The interface sits on
  top of everything outside that box: the caption, the action rail, the audio
  strip.
- **Never put the hook where the caption sits.** That is the bottom of the
  frame and it is covered.
- **Burn in captions for the body.** Most people watch muted first.

## Rules that make the difference

- **One idea per Reel.** If the script has two, you have two Reels. Say so.
- **Numbers over adjectives.** "$4,200" beats "a lot". If the user has not
  given a number, ask for one rather than writing around the hole.
- **Cut the intro.** No greeting, no "in this video", no name, no logo sting.
  The video starts at the sentence you would normally reach at second six.
- **Change the frame every beat.** A static shot for 8 seconds is where people
  leave, and `beats.py` will flag it.
- **One ask at the end.** Comment a keyword, save it, or follow. One.
- **Never fabricate.** No invented metrics, clients, revenue or outcomes under
  the user's name, even as a placeholder. If a number is needed and unknown,
  leave `{{your number}}` in the script and flag it.
- **Do not write a script around a trending audio the user cannot use.** If the
  idea needs the user's own voice, say so.

## Optional input (scheduled task or orchestrator)

If the topic, the voice and the constraints are already in the request, ask no question and write no file outside the reply unless the request says so.
If the scripts are not reachable (scheduled task in the cloud), apply the rules by hand and say the score is estimated, not computed.
Otherwise run the normal workflow above.

## Example

```
/instagram-reel we cut proposal time from 5 hours to 20 minutes with one template
```

```
HOOKS  (scored)
  86  STRONG  #5  Time Collapse   "Proposals used to take me five hours. Twenty minutes now."
                                  on screen: 5 HOURS -> 20 MIN
  71  STRONG  #1  Cost Confession "I billed four hours a week for formatting. For two years."
                                  on screen: 2 YEARS WASTED
  54  OK      #9  The Steal       "Steal the proposal template that did it."
                                  on screen: STEAL THIS

Shooting #5: the ratio is believable, it reads in one glance on screen,
and the number is yours.
```
