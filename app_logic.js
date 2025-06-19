// --- Global Application State Variables ---
var currentEidTheme = 'fitr';
var currentDesign = "Eid1.jpeg";
var allTextConfigs = null; // Will hold all configs from text_configs.json

// --- Admin Mode Related Global Variables ---
// Note: isAdminModeActive is effectively deprecated for index.html after UI removal.
// It's not actively used to gate functionality on admin.html as that page is inherently admin-focused.
var isAdminModeActive = false;
var currentImageOriginalWidth = null;
var currentImageOriginalHeight = null;

// --- Swiper Instance (for index.html) ---
window.mySwiper = null;

// --- Canvas Element References (context-dependent) ---
var mainCanvas = null; // Used by index.html (#myCanvas) or admin.html (#adminCanvas)

// --- Image lists for Admin Dropdown ---
const FITR_IMAGE_NAMES = Array.from({length: 15}, (_, i) => `Eid${i + 1}.jpeg`);
const ADHA_IMAGE_NAMES = Array.from({length: 9}, (_, i) => `Eid${i + 1}.jpeg`);

// --- DOMContentLoaded: Main Initialization ---
document.addEventListener("DOMContentLoaded", async function () {
  await loadAllTextConfigs(); // Load configs first, needed by both pages

  // Page-specific initializations
  if (document.getElementById('myCanvas') && document.querySelector('.swiper-container')) {
    mainCanvas = document.getElementById('myCanvas');
    console.log("Initializing for index.html");
    initializeIndexPage();
  } else if (document.getElementById('adminCanvas')) {
    mainCanvas = document.getElementById('adminCanvas');
    console.log("Initializing for admin.html");
    initializeAdminPage();
  } else {
    console.error("Unknown page context or essential elements missing.");
  }
});

// --- Configuration Loading ---
async function loadAllTextConfigs() {
    try {
        const response = await fetch('text_configs.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, while fetching text_configs.json`);
        }
        allTextConfigs = await response.json();
        console.log("Text configurations loaded successfully from text_configs.json.");
    } catch (error) {
        console.error("Failed to load text_configs.json:", error);
        allTextConfigs = { fitr: {}, adha: {} }; // Provide a basic empty structure on error
    }
}

// --- Initialization for index.html ---
function initializeIndexPage() {
  if (typeof $ !== 'undefined' && typeof $.fn.select2 === 'function') {
    $('.font-family-select').select2({
        templateResult: formatFontOption,
        templateSelection: formatFontOption
    });
  } else {
    console.warn("jQuery or Select2 not available for font-family select on index.html.");
  }

  var $swiperSelector = $('.swiper-container');
  if (typeof $ !== 'undefined' && $swiperSelector.length > 0 && !$swiperSelector.hasClass('swiper-slider-0')) {
      $swiperSelector.first().addClass('swiper-slider-0');
  }
  updateSwiperDesigns();

  if (currentDesign && mainCanvas) {
    showImg();
  }

  document.getElementById('fitrBtn').addEventListener('click', function() {
    currentEidTheme = 'fitr';
    this.classList.add('btn-primary', 'active');
    this.classList.remove('btn-secondary');
    document.getElementById('adhaBtn').classList.add('btn-secondary');
    document.getElementById('adhaBtn').classList.remove('btn-primary', 'active');
    updateSwiperDesigns();
    showImg();
  });

  document.getElementById('adhaBtn').addEventListener('click', function() {
    currentEidTheme = 'adha';
    this.classList.add('btn-primary', 'active');
    this.classList.remove('btn-secondary');
    document.getElementById('fitrBtn').classList.add('btn-secondary');
    document.getElementById('fitrBtn').classList.remove('btn-primary', 'active');
    updateSwiperDesigns();
    showImg();
  });
}

