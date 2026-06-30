class Project {
  constructor() {
    this.pieces = {};
  }
  getPieces() {
    const array = [];
    const keys = Object.keys(this.pieces);
    for (let i = 0; i < keys.length; i++) {
      array.push({ piece: keys[i], color: this.pieces[keys[i]] });
    }
    return array;
  }
}
let loadedProject = null;
let code = "";
let numberPiece = 0;
const project = new Project();
let productCode = 0;
let baseUrl = "";
let projectImageSource = null;
let lastColors = [];
let confirm = false;
let popUpConfirmName = null;
let quickAdd = null;
let quickAddMobile = null;
let buttonColors = null;
let buttonSelected = null;
let pieceSelectors = null;
let pdf_link_code_href = null;
let pdf_link_code = null;
let pdf_link_code2 = null;
let pdf_link_code_href2 = null;
let twitter_link = null;
let mail_link = null;
let customImage = null;
let loginButtonUpdate = null;
const init = () => {

  console.log('init svp');

  baseUrl = document.location.href;
  pieceSelectors = document.getElementsByClassName("piece_selector");
  buttonColors = document.getElementsByClassName("button_color");
  customImage = document.getElementsByClassName("customImage");
  const imageSource = document.getElementById("imageSource");
  loginButtonUpdate = document.getElementById("login_button_update");
  quickAdd = document.getElementById("quick_add_color");
  quickAddMobile = document.getElementById("quick_add_color_mobile");
  const quickAddValidation = document.getElementById(
    "quick_add_color_validation"
  );
  if (quickAddValidation) {
    quickAddValidation.addEventListener("submit", handleClickAddColor);
  }
  const quickAddValidationMobile = document.getElementById(
    "quick_add_color_validation_mobile"
  );
  if (quickAddValidationMobile) {
    quickAddValidationMobile.addEventListener(
      "submit",
      handleClickAddColorMobile
    );
  }

  projectImageSource = imageSource;
  productCode = imageSource.dataset.productcode;
  let famille;
  famille = productCode.substr(0, 2);
  switch (famille) {
    case "S1":
    case "S2":
    case "S3":
      colorDefault = "0001";
      break;
    case "S4":
      colorDefault = "1001";
      break;
  }

  /*
  if (loadedProject == null) {
    if (baseUrl.indexOf("/c/") == -1) {
      if (baseUrl.substr(baseUrl.length - 1) === "/") {
        baseUrl = baseUrl.slice(0, -1);
      }
      baseUrl += "/c/";
      newUrl = baseUrl;
      code = "";
      let colorDefault;
      for (let i = 0; i < pieceSelectors.length; i++) {
        switch (famille) {
          case "S1":
          case "S2":
          case "S3":
            colorDefault = "0001";
            break;
          case "S4":
            colorDefault = "1001";
            break;
        }
        if (i == 0) {
          newUrl += colorDefault;
          code += colorDefault;
        } else {
          newUrl += "-" + colorDefault;
          code += "-" + colorDefault;
        }
      }
      window.history.replaceState("projectCode", "project", newUrl);
    } else {
      newUrl = baseUrl.split("/c/")[0];
      baseUrl = newUrl;
      baseUrl += "/c/";
    }
  }
    */

  // twitter_link = document.getElementsByClassName("twitter_link");
  // if (twitter_link) {
  //   twitter_link[0].href =
  //     "https://twitter.com/intent/tweet?text=Mon projet Houles : %20" +
  //     document.location.href +
  //     "%20%23Houles";
  //   twitter_link[1].href =
  //     "https://twitter.com/intent/tweet?text=Mon projet Houles : %20" +
  //     document.location.href +
  //     "%20%23Houles";
  // }
  //
  // mail_link = document.getElementsByClassName("mail_link");
  // if (mail_link) {
  //   mail_link[0].href =
  //     "mailto:?subject=Mon projet Houles &body=" + document.location.href;
  // }

  const zones = document.getElementsByClassName("zones")[0];
  const zonesMobiles = document.getElementsByClassName("zones_mobile")[0];
  if (zonesMobiles) {
    zonesMobiles.innerHTML = zones.innerHTML;
    const coloris = document.getElementsByClassName("coloris")[0];
    const colorisMobiles = document.getElementsByClassName("coloris_mobile")[0];
    colorisMobiles.innerHTML = coloris.innerHTML;
  }

  for (let i = 0; i < pieceSelectors.length; i++) {
    if (i !== 0 && pieceSelectors[i].dataset.value == 1) {
      pieceSelected = pieceSelectors[i];
      pieceSelected.classList.add("pieceSelected");
    }
  }
  for (let i = 0; i < buttonColors.length; i++) {
    if (
      pieceSelected.lastChild.innerHTML == buttonColors[i].dataset.vendorcode
    ) {
      buttonSelected = buttonColors[i];
      for (let i = 0; i < buttonColors.length; i++) {
        buttonColors[i].classList.remove("buttonSelected");
      }
      buttonSelected.classList.add("buttonSelected");
    }
  }

  /**
   * Custom Meta
   * Synchronize data
   */

  document.querySelectorAll('.zones').forEach((zone, index, allZones) => {
    zone.addEventListener('click', (e) => {
      const btn = e.target.closest('.piece_selector');
      if (!btn) return;

      const value = btn.dataset.value;

      // 1. Retirer la sélection de tous les boutons dans cette zone
      zone.querySelectorAll('.piece_selector').forEach(b => b.classList.remove('pieceSelected'));

      // 2. Activer le bouton cliqué
      btn.classList.add('pieceSelected');

      // 3. Synchroniser avec les autres zones
      allZones.forEach(otherZone => {
        if (otherZone !== zone) {
          otherZone.querySelectorAll('.piece_selector').forEach(b => b.classList.remove('pieceSelected'));
          const matchingBtn = otherZone.querySelector(`.piece_selector[data-value="${value}"]`);
          if (matchingBtn) matchingBtn.classList.add('pieceSelected');
        }
      });
    });
  });

  /**
   * Coloris modal Trigger Modal
   *
   */

  function changeProjectImageSize() {

    const projectImage = document.querySelector('.projectImage');

    const colorisModal = document.querySelector('#coloris_modal');
    if (colorisModal) {
      const modalHeight = colorisModal.offsetHeight + 32;
      const headerHeight = document.querySelector('[data-component="Header"]').offsetHeight;
      if (projectImage) { 
        projectImage.style.height = window.innerHeight - modalHeight - headerHeight + 'px';
      }
    }

  }

  const mediaQuery = window.matchMedia('(max-width: 767px)');
  if (mediaQuery.matches) {
    changeProjectImageSize();
  }


  document.querySelector('.js--launch-coloris-modal').addEventListener('click', (e) => {
    const modal = document.querySelector('#coloris_modal');
    modal.classList.remove('opacity-0');
    modal.classList.remove('-translate-y-8');
    modal.classList.remove('pointer-events-none');
    if (mediaQuery.matches) {
      document.body.classList.add('overflow-hidden');
    }
    // scroll to top of the page smoothly
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });

  const close_modal = document.querySelectorAll('.js--close-coloris-modal');
  close_modal.forEach(button => {
    button.addEventListener('click', (e) => {
      const modal = document.querySelector('#coloris_modal');
      modal.classList.add('opacity-0');
      modal.classList.add('-translate-y-8');
      modal.classList.add('pointer-events-none');
      if (mediaQuery.matches) {
        document.body.classList.remove('overflow-hidden');
      }
    });
  });





  /*
  if (loadedProject) {
    updateProject(loadedProject);
  } else if (code.length > 0) {
    updateProjectByCode(code);
  } else {
    document.location.href = baseUrl.split("/c/")[0];

    project.pieces = {};
    for (let i = 0; i < customImage.length; i++) {
      customImage[i].src =
        "commun/visuels_articles/S/" +
        productCode +
        "/zone" +
        (i + 1) +
        "/" +
        productCode +
        "_" +
        (i + 1) +
        "_" +
        buttonColors[0].dataset.vendorcode +
        "_L1.png";
      project.pieces[i + 1] = 1;
    }
  }
  pdf_link_code = document.getElementById("pdf_link_code");
  pdf_link_code2 = document.getElementById("pdf_link_code2");
  if (pdf_link_code) {
    pdf_link_code_href = pdf_link_code.href;
    pdf_link_code_href2 = pdf_link_code2.href;
    pdf_link_code.href = pdf_link_code_href + document.location.href.split("/c/")[1];
    pdf_link_code2.href = pdf_link_code_href2 + document.location.href.split("/c/")[1];
  }
  if (loadedProject == null) {
  } else {
    code = generateCode(pieceSelectors);
  }
  */

  for (let i = 0; i < pieceSelectors.length; i++) {
    pieceSelectors[i].addEventListener("click", (ev) => {
      pieceSelected = ev.currentTarget;
      for (let i = 0; i < pieceSelectors.length; i++) {
        pieceSelectors[i].classList.remove("pieceSelected");
      }
      pieceSelected.classList.add("pieceSelected");
      if (pieceSelected.lastChild.innerHTML != "0000") {
        for (let i = 0; i < buttonColors.length; i++) {
          if (
            pieceSelected.lastChild.innerHTML ==
            buttonColors[i].dataset.vendorcode
          ) {
            buttonSelected = buttonColors[i];
            for (let i = 0; i < buttonColors.length; i++) {
              buttonColors[i].classList.remove("buttonSelected");

            }
            buttonSelected.classList.add("buttonSelected");
          }
        }
      } else {
        buttonSelected = null;
        for (let i = 0; i < buttonColors.length; i++) {
          buttonColors[i].classList.remove("buttonSelected");
        }
      }
    });

    pieceSelectors[i].addEventListener("mouseenter", (ev) => {
      for (let j = 0; j < customImage.length; j++) {
        if (
          parseInt(customImage[j].dataset.piece) ==
          parseInt(pieceSelectors[i].dataset.value)
        ) {
          customImage[j].style.zIndex = "2";
          customImage[j].style.backgroundColor = "rgb(255, 255, 255, 0.85)";
        }
      }
    });

    pieceSelectors[i].addEventListener("mouseleave", (ev) => {
      for (let j = 0; j < customImage.length; j++) {
        if (
          parseInt(customImage[j].dataset.piece) ==
          parseInt(pieceSelectors[i].dataset.value)
        ) {
          customImage[j].style.zIndex = "1";
          customImage[j].style.backgroundColor = "transparent";
        }
      }
    });
  }
  for (let i = 0; i < buttonColors.length; i++) {
    buttonColors[i].addEventListener("click", handleOnClickColor);
  }
  buttonSaveProject = document.getElementById("button_save_project");
  if (buttonSaveProject) {
    buttonSaveProject.addEventListener("click", saveProject);
  }
  const createProductRandom = document.getElementById("create_product_random");

  if (createProductRandom) {
    createProductRandom.addEventListener("click", createRandomProduct);
  }

  const itemResetProduct = document.getElementById("product_reset");
  if (itemResetProduct) {
    itemResetProduct.addEventListener("click", resetProduct);
  }
  //TODO
  loadLastColors(buttonColors[0].dataset.matiere);
};

