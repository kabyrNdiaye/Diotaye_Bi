<?php
header('Content-Type: application/json');

if (!extension_loaded('xml')) {
    echo json_encode(['error' => 'Extension XML non chargée']);
    exit;
}

$xmlFile = __DIR__ . '/../xml/users.xml';

// Vérifier si le fichier XML existe, sinon le créer
if (!file_exists($xmlFile)) {
    $xmlContent = '<?xml version="1.0" encoding="UTF-8"?><users></users>';
    file_put_contents($xmlFile, $xmlContent);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'signup') {
    $firstname = trim($_POST['firstname']);
    $lastname = trim($_POST['lastname']);
    $phone = trim($_POST['phone']);
    $password = $_POST['password'];

    // Validation des données
    if (empty($firstname) || empty($lastname) || empty($phone) || empty($password)) {
        echo json_encode(['error' => 'Tous les champs sont obligatoires']);
        exit;
    }

    // Validation du numéro de téléphone (9 chiffres)
    if (!preg_match('/^[0-9]{9}$/', $phone)) {
        echo json_encode(['error' => 'Le numéro de téléphone doit contenir 9 chiffres']);
        exit;
    }

    // Validation du mot de passe (minimum 6 caractères)
    if (strlen($password) < 6) {
        echo json_encode(['error' => 'Le mot de passe doit contenir au moins 6 caractères']);
        exit;
    }

    // Charger le fichier XML
    $xml = simplexml_load_file($xmlFile);
    if ($xml === false) {
        echo json_encode(['error' => 'Erreur lors du chargement du fichier XML']);
        exit;
    }

    // Vérifier si le numéro de téléphone existe déjà
    foreach ($xml->user as $user) {
        if ((string)$user->phone === $phone) {
            echo json_encode(['error' => 'Ce numéro de téléphone est déjà utilisé']);
            exit;
        }
    }

    // Générer un nouvel ID
    $maxId = 0;
    foreach ($xml->user as $user) {
        $userId = (int)$user['id'];
        if ($userId > $maxId) {
            $maxId = $userId;
        }
    }
    $newId = $maxId + 1;

    // Créer le nouvel utilisateur
    $newUser = $xml->addChild('user');
    $newUser->addAttribute('id', $newId);
    $newUser->addChild('name', $firstname . ' ' . $lastname);
    $newUser->addChild('password', password_hash($password, PASSWORD_DEFAULT));
    $newUser->addChild('phone', $phone);
    $newUser->addChild('status', 'Offline');

    // Sauvegarder le fichier XML
    if ($xml->asXML($xmlFile)) {
        echo json_encode(['success' => 'Inscription réussie ! Vous pouvez maintenant vous connecter.']);
    } else {
        echo json_encode(['error' => 'Erreur lors de la sauvegarde']);
    }
} else {
    echo json_encode(['error' => 'Méthode non autorisée']);
}
?>