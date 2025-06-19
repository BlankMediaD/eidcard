// --- Global Application State Variables ---
var currentEidTheme = 'fitr';
var currentDesign = "Eid1.jpeg";
var allTextConfigs = null; // Will hold all configs from text_configs.json

// --- Admin Mode Related Global Variables ---
// Note: isAdminModeActive is now effectively removed/unused.
var currentImageOriginalWidth = null;
var currentImageOriginalHeight = null;

// --- Swiper Instance (for index.html) ---
window.mySwiper = null;

// --- Canvas Element References (context-dependent) ---
var mainCanvas = null; // Used by index.html (#myCanvas) or admin.html (#adminCanvas)
var currentAdminImageObject = null; // Holds the currently loaded image object for the admin canvas

// --- Image lists for Admin Dropdown ---
const FITR_IMAGE_NAMES = Array.from({length: 15}, (_, i) => `Eid${i + 1}.jpeg`);
const ADHA_IMAGE_NAMES = Array.from({length: 9}, (_, i) => `Eid${i + 1}.jpeg`);

// --- DOMContentLoaded: Main Initialization ---
document.addEventListener("DOMContentLoaded", async function () {
  await loadAllTextConfigs(); // Load configs first. This will also set currentEidTheme for index.html.

  // Page-specific initializations
  if (document.getElementById('myCanvas') && document.querySelector('.swiper-container')) { // Index page
    mainCanvas = document.getElementById('myCanvas');
    console.log("Initializing for index.html with theme:", currentEidTheme);
    initializeIndexPage();
  } else if (document.getElementById('adminCanvas')) { // Admin page
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
        const response = await fetch('api/get_config.php'); // Changed to PHP endpoint
        if (!response.ok) {
            // Try to get error message from PHP script if available
            let errorData = null;
            try {
                errorData = await response.json();
            } catch (e) { /* ignore if response is not json */ }

            let errorMessage = `HTTP error! status: ${response.status}`;
            if (errorData && errorData.error) {
                errorMessage += ` - Server: ${errorData.error}`;
            }
            throw new Error(`${errorMessage}, while fetching config from api/get_config.php`);
        }
        allTextConfigs = await response.json();

        if (typeof allTextConfigs !== 'object' || allTextConfigs === null) {
            console.warn("Config from api/get_config.php was not a valid object. Initializing with defaults.");
            allTextConfigs = { defaultThemeForUser: 'fitr', fitr: {}, adha: {} };
        }

        if (!allTextConfigs.hasOwnProperty('defaultThemeForUser') ||
            !['fitr', 'adha'].includes(allTextConfigs.defaultThemeForUser)) {
            console.warn("defaultThemeForUser not found or invalid in config. Defaulting to 'fitr'.");
            allTextConfigs.defaultThemeForUser = 'fitr';
        }

        // Set currentEidTheme for index.html based on loaded config.
        // This needs to happen before initializeIndexPage is called.
        // Check if we are on index.html by looking for unique elements of index.html and ensuring admin elements aren't present.
        if (document.getElementById('myCanvas') && document.querySelector('.swiper-container') && !document.getElementById('adminCanvas')) {
             currentEidTheme = allTextConfigs.defaultThemeForUser;
             console.log("Global currentEidTheme set to:", currentEidTheme, "from config for index.html.");
        }

        console.log("Text configurations loaded successfully via get_config.php. Default theme for user:", allTextConfigs.defaultThemeForUser);
    } catch (error) {
        console.error("Failed to load or parse configuration from api/get_config.php:", error);
        allTextConfigs = { defaultThemeForUser: 'fitr', fitr: {}, adha: {} }; // Fallback config

        // If loading fails, index.html will use the globally preset 'fitr' for currentEidTheme
        // or whatever was its initial default if this logic also fails.
        // Check if we are on index.html
        if (document.getElementById('myCanvas') && document.querySelector('.swiper-container') && !document.getElementById('adminCanvas')) {
            currentEidTheme = 'fitr'; // Explicitly fallback for index page if API/config error
            console.warn("Falling back to default 'fitr' theme for index.html due to API/config error.");
        }
    }
}

// --- Initialization for index.html ---
function initializeIndexPage() {
    // Update button states based on currentEidTheme (which might have been set by loadAllTextConfigs)
    const fitrButton = document.getElementById('fitrBtn');
    const adhaButton = document.getElementById('adhaBtn');
    if (fitrButton && adhaButton) {
        if (currentEidTheme === 'fitr') {
            fitrButton.classList.add('btn-primary', 'active');
            fitrButton.classList.remove('btn-secondary');
            adhaButton.classList.add('btn-secondary');
            adhaButton.classList.remove('btn-primary', 'active');
        } else if (currentEidTheme === 'adha') {
            adhaButton.classList.add('btn-primary', 'active');
            adhaButton.classList.remove('btn-secondary');
            fitrButton.classList.add('btn-secondary');
            fitrButton.classList.remove('btn-primary', 'active');
        }
    } else {
        console.warn("Theme buttons (fitrBtn/adhaBtn) not found on index.html for visual update.");
    }

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
    // const adminGenerateJsonBtn = document.getElementById('adminGenerateJsonBtn'); // Button removed
    const defaultUserThemeSelect = document.getElementById('defaultUserThemeSelect');
    // const updateFullJsonBtn = document.getElementById('updateFullJsonBtn'); // Button removed
    const saveFullConfigBtn = document.getElementById('saveFullConfigBtn'); // New save button
    const adminCoordXInput = document.getElementById('adminCoordX');
    const adminCoordYInput = document.getElementById('adminCoordY');
    const adminFontSizeInput = document.getElementById('adminFontSize');
    const adminFontColorInput = document.getElementById('adminFontColor');

    if (typeof $ !== 'undefined' && typeof $.fn.select2 === 'function') {
        if (adminFontFamilySelect) { $(adminFontFamilySelect).select2(); }
    } else { console.warn("jQuery or Select2 not available for adminFontFamily select on admin.html."); }

    if (adminEidThemeSelect) {
        currentEidTheme = adminEidThemeSelect.value; // Set initial theme for admin
        adminEidThemeSelect.addEventListener('change', function() {
            currentEidTheme = this.value;
            populateAdminImageSelect();
            if (adminImageSelect.options.length > 0) {
                currentDesign = adminImageSelect.value;
                loadAdminImage();
            } else {
                 // No designs for this theme, clear canvas and inputs
                if(mainCanvas && mainCanvas.id === 'adminCanvas') {
                    const context = mainCanvas.getContext('2d');
                    context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
                    currentAdminImageObject = null; // Clear stored image
                    document.getElementById('adminEditingImageName').textContent = 'N/A';
                }
                updateAdminPanelWithCurrentDesignInfo(); // Clears or sets defaults for inputs
                redrawAdminCanvasText(); // Attempt to draw (will likely show nothing or placeholder)
            }
        });
    }
    populateAdminImageSelect();

    if (adminImageSelect) {
        adminImageSelect.addEventListener('change', function() {
            currentDesign = this.value;
            loadAdminImage();
        });
    }

    // Event listeners for live preview on admin canvas
    if (adminCoordXInput) adminCoordXInput.addEventListener('input', redrawAdminCanvasText);
    if (adminCoordYInput) adminCoordYInput.addEventListener('input', redrawAdminCanvasText);
    if (adminFontSizeInput) adminFontSizeInput.addEventListener('input', redrawAdminCanvasText);
    if (adminFontColorInput) adminFontColorInput.addEventListener('input', redrawAdminCanvasText);
    if (adminFontFamilySelect) adminFontFamilySelect.addEventListener('change', redrawAdminCanvasText);

    // Setup "Generate JSON" button
    // Setup "Generate JSON" button - REMOVED
    // if (adminGenerateJsonBtn) {
    //     adminGenerateJsonBtn.addEventListener('click', generateAdminJsonConfig);
    // }

    if (defaultUserThemeSelect) {
        defaultUserThemeSelect.value = allTextConfigs.defaultThemeForUser || 'fitr';
    }

    // if (updateFullJsonBtn) { // Button removed
    //     updateFullJsonBtn.addEventListener('click', updateFullJsonOutput);
    // }

    if (saveFullConfigBtn) {
        saveFullConfigBtn.addEventListener('click', saveFullConfiguration);
    }

    // Always listen for canvas clicks on admin page
    setupAdminCanvasListener(true, 'adminCanvas');

    // Load initial image and config
    if (adminImageSelect.options.length > 0) {
        // currentDesign might have been set by populateAdminImageSelect, or use the first option
        currentDesign = adminImageSelect.value || (select.options[0] ? select.options[0].value : null);
        if(currentDesign) loadAdminImage();
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
    } else {
      currentDesign = null; // No designs for this theme
    }
}

async function loadAdminImage() {
    if (!mainCanvas || !currentDesign) {
        console.error("Admin canvas or current design not set for loadAdminImage. Current Design:", currentDesign);
        // Optionally clear canvas or show a "no design selected" message
        if (mainCanvas) {
            const context = mainCanvas.getContext('2d');
            context.clearRect(0,0,mainCanvas.width, mainCanvas.height);
            context.fillText("Please select a design.", 10, 50);
        }
        updateAdminPanelWithCurrentDesignInfo(); // Update panel even if no image
        return;
    }
    const context = mainCanvas.getContext('2d');
    const img = new Image();

    var basePath = getImageBasePath(currentEidTheme);
    img.src = basePath + currentDesign;

    img.onload = function() {
        currentImageOriginalWidth = img.width;
        currentImageOriginalHeight = img.height;
        currentAdminImageObject = img; // Store the loaded image object

        mainCanvas.width = img.width;
        mainCanvas.height = img.height;

        updateAdminPanelWithCurrentDesignInfo(); // Populate inputs first
        redrawAdminCanvasText(); // Then draw text based on those inputs
    };
    img.onerror = function() {
        console.error("Failed to load admin image: " + img.src);
        currentAdminImageObject = null; // Clear stored image on error
        if (mainCanvas && mainCanvas.id === 'adminCanvas') {
            const context = mainCanvas.getContext('2d');
            context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
            context.fillStyle = "red";
            context.font = "16px Arial";
            context.fillText(`Error: Image "${currentDesign}" not found at ${img.src}.`, 10, 50);
        }
        updateAdminPanelWithCurrentDesignInfo(); // Update panel (e.g. clear coords)
    };
}

function redrawAdminCanvasText() {
    if (!mainCanvas || mainCanvas.id !== 'adminCanvas' || !currentAdminImageObject) {
        // If no image is loaded (e.g., theme switched to one with no images, or image error)
        // still try to clear and potentially draw placeholder text if inputs have values.
        if (mainCanvas && mainCanvas.id === 'adminCanvas') {
            const context = mainCanvas.getContext('2d');
            context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
            if (!currentAdminImageObject) { // Only show this if there's truly no image
                 context.font = "16px Arial";
                 context.fillStyle = "grey";
                 context.fillText("No image loaded, or image error.", 10, 50);
            }
        }
        // Do not proceed to draw text if there's no image.
        // However, if an image IS loaded but this function is called due to input changes,
        // it should proceed to draw over that image.
        // The currentAdminImageObject check handles the "no image" case.
        // For the case where an image *is* loaded, it will proceed below.
         if (!currentAdminImageObject) return;
    }

    const context = mainCanvas.getContext('2d');
    context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    context.drawImage(currentAdminImageObject, 0, 0, mainCanvas.width, mainCanvas.height);

    const x = parseInt(document.getElementById('adminCoordX').value) || 0;
    const y = parseInt(document.getElementById('adminCoordY').value) || 0;
    const fontSize = parseInt(document.getElementById('adminFontSize').value) || 30;
    const fontColor = document.getElementById('adminFontColor').value || '#000000';
    const fontFamily = document.getElementById('adminFontFamily').value || 'Arial';

    context.fillStyle = fontColor;
    context.font = `bold ${fontSize}px ${fontFamily}`; // Added px unit
    context.fillText("Your Name", x, y);
}

// --- Helper Functions (Shared) ---
function getImageBasePath(theme) {
    if (theme === 'fitr') return 'Eidfitr/';
    if (theme === 'adha') return 'Eidadha/';
    console.warn(`getImageBasePath: Unknown theme provided - ${theme}. Defaulting to empty path.`);
    return '';
}

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

  var basePath = getImageBasePath(currentEidTheme);
  var designs = [];
  // Swiper on index.html displays Eid1-9 for both themes by default
  for (let i = 1; i <= 9; i++) { designs.push(`Eid${i}.jpeg`); }

  designs.forEach(function(designName, index) {
    var slide = document.createElement('div');
    slide.classList.add('swiper-slide');
    var thumbnailDiv = document.createElement('div');
    thumbnailDiv.classList.add('thumbnail');
    var imgElement = document.createElement('img');
    imgElement.src = basePath + designName;
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
  const targetCanvas = document.getElementById(canvasId); // canvasId is 'adminCanvas'
  if (targetCanvas) {
    if (shouldListen) { targetCanvas.addEventListener('click', handleAdminCanvasClick); }
    else { targetCanvas.removeEventListener('click', handleAdminCanvasClick); }
  } else {
    console.error(`Admin Canvas Listener: Canvas with ID "${canvasId}" not found.`);
  }
}

function handleAdminCanvasClick(event) {
  // This function is only effectively called for adminCanvas due to setupAdminCanvasListener calls.
  if (!mainCanvas || !currentImageOriginalWidth || !currentImageOriginalHeight) return;

  let clickX = event.offsetX;
  let clickY = event.offsetY;
  var json_x = Math.round(clickX * (currentImageOriginalWidth / mainCanvas.width));
  var json_y = Math.round(clickY * (currentImageOriginalHeight / mainCanvas.height));

  const xInput = document.getElementById('adminCoordX');
  const yInput = document.getElementById('adminCoordY');
  if (xInput) xInput.value = json_x;
  if (yInput) yInput.value = json_y;
  redrawAdminCanvasText(); // Update canvas after click
}

function updateAdminPanelWithCurrentDesignInfo() {
    if (!currentDesign) return;

    const nameEl = document.getElementById('adminEditingImageName');
    const filenameDisplayEl = document.getElementById('jsonConfigFilenameDisplay');

    if (nameEl) nameEl.textContent = getImageBasePath(currentEidTheme) + currentDesign;
    if (filenameDisplayEl) filenameDisplayEl.textContent = "text_configs.json"; // Keep this updated

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

    // After updating inputs from config, if an image is loaded, redraw text
    // This ensures that if a config is loaded, the preview matches it.
    // No, this is not the right place. loadAdminImage calls this, then redrawAdminCanvasText.
    // if (currentAdminImageObject && mainCanvas && mainCanvas.id === 'adminCanvas') {
    //   redrawAdminCanvasText();
    // }
}

function generateAdminJsonConfig() {
  const fontSizeEl = document.getElementById('adminFontSize');
  const coordXEl = document.getElementById('adminCoordX');
  const coordYEl = document.getElementById('adminCoordY');
  const fontColorEl = document.getElementById('adminFontColor');
  const outputEl = document.getElementById('generatedJsonOutput');
  const filenameHintEl = document.getElementById('jsonConfigFilenameDisplay'); // Use updated ID

  const config = {
    fontSize: parseInt(fontSizeEl ? fontSizeEl.value : 30) || 30,
    x: parseInt(coordXEl ? coordXEl.value : 0) || 0,
    y: parseInt(coordYEl ? coordYEl.value : 0) || 0,
    defaultColor: fontColorEl ? fontColorEl.value : '#000000'
  };
  if (outputEl) {
    outputEl.value = `"${currentDesign}": ${JSON.stringify(config, null, 2)}`;
    alert("JSON snippet for this design generated in the text area. Remember to include the image name as the key and place it under the correct theme in text_configs.json");
  }
  if (filenameHintEl) filenameHintEl.textContent = "text_configs.json";
}

// function updateFullJsonOutput() { // Replaced by saveFullConfiguration
//     const outputEl = document.getElementById('generatedJsonOutput');
//     const defaultUserThemeSelect = document.getElementById('defaultUserThemeSelect');

//     if (allTextConfigs && defaultUserThemeSelect && outputEl) {
//         allTextConfigs.defaultThemeForUser = defaultUserThemeSelect.value;
//         outputEl.value = JSON.stringify(allTextConfigs, null, 2);
//         alert("Full JSON configuration (including default user theme) updated in the text area. Copy this entire content and replace text_configs.json with it.");
//     } else {
//         console.error("Could not update full JSON output. Elements missing or allTextConfigs not loaded.");
//         alert("Error: Could not generate full JSON. Check console.");
//     }
// }

async function saveFullConfiguration() {
    console.log("Attempting to save full configuration...");
    const outputEl = document.getElementById('generatedJsonOutput');
    const defaultUserThemeSelect = document.getElementById('defaultUserThemeSelect');

    if (!allTextConfigs) {
        alert("Error: Configuration data is not loaded. Cannot save.");
        console.error("saveFullConfiguration: allTextConfigs is null.");
        return;
    }

    // 1. Update defaultThemeForUser from the dropdown
    if (defaultUserThemeSelect) {
        allTextConfigs.defaultThemeForUser = defaultUserThemeSelect.value;
    } else {
        alert("Error: Default theme selector not found. Cannot save.");
        console.error("saveFullConfiguration: defaultUserThemeSelect element not found.");
        return;
    }

    // 2. Update text configuration for the currently active/displayed image
    //    currentEidTheme (for admin editing context) and currentDesign should be up-to-date
    if (currentDesign && currentEidTheme && allTextConfigs[currentEidTheme]) {
        const adminCoordXInput = document.getElementById('adminCoordX');
        const adminCoordYInput = document.getElementById('adminCoordY');
        const adminFontSizeInput = document.getElementById('adminFontSize');
        const adminFontColorInput = document.getElementById('adminFontColor');

        const currentImageConfig = {
            x: parseInt(adminCoordXInput.value) || 0,
            y: parseInt(adminCoordYInput.value) || 0,
            fontSize: parseInt(adminFontSizeInput.value) || 30,
            defaultColor: adminFontColorInput.value || '#000000'
        };

        // Ensure the theme object and design entry exist before assigning
        if (!allTextConfigs[currentEidTheme]) {
            allTextConfigs[currentEidTheme] = {};
        }
        allTextConfigs[currentEidTheme][currentDesign] = currentImageConfig;
        console.log(`Updated config for ${currentEidTheme}/${currentDesign}:`, currentImageConfig);
    } else {
        console.warn("saveFullConfiguration: No current design/theme selected for saving text config, or theme object missing. Only default user theme will be updated in allTextConfigs.");
        // Not necessarily an error if admin only wanted to change default theme and not touch an image.
    }

    // 3. Display the config that will be sent (optional, good for debugging)
    if (outputEl) {
        outputEl.value = JSON.stringify(allTextConfigs, null, 2);
    }

    // 4. Send to server
    try {
        const response = await fetch('api/save_config.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(allTextConfigs)
        });

        const result = await response.json(); // Try to parse JSON response from server

        if (response.ok && result.success) {
            alert("Configuration saved successfully!");
            console.log("Configuration saved successfully:", result);
        } else {
            const errorMessage = result.error || (result.validation_errors ? JSON.stringify(result.validation_errors) : "Unknown error saving configuration.");
            alert(`Error saving configuration: ${errorMessage}`);
            console.error("Error saving configuration:", result);
        }
    } catch (error) {
        alert("Fatal error sending configuration. Check console for details.");
        console.error("Fatal error sending configuration:", error);
    }
}

// --- Core Drawing and Settings Logic (Shared) ---
function setTextSettings(designName, scaleFactor, userSelectedFontColor, fontName) {
  let designSpecificConfig = null;
  const fallbackSettings = { fontSize: 30, x: 50, y: 50, defaultColor: '#000000' }; // Default values

  // Prioritize loaded configurations if available
  if (allTextConfigs && allTextConfigs[currentEidTheme]) {
      designSpecificConfig = allTextConfigs[currentEidTheme][designName];
      // Fallback for Adha images (1-15) to Fitr config if Adha specific is missing
      if (currentEidTheme === 'adha' && !designSpecificConfig && designName && designName.match(/Eid(1[0-5])\.jpeg/)) {
          designSpecificConfig = allTextConfigs.fitr ? allTextConfigs.fitr[designName] : null;
      }
  }

  // If no specific configuration found after checking theme and fallback, use defaults
  if (!designSpecificConfig) {
      designSpecificConfig = { ...fallbackSettings }; // Use a copy of fallback
  } else {
      // Ensure all properties exist, even if config is sparse, by merging with fallback
      designSpecificConfig = { ...fallbackSettings, ...designSpecificConfig };
  }

  let finalColor = userSelectedFontColor;
  // If the user-selected color is black (default from color picker),
  // and a specific defaultColor is set in the config, prefer the config's defaultColor.
  // This allows designs to have a non-black default that isn't overridden unless the user explicitly changes the color picker.
  if (userSelectedFontColor === '#000000' && designSpecificConfig.defaultColor) {
      finalColor = designSpecificConfig.defaultColor;
  }


  return {
    color: finalColor, // The color to actually use for drawing
    fontSize: (designSpecificConfig.fontSize * scaleFactor) + 'px',
    x: (designSpecificConfig.x * scaleFactor),
    y: (designSpecificConfig.y * scaleFactor),
    fontFamily: fontName,
    // Also return the original defaultColor from config, so admin panel can show it
    // This is useful if the userSelectedFontColor caused finalColor to be different
    originalDefaultColor: designSpecificConfig.defaultColor
  };
}

// --- Main Page Canvas Drawing (index.html) ---
async function showImg() {
  if (!mainCanvas || mainCanvas.id !== 'myCanvas') {
    // console.log('showImg: Not on index.html or mainCanvas is not myCanvas.');
    return;
  }

  const context = mainCanvas.getContext("2d");
  const textElement = document.getElementById("custom-text");
  const text = textElement ? textElement.value : '';
  const fontColorInput = document.getElementById("font-color");
  const fontColor = fontColorInput ? fontColorInput.value : '';
  const fontFamilySelect = document.getElementById("font-family");
  const fontFamily = fontFamilySelect ? fontFamilySelect.value : '';

  const img = new Image();
  var basePath = getImageBasePath(currentEidTheme);
  const finalImageSrc = basePath + currentDesign;
  img.src = finalImageSrc;

  img.onload = function() {
    currentImageOriginalWidth = img.width;
    currentImageOriginalHeight = img.height;

    const deviceWidth = window.innerWidth;
    const isMobile = isMobileDevice();

    if (isMobile) {
        mainCanvas.width = 390;
        mainCanvas.height = 390;
    } else {
        mainCanvas.width = img.width;
        mainCanvas.height = img.height;
    }

    let displayScaleFactor = mainCanvas.width / img.width;

    context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
    context.drawImage(img, 0, 0, mainCanvas.width, mainCanvas.height);

    var designSettings = setTextSettings(currentDesign, displayScaleFactor, fontColor, fontFamily);

    context.fillStyle = designSettings.color;
    context.font = 'bold ' + designSettings.fontSize + ' ' + designSettings.fontFamily;
    context.fillText(text, designSettings.x, designSettings.y);

    if (isMobile) {
        mainCanvas.style.width = deviceWidth + 'px';
        mainCanvas.style.height = deviceWidth + 'px';
    }
  };
   img.onerror = function() {
    console.error("Failed to load image on user page: " + finalImageSrc);
    if (context) {
        context.clearRect(0, 0, mainCanvas.width, mainCanvas.height);
        context.fillStyle = "red";
        context.font = "16px Arial";
        context.fillText("Error: Image not found.", 10, 50);
    }
  };
}

// --- Save Image Functionality (index.html) ---
async function saveImg() {
  if (!mainCanvas || mainCanvas.id !== 'myCanvas') {
    // console.log('saveImg: Not on index.html or mainCanvas is not myCanvas.');
    return;
  }

  const context = mainCanvas.getContext("2d");
  const textElement = document.getElementById("custom-text");
  const text = textElement ? textElement.value : '';
  const fontColorInput = document.getElementById("font-color");
  const fontColor = fontColorInput ? fontColorInput.value : '';
  const fontFamilySelect = document.getElementById("font-family");
  const fontFamily = fontFamilySelect ? fontFamilySelect.value : '';

  const img = new Image();
  var basePath = getImageBasePath(currentEidTheme);
  const finalImageSrc = basePath + currentDesign;
  img.src = finalImageSrc;

  img.onload = function () {
    mainCanvas.width = img.width; // Use original image dimensions for saving
    mainCanvas.height = img.height;
    context.clearRect(0, 0, img.width, img.height);
    context.drawImage(img, 0, 0, img.width, img.height);

    var designSettings = setTextSettings(currentDesign, 1, fontColor, fontFamily);
    context.fillStyle = designSettings.color;
    context.font = 'bold ' + designSettings.fontSize + ' ' + designSettings.fontFamily;
    context.fillText(capitalizeFirstLetter(text), designSettings.x, designSettings.y);

    var image = mainCanvas.toDataURL("image/jpeg", 1.0).replace("image/jpeg", "image/octet-stream");
    var link = document.createElement('a');
    link.download = "Eid_Mubarak.jpg";
    link.href = image;
    link.click();
    showImg(); // Redraw for display after saving (might resize canvas)
  };
   img.onerror = function() {
    console.error("Failed to load image for saving: " + finalImageSrc);
    alert("Error: Could not load image for saving. Please try another design.");
  };
}