const changeColorByColorElement = (element) => {
  buttonSelected = element;
  saveLastColor(element);
  for (let i = 0; i < buttonColors.length; i++) {
    buttonColors[i].classList.remove("buttonSelected");
  }
  buttonSelected.classList.add("buttonSelected");
  // pieceSelected.style.borderColor = element.dataset.hex;
  // pieceSelected.lastChild.innerHTML = element.dataset.vendorcode;
  project.pieces[pieceSelected.dataset.value] = parseInt(
    element.dataset.id,
    10
  );
  if (loadedProject == null) {
    const code = generateCode(pieceSelectors);
    updateUrl(baseUrl, code);
    updateTargetUrl(code);
    updatePdfUrl(code);
  } else {
  }
  if (pdf_link_code) {
    pdf_link_code.href = pdf_link_code_href + generateCode(pieceSelectors);
    pdf_link_code2.href = pdf_link_code_href2 + generateCode(pieceSelectors);
  }

  //TODO
  // if (twitter_link) {
  //   twitter_link[0].href =
  //     "https://twitter.com/intent/tweet?text=Mon projet Houles : %20" +
  //     document.location.href +
  //     "%20%23Houles";
  //   twitter_link[1].href =
  //     "https://twitter.com/intent/tweet?text=Mon projet Houles : %20" +
  //     document.location.href +
  //     "%20%23Houles";
  // }

  if (mail_link) {
    mail_link[0].href =
      "mailto:?subject=Mon projet Houles &body=" + document.location.href;
  }

  for (let i = 0; i < customImage.length; i++) {
    if (
      parseInt(customImage[i].dataset.piece) ==
      parseInt(pieceSelected.dataset.value)
    ) {
      customImage[i].src =
        "commun/visuels_articles/S/" +
        productCode +
        "/zone" +
        pieceSelected.dataset.value +
        "/" +
        productCode +
        "_" +
        pieceSelected.dataset.value +
        "_" +
        buttonSelected.dataset.vendorcode +
        "_L1.png";
    }
  }
};

