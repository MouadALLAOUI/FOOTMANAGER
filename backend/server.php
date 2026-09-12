<?php

$publicPath = getcwd();

$uri = urldecode(
    parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH) ?? ''
);

// If this is a request to /storage/... serve directly with CORS headers so canvas/html-to-image won't fail
if ($uri !== '/' && str_starts_with($uri, '/storage/') && file_exists($publicPath.$uri)) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: *');
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }
    $mime = mime_content_type($publicPath.$uri);
    if ($mime) {
        header("Content-Type: $mime");
    }
    readfile($publicPath.$uri);
    exit;
}

// Emulate Apache's "mod_rewrite" functionality from the built-in PHP web server
if ($uri !== '/' && file_exists($publicPath.$uri)) {
    return false;
}

$formattedDateTime = date('D M j H:i:s Y');

$requestMethod = $_SERVER['REQUEST_METHOD'];
$remoteAddress = $_SERVER['REMOTE_ADDR'].':'.$_SERVER['REMOTE_PORT'];

file_put_contents('php://stdout', "[$formattedDateTime] $remoteAddress [$requestMethod] URI: $uri\n");

require_once $publicPath.'/index.php';
