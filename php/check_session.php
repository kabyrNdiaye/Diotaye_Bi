<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (isset($_SESSION['user_id']) && isset($_SESSION['user_name'])) {
    echo json_encode([
        'logged_in' => true,
        'user' => [
            'id' => $_SESSION['user_id'],
            'name' => $_SESSION['user_name'],
            'phone' => $_SESSION['user_phone'] ?? '',
            'email' => $_SESSION['user_email'] ?? ''
        ]
    ]);
} else {
    echo json_encode([
        'logged_in' => false
    ]);
}
?> 