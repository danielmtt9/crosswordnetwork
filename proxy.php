<?php
/**
 * PHP Proxy Script for Node.js App
 * This works around Apache mod_proxy restrictions on shared hosting
 */

// Get the request URI
$requestUri = $_SERVER['REQUEST_URI'];
$queryString = $_SERVER['QUERY_STRING'] ?? '';

// Build the Node.js server URL
$nodeUrl = 'http://127.0.0.1:3000' . $requestUri;
if ($queryString) {
    $nodeUrl .= '?' . $queryString;
}

// Initialize cURL
$ch = curl_init($nodeUrl);

// Set cURL options
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_NOBODY, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

// Forward request method
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);

// Forward headers (excluding some)
$headers = [];
foreach (getallheaders() as $name => $value) {
    if (!in_array(strtolower($name), ['host', 'connection', 'content-length'])) {
        $headers[] = "$name: $value";
    }
}
if (!empty($headers)) {
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
}

// Forward POST data
if ($_SERVER['REQUEST_METHOD'] === 'POST' || $_SERVER['REQUEST_METHOD'] === 'PUT') {
    $postData = file_get_contents('php://input');
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
}

// Execute request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

// Split headers and body
$responseHeaders = substr($response, 0, $headerSize);
$body = substr($response, $headerSize);

// Parse and forward headers
$headerLines = explode("\r\n", $responseHeaders);
foreach ($headerLines as $header) {
    if (stripos($header, 'HTTP/') === 0) {
        http_response_code($httpCode);
    } elseif (strpos($header, ':') !== false) {
        list($name, $value) = explode(':', $header, 2);
        $name = trim($name);
        $value = trim($value);
        // Skip some headers
        if (!in_array(strtolower($name), ['transfer-encoding', 'connection', 'content-encoding'])) {
            header("$name: $value");
        }
    }
}

// Output body
echo $body;
?>