const updateProjectByCode = (code) => {

  console.log('updateProjectByCode');

  const pieceSelectors = document.getElementsByClassName("piece_selector");
  const buttonColors = document.getElementsByClassName("button_color");
  const customImage = document.getElementsByClassName("customImage");

  arrButtons = Array.from(buttonColors);
  project.pieces = {};
  const codes = code.split("-");
  if (codes.length !== numberPiece) {
    document.location.href = baseUrl.split("/c/")[0];
  }

  for (let i = 0; i < codes.length; i++) {
    const color = arrButtons.find(
        (found) => found.dataset.vendorcode === codes[i]
    );
    if (color !== undefined) {
      project.pieces[i + 1] = color.dataset.id;
    } else {
      document.location.href = baseUrl.split("/c/")[0];
    }
  }
  for (let i = 1; i <= Object.keys(project.pieces).length; i++) {
    for (let j = 0; j < buttonColors.length; j++) {
      if (
        parseInt(project.pieces[i]) === parseInt(buttonColors[j].dataset.id)
      ) {
        for (l = 0; l < pieceSelectors.length; l++) {
          if (parseInt(pieceSelectors[l].dataset.value) === parseInt(i)) {
            pieceSelectors[l].style.borderColor = buttonColors[j].dataset.hex;
            pieceSelectors[l].lastChild.innerHTML =
              buttonColors[j].dataset.vendorcode;
          }
        }
        for (k = 0; k < customImage.length; k++) {
          if (parseInt(customImage[k].dataset.piece) === parseInt(i)) {
            customImage[k].src =
            // TODO - update path
              // "commun/visuels_articles/S/" +
              "/assets/products/" +
              productCode +
              "/zone" +
              i +
              "/" +
              productCode +
              "_" +
              i +
              "_" +
              buttonColors[j].dataset.vendorcode +
              "_L1.png";
          }
        }
      }
    }
  }
};

