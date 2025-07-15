<?php
header('Content-Type: application/json');

session_start();

if (isset($_SESSION['user_id'])) {
    // Mettre à jour le statut hors ligne dans le fichier XML
    $xmlFile = __DIR__ . '/../xml/users.xml';
    
    if (file_exists($xmlFile)) {
        $xml = simplexml_load_file($xmlFile);
        if ($xml !== false) {
            foreach ($xml->user as $user) {
                if ((string)$user['id'] === $_SESSION['user_id']) {
                    $user->status = 'Offline';
                    $xml->asXML($xmlFile);
                    break;
                }
            }
        }
    }
    
    // Détruire la session
    session_destroy();
    
    echo json_encode(['success' => true, 'message' => 'Déconnexion réussie']);
} else {
    echo json_encode(['error' => 'Aucune session active']);
}
?>