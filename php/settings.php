<?php
session_start();
header('Content-Type: application/json');

// Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non autorisé']);
    exit;
}

$action = $_GET['action'] ?? '';

// Gérer les requêtes POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
}

switch ($action) {
    case 'get_settings':
        getSettings();
        break;
    case 'save_setting':
        saveSetting($input);
        break;
    case 'update_profile':
        updateProfile($input);
        break;
    case 'change_password':
        changePassword($input);
        break;
    case 'upload_avatar':
        uploadAvatar();
        break;
    case 'delete_account':
        deleteAccount($input);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
}

function getSettings() {
    $xmlFile = '../xml/settings.xml';
    
    if (!file_exists($xmlFile)) {
        // Créer le fichier avec les paramètres par défaut
        createDefaultSettings();
    }
    
    $xml = simplexml_load_file($xmlFile);
    $userId = $_SESSION['user_id'];
    
    $userSettings = $xml->xpath("//user[@id='$userId']")[0] ?? null;
    
    if (!$userSettings) {
        // Créer les paramètres par défaut pour cet utilisateur
        $userSettings = createUserSettings($userId);
    }
    
    $settings = [
        'push_notifications' => (bool)($userSettings->push_notifications ?? true),
        'sounds' => (bool)($userSettings->sounds ?? true),
        'vibrations' => (bool)($userSettings->vibrations ?? true),
        'online_status' => (bool)($userSettings->online_status ?? true),
        'read_receipts' => (bool)($userSettings->read_receipts ?? true)
    ];
    
    echo json_encode(['success' => true, 'settings' => $settings]);
}

function saveSetting($input) {
    $setting = $input['setting'] ?? '';
    $value = $input['value'] ?? false;
    $userId = $_SESSION['user_id'];
    
    if (empty($setting)) {
        echo json_encode(['success' => false, 'message' => 'Paramètre manquant']);
        return;
    }
    
    $xmlFile = '../xml/settings.xml';
    $xml = simplexml_load_file($xmlFile);
    
    $userSettings = $xml->xpath("//user[@id='$userId']")[0] ?? null;
    
    if (!$userSettings) {
        $userSettings = createUserSettings($userId);
    }
    
    $userSettings->$setting = $value ? 'true' : 'false';
    $xml->asXML($xmlFile);
    
    echo json_encode(['success' => true, 'message' => 'Paramètre sauvegardé']);
}

function updateProfile($input) {
    $name = $input['name'] ?? '';
    $status = $input['status'] ?? '';
    $userId = $_SESSION['user_id'];
    
    if (empty($name)) {
        echo json_encode(['success' => false, 'message' => 'Nom requis']);
        return;
    }
    
    $xmlFile = '../xml/users.xml';
    $xml = simplexml_load_file($xmlFile);
    
    $user = $xml->xpath("//user[@id='$userId']")[0] ?? null;
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
        return;
    }
    
    $user->name = $name;
    $user->status = $status;
    $xml->asXML($xmlFile);
    
    // Mettre à jour la session
    $_SESSION['user_name'] = $name;
    
    echo json_encode(['success' => true, 'message' => 'Profil mis à jour']);
}

function changePassword($input) {
    $currentPassword = $input['current_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';
    $userId = $_SESSION['user_id'];
    
    if (empty($currentPassword) || empty($newPassword)) {
        echo json_encode(['success' => false, 'message' => 'Tous les champs sont requis']);
        return;
    }
    
    if (strlen($newPassword) < 6) {
        echo json_encode(['success' => false, 'message' => 'Le mot de passe doit contenir au moins 6 caractères']);
        return;
    }
    
    $xmlFile = '../xml/users.xml';
    $xml = simplexml_load_file($xmlFile);
    
    $user = $xml->xpath("//user[@id='$userId']")[0] ?? null;
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
        return;
    }
    
    // Vérifier l'ancien mot de passe
    if (!password_verify($currentPassword, (string)$user->password)) {
        echo json_encode(['success' => false, 'message' => 'Mot de passe actuel incorrect']);
        return;
    }
    
    // Hasher et sauvegarder le nouveau mot de passe
    $user->password = password_hash($newPassword, PASSWORD_DEFAULT);
    $xml->asXML($xmlFile);
    
    echo json_encode(['success' => true, 'message' => 'Mot de passe changé avec succès']);
}