const updateProject = (projectLoaded) => {

  console.log('updateProject');

  const pieceSelectors = document.getElementsByClassName("piece_selector");
  const buttonColors = document.getElementsByClassName("button_color");
  const customImage = document.getElementsByClassName("customImage");
  project.pieces = {};
  for (let i = 0; i < projectLoaded.pieces.length; i++) {
    for (let j = 0; j < buttonColors.length; j++) {
      if (
        parseInt(projectLoaded.pieces[i].color) ===
        parseInt(buttonColors[j].dataset.id)
      ) {
        project.pieces[projectLoaded.pieces[i].piece] =
          projectLoaded.pieces[i].color;
        for (l = 0; l < pieceSelectors.length; l++) {
          if (
            parseInt(pieceSelectors[l].dataset.value) ===
            parseInt(projectLoaded.pieces[i].piece)
          ) {
            pieceSelectors[l].style.borderColor = buttonColors[j].dataset.hex;
            pieceSelectors[l].lastChild.innerHTML =
              buttonColors[j].dataset.vendorcode;
          }
        }
        for (k = 0; k < customImage.length; k++) {
          if (
            parseInt(customImage[k].dataset.piece) ===
            parseInt(projectLoaded.pieces[i].piece)
          ) {
            customImage[k].src =
              "commun/visuels_articles/S/" +
              productCode +
              "/zone" +
              projectLoaded.pieces[i].piece +
              "/" +
              productCode +
              "_" +
              projectLoaded.pieces[i].piece +
              "_" +
              buttonColors[j].dataset.vendorcode +
              "_L1.png";
          }
        }
      }
    }
  }
};

