<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Non autorisé']);
    exit;
}

$messagesFile = __DIR__ . '/../xml/messages.xml';
$usersFile = __DIR__ . '/../xml/users.xml';
$contactsFile = __DIR__ . '/../xml/contacts.xml';
$groupsFile = __DIR__ . '/../xml/groups.xml';

// Vérifier si les fichiers XML existent
if (!file_exists($messagesFile)) {
    $xmlContent = '<?xml version="1.0" encoding="UTF-8"?><messages></messages>';
    file_put_contents($messagesFile, $xmlContent);
}

if (!file_exists($usersFile)) {
    echo json_encode(['success' => false, 'message' => 'Fichier users.xml manquant']);
    exit;
}

if (!file_exists($contactsFile)) {
    echo json_encode(['success' => false, 'message' => 'Fichier contacts.xml manquant']);
    exit;
}

$messagesXml = simplexml_load_file($messagesFile);
$usersXml = simplexml_load_file($usersFile);
$contactsXml = simplexml_load_file($contactsFile);
$groupsXml = simplexml_load_file($groupsFile);

if ($messagesXml === false || $usersXml === false || $contactsXml === false) {
    echo json_encode(['success' => false, 'message' => 'Erreur de chargement XML']);
    exit;
}

// GET - Récupérer les chats de l'utilisateur
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $_GET['action'] === 'get_chats') {
    $userId = $_SESSION['user_id'];
    $chats = [];
    
    // Récupérer les contacts de l'utilisateur
    $userContacts = [];
    foreach ($contactsXml->contact as $contact) {
        if ((string)$contact->user_id === $userId) {
            $contactUserId = (string)$contact->contact_user_id;
            
            // Récupérer les informations de l'utilisateur contact
            foreach ($usersXml->user as $user) {
                if ((string)$user['id'] === $contactUserId) {
                    $userContacts[] = [
                        'id' => $contactUserId,
                        'name' => (string)$user->name,
                        'phone' => (string)$user->phone,
                        'email' => (string)$user->email,
                        'status' => (string)$user->status,
                        'online' => (string)$user->status === 'Online',
                        'avatar' => (string)$user->avatar,
                        'nickname' => (string)$contact->nickname
                    ];
                    break;
                }
            }
        }
    }
    
    // Récupérer les groupes de l'utilisateur
    $userGroups = [];
    if ($groupsXml) {
        foreach ($groupsXml->group as $group) {
            $groupId = (string)$group['id'];
            $isMember = false;
            
            foreach ($group->members->member as $member) {
                if ((string)$member['user_id'] === $userId) {
                    $isMember = true;
                    break;
                }
            }
            
            if ($isMember) {
                $userGroups[] = [
                    'id' => $groupId,
                    'name' => (string)$group->name,
                    'description' => (string)$group->description,
                    'created_by' => (string)$group->created_by,
                    'created_at' => (string)$group->created_at,
                    'avatar' => (string)$group->avatar,
                    'member_count' => count($group->members->member),
                    'type' => 'group'
                ];
            }
        }
    }
    
    // Récupérer les derniers messages pour chaque contact
    foreach ($userContacts as $contact) {
        $lastMessage = null;
        $lastTime = null;
        $unreadCount = 0;
        
        foreach ($messagesXml->message as $message) {
            $senderId = (string)$message->sender_id;
            $receiverId = (string)$message->receiver_id;
            $groupId = (string)$message->group_id;
            
            // Ignorer les messages de groupe
            if (!empty($groupId)) continue;
            
            // Vérifier si c'est un message entre l'utilisateur et ce contact
            if (($senderId === $userId && $receiverId === $contact['id']) || 
                ($senderId === $contact['id'] && $receiverId === $userId)) {
                
                $messageTime = strtotime((string)$message->timestamp);
                
                // Garder le message le plus récent
                if (!$lastTime || $messageTime > $lastTime) {
                    $lastMessage = (string)$message->content;
                    $lastTime = $messageTime;
                }
                
                // Compter les messages non lus reçus
                if ($senderId === $contact['id'] && $receiverId === $userId && 
                    (string)$message->status !== 'read') {
                    $unreadCount++;
                }
            }
        }
        
        if ($lastMessage) {
            $chats[] = [
                'id' => $contact['id'],
                'name' => $contact['nickname'] ?: $contact['name'],
                'type' => 'contact',
                'online' => $contact['online'],
                'last_message' => $lastMessage,
                'last_time' => date('c', $lastTime),
                'unread_count' => $unreadCount
            ];
        }
    }
    
    // Récupérer les derniers messages pour chaque groupe
    foreach ($userGroups as $group) {
        $lastMessage = null;
        $lastTime = null;
        $unreadCount = 0;
        
        foreach ($messagesXml->message as $message) {
            $messageGroupId = (string)$message->group_id;
            $senderId = (string)$message->sender_id;
            
            if ($messageGroupId === $group['id']) {
                $messageTime = strtotime((string)$message->timestamp);
                
                // Garder le message le plus récent
                if (!$lastTime || $messageTime > $lastTime) {
                    $lastMessage = (string)$message->content;
                    $lastTime = $messageTime;
                }
                
                // Compter les messages non lus reçus
                if ($senderId !== $userId && (string)$message->status !== 'read') {
                    $unreadCount++;
                }
            }
        }
        
        if ($lastMessage) {
            $chats[] = [
                'id' => $group['id'],
                'name' => $group['name'],
                'type' => 'group',
                'online' => false, // Les groupes ne sont jamais "en ligne"
                'last_message' => $lastMessage,
                'last_time' => date('c', $lastTime),
                'unread_count' => $unreadCount,
                'member_count' => $group['member_count']
            ];
        }
    }
    
    // Trier par date du dernier message (plus récent en premier)
    usort($chats, function($a, $b) {
        $timeA = strtotime($a['last_time']);
        $timeB = strtotime($b['last_time']);
        return $timeB - $timeA;
    });
    
    echo json_encode(['success' => true, 'chats' => $chats]);
    exit;
}

// Si aucune action n'est spécifiée
echo json_encode(['success' => false, 'message' => 'Action non reconnue']);
exit;
?> 