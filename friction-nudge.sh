#!/usr/bin/env bash
# friction-nudge.sh — hook UserPromptSubmit
# Détecte un message qui corrige l'approche de Claude (« non », « pas ça », « arrête »,
# « je vois toujours… ») et rappelle d'appeler `retro` en capture courte.
#
# Pourquoi un hook : la règle « capture continue des frictions » de CLAUDE.md est en prose, et
# l'analyse de 14 jours de séances a montré 6 corrections pour 2 appels à `retro`. Un hook se
# déclenche à chaque message, le modèle ne s'en souvient pas de façon fiable.
#
# Entrée : JSON sur STDIN (champ `prompt`). Sortie : sur STDOUT, du texte ajouté au contexte du
# modèle (comportement documenté de UserPromptSubmit). Ne bloque jamais : sortie 0 dans tous les cas.
set -uo pipefail

INPUT=$(cat)
command -v node >/dev/null 2>&1 || exit 0

MSG=$(printf '%s' "$INPUT" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  try{const p=(JSON.parse(s).prompt||"").trim();
    // début de message uniquement : « non » au milieu d une phrase n est pas une correction
    const re=/^(non\b|pas ça|pas comme|ce n.est pas|c.est pas|arrête|stop\b|plutôt|c.est faux|tu as oublié|je vois toujours|toujours pas|no[,. ]|wrong|that.s not|not what)/i;
    if(p.length<400&&re.test(p))process.stdout.write("1");}catch(e){}
});' 2>/dev/null)

if [ "$MSG" = "1" ]; then
  echo "Friction probable : le message de l'utilisateur corrige l'approche. Appeler l'outil Skill avec retro en capture courte maintenant (sans attendre la fin de la tâche), puis reprendre la tâche. Si le message n'est pas une correction, ignorer ce rappel."
fi
exit 0
