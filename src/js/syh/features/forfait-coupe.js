/**
 * Code article (EAN) du forfait de coupe des tubes — service de découpe facturé une fois par coupe
 * nécessaire (voir `tube-coupe.js` / `calculCoupes`). Fixe, identique pour toutes les collections
 * Houlès : ne dépend d'aucune donnée de collection, donc jamais dans le JSON (évite la redondance
 * et le risque d'oubli ou de faute de frappe à chaque nouvelle collection créée côté admin).
 */
export const FORFAIT_COUPE_EAN = '80099';
