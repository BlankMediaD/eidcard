<?php
header('Content-Type: application/json');

// --- Configuration ---
$configFile = __DIR__ . '/../text_configs.json';
$tempFile = __DIR__ . '/../text_configs.tmp.json';

// --- Helper Function for Sending JSON Response ---
function send_json_response($statusCode, $data) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}

// --- Request Method Check ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    send_json_response(405, ['error' => 'Method Not Allowed. Only POST requests are accepted.']);
}

// --- Content-Type Check ---
if (!isset($_SERVER['CONTENT_TYPE']) || stripos($_SERVER['CONTENT_TYPE'], 'application/json') === false) {
    send_json_response(415, ['error' => 'Unsupported Media Type. Request must be application/json.']);
}

// --- Get Raw POST Data ---
$jsonPayload = file_get_contents('php://input');
if ($jsonPayload === false) {
    send_json_response(400, ['error' => 'Bad Request. Could not read request body.']);
}

// --- Decode JSON Payload ---
$data = json_decode($jsonPayload, true); // true for associative array
if (json_last_error() !== JSON_ERROR_NONE) {
    send_json_response(400, [
        'error' => 'Bad Request. Invalid JSON payload.',
        'json_error' => json_last_error_msg()
    ]);
}

// --- Basic Validation ---
$errors = [];
if (!isset($data['defaultThemeForUser']) || !is_string($data['defaultThemeForUser'])) {
    $errors[] = "'defaultThemeForUser' is missing or not a string.";
} elseif (!in_array($data['defaultThemeForUser'], ['fitr', 'adha'])) {
    $errors[] = "'defaultThemeForUser' must be either 'fitr' or 'adha'.";
}

if (!isset($data['fitr']) || !is_array($data['fitr'])) {
    $errors[] = "'fitr' theme configuration is missing or not an object/array.";
}

if (!isset($data['adha']) || !is_array($data['adha'])) {
    $errors[] = "'adha' theme configuration is missing or not an object/array.";
}

// Further validation could be added here, e.g., checking structure of theme objects if necessary.

if (!empty($errors)) {
    send_json_response(400, [
        'error' => 'Bad Request. JSON data validation failed.',
        'validation_errors' => $errors
    ]);
}

// --- Write to Temporary File First ---
if (file_put_contents($tempFile, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)) === false) {
    // Attempt to get more detailed error information if possible (requires specific PHP config)
    $lastError = error_get_last();
    $errorMessage = 'Internal Server Error. Could not write to temporary file.';
    if ($lastError && isset($lastError['message'])) {
        $errorMessage .= ' System Error: ' . $lastError['message'];
    }
    // Log this error to server logs for admin to see
    error_log("Failed to write to temp file $tempFile: " . ($lastError['message'] ?? 'Unknown error'));
    send_json_response(500, ['error' => $errorMessage]);
}

// --- Rename Temporary File to Actual Config File ---
if (!rename($tempFile, $configFile)) {
    // Attempt to get more detailed error information
    $lastError = error_get_last();
    $errorMessage = 'Internal Server Error. Could not move temporary file to final config file.';
    if ($lastError && isset($lastError['message'])) {
        $errorMessage .= ' System Error: ' . $lastError['message'];
    }
     // Log this error
    error_log("Failed to rename $tempFile to $configFile: " . ($lastError['message'] ?? 'Unknown error'));
    // Try to clean up temp file if rename failed
    if (file_exists($tempFile)) {
        unlink($tempFile);
    }
    send_json_response(500, ['error' => $errorMessage]);
}

// --- Success ---
send_json_response(200, ['success' => true, 'message' => 'Configuration saved successfully.']);

?>
