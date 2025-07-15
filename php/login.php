<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Gérer les requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!extension_loaded('xml')) {
    echo json_encode(['error' => 'Extension XML non chargée']);
    exit;
}

$xmlFile = __DIR__ . '/../xml/users.xml';

if (
    $_SERVER['REQUEST_METHOD'] === 'POST' &&
    isset($_POST['action']) && $_POST['action'] === 'reset_password'
) {
    $phone = trim($_POST['phone'] ?? '');
    $password = $_POST['password'] ?? '';

    if (empty($phone) || empty($password)) {
        echo json_encode(['error' => 'Tous les champs sont obligatoires']);
        exit;
    }
    if (!preg_match('/^[0-9]{9}$/', $phone)) {
        echo json_encode(['error' => 'Le numéro de téléphone doit contenir 9 chiffres']);
        exit;
    }
    if (strlen($password) < 6) {
        echo json_encode(['error' => 'Le mot de passe doit contenir au moins 6 caractères']);
        exit;
    }
    if (!file_exists($xmlFile)) {
        echo json_encode(['error' => 'Aucun utilisateur enregistré']);
        exit;
    }
    $xml = simplexml_load_file($xmlFile);
    if ($xml === false) {
        echo json_encode(['error' => 'Erreur lors du chargement du fichier XML']);
        exit;
    }
    $userFound = false;
    foreach ($xml->user as $user) {
        if ((string)$user->phone === $phone) {
            $userFound = true;
            $user->password = password_hash($password, PASSWORD_DEFAULT);
            $xml->asXML($xmlFile);
            echo json_encode(['success' => true, 'message' => 'Mot de passe réinitialisé avec succès.']);
            exit;
        }
    }
    if (!$userFound) {
        echo json_encode(['error' => 'Aucun compte trouvé avec ce numéro de téléphone']);
        exit;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'login') {
    $phone = trim($_POST['phone']);
    $password = $_POST['password'];

    // Validation des données
    if (empty($phone) || empty($password)) {
        echo json_encode(['error' => 'Tous les champs sont obligatoires']);
        exit;
    }

    // Validation du numéro de téléphone
    if (!preg_match('/^[0-9]{9}$/', $phone)) {
        echo json_encode(['error' => 'Le numéro de téléphone doit contenir 9 chiffres']);
        exit;
    }

    // Charger le fichier XML
    if (!file_exists($xmlFile)) {
        echo json_encode(['error' => 'Aucun utilisateur enregistré']);
        exit;
    }

    $xml = simplexml_load_file($xmlFile);
    if ($xml === false) {
        echo json_encode(['error' => 'Erreur lors du chargement du fichier XML']);
        exit;
    }

    // Rechercher l'utilisateur
    $userFound = false;
    $userId = null;
    $userName = null;

    foreach ($xml->user as $user) {
        if ((string)$user->phone === $phone) {
            $userFound = true;
            $userId = (string)$user['id'];
            $userName = (string)$user->name;
            
            // Vérifier le mot de passe
            if (password_verify($password, (string)$user->password)) {
                // Mettre à jour le statut en ligne
                $user->status = 'Online';
                $xml->asXML($xmlFile);
                
                // Démarrer la session
                session_start();
                $_SESSION['user_id'] = $userId;
                $_SESSION['user_name'] = $userName;
                $_SESSION['user_phone'] = $phone;
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Connexion réussie',
                    'user' => [
                        'id' => $userId,
                        'name' => $userName,
                        'phone' => $phone
                    ]
                ]);
                exit;
            } else {
                echo json_encode(['error' => 'Mot de passe incorrect']);
                exit;
            }
        }
    }

    if (!$userFound) {
        echo json_encode(['error' => 'Aucun compte trouvé avec ce numéro de téléphone']);
        exit;
    }

} else {
    echo json_encode(['error' => 'Méthode non autorisée']);
}
?>