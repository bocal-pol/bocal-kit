# Asset rights and provenance

Use this reference for generated, purchased, commissioned, open, or remixed assets. This is a
production record-keeping workflow, not legal advice.

## Record per delivered asset

- stable asset ID and repository path
- creator/source URL or vendor order
- acquisition or generation date
- source tool/model/version when generated
- prompt/reference IDs of origin when available
- license name/version and a saved copy or link to the terms
- attribution text and placement requirements
- whether commercial use, modification, redistribution, or AI training is restricted
- edits, derivatives, and the person/tool responsible
- approval status and reviewer

The provided `assets/asset-manifest.json` has fields for these records. Keep proof of purchase
and license snapshots out of a public repository when they contain personal or account data.

## Decision rules

1. Don't treat "free", "royalty-free", visible on a search engine, or model-generated as a
   license.
2. Check terms at the original source, not a repost or an aggregator preview.
3. Keep attribution through atlas packing, renaming, conversion, and derivative edits.
4. Check whether a marketplace license allows redistributing raw source files; shipping a game
   and publishing editable source assets can have different permissions.
5. Don't ask for direct imitation of a living artist. Describe visual properties or use
   references the project has permission to edit.
6. Preserve content-credentials/provenance metadata where the file pipeline supports it. If
   optimization strips metadata, keep the matching manifest record.
7. Review each store/platform's current disclosure rules before submission; rules change
   faster than this skill. Steam's Content Survey has a mandatory generative-AI section that
   separates content made during development from content generated while the game runs.
   Record which assets were generated so this section can be filled from the manifest, not
   from memory.

## Useful primary references

- Creative Commons license chooser
- SPDX license list
- C2PA (Content Credentials) specifications
- OpenAI content provenance
- Steamworks Content Survey, including its generative-AI section

When terms are unclear or the output is commercially significant, flag the ambiguity for a
human rights review rather than guessing.