function handleOnClickColor(ev) {
  buttonSelected = ev.currentTarget;
  saveLastColor(ev.currentTarget);
  for (let i = 0; i < buttonColors.length; i++) {
    buttonColors[i].classList.remove("buttonSelected");
  }
  buttonSelected.classList.add("buttonSelected");
  pieceSelected.style.borderColor = ev.currentTarget.dataset.hex;
  pieceSelected.lastChild.innerHTML = ev.currentTarget.dataset.vendorcode;
  project.pieces[pieceSelected.dataset.value] = parseInt(
    ev.currentTarget.dataset.id,
    10
  );

  // TODO - update supplier code
  // On récupère toutes les zones (FYI, il y a 2 zones dans le DOM : La première lance le modal de sélection de couleurs, la deuxième est celle qui contient les zones)
  const allPieceSelected = document.querySelectorAll('.piece_selector.pieceSelected');

  allPieceSelected.forEach(piece => {
    piece.querySelector('.supplier_code').innerHTML = ev.currentTarget.dataset.vendorcode;
    piece.querySelector('.piece_selector_color').style.backgroundColor = ev.currentTarget.dataset.hex;
  });

  if (loadedProject == null) {
    const code = generateCode(pieceSelectors);
    updateUrl(baseUrl, code);
    updateTargetUrl(code);
    updatePdfUrl(code);
  } else {
  }
  if (pdf_link_code) {
    pdf_link_code.href = pdf_link_code_href + generateCode(pieceSelectors);
    pdf_link_code2.href = pdf_link_code_href2 + generateCode(pieceSelectors);
  }
  if (twitter_link) {
    twitter_link[0].href =
      "https://twitter.com/intent/tweet?text=Mon projet Houles : %20" +
      document.location.href +
      "%20%23Houles";
    twitter_link[1].href =
      "https://twitter.com/intent/tweet?text=Mon projet Houles : %20" +
      document.location.href +
      "%20%23Houles";
  }

  if (mail_link) {
    mail_link[0].href =
      "mailto:?subject=Mon projet Houles &body=" + document.location.href;
  }

  for (let i = 0; i < customImage.length; i++) {
    if (
      parseInt(customImage[i].dataset.piece) ==
      parseInt(pieceSelected.dataset.value)
    ) {
      customImage[i].src =
        // TODO - update path
        // "commun/visuels_articles/S/" +
        "/assets/products/" +
        productCode +
        "/zone" +
        pieceSelected.dataset.value +
        "/" +
        productCode +
        "_" +
        pieceSelected.dataset.value +
        "_" +
        buttonSelected.dataset.vendorcode +
        "_L1.png";
    }
  }
}

function saveProject(ev) {

  console.log('saveProject');

  if (loadedProject) {
    phery.json(
      "updateProject",
      { id: loadedProject.id, pieces: project.getPieces() },
      function (retour) {}
    );
  } else {
    popUpSave((result) => {

      let regex;
      regex = new RegExp("^[a-zA-ZÀ-ÿ0-9\\-\\'#(). &\\/@_\\\\\\\\]+$");

      if (result === "") {
        $("#error-pattern").hide();
        $("#error-required").show();
        $(".bootbox-input").focus();
        return false;
      } else if (!regex.test(result)) {
        $("#error-required").hide();
        $("#error-pattern").show();
        $(".bootbox-input").focus();
        return false;
      }

      if (result) {
        phery.json(
          "saveProject", {
            project_client_id: 1,
            project_id: parseInt(projectImageSource.dataset.projectid),
            pieces: project.getPieces(),
            name: result,
          },
          function (retour) {
            document.location.href = "FR-fr/mes-projets";
          }
        );
      }
    });
  }
}

function generateCode(pieceSelectors) {

  console.log('generateCode');

  projectCode = "";

  if (window.matchMedia("(min-width: 770px)").matches) {
    /* La largeur minimum de l'affichage est 770 px inclus */
    for (let i = pieceSelectors.length / 2; i < pieceSelectors.length; i++) {
      if (i == pieceSelectors.length / 2) {
        projectCode += pieceSelectors[i].lastChild.innerHTML;
      } else {
        projectCode += "-" + pieceSelectors[i].lastChild.innerHTML;
      }
    }
  } else {
    /* L'affichage est inférieur à 700px de large */
    for (let i = 0; i < pieceSelectors.length / 2; i++) {
      if (i == 0) {
        projectCode += pieceSelectors[i].lastChild.innerHTML;
      } else {
        projectCode += "-" + pieceSelectors[i].lastChild.innerHTML;
      }
    }
  }
  return projectCode;
}

