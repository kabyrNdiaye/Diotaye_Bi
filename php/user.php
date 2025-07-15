<?php
header('Content-Type: application/json');

if (!extension_loaded('xml')) {
    echo json_encode(['error' => 'Extension XML non chargée']);
    exit;
}

$xmlFile = __DIR__ . '/../xml/users.xml';

if (!file_exists($xmlFile)) {
    file_put_contents($xmlFile, '<?xml version="1.0" encoding="UTF-8"?><users></users>');
    echo json_encode(['error' => 'Fichier XML des utilisateurs créé mais vide']);
    exit;
}

$xml = simplexml_load_file($xmlFile);
if ($xml === false) {
    echo json_encode(['error' => 'Erreur lors du chargement du fichier XML']);
    exit;
}

if ($_GET['action'] === 'get_all_users') {
    $users = [];
    foreach ($xml->user as $user) {
        $users[] = [
            'name' => (string)$user->name,
            'email' => (string)$user->email,
            'status' => (string)$user->status
        ];
    }
    echo json_encode($users);
} elseif ($_GET['action'] === 'get_user' && isset($_GET['id'])) {
    foreach ($xml->user as $user) {
        if ((string)$user['id'] == $_GET['id']) {
            echo json_encode([
                'name' => (string)$user->name,
                'email' => (string)$user->email
            ]);
            exit;
        }
    }
    echo json_encode(['error' => 'Utilisateur non trouvé']);
} elseif ($_SERVER['REQUEST_METHOD'] === 'POST' && $_POST['action'] === 'update') {
    $id = $_POST['id'];
    $name = htmlspecialchars($_POST['name']);
    $email = htmlspecialchars($_POST['email']);
    $password = $_POST['password'] ? password_hash($_POST['password'], PASSWORD_DEFAULT) : '';

    $updated = false;
    foreach ($xml->user as $user) {
        if ((string)$user['id'] == $id) {
            $user->name = $name;
            $user->email = $email;
            if ($password) $user->password = $password;
            $updated = true;
            break;
        }
    }
    if ($updated) {
        $xml->asXML($xmlFile);
        echo "Profil mis à jour avec succès";
    } else {
        echo "Utilisateur non trouvé";
    }
}
?>