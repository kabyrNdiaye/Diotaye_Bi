<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non autorisé']);
    exit;
}

$xmlFile = __DIR__ . '/../xml/contacts.xml';
$usersFile = __DIR__ . '/../xml/users.xml';

if (!file_exists($xmlFile) || !file_exists($usersFile)) {
    echo json_encode(['success' => false, 'message' => 'Fichiers XML manquants']);
    exit;
}

$xml = simplexml_load_file($xmlFile);
$usersXml = simplexml_load_file($usersFile);

if ($xml === false || $usersXml === false) {
    echo json_encode(['success' => false, 'message' => 'Erreur de chargement XML']);
    exit;
}

if (isset($_GET['action']) && $_GET['action'] === 'get_contacts') {
    $contacts = [];
    $currentUserId = $_SESSION['user_id'];
    
    // Récupérer les contacts de l'utilisateur courant
    foreach ($xml->contact as $contact) {
        if ((string)$contact->user_id === $currentUserId) {
            $contactUserId = (string)$contact->contact_user_id;
            
            // Trouver l'utilisateur correspondant
            foreach ($usersXml->user as $user) {
                if ((string)$user['id'] === $contactUserId) {
                    $contacts[] = [
                        'id' => $contactUserId,
                        'contact_id' => (string)$contact['id'],
                        'name' => (string)$user->name,
                        'phone' => (string)$user->phone,
                        'email' => (string)$user->email,
                        'status' => (string)$user->status,
                        'online' => (string)$user->status === 'Online',
                        'avatar' => (string)$user->avatar,
                        'bio' => (string)$user->bio,
                        'nickname' => (string)$contact->nickname,
                        'favorite' => (string)$contact->favorite === 'true',
                        'blocked' => (string)$contact->blocked === 'true',
                        'created_at' => (string)$contact->created_at,
                        'last_contact' => (string)$contact->last_contact
                    ];
                    break;
                }
            }
        }
    }
    
    echo json_encode(['success' => true, 'contacts' => $contacts]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['action']) && $input['action'] === 'add_contact') {
        $currentUserId = $_SESSION['user_id'];
        $nickname = trim($input['nickname'] ?? '');
        
        // Vérifier si le contact existe déjà
        $exists = false;
        foreach ($xml->contact as $contact) {
            if ((string)$contact->user_id === $currentUserId && 
                (string)$contact->contact_user_id === $input['user_id']) {
                $exists = true;
                break;
            }
        }
        
        if ($exists) {
            echo json_encode(['success' => false, 'message' => 'Contact déjà existant']);
            exit;
        }
        
        // Récupérer les informations de l'utilisateur
        $userFound = null;
        foreach ($usersXml->user as $user) {
            if ((string)$user['id'] === $input['user_id']) {
                $userFound = $user;
                break;
            }
        }
        
        if (!$userFound) {
            echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé']);
            exit;
        }
        
        // Utiliser le surnom personnalisé s'il est fourni, sinon utiliser le nom de l'utilisateur
        $displayName = !empty($nickname) ? $nickname : (string)$userFound->name;
        
        // Ajouter le contact
        $contactId = uniqid();
        $contact = $xml->addChild('contact');
        $contact->addAttribute('id', $contactId);
        $contact->addChild('user_id', $currentUserId);
        $contact->addChild('contact_user_id', $input['user_id']);
        $contact->addChild('nickname', $displayName);
        $contact->addChild('favorite', 'false');
        $contact->addChild('blocked', 'false');
        $contact->addChild('created_at', date('c'));
        $contact->addChild('last_contact', date('c'));
        
        $xml->asXML($xmlFile);
        echo json_encode(['success' => true, 'message' => 'Contact ajouté avec succès', 'contact_id' => $contactId]);
        exit;
    } elseif (isset($input['action']) && $input['action'] === 'toggle_favorite') {
        $contactId = $input['contact_id'] ?? '';
        $currentUserId = $_SESSION['user_id'];
        
        $contact = $xml->xpath("//contact[@id='$contactId' and user_id='$currentUserId']")[0] ?? null;
        
        if (!$contact) {
            echo json_encode(['success' => false, 'message' => 'Contact non trouvé']);
            exit;
        }
        
        $currentFavorite = (string)$contact->favorite === 'true';
        $contact->favorite = $currentFavorite ? 'false' : 'true';
        $xml->asXML($xmlFile);
        
        echo json_encode(['success' => true, 'message' => 'Statut favori mis à jour']);
        exit;
    } elseif (isset($input['action']) && $input['action'] === 'delete_contact') {
        $contactId = $input['contact_id'] ?? '';
        $currentUserId = $_SESSION['user_id'];
        
        $contact = $xml->xpath("//contact[@id='$contactId' and user_id='$currentUserId']")[0] ?? null;
        
        if (!$contact) {
            echo json_encode(['success' => false, 'message' => 'Contact non trouvé']);
            exit;
        }
        
        unset($contact[0]);
        $xml->asXML($xmlFile);
        
        echo json_encode(['success' => true, 'message' => 'Contact supprimé avec succès']);
        exit;
    } elseif (isset($input['action']) && $input['action'] === 'update_contact') {
        $contactId = $input['contact_id'] ?? '';
        $nickname = $input['nickname'] ?? '';
        $currentUserId = $_SESSION['user_id'];
        
        if (empty($nickname)) {
            echo json_encode(['success' => false, 'message' => 'Surnom requis']);
            exit;
        }
        
        $contact = $xml->xpath("//contact[@id='$contactId' and user_id='$currentUserId']")[0] ?? null;
        
        if (!$contact) {
            echo json_encode(['success' => false, 'message' => 'Contact non trouvé']);
            exit;
        }
        
        $contact->nickname = $nickname;
        $xml->asXML($xmlFile);
        
        echo json_encode(['success' => true, 'message' => 'Contact mis à jour avec succès']);
        exit;
    } elseif (isset($input['action']) && $input['action'] === 'check_user') {
        $phone = trim($input['phone'] ?? '');
        
        $found = null;
        foreach ($usersXml->user as $user) {
            if ((string)$user->phone === $phone) {
                $found = $user;
                break;
            }
        }
        
        if ($found) {
            echo json_encode([
                'success' => true, 
                'user_id' => (string)$found['id'],
                'user_name' => (string)$found->name,
                'user_phone' => (string)$found->phone,
                'user_email' => (string)$found->email
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Aucun utilisateur trouvé avec ce numéro de téléphone.']);
        }
        exit;
    }
}

echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
?> 