function updateUrl(baseUrl, projectCode) {

  console.log('updateUrl');

  const newUrl = baseUrl + projectCode;

  if (window.history.replaceState) {
    window.history.replaceState(projectCode, "project", newUrl);
  }
}

function updateTargetUrl(projectCode) {

  console.log('updateTargetUrl');

  if (loginButtonUpdate) {
    if (loginButtonUpdate.href.includes("/c/")) {
      const newValue = `${
        loginButtonUpdate.href.split("/c/")[0]
      }/c/${projectCode}`;
      loginButtonUpdate.href = newValue;
    } else {
      loginButtonUpdate.href = `${loginButtonUpdate.href}/c/${projectCode}`;
    }
  }
}

function updatePdfUrl(projectCode) {

  console.log('updatePdfUrl');

  if (pdf_link_code) {
    const newValue = `${pdf_link_code_href}${projectCode}`;
    const newValue2 = `${pdf_link_code_href2}${projectCode}`;
    pdf_link_code.href = newValue;
    pdf_link_code2.href = newValue2;
  }
}

function updateTargetUrl(projectCode) {

  console.log('updateTargetUrl');

  if (loginButtonUpdate) {
    if (loginButtonUpdate.href.includes("/c/")) {
      const newValue = `${
        loginButtonUpdate.href.split("/c/")[0]
      }/c/${projectCode}`;
      loginButtonUpdate.href = newValue;
    } else {
      loginButtonUpdate.href = `${loginButtonUpdate.href}/c/${projectCode}`;
    }
  }
}

