J'ai maintenant tout ce qu'il faut. Voici l'explication complète :

Le champ input_longueur_perso
Ce champ n'est pas dans ces fichiers PHP — il est dans un template/vue Twig ou HTML sur le reste du serveur. C'est lui qui capture la longueur saisie par l'utilisateur (en cm). La valeur saisie est ensuite envoyée au serveur et aboutit dans affecterLongueur() ou directement dans le constructeur de ConfigurationTringlerie.

La chaîne complète autour de nouvelleCoupe()
1. $this->longueur — la source de tout
Définie en ligne 13, initialisée via :

Le constructeur ConfigurationTringlerie.php:43 — $this->longueur = $_longueur
Ou via ConfigurationTringlerie.php:729 — affecterLongueur($_longueur) qui en plus recalcule les options et les supports intermédiaires.
2. calculCoupe() — la fonction principale ligne 1359
C'est elle qui orchestre tout. Elle :

Récupère les tubes (avant + arrière) parmi les articles sélectionnés
Pour chaque tube, décide combien de coupes faire selon la quantité de tubes nécessaires :
Quantité	Logique
1 tube	1 coupe = longueur totale
2 tubes	2 coupes = longueur / 2 chacune
3 tubes	1 grande coupe + 2 petites ((longueur - grande) / 2). La grande vaut (longueur - 20) / 2 pour laisser 10 cm de chaque côté
4 tubes	4 coupes = longueur / 4 chacune
Condition : la coupe n'est créée que si le tube source est plus long que la longueur souhaitée (longueur_article > longueur_coupe)
Si au moins une coupe existe, ajoute un forfait de coupe via ConfigurationTringlerieOptionArticle::nouvelleLigneCoupe()
3. nouvelleCoupe() — la fonction finale ligne 1469

public static function nouvelleCoupe($_reference, $_longueur){
    $coupe = [];
    $coupe['reference'] = $_reference;   // référence du tube à couper
    $coupe['longueur']  = $_longueur;    // longueur de coupe en cm
    $coupe['sens']      = "gauche";      // sens fixe (toujours gauche)
    return $coupe;
}
C'est un simple factory qui retourne un tableau associatif. Le sens est hardcodé à "gauche" — il n'est jamais paramétré ici (probablement géré ailleurs dans l'affichage).

En résumé

[input_longueur_perso] (HTML/Twig)
        ↓ POST
affecterLongueur() ou constructeur
        ↓
$this->longueur (propriété de ConfigurationTringlerie)
        ↓
calculCoupe()  ← détermine combien de tubes, calcule les longueurs de coupe
        ↓ (pour chaque coupe)
nouvelleCoupe(référence, longueur)  ← crée un tableau {reference, longueur, sens}
        ↓
$this->coupes[]  +  $this->forfaits_coupes (si au moins 1 coupe)