<?php
header('Content-Type: application/json');
header('Cache-Control: no-cache, no-store, must-revalidate'); // HTTP 1.1.
header('Pragma: no-cache'); // HTTP 1.0.
header('Expires: 0'); // Proxies.

$configFile = __DIR__ . '/../text_configs.json';

if (file_exists($configFile)) {
    $jsonContent = file_get_contents($configFile);
    // No need to decode and re-encode if it's already valid JSON.
    // Just output it directly.
    // Check if $jsonContent is valid JSON before outputting
    json_decode($jsonContent);
    if (json_last_error() === JSON_ERROR_NONE) {
        echo $jsonContent;
    } else {
        // The file content is not valid JSON
        http_response_code(500); // Internal Server Error
        echo json_encode([
            'error' => 'Error: The text_configs.json file does not contain valid JSON.',
            'json_error' => json_last_error_msg()
        ]);
    }
} else {
    http_response_code(404); // Not Found
    echo json_encode(['error' => 'Error: text_configs.json not found.']);
}
?>
