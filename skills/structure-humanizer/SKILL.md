---
name: structure-humanizer
description: Writes or corrects a text so that its structure no longer shows AI authorship, based on the StoryScope study. Use it for a story, a post or an email, before or after the first draft. It complements no-ai-slop, which treats the surface (words, tics), while this skill treats the structure.
type: specialized
model: claude-sonnet-5-5
priority: medium
scope: cross
dependencies: []
conflicts: []
---

# structure-humanizer

You write like a person, not like a model. Words are easy to correct. Structure is not. This skill
treats the structure. For vocabulary, punctuation and surface tics, use `no-ai-slop` as a second step.

## Why structure

StoryScope (Russell, Rajendhran, Pham, Iyyer, Wieting, arXiv 2604.03136, COLM 2026) took one prompt
from each of 10,272 short stories by human authors. It gave each prompt to five models (Claude
Sonnet 4.6, GPT-5.4, Gemini 3 Flash, DeepSeek V3.2, Kimi K2.5). The result: 61,608 stories, with 304
narrative traits measured on each.

- With no style trait at all, structure alone identifies the AI text at 93.2% (macro-F1).
- An automatic rewrite of 278 Gemini stories, guided by examples from professional writers (the LAMP
  method), removes clichés, inflated prose and surplus explanation. It lowers detection by only 1.6
  points (95.5% to 93.9%). Long dashes are also surface: removing them does not change the structure.
- The five models write in the same zone. Human authors are more spread out and more rare.

## The seven checks

The figures show the share of human stories against the average of the five models.

1. **The stated moral.** The narrator explains the meaning of the story in 77% of AI texts and 52% of
   human texts. State the idea one time, where it hits hardest, or not at all. Never end with a
   sentence that draws the lesson. Leave at least one example without interpretation.
2. **Emotion played by the body.** Tight throat, held breath, pounding heart: 81% of AI texts and 38%
   of human texts. Humans name the emotion three and a half times more often (29% against 8%). Write
   "I was afraid" or "it made me angry". Keep the physical detail for one moment, and only if that
   moment earns it.
3. **The story that is too straight.** No side thread in 79% of AI texts (57% of human texts). The
   ending is settled by a decision of the hero in 69% of AI texts (46% of human texts), or by a
   realization in 47% (27%). Add a digression that does not serve the thesis. Leave one question
   without an answer. Or stop just after the peak moment, with no epilogue.
4. **Vague allusions.** 72% of AI texts stay in allusion ("a famous book", "experts", "recently"),
   against 50% of human texts. They name a specific work half as often (24% against 47%). Put in the
   title, the name, the brand, the city, the price, the date.
5. **The setting that thinks for the character.** Rain when he is sad. The smell of coffee in each
   scene (82% of AI texts mention a smell, 57% of human texts). Cut the filler atmosphere. A place can
   be only a place.
6. **The entrance portrait.** Introducing a character by looks or by past: 52% of AI texts, 30% of
   human texts. Make the character enter while he acts or speaks.
7. **The ignored reader.** Humans address the reader about four times more often. Once in the text,
   admit that someone is reading ("you will think this is silly", "I know what you think"). This is a
   spice, not a method.

## The tics of each model

Know who wrote the draft.

- **Claude**: the tension rises less than in all other models. An epilogue follows the real ending.
  The ending is calm. Dream scenes are rare. Vary the intensity, cut the epilogue, and sometimes stop
  on the peak.
- **GPT**: gossip and rumor as the engine (64% of its stories). The distant look ("years later, I
  understand"). Move the camera closer and cut the hindsight.
- **Gemini**: introduces characters by their looks. The tidiest endings. The darkest settings. Make
  the character act before you describe him, and untie the final knot.

## The method

1. **Skeleton first.** Before you touch a sentence, list the steps of the text in order. Note where
   the moral is stated and how many times. Note if time is linear. Note what is resolved and how many
   digressions exist. Note each emotion and how it is shown. Note the named references and the vague
   ones.
2. **The seven checks**, one by one, on the skeleton.
3. **One or two interventions, no more.** Choose from the list below, based on the text. If you apply
   all of them at once, you build a new mold. The study shows that the shared mold gives the text away.
4. **Rewrite the structure.** Move parts, cut the ending, remove repeated points. Do not only polish.
5. **Check against the trap.** If your correction looks like the correction of the previous text,
   change it.

If the request is a writing request that follows `/structure-humanizer`, apply all of this from the
first draft and deliver only the text. If the request gives a text to correct, deliver the rewritten
text. Then add, in three lines at most, what you changed.

## The interventions (one or two per text, never the same two twice in a row)

- Start with the end, then go back.
- Open in the middle of a scene. The context comes later.
- Delay the figure, the name or the result on which everything rests.
- Bring back a detail from the start with a different meaning.
- A digression that echoes the subject without serving it, and without a link back to it.
- A question asked and left open.
- End with both feelings intact instead of a lesson.
- Replace each allusion with a real thing that a reader can check.
- Name the emotion instead of playing it.
- End on the peak, with no epilogue.

## What this skill does not do

It does not correct vocabulary or punctuation (long dashes, fashionable words, the rule of three).
Pass those in a second step with `no-ai-slop`. It does not make a text undetectable. Nothing does.
The study covers fiction of about 5,000 words in English. To apply it to a post, an email or a sales
page is an extrapolation. The extrapolation is reasonable for checks 1, 2, 4 and 7.
