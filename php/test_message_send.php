<?php
// Script de test pour l'envoi de messages
session_start();

// Simuler une session utilisateur (user ID 4)
$_SESSION['user_id'] = 4;

// Simuler les variables d'environnement HTTP
$_SERVER['REQUEST_METHOD'] = 'POST';

echo "<h2>Test d'envoi de messages</h2>";

// Test 1: Envoi d'un message JSON
echo "<h3>Test 1: Envoi d'un message via JSON</h3>";

$messageData = [
    'chat_id' => '1', // Envoyer à l'utilisateur 1
    'type' => 'contact',
    'content' => 'Test message from user 4 to user 1 - ' . date('Y-m-d H:i:s')
];

$jsonData = json_encode($messageData);

// Simuler une requête POST avec JSON
$_POST = $messageData;

// Capturer la sortie
ob_start();
include 'messages.php';
$output = ob_get_clean();

echo "<p><strong>Données envoyées:</strong></p>";
echo "<pre>" . htmlspecialchars($jsonData) . "</pre>";

echo "<p><strong>Réponse du serveur:</strong></p>";
echo "<pre>" . htmlspecialchars($output) . "</pre>";

// Test 2: Vérifier les messages
echo "<h3>Test 2: Vérification des messages</h3>";

// Simuler une requête GET pour récupérer les messages
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET = [
    'action' => 'get_messages',
    'chat_id' => '1',
    'type' => 'contact'
];

ob_start();
include 'messages.php';
$messagesOutput = ob_get_clean();

echo "<p><strong>Messages récupérés:</strong></p>";
echo "<pre>" . htmlspecialchars($messagesOutput) . "</pre>";

// Test 3: Afficher le contenu du fichier XML
echo "<h3>Test 3: Contenu du fichier messages.xml</h3>";

$messagesFile = __DIR__ . '/../xml/messages.xml';
if (file_exists($messagesFile)) {
    $xmlContent = file_get_contents($messagesFile);
    echo "<pre>" . htmlspecialchars($xmlContent) . "</pre>";
} else {
    echo "<p>Le fichier messages.xml n'existe pas.</p>";
}

echo "<h3>Test terminé</h3>";
?> 