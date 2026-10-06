Ce n'est pas du cm
 
Chez es US
 
Il y a aussi de rare fois où le client peut changer les quantité proposé 
 
Le plus serait que je fasse un convertisseur qui sert a toutes les longeurs : coupe, tube, calcul du nombre d'anneau... Ca se passe en front mais vous vous recevez l'info en cm et en inches, ca vous irait ?
 
On doit déjà avoir ce quelque part 
 
du coup tu geres l'integration ? Ou tu preferes que je le gere ?
 
bah il faut faire l'affichage
 
if ($this->tarif === "USD") {
    $this->longueurConfig = Utils::unitConversion($this->longueurConfig, "cm", "in", 1);
}
 
on avait un truc comme ça
 
ok, je vois.
Pour le tarifs, Michaël Bussière comment tu geres ? C'est via le select avec name=country ?
 
Ou alors est-ce que je prevois un switcher currency et un swticher metrics ? 
 
Yohann Morin Pour le calcul du nombre d'anneaux, la longueur de coupe, etc... c'est prevu en cm.
 
Mais si ce n'est qu'une question "d'affichage" et que les qty ou les longeurus de coupe a transmettre se font toujours en cm, les inches seront uniquements d'affiachage et on peut se contenter de JS, non ?
 
currency ça prend le prix du client normalement
 
vu qu'en mode non connecté
 
pas de tarif
 
même si bientot il veulent mettre en place un prix "public"
 
Du coup ca me fait embryer sur une chose.  
Pour le moment dans mon json, j'ai le prix.
 
Mais on va creer une API pour le prix (prix normal, prix par client) et une API pour la qty (general)
 
nous en php : 
if ($client && $client->getSysId() == 'US') {
    $mesure = "imperial";
}
if ($client->sys_id == "US" && $article->UV == "M.") {
    $article->convertUVMenYD();
}
 
public function convertUVMenYD()
{
    $this->uniteVente->id = "YD";
    foreach (array_keys($this->uniteVente->libelle) as $lang) {
        $this->uniteVente->libelle[$lang] = "Yard";
    }
    $this->uniteVente->abrev = "yd";
}
 
 
public static function metersToYards(float $value): float
{
    return $value * 1.0936133;
}
 
déjà il y a un bug sur le configureateur actuel
 
il se passe sur la langue du site 
 
si je passe en mode US
 
 
j'ai trouvé la fonction PHP qui fait ça : 
 
public static function conversionCarac($_eav_id, $_eav_value ,$_langue, $_mesure, $_tissu = false) {
    if ($_mesure=='metrique') {
        $tabconvert['longueur'] = "cm";
        $tabconvert['largeur'] = "mm";
        $tabconvert['hauteur'] = "cm";
        $tabconvert['diametre'] = "mm";
        $tabconvert['poids1'] = "g";
        $tabconvert['poids2'] = "kg";
        $tabconvert['longueur_condi'] = "cm";
        $tabconvert['largeur_condi'] = "cm";
        $tabconvert['hauteur_condi'] = "cm";
        $tabconvert['poids1_condi'] = "g";
        $tabconvert['poids2_condi'] = "kg";
        $tabconvert['raccordhorizontal'] = "mm";
        $tabconvert['raccordvertical'] = "mm";
        $tabconvert['raccordsaute'] = "mm";
        $tabconvert['longueur_piece_uv'] = "m";
    }
    else {
        $tabconvert['longueur'] = "in";
        $tabconvert['largeur'] = "in";
        $tabconvert['hauteur'] = "in";
        $tabconvert['diametre'] = "in";
        $tabconvert['poids1'] = "oz";
        $tabconvert['poids2'] = "lb";
        $tabconvert['longueur_condi'] = "yd";
        $tabconvert['largeur_condi'] = "yd";
        $tabconvert['hauteur_condi'] = "yd";
        $tabconvert['poids1_condi'] = "oz";
        $tabconvert['poids2_condi'] = "lb";
        $tabconvert['raccordhorizontal'] = "in";
        $tabconvert['raccordvertical'] = "in";
        $tabconvert['raccordsaute'] = "in";
        $tabconvert['longueur_piece_uv'] = "yd";
    }
    if ($_langue=='fr') {
        $tabconvert['martindale'] = "tours";
    }
    else {
        $tabconvert['martindale'] = "rubs";
    }
    foreach ($tabconvert as $key => $value) {
        if ($tabconvert[$key]=="mm" && (int)$_eav_value >=10000) $tabconvert[$key] = "m";
        if ($tabconvert[$key]=="mm" && (int)$_eav_value >=1000) $tabconvert[$key] = "cm";
        //if ($tabconvert[$key]=="cm" && intval($_eav_value)>=10000) $tabconvert[$key] = "m";
    }
    if ($_eav_id=="poids") {
        if ((int)$_eav_value >1000) {
            $tabconvert['poids'] = $tabconvert['poids2'];
        }
        else  {
            $tabconvert['poids'] = $tabconvert['poids1'];
        }
    }
    if ($_eav_id=="poids_condi") {
        if ((int)$_eav_value >1000) {
            $tabconvert['poids_condi'] = $tabconvert['poids2_condi'];
        }
        else  {
            $tabconvert['poids_condi'] = $tabconvert['poids1_condi'];
        }
    }

    $qUniteEAV = "SELECT * FROM h_article_eav WHERE id = :eav_id;";
    $rUniteEAV = DBMHoules::getInstance()->prepare($qUniteEAV);
    $rUniteEAV->bindValue(":eav_id", $_eav_id);
    $rUniteEAV->execute();
    $fUniteEAV = $rUniteEAV->fetch();
    $value = $_eav_value;
    if ($fUniteEAV) {
        if (strlen(trim( $fUniteEAV['unite_id']))>0) {
            $unite = $fUniteEAV['unite_id'];
            if (isset($tabconvert[$_eav_id])) {
                if ($unite!=$tabconvert[$_eav_id]) {
                    $value = Utils::unitConversion($_eav_value, $fUniteEAV['unite_id'], $tabconvert[$_eav_id]);
                    $unite = $tabconvert[$_eav_id];
                }
            }
            $value = trim(Utils::numberFormat($value, $_langue) . " " . $unite);
        }
    }
    if ($_eav_id=="poids" && $_tissu == true) {
            if ($_mesure=="metrique") {
                $value = $value . "/ml";
                /*
                $surface = $_eav_value * $_eav_value;
                if ($unite=="g") {
                    $surface = $surface / 1000;
                }
                $surface = "(" . trim(Utils::numberFormat($surface, $_langue) . " kg/m²)" );
                $value = $value . " $surface";
                */
            }
    }
    return $value;
}
 