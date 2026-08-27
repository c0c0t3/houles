Voici les questions à poser, organisées pour deux devs — regroupées par sujet technique pour qu'ils puissent se répartir les réponses. J'ai formulé chaque question de façon à obtenir une réponse actionnable, pas un "oui" vague.

---

### Bloc 1 — L'objet de configuration (le plus important)

C'est le contrat central. Sans ça, tu ne peux pas figer ce que ton front produit.

1. **La structure de l'objet sérialisé** : votre `sauvegarder()` fait un `serialize($this)`. Vous pouvez me donner la **classe PHP** (ou au moins la liste des propriétés) de cet objet ? Je veux les noms exacts des champs : options, articles, coupes, coloris, longueur, quantités... tout ce qui est dans l'objet.

2. **Le niveau de détail des articles** : dans l'objet, un article c'est quoi exactement — juste un code article + quantité ? Ou vous stockez aussi le prix, le coloris, le libellé au moment de la sauvegarde ?

3. **Les "coupes"** (découpes de tubes) : elles sont stockées comment dans l'objet ? C'est le résultat du calcul (nb de tubes + raccords), ou les longueurs brutes ?

---

### Bloc 2 — Le point de jonction front ↔ JS

Comment vos deux JS se parlent au moment de la validation.

4. **Le mécanisme d'accroche** : quand l'utilisateur valide sa config, votre JS récupère la sélection **comment** ? Vous préférez que j'émette un événement custom (`syh:add-to-cart`) que vous écoutez, que j'expose une fonction que vous appelez, ou que je pose des data-attributes que vous lisez ? Je m'adapte, dites-moi ce qui s'intègre le mieux dans votre code.

5. **Le format d'entrée de votre Ajax** : votre appel Ajax de sauvegarde attend quoi en entrée — l'objet complet en JSON ? Un format particulier ? C'est ce format qui doit matcher ce que je vous transmets.

---

### Bloc 3 — Le rechargement de config

Le sens client → front, plus subtil.

6. **Le format au rechargement** : quand vous rechargez une config (panier ou "mon compte"), vous me redonnez quoi — l'objet désérialisé tel quel ? Dans quelle structure ? (Idéalement la même que celle de sauvegarde, mais à confirmer.)

7. **Panier vs "mon compte"** : c'est le même mécanisme technique de rechargement avec juste une origine différente, ou deux flux distincts que je dois gérer séparément ?

8. **Config périmée** : si une config sauvegardée il y a longtemps contient un produit qui n'existe plus dans le catalogue actuel (retiré, ref changée), vous voulez que je fasse quoi côté affichage — je bloque avec un message, je charge la config partielle en signalant l'élément manquant, ou vous gérez ça côté back avant de me redonner l'objet ?

---

### Bloc 4 — Prix, stock, catalogue (confirmation)

Pour valider ce qu'on a supposé.

9. **Prix/stock dans le catalogue** : vous confirmez que la réponse qui me sert le catalogue d'une collection contient bien prix et stock par produit (servis depuis Elastic) ? Et que c'est rafraîchi ~5 min ?

10. **Le check à l'ajout panier** : au clic "ajouter au panier", c'est bien vous qui revalidez prix et stock réels ? Vous me renvoyez quoi si un produit est en rupture ou si le prix a changé — un format d'erreur que je dois afficher ?

11. **Le filtrage** : côté back, vous filtrez déjà les produits via Elastic selon la sélection, ou vous me renvoyez toute la collection et je filtre en front ? (Ça ne change pas grand-chose pour moi, mais je veux savoir si mon `showIf` fait le boulot ou double le vôtre.)

---

### Comment leur envoyer ça

Ne balance pas les 11 questions d'un bloc — ça écrase. Deux options :

**Priorise** : dis-leur que **les questions 1 et 4 sont les plus urgentes** (l'objet de config et le mécanisme d'accroche), parce qu'elles débloquent tout le reste. Les autres peuvent suivre.

**Ou répartis** : Bloc 1+3 pour le dev back (structure objet, sérialisation, rechargement), Bloc 2+4 pour le dev front/JS (accroche, Ajax, prix/stock). Chacun répond sur son terrain.

La question **1** est celle qui compte le plus. Tant que tu n'as pas la structure de leur objet PHP, ton `cart-payload.js` reste en suspens. Insiste dessus.