function getRandomInt(min, max) {

  console.log('getRandomInt');

  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Permet de mettre à jour la couleur sélectionnée dans les zones sélectionnées lors de l'utilisation d'un select
 */
function onSelectColor() {

  const colorisSelect = document.querySelector('select[name="coloris_select"]');
  colorisSelect.addEventListener('change', () => {
    const selectedOption = colorisSelect.options[colorisSelect.selectedIndex];

    // Récupérer le code et la couleur sélectionnée...
    // La couleur est encapsulée dans un span, il est impossible en twig de return plusieurs value dans un option.
    // on récupère donc la valeur en parsant le span avec un regex
    const colorCode = selectedOption.value;
    const colorHex = selectedOption.innerHTML;
    const hexMatch = colorHex.match(/background-color:\s*(#[A-Fa-f0-9]{6})/);
    const colorHexValue = hexMatch ? hexMatch[1] : '';

    // Mettre à jour la couleur sélectionnée dans la zone sélectionnée
    const allPieceSelected = document.querySelectorAll('.piece_selector.pieceSelected');
    allPieceSelected.forEach(piece => {
      piece.querySelector('.supplier_code').innerHTML = colorCode;
      piece.querySelector('.piece_selector_color').style.backgroundColor = colorHexValue;
    });
  });

}

document.addEventListener('DOMContentLoaded', () => {
  onSelectColor();
});


const resetProduct = () => {

  console.log('resetProduct');

  const pieceSelectors = document.getElementsByClassName("piece_selector");
  const buttonColors = document.getElementsByClassName("button_color");
  const customImage = document.getElementsByClassName("customImage");
  const resetColor = [...buttonColors].find(

    (found) => found.dataset.vendorcode == colorDefault
  );
  for (let j = 0; j < numberPiece; j++) {
    for (let i = 0; i < customImage.length; i++) {
      if (parseInt(customImage[i].dataset.piece, 10) === j + 1) {
        customImage[i].src =
          "commun/visuels_articles/S/" +
          productCode +
          "/zone" +
          (j + 1) +
          "/" +
          productCode +
          "_" +
          (j + 1) +
          "_" +
          resetColor.dataset.vendorcode +
          "_L1.png";
        project.pieces[j + 1] = resetColor.dataset.id;
      }
    }
    for (let k = 0; k < pieceSelectors.length; k++) {
      if (parseInt(pieceSelectors[k].dataset.value) === j + 1) {
        pieceSelectors[k].style.borderColor = resetColor.dataset.hex;
        pieceSelectors[k].lastChild.innerHTML = resetColor.dataset.vendorcode;
      }
    }
  }
  if (loadedProject == null) {
    const code = generateCode(pieceSelectors);
    updateUrl(baseUrl, code);
    updateTargetUrl(code);
    updatePdfUrl(code);
  }
};


const createRandomProduct = () => {

  console.log('createRandomProduct');

  const pieceSelectors = document.querySelectorAll(".piece_selector");
  const buttonColors = document.getElementsByClassName("button_color");
  const customImage = document.getElementsByClassName("customImage");

  const randomArrays = [];
  for (let i = 0; i < numberPiece; i++) {
    randomArrays.push(getRandomInt(0, buttonColors.length));
  }

  // TODO - update path
  for (let j = 0; j < numberPiece; j++) {
    for (let i = 0; i < customImage.length; i++) {
      if (parseInt(customImage[i].dataset.piece, 10) === j + 1) {
        customImage[i].src =
          // "commun/visuels_articles/S/" +
          // TODO - update path
          "/assets/products/" +
          productCode +
          "/zone" +
          (j + 1) +
          "/" +
          productCode +
          "_" +
          (j + 1) +
          "_" +
          buttonColors[randomArrays[j]].dataset.vendorcode +
          "_L1.png";
        project.pieces[j + 1] = buttonColors[randomArrays[j]].dataset.id;
      }
    }
    for (let k = 0; k < pieceSelectors.length; k++) {
      if (parseInt(pieceSelectors[k].dataset.value) === j + 1) {
        console.log(pieceSelectors[k]);
        pieceSelectors[k].style.borderColor =
          buttonColors[randomArrays[j]].dataset.hex;
        pieceSelectors[k].lastChild.innerHTML =
          buttonColors[randomArrays[j]].dataset.vendorcode;
      }
    }
  }
  if (loadedProject == null) {
    const code = generateCode(pieceSelectors);
    updateUrl(baseUrl, code);
    updateTargetUrl(code);
    updatePdfUrl(code);
  }
};

const saveLastColor = (element) => {

  console.log('saveLastColor');

  if (!lastColors) {
    lastColors = [];
  }
  if (lastColors.length > 10) {
    lastColors.pop();
  }
  lastColors.unshift(element.outerHTML);
  localStorage.setItem(
    "lastColors_" + element.dataset.matiere,
    JSON.stringify(lastColors)
  );
  //TODO
  loadLastColors(element.dataset.matiere);
};

const loadLastColors = (matiere) => {

  console.log('loadLastColors');

  lastColors = JSON.parse(localStorage.getItem("lastColors_" + matiere));
  if (!lastColors) {
    lastColors = [];
  }
  const lastColorBlock = document.getElementById("lastColorBlock");
  let content = "";
  for (let i = 0; i < lastColors.length; i++) {
    content += lastColors[i];
  }
  lastColorBlock.innerHTML = content;

  buttonColors = document.getElementsByClassName("button_color");
  for (let i = 0; i < buttonColors.length; i++) {
    buttonColors[i].removeEventListener("click", handleOnClickColor);
    buttonColors[i].addEventListener("click", handleOnClickColor);
  }
};

const handleClickAddColor = (ev) => {

  console.log('handleClickAddColor');

  ev.preventDefault();
  const colorCode = quickAdd.value;
  for (let i = 0; i < buttonColors.length; i += 1) {
    if (buttonColors[i].dataset.vendorcode === colorCode) {
      changeColorByColorElement(buttonColors[i]);
      return;
    }
  }
  alert("Votre coloris n'existe pas.");
};

const handleClickAddColorMobile = (ev) => {

  console.log('handleClickAddColorMobile');

  ev.preventDefault();
  const colorCode = quickAddMobile.value;
  for (let i = 0; i < buttonColors.length; i += 1) {
    if (buttonColors[i].dataset.vendorcode === colorCode) {
      changeColorByColorElement(buttonColors[i]);
      return;
    }
  }
  alert("Votre coloris n'existe pas.");
};

window.addEventListener("load", init);