// --- Initialization for admin.html ---
function initializeAdminPage() {
    const adminEidThemeSelect = document.getElementById('adminEidThemeSelect');
    const adminImageSelect = document.getElementById('adminImageSelect');
    const adminFontFamilySelect = document.getElementById('adminFontFamily');
    const adminGenerateJsonBtn = document.getElementById('adminGenerateJsonBtn');

    if (typeof $ !== 'undefined' && typeof $.fn.select2 === 'function') {
        if (adminFontFamilySelect) { $(adminFontFamilySelect).select2(); }
    } else { console.warn("jQuery or Select2 not available for adminFontFamily select on admin.html."); }

    // Set initial theme for admin page based on its select element's default
    if (adminEidThemeSelect) {
        currentEidTheme = adminEidThemeSelect.value;
    }
    populateAdminImageSelect();

    if (adminEidThemeSelect) {
        adminEidThemeSelect.addEventListener('change', function() {
            currentEidTheme = this.value;
            populateAdminImageSelect();
            if (adminImageSelect.options.length > 0) {
                currentDesign = adminImageSelect.value;
                loadAdminImage();
            }
        });
    }

    if (adminImageSelect) {
        adminImageSelect.addEventListener('change', function() {
            currentDesign = this.value;
            loadAdminImage();
        });
    }

    if (adminFontFamilySelect) {
        adminFontFamilySelect.addEventListener('change', function() {
            if (currentDesign) loadAdminImage();
        });
    }

    if (adminGenerateJsonBtn) {
        adminGenerateJsonBtn.addEventListener('click', generateAdminJsonConfig);
    }

    setupAdminCanvasListener(true, 'adminCanvas');

    if (adminImageSelect.options.length > 0) {
        currentDesign = adminImageSelect.value;
        loadAdminImage();
    }
}

function populateAdminImageSelect() {
    const select = document.getElementById('adminImageSelect');
    if (!select) return;
    select.innerHTML = '';
    const imageNames = currentEidTheme === 'fitr' ? FITR_IMAGE_NAMES : ADHA_IMAGE_NAMES;

    imageNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name.replace('.jpeg', '');
        select.appendChild(option);
    });
    if (select.options.length > 0) {
      currentDesign = select.options[0].value;
    }
}

async function loadAdminImage() {
    if (!mainCanvas || !currentDesign) {
        console.error("Admin canvas or current design not set for loadAdminImage.");
        return;
    }
    const context = mainCanvas.getContext('2d');
    const img = new Image();

    // *** MODIFIED PATH LOGIC FOR ADMIN PAGE ***
    var basePath = '';
    if (currentEidTheme === 'fitr') {
        basePath = 'Eidfitr/';
    } else if (currentEidTheme === 'adha') {
        basePath = 'Eidadha/';
    }
    img.src = basePath + currentDesign;

    img.onload = function() {
        currentImageOriginalWidth = img.width;
        currentImageOriginalHeight = img.height;
        mainCanvas.width = img.width;
        mainCanvas.height = img.height;
        context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        context.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);

        const adminFontFamilySelect = document.getElementById('adminFontFamily');
        const previewFont = adminFontFamilySelect ? adminFontFamilySelect.value : 'Arial';
        const settings = setTextSettings(currentDesign, 1, '#000000', previewFont);

        if (settings) {
            context.fillStyle = settings.color;
            context.font = `bold ${settings.fontSize} ${settings.fontFamily}`;
            context.fillText("Your Name", settings.x, settings.y);
        }
        updateAdminPanelWithCurrentDesignInfo();
    };
    img.onerror = function() {
        console.error("Failed to load admin image: " + img.src);
        if (context) {
            context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
            context.fillStyle = "red";
            context.font = "16px Arial";
            context.fillText("Error: Image not found.", 10, 50);
        }
        updateAdminPanelWithCurrentDesignInfo();
    };
}


// --- Helper Functions (Shared) ---
function formatFontOption(font) {
  if (!font.id) { return font.text; }
  if (typeof $ === 'undefined') { return font.text; }
  return $('<span class="font-option" style="font-family:\'' + font.element.value + '\';">' + font.text + '</span>');
}