function uploadAvatar() {
    if (!isset($_FILES['avatar'])) {
        echo json_encode(['success' => false, 'message' => 'Aucun fichier uploadé']);
        return;
    }
    
    $file = $_FILES['avatar'];
    $userId = $_SESSION['user_id'];
    
    // Vérifier le type de fichier
    $allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!in_array($file['type'], $allowedTypes)) {
        echo json_encode(['success' => false, 'message' => 'Type de fichier non autorisé']);
        return;
    }
    
    // Vérifier la taille (max 5MB)
    if ($file['size'] > 5 * 1024 * 1024) {
        echo json_encode(['success' => false, 'message' => 'Fichier trop volumineux (max 5MB)']);
        return;
    }
    
    // Créer le dossier s'il n'existe pas
    $uploadDir = '../uploads/avatars/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0777, true);
    }
    
    // Générer un nom de fichier unique
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = 'avatar_' . $userId . '_' . time() . '.' . $extension;
    $filepath = $uploadDir . $filename;
    
    if (move_uploaded_file($file['tmp_name'], $filepath)) {
        // Mettre à jour l'utilisateur
        $xmlFile = '../xml/users.xml';
        $xml = simplexml_load_file($xmlFile);
        
        $user = $xml->xpath("//user[@id='$userId']")[0] ?? null;
        
        if ($user) {
            $user->avatar = 'uploads/avatars/' . $filename;
            $xml->asXML($xmlFile);
        }
        
        echo json_encode([
            'success' => true, 
            'message' => 'Avatar uploadé avec succès',
            'avatar_url' => 'uploads/avatars/' . $filename
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Erreur lors de l\'upload']);
    }
}

function deleteAccount($input) {
    $password = $input['password'] ?? '';
    $userId = $_SESSION['user_id'];
    
    if (empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Mot de passe requis']);
        return;
    }
    
    $xmlFile = '../xml/users.xml';
    $xml = simplexml_load_file($xmlFile);
    
    $user = $xml->xpath("//user[@id='$userId']")[0] ?? null;
    
    if (!$user) {
        echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
        return;
    }
    
    // Vérifier le mot de passe
    if (!password_verify($password, (string)$user->password)) {
        echo json_encode(['success' => false, 'message' => 'Mot de passe incorrect']);
        return;
    }
    
    // Supprimer l'utilisateur
    unset($user[0]);
    $xml->asXML($xmlFile);
    
    // Supprimer les paramètres
    $settingsFile = '../xml/settings.xml';
    if (file_exists($settingsFile)) {
        $settingsXml = simplexml_load_file($settingsFile);
        $userSettings = $settingsXml->xpath("//user[@id='$userId']")[0] ?? null;
        if ($userSettings) {
            unset($userSettings[0]);
            $settingsXml->asXML($settingsFile);
        }
    }
    
    // Détruire la session
    session_destroy();
    
    echo json_encode(['success' => true, 'message' => 'Compte supprimé avec succès']);
}

function createDefaultSettings() {
    $xmlContent = '<?xml version="1.0" encoding="UTF-8"?>
<settings>
</settings>';
    
    file_put_contents('../xml/settings.xml', $xmlContent);
}

function createUserSettings($userId) {
    $xmlFile = '../xml/settings.xml';
    $xml = simplexml_load_file($xmlFile);
    
    $userSettings = $xml->addChild('user');
    $userSettings->addAttribute('id', $userId);
    $userSettings->addChild('push_notifications', 'true');
    $userSettings->addChild('sounds', 'true');
    $userSettings->addChild('vibrations', 'true');
    $userSettings->addChild('online_status', 'true');
    $userSettings->addChild('read_receipts', 'true');
    
    $xml->asXML($xmlFile);
    
    return $userSettings;
}
?> 