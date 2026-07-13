/**
 * Tests unitaires pour features/tube-coupe.js
 * Exécuter : node test/tube-coupe.test.js
 */
import { calculCoupes, buildTubeInputs } from '../src/js/syh/features/tube-coupe.js';

let passed = 0;
let failed = 0;

function assert(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    console.log(`  ✓ ${label}`);
    passed++;
  } else {
    console.error(`  ✗ ${label}`);
    console.error(`    attendu  : ${JSON.stringify(expected)}`);
    console.error(`    reçu     : ${JSON.stringify(actual)}`);
    failed++;
  }
}

const EAN = 'EAN13_COUPETUBE';

// ─────────────────────────────────────────────────────────────────────────────
// quantite = 1
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nquantite = 1');

{
  // Tube 180cm stock, longueur 150 → 1 coupe (stock > longueur)
  const { coupes, forfait } = calculCoupes(
    [{ reference: 'REF-180', quantite: 1, longueurStock: 180 }],
    150, EAN
  );
  assert('1 coupe créée', coupes.length, 1);
  assert('longueur coupe = 150', coupes[0].longueur, 150);
  assert('sens = gauche', coupes[0].sens, 'gauche');
  assert('forfait qty = 1', forfait?.qty, 1);
}

{
  // Tube 180cm stock, longueur 180 → stock == longueur → PAS de coupe
  const { coupes, forfait } = calculCoupes(
    [{ reference: 'REF-180', quantite: 1, longueurStock: 180 }],
    180, EAN
  );
  assert('stock = longueur → 0 coupe', coupes.length, 0);
  assert('pas de forfait', forfait, null);
}

// ─────────────────────────────────────────────────────────────────────────────
// quantite = 2
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nquantite = 2');

{
  // Longueur 265, tube 180cm → 2 segments de 132.5cm (180 > 132.5)
  const { coupes, forfait } = calculCoupes(
    [{ reference: 'REF-180', quantite: 2, longueurStock: 180 }],
    265, EAN
  );
  assert('2 coupes créées', coupes.length, 2);
  assert('longueur coupe = 132.5', coupes[0].longueur, 132.5);
  assert('forfait qty = 2', forfait?.qty, 2);
}

{
  // Longueur 400, tube 180cm → 2 segments de 200cm (180 < 200) → 0 coupe
  const { coupes, forfait } = calculCoupes(
    [{ reference: 'REF-180', quantite: 2, longueurStock: 180 }],
    400, EAN
  );
  assert('stock < longueurCoupe → 0 coupe', coupes.length, 0);
  assert('pas de forfait', forfait, null);
}

// ─────────────────────────────────────────────────────────────────────────────
// quantite = 3
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nquantite = 3');

{
  // Longueur 400, tube 180cm
  // plusGrande = (400-20)/2 = 190 → stock (180) <= 190 → tube brut, plusGrande = 180
  // deuxAutres = (400-180)/2 = 110 → stock (180) > 110 → 2 coupes de 110
  const { coupes, forfait } = calculCoupes(
    [{ reference: 'REF-180', quantite: 3, longueurStock: 180 }],
    400, EAN
  );
  assert('1 tube brut (non facturé) + 2 coupes de 110', coupes.length, 2);
  assert('longueur des petites coupes = 110', coupes[0].longueur, 110);
  assert('forfait qty = 2', forfait?.qty, 2);
}

{
  // Longueur 300, tube 240cm
  // plusGrande = (300-20)/2 = 140 → stock (240) > 140 → 1 coupe de 140
  // deuxAutres = (300-140)/2 = 80 → stock (240) > 80 → 2 coupes de 80
  const { coupes, forfait } = calculCoupes(
    [{ reference: 'REF-240', quantite: 3, longueurStock: 240 }],
    300, EAN
  );
  assert('3 coupes créées', coupes.length, 3);
  assert('grande coupe = 140', coupes[0].longueur, 140);
  assert('petite coupe = 80', coupes[1].longueur, 80);
  assert('forfait qty = 3', forfait?.qty, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// quantite = 4
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nquantite = 4');

{
  // Longueur 400, tube 180cm → 4 segments de 100cm
  const { coupes, forfait } = calculCoupes(
    [{ reference: 'REF-180', quantite: 4, longueurStock: 180 }],
    400, EAN
  );
  assert('4 coupes créées', coupes.length, 4);
  assert('longueur coupe = 100', coupes[0].longueur, 100);
  assert('forfait qty = 4', forfait?.qty, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// config double — deux tubes (avant + arrière)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nconfig double (tube_avant + tube_arriere)');

{
  // Deux tubes de 180cm, longueur 265 → chacun qty=2 → 4 coupes au total
  const { coupes, forfait } = calculCoupes(
    [
      { reference: 'REF-16-180', quantite: 2, longueurStock: 180 },
      { reference: 'REF-25-180', quantite: 2, longueurStock: 180 },
    ],
    265, EAN
  );
  assert('4 coupes au total (2+2)', coupes.length, 4);
  assert('forfait qty = 4 (un seul forfait global)', forfait?.qty, 4);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pas de coupe du tout → pas de forfait
// ─────────────────────────────────────────────────────────────────────────────
console.log('\npas de coupe');

{
  const { coupes, forfait } = calculCoupes(
    [{ reference: 'REF-180', quantite: 1, longueurStock: 180 }],
    180, EAN
  );
  assert('longueur = stock → 0 coupe, 0 forfait', forfait, null);
}

// ─────────────────────────────────────────────────────────────────────────────
// buildTubeInputs — construction depuis la sélection
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nbuildTubeInputs');

{
  const selection = {
    longueur: 265,
    produits: {
      tube: { refBase: 'REF-180', coloris: '24' },
    },
  };
  const expandedFields = [
    {
      id: 'tube',
      options: [
        {
          refBase: 'REF-180',
          tubeLength: 180,
          variants: { '24': { id: 'REF-180-24' } },
        },
      ],
    },
  ];
  const inputs = buildTubeInputs(selection, expandedFields);
  assert('1 tube trouvé', inputs.length, 1);
  assert('référence = variant.id', inputs[0].reference, 'REF-180-24');
  assert('quantite = ceil(265/180) = 2', inputs[0].quantite, 2);
  assert('longueurStock = tubeLength', inputs[0].longueurStock, 180);
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${passed} passés, ${failed} échoués`);
if (failed > 0) process.exit(1);