function capitalizeFirstLetter(string) {
  if (typeof string !== 'string' || string.length === 0) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// --- Swiper Carousel Management (index.html specific) ---
function updateSwiperDesigns() {
  var swiperWrapper = document.querySelector('.swiper-wrapper');
  if (!swiperWrapper) { return; }
  swiperWrapper.innerHTML = '';

  // *** MODIFIED PATH LOGIC FOR SWIPER ***
  var basePath = '';
  if (currentEidTheme === 'fitr') {
      basePath = 'Eidfitr/';
  } else if (currentEidTheme === 'adha') {
      basePath = 'Eidadha/';
  }
  var designs = [];
  // The swiper on index.html shows Eid1-9 for both themes.
  for (let i = 1; i <= 9; i++) { designs.push(`Eid${i}.jpeg`); }

  designs.forEach(function(designName, index) {
    var slide = document.createElement('div');
    slide.classList.add('swiper-slide');
    var thumbnailDiv = document.createElement('div');
    thumbnailDiv.classList.add('thumbnail');
    var imgElement = document.createElement('img');
    imgElement.src = basePath + designName; // Apply new base path
    imgElement.alt = `Design ${index + 1}`;
    imgElement.dataset.src = designName;
    imgElement.classList.add('img-fluid');
    var p = document.createElement('p');
    p.innerHTML = `<b>Design ${index + 1}</b>`;
    thumbnailDiv.appendChild(imgElement);
    thumbnailDiv.appendChild(p);
    slide.appendChild(thumbnailDiv);
    swiperWrapper.appendChild(slide);
  });

  if (window.mySwiper && typeof window.mySwiper.destroy === 'function') {
    window.mySwiper.destroy(true, true);
  }

  var $swiperSelector = null;
  if (typeof $ !== 'undefined') { $swiperSelector = $('.swiper-container'); }

  if ($swiperSelector && $swiperSelector.length > 0) {
      window.mySwiper = new Swiper($swiperSelector[0], {
          slidesPerView: $swiperSelector.data('slides-per-view') ? $swiperSelector.data('slides-per-view') : 2,
          spaceBetween: $swiperSelector.data('space-between') ? $swiperSelector.data('space-between') : 10,
          loop: $swiperSelector.data('loop') ? $swiperSelector.data('loop') : false,
          navigation: { nextEl: ".swiper-button-next", prevEl: ".swiper-button-prev" },
          pagination: { el: ".swiper-pagination", clickable: true },
        });
  }

  var thumbnails = document.querySelectorAll(".swiper-slide .thumbnail img");
  thumbnails.forEach(function (thumbnail) {
    thumbnail.addEventListener("click", function (e) {
      thumbnails.forEach(thumb => thumb.classList.remove("selected"));
      e.target.classList.add("selected");
      currentDesign = e.target.dataset.src;
      showImg();
    });
  });

  if (thumbnails.length > 0) {
    thumbnails[0].classList.add("selected");
    currentDesign = thumbnails[0].dataset.src;
  } else {
    currentDesign = "Eid1.jpeg";
  }
}

// --- Admin Mode Functionality (Shared logic for handling canvas clicks and generating JSON) ---
function setupAdminCanvasListener(shouldListen, canvasId) {
  const targetCanvas = document.getElementById(canvasId);
  if (targetCanvas) {
    if (shouldListen) { targetCanvas.addEventListener('click', handleAdminCanvasClick); }
    else { targetCanvas.removeEventListener('click', handleAdminCanvasClick); }
  } else {
    console.error(`Admin Canvas Listener: Canvas with ID "${canvasId}" not found.`);
  }
}

function handleAdminCanvasClick(event) {
  if (!mainCanvas || !currentImageOriginalWidth || !currentImageOriginalHeight) return;

  let clickX = event.offsetX;
  let clickY = event.offsetY;
  var json_x = Math.round(clickX * (currentImageOriginalWidth / mainCanvas.width));
  var json_y = Math.round(clickY * (currentImageOriginalHeight / mainCanvas.height));

  const xInput = document.getElementById('adminCoordX');
  const yInput = document.getElementById('adminCoordY');
  if (xInput) xInput.value = json_x;
  if (yInput) yInput.value = json_y;
}

function updateAdminPanelWithCurrentDesignInfo() {
    if (!currentDesign) return;

    const nameEl = document.getElementById('adminEditingImageName');
    const filenameEl = document.getElementById('jsonConfigFilename');

    if (nameEl) nameEl.textContent = (currentEidTheme === 'adha' ? 'Eidadha/' : (currentEidTheme === 'fitr' ? 'Eidfitr/' : '')) + currentDesign;
    if (filenameEl) filenameEl.textContent = "text_configs.json";

    let settingsToDisplay = { fontSize: 30, x: 50, y: 50, defaultColor: '#000000' };

    if (allTextConfigs && allTextConfigs[currentEidTheme]) {
        let designSpecificConfig = allTextConfigs[currentEidTheme][currentDesign];
        if (currentEidTheme === 'adha' && !designSpecificConfig && currentDesign.match(/Eid(1[0-5])\.jpeg/)) {
            designSpecificConfig = allTextConfigs.fitr ? allTextConfigs.fitr[currentDesign] : null;
        }
        if (designSpecificConfig) { settingsToDisplay = designSpecificConfig; }
    }

    const xInput = document.getElementById('adminCoordX');
    const yInput = document.getElementById('adminCoordY');
    const fontSizeInput = document.getElementById('adminFontSize');
    const fontColorInput = document.getElementById('adminFontColor');

    if (xInput) xInput.value = settingsToDisplay.x || 0;
    if (yInput) yInput.value = settingsToDisplay.y || 0;
    if (fontSizeInput) fontSizeInput.value = settingsToDisplay.fontSize || 30;
    if (fontColorInput) fontColorInput.value = settingsToDisplay.defaultColor || '#000000';
}

function generateAdminJsonConfig() {
  const fontSizeEl = document.getElementById('adminFontSize');
  const coordXEl = document.getElementById('adminCoordX');
  const coordYEl = document.getElementById('adminCoordY');
  const fontColorEl = document.getElementById('adminFontColor');
  const outputEl = document.getElementById('generatedJsonOutput');
  const filenameHintEl = document.getElementById('jsonConfigFilename');

  const config = {
    fontSize: parseInt(fontSizeEl ? fontSizeEl.value : 30) || 30,
    x: parseInt(coordXEl ? coordXEl.value : 0) || 0,
    y: parseInt(coordYEl ? coordYEl.value : 0) || 0,
    defaultColor: fontColorEl ? fontColorEl.value : '#000000'
  };
  if (outputEl) outputEl.value = JSON.stringify(config, null, 2);
  if (filenameHintEl) filenameHintEl.textContent = "text_configs.json";
}

// --- Core Drawing and Settings Logic (Shared) ---
function setTextSettings(designName, scaleFactor, userSelectedFontColor, fontName) {
  let designSpecificConfig = null;
  const fallbackSettings = { fontSize: 30, x: 50, y: 50, defaultColor: '#000000' };

  if (!allTextConfigs) {
    console.error("setTextSettings: allTextConfigs is not loaded. Using fallback.");
    designSpecificConfig = { ...fallbackSettings };
  } else if (allTextConfigs[currentEidTheme]) {
    designSpecificConfig = allTextConfigs[currentEidTheme][designName];
    if (currentEidTheme === 'adha' && !designSpecificConfig && designName.match(/Eid(1[0-5])\.jpeg/)) {
        designSpecificConfig = allTextConfigs.fitr ? allTextConfigs.fitr[designName] : null;
    }
  }

  if (!designSpecificConfig) {
    designSpecificConfig = { ...fallbackSettings };
  }

  designSpecificConfig.fontSize = designSpecificConfig.fontSize || fallbackSettings.fontSize;
  designSpecificConfig.x = designSpecificConfig.x || fallbackSettings.x;
  designSpecificConfig.y = designSpecificConfig.y || fallbackSettings.y;
  designSpecificConfig.defaultColor = designSpecificConfig.defaultColor || fallbackSettings.defaultColor;

  let finalColor = userSelectedFontColor;
  if (userSelectedFontColor === '#000000') { finalColor = designSpecificConfig.defaultColor; }

  return {
    color: finalColor,
    fontSize: (designSpecificConfig.fontSize * scaleFactor) + 'px',
    x: (designSpecificConfig.x * scaleFactor),
    y: (designSpecificConfig.y * scaleFactor),
    fontFamily: fontName
  };
}

// --- Main Page Canvas Drawing (index.html) ---
async function showImg() {
  const canvasForUserPage = document.getElementById('myCanvas');
  if (!canvasForUserPage) { return; }
  if (mainCanvas !== canvasForUserPage && canvasForUserPage) mainCanvas = canvasForUserPage;

  const context = canvasForUserPage.getContext("2d");
  const textElement = document.getElementById("custom-text");
  const text = textElement ? textElement.value : '';
  const fontColorInput = document.getElementById("font-color");
  const fontColor = fontColorInput ? fontColorInput.value : '';
  const fontFamilySelect = document.getElementById("font-family");
  const fontFamily = fontFamilySelect ? fontFamilySelect.value : '';

  const img = new Image();
  // *** MODIFIED PATH LOGIC FOR USER PAGE IMAGES ***
  var basePath = '';
  if (currentEidTheme === 'fitr') {
      basePath = 'Eidfitr/';
  } else if (currentEidTheme === 'adha') {
      basePath = 'Eidadha/';
  }
  const finalImageSrc = basePath + currentDesign;
  img.src = finalImageSrc;

  img.onload = function() {
    currentImageOriginalWidth = img.width;
    currentImageOriginalHeight = img.height;

    const deviceWidth = window.innerWidth;
    const isMobile = isMobileDevice();

    if (isMobile) {
        canvasForUserPage.width = 390;
        canvasForUserPage.height = 390;
    } else {
        canvasForUserPage.width = img.width;
        canvasForUserPage.height = img.height;
    }

    let displayScaleFactor = canvasForUserPage.width / img.width;

    context.clearRect(0, 0, canvasForUserPage.width, canvasForUserPage.height);
    context.drawImage(img, 0, 0, canvasForUserPage.width, canvasForUserPage.height);

    var designSettings = setTextSettings(currentDesign, displayScaleFactor, fontColor, fontFamily);

    context.fillStyle = designSettings.color;
    context.font = 'bold ' + designSettings.fontSize + ' ' + designSettings.fontFamily;
    context.fillText(text, designSettings.x, designSettings.y);

    if (isMobile) {
        canvasForUserPage.style.width = deviceWidth + 'px';
        canvasForUserPage.style.height = deviceWidth + 'px';
    }
  };
   img.onerror = function() {
    console.error("Failed to load image on user page: " + finalImageSrc);
    if (context) {
        context.clearRect(0, 0, canvasForUserPage.width, canvasForUserPage.height);
        context.fillStyle = "red";
        context.font = "16px Arial";
        context.fillText("Error: Image not found.", 10, 50);
    }
  };
}

// --- Save Image Functionality (index.html) ---
async function saveImg() {
  const canvasForUserPage = document.getElementById('myCanvas');
  if (!canvasForUserPage) { return; }
  if (mainCanvas !== canvasForUserPage && canvasForUserPage) mainCanvas = canvasForUserPage;

  const context = canvasForUserPage.getContext("2d");
  const textElement = document.getElementById("custom-text");
  const text = textElement ? textElement.value : '';
  const fontColorInput = document.getElementById("font-color");
  const fontColor = fontColorInput ? fontColorInput.value : '';
  const fontFamilySelect = document.getElementById("font-family");
  const fontFamily = fontFamilySelect ? fontFamilySelect.value : '';

  const img = new Image();
  // *** MODIFIED PATH LOGIC FOR SAVING IMAGE ***
  var basePath = '';
  if (currentEidTheme === 'fitr') {
      basePath = 'Eidfitr/';
  } else if (currentEidTheme === 'adha') {
      basePath = 'Eidadha/';
  }
  const finalImageSrc = basePath + currentDesign;
  img.src = finalImageSrc;

  img.onload = function () {
    canvasForUserPage.width = img.width;
    canvasForUserPage.height = img.height;
    context.clearRect(0, 0, img.width, img.height);
    context.drawImage(img, 0, 0, img.width, img.height);

    var designSettings = setTextSettings(currentDesign, 1, fontColor, fontFamily);
    context.fillStyle = designSettings.color;
    context.font = 'bold ' + designSettings.fontSize + ' ' + designSettings.fontFamily;
    context.fillText(capitalizeFirstLetter(text), designSettings.x, designSettings.y);

    var image = canvasForUserPage.toDataURL("image/jpeg", 1.0).replace("image/jpeg", "image/octet-stream");
    var link = document.createElement('a');
    link.download = "Eid_Mubarak.jpg";
    link.href = image;
    link.click();
    showImg();
  };
   img.onerror = function() {
    console.error("Failed to load image for saving: " + finalImageSrc);
    alert("Error: Could not load image for saving. Please try another design.");
  };
